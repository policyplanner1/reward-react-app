const db = require("../../../../config/database");

async function processEvent(req, res) {
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
        return res.sendStatus(200);
      }

      const parentOrderId = rpOrder[0].receipt;

      //  Update ALL service orders
      await db.execute(
        `UPDATE service_orders
         SET status = 'documents_pending',
             payment_id = ?,
             payment_status = 'paid'
         WHERE parent_order_id = ?`,
        [paymentId, parentOrderId],
      );

      console.log("Payment captured → Orders updated");
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

      if (rpOrder.length) {
        const parentOrderId = rpOrder[0].receipt;

        await db.execute(
          `UPDATE service_orders
           SET payment_status = 'failed'
           WHERE parent_order_id = ?`,
          [parentOrderId],
        );
      }

      console.log("Payment failed");
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(500);
  }
}

module.exports = { processEvent };
