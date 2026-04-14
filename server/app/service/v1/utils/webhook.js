const crypto = require("crypto");
const db = require("../../../../config/database");

async function handleServiceWebhook(req, res) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // Raw body
    const rawBody = req.body;

    // 1 Verify signature
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expected !== signature) {
      console.log("Invalid webhook signature");
      return res.status(400).send("Invalid signature");
    }

    // 2 Parse body
    const body = JSON.parse(rawBody.toString());
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
        [razorpayOrderId]
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
        [paymentId, parentOrderId]
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
        [razorpayOrderId]
      );

      if (rpOrder.length) {
        const parentOrderId = rpOrder[0].receipt;

        await db.execute(
          `UPDATE service_orders
           SET payment_status = 'failed'
           WHERE parent_order_id = ?`,
          [parentOrderId]
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

module.exports = { handleServiceWebhook };