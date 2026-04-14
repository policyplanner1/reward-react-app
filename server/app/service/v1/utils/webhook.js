const db = require("../../../../config/database");

async function processEvent(req) {
  try {
    const body = req.parsedBody;
    const event = body.event;

    // =========================
    //  PAYMENT SUCCESS
    // =========================
    if (event === "payment.captured") {
      const payment = body.payload.payment.entity;

      const razorpayOrderId = payment.order_id;
      const paymentId = payment.id;

      //  Fetch receipt (parent_order_id)
      const [rpOrder] = await db.execute(
        `SELECT receipt FROM razorpay_orders WHERE razorpay_order_id = ?`,
        [razorpayOrderId],
      );

      if (!rpOrder.length) {
        console.log("No matching razorpay order");
        return;
      }

      const parentOrderId = rpOrder[0].receipt;

      //  Update ALL service orders
      await db.execute(
        `UPDATE service_orders
         SET status = 'documents_pending',
             payment_id = ?,
             payment_status = 'paid'
         WHERE parent_order_id = ?
         AND payment_status != 'paid'`,
        [paymentId, parentOrderId],
      );

      console.log("Service Payment Success", {
        razorpayOrderId,
        paymentId,
      });
    }

    // =========================
    //  PAYMENT FAILED
    // =========================
    if (event === "payment.failed") {
      const payment = body.payload.payment.entity;

      const razorpayOrderId = payment.order_id;

      const [rpOrder] = await db.execute(
        `SELECT receipt FROM razorpay_orders WHERE razorpay_order_id = ?`,
        [razorpayOrderId],
      );

      if (!rpOrder.length) return;

      const parentOrderId = rpOrder[0].receipt;

      await db.execute(
        `UPDATE service_orders
         SET payment_status = 'failed'
         WHERE parent_order_id = ?
         AND payment_status != 'failed'`,
        [parentOrderId],
      );

      console.log("Service Payment failed", { razorpayOrderId });
    }
  } catch (err) {
    console.error("Webhook error:", err);
    throw err;
  }
}

module.exports = { processEvent };
