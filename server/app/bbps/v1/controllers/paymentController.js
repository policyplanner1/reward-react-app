const crypto = require("crypto");
const PaymentModel = require("../models/paymentModel");
const TransactionModel = require("../models/transactionModel");
const razorpay = require("../services/razorpay_service");
const ekoService = require("../services/eko_service");
const db = require("../../../../config/database");

class PaymentController {
  //   create Order
  async createOrder(req, res) {
    try {
      const userId = req.user?.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { amount, operator_id, utility_acc_no, cycle_number } = req.body;

      if (!amount || !operator_id || !utility_acc_no) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // 1. create transaction
      const transaction_id = await TransactionModel.create({
        user_id: userId,
        operator_id,
        utility_acc_no,
        cycle_number,
        amount,
      });

      // 2. create razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: `bbps_${transaction_id}`,
        notes: {
          module: "bbps",
          transaction_id,
        },
      });

      await db.execute(
        `INSERT INTO razorpay_orders
      (razorpay_order_id, receipt, amount, status, module, ref_id)
      VALUES (?, ?, ?, 'created', 'bbps', ?)`,
        [razorpayOrder.id, `bbps_${transaction_id}`, amount, transaction_id],
      );

      res.json({
        success: true,
        data: {
          key: process.env.RAZOR_API_KEY,
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          transaction_id,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  //   verify Payment+Pay BBPS
  async verifyPayment(req, res) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      // verify signature
      const generated = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generated !== razorpay_signature) {
        await conn.rollback();
        return res.status(400).json({ error: "Invalid signature" });
      }

      // check if already processed
      const existing = await PaymentModel.getByOrderId(razorpay_order_id, conn);

      if (!existing) {
        await conn.rollback();
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      if (existing.status === "SUCCESS") {
        await conn.rollback();
        return res.json({ success: true, message: "Already processed" });
      }

      // update payment
      await PaymentModel.updateStatus(
        razorpay_order_id,
        "SUCCESS",
        req.body,
        conn,
      );

      const payment = await PaymentModel.getByOrderId(razorpay_order_id, conn);

      const transaction = await TransactionModel.getByPaymentId(
        payment.id,
        conn,
      );

      if (!transaction) {
        await conn.rollback();
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      if (transaction.bbps_status === "PAID") {
        await conn.rollback();
        return res.json({
          success: true,
          message: "Already processed",
        });
      }

      //  CALL BBPS
      let bbpsResponse;

      try {
        bbpsResponse = await ekoService.payBill(
          {
            utility_acc_no: transaction.utility_acc_no,
            operator_id: transaction.operator_id,
            amount: transaction.amount,
            cycle_number: transaction.cycle_number,
          },
          req,
        );

        //  Success → mark PAID
        await TransactionModel.updateStatus(
          transaction.id,
          "PAID",
          bbpsResponse,
          conn,
        );

        await conn.commit();
      } catch (err) {
        console.error("BBPS Error:", err);

        //  MARK FOR RETRY (NOT FINAL FAILURE)
        await TransactionModel.updateStatus(
          transaction.id,
          "FAILED_RETRY",
          err.message,
          conn,
        );

        await conn.commit();

        return res.status(500).json({
          success: false,
          message: "Payment processing failed, will retry automatically",
        });
      }

      return res.json({
        success: true,
        transaction_id: transaction.id,
        bbpsResponse,
      });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ error: err.message });
    } finally {
      conn.release();
    }
  }

  // Retry Transaction
  async retryTransaction(req, res) {
    try {
      const { transaction_id } = req.body;

      const txn = await TransactionModel.getById(transaction_id);

      if (!txn) {
        return res.status(404).json({ message: "Transaction not found" });
      }

      const result = await ekoService.payBill({
        utility_acc_no: txn.utility_acc_no,
        operator_id: txn.operator_id,
        amount: txn.amount,
        cycle_number: txn.cycle_number,
      });

      await TransactionModel.updateStatus(txn.id, "PAID", result);

      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Retry failed",
      });
    }
  }
}

module.exports = new PaymentController();
