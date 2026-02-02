const crypto = require("crypto");
const db = require("../../config/database");

async function handleWebhook(req, res) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // 1
    const expected = crypto
      .createHmac("sha256", secret)
      .update(req.body) 
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).send("Invalid signature");
    }

    // 2
    const body = JSON.parse(req.body.toString());

    const event = body.event;

    if (event === "payment.captured") {
      const payment = body.payload.payment.entity;

      await db.query(
        `UPDATE order_payments 
         SET razorpay_payment_id = ?, 
             status = 'success',
             payment_method = ?,
             raw_webhook = ?
         WHERE razorpay_order_id = ?`,
        [payment.id, payment.method, JSON.stringify(body), payment.order_id],
      );

      await db.query(
        `UPDATE eorders 
         SET status = 'paid' 
         WHERE order_id = (
           SELECT order_id FROM order_payments WHERE razorpay_order_id = ?
         )`,
        [payment.order_id],
      );
    }

    if (event === "payment.failed") {
      const payment = body.payload.payment.entity;

      await db.query(
        `UPDATE order_payments 
         SET status = 'failed',
             raw_webhook = ?
         WHERE razorpay_order_id = ?`,
        [JSON.stringify(body), payment.order_id],
      );
    }

    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
}

module.exports = { handleWebhook };
