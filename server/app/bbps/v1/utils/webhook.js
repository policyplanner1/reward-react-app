const db = require("../../../../config/database");
const TransactionModel = require("../models/transactionModel");
const ekoService = require("../services/eko_service");

async function processEvent(req) {
  try {
    const body = req.parsedBody;
    const event = body.event;

    // =========================
    //  PAYMENT SUCCESS
    // =========================
    if (event === "payment.captured") {
      const payment = body.payload.payment.entity;

      const transactionId = payment.notes.transaction_id;

      const txn = await TransactionModel.getById(transactionId);

      if (!txn) return;

      //  DOUBLE EXECUTION PROTECTION
      if (txn.bbps_status === "PAID") {
        console.log("Skipping already paid txn:", txn.id);
        return;
      }

      try {
        const res = await ekoService.payBill({
          utility_acc_no: txn.utility_acc_no,
          operator_id: txn.operator_id,
          amount: txn.amount,
          cycle_number: txn.cycle_number,
        });

        await TransactionModel.updateStatus(txn.id, "PAID", res);
      } catch (err) {
        await TransactionModel.updateStatus(
          txn.id,
          "FAILED_RETRY",
          err.message,
        );
      }
    }

    // =========================
    //  PAYMENT FAILED
    // =========================
    if (event === "payment.failed") {
      const payment = body.payload.payment.entity;

      const razorpayOrderId = payment.order_id;

      const [rpOrder] = await db.execute(
        `SELECT ref_id FROM razorpay_orders WHERE razorpay_order_id = ?`,
        [razorpayOrderId],
      );

      if (!rpOrder.length) return;

      const parentOrderId = rpOrder[0].ref_id;

      await db.execute(
        `UPDATE razorpay_orders
          SET status='failed',
              raw_response=?
          WHERE razorpay_order_id=?`,
        [JSON.stringify(body), razorpayOrderId],
      );

      await TransactionModel.updateStatus(txn.id, "FAILED_RETRY", body);
    }
  } catch (err) {
    console.error("Webhook error:", err);
    throw err;
  }
}

module.exports = { processEvent };
