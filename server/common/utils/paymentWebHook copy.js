const crypto = require("crypto");
const db = require("../../config/database");
const { enqueueWhatsApp } = require("../../services/whatsapp/waEnqueueService");

// async function handleWebhook(req, res) {
//   try {
//     const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
//     const signature = req.headers["x-razorpay-signature"];

//     // 1
//     const expected = crypto
//       .createHmac("sha256", secret)
//       .update(req.body)
//       .digest("hex");

//     if (expected !== signature) {
//       return res.status(400).send("Invalid signature");
//     }

//     // 2
//     const body = JSON.parse(req.body.toString());

//     const event = body.event;

//     if (event === "payment.captured") {
//       const payment = body.payload.payment.entity;

//       await db.query(
//         `UPDATE order_payments
//          SET razorpay_payment_id = ?,
//              status = 'success',
//              payment_method = ?,
//              raw_webhook = ?
//          WHERE razorpay_order_id = ?`,
//         [payment.id, payment.method, JSON.stringify(body), payment.order_id],
//       );

//       await db.query(
//         `UPDATE eorders
//          SET status = 'paid'
//          WHERE order_id = (
//            SELECT order_id FROM order_payments WHERE razorpay_order_id = ?
//          )`,
//         [payment.order_id],
//       );
//     }

//     if (event === "payment.failed") {
//       const payment = body.payload.payment.entity;

//       await db.query(
//         `UPDATE order_payments
//          SET status = 'failed',
//              raw_webhook = ?
//          WHERE razorpay_order_id = ?`,
//         [JSON.stringify(body), payment.order_id],
//       );
//     }

//     res.sendStatus(200);
//   } catch (err) {
//     console.error(err);
//     res.sendStatus(500);
//   }
// }

async function sendOrderPlacedWhatsApp(orderId) {
  const [rows] = await db.query(
    `SELECT 
        o.order_id,
        o.order_ref,
        o.company_id,
        o.total_amount,
        cu.name AS customer_name,
        cu.phone
     FROM eorders o
     JOIN customer cu ON cu.user_id = o.user_id
     WHERE o.order_id = ?
     LIMIT 1`,
    [orderId],
  );

  if (!rows.length) return;

  const ctx = rows[0];

  if (!ctx.phone) return;

  await enqueueWhatsApp({
    eventName: "order_place_confirm",
    ctx: {
      phone: ctx.phone,
      company_id: ctx.company_id ?? null,
      customer_name: ctx.customer_name || "User",
      order_id: ctx.order_ref || ctx.order_id,
      total_amount: ctx.total_amount,
    },
  });
}

async function handleWebhook(req, res) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // 1 Verify signature
    const expected = crypto
      .createHmac("sha256", secret)
      .update(req.body)
      .digest("hex");

    if (expected !== signature) {
      return res.status(400).send("Invalid signature");
    }

    const body = JSON.parse(req.body.toString());
    const event = body.event;

    if (event === "payment.captured") {
      const payment = body.payload.payment.entity;

      // 2 Get payment row
      const [rows] = await db.query(
        `SELECT order_id, status 
         FROM order_payments 
         WHERE razorpay_order_id = ? 
         LIMIT 1`,
        [payment.order_id],
      );

      if (!rows.length) return res.sendStatus(200);

      const { order_id, status } = rows[0];

      // 3 Idempotency check
      if (status === "success") {
        return res.sendStatus(200);
      }

      // 4 Update payment row
      await db.query(
        `UPDATE order_payments 
         SET razorpay_payment_id = ?, 
             status = 'success',
             payment_method = ?,
             raw_webhook = ?
         WHERE razorpay_order_id = ?`,
        [payment.id, payment.method, JSON.stringify(body), payment.order_id],
      );

      // 5 Update order status
      await db.query(
        `UPDATE eorders 
         SET status = 'paid' 
         WHERE order_id = ?`,
        [order_id],
      );

      // 6 Send WhatsApp (only once)
      await sendOrderPlacedWhatsApp(order_id);
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

    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    return res.sendStatus(500);
  }
}

module.exports = { handleWebhook };
