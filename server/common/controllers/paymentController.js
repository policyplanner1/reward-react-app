const PaymentModel = require("../models/paymentModel");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const db = require("../../config/database");

const razorpay = new Razorpay({
  key_id: process.env.RAZOR_API_KEY,
  key_secret: process.env.RAZOR_SECRET_KEY,
});

class PaymentController {
  // create payment
  async createOrder(req, res) {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "orderId required" });
    }

    // check if already paid
    const [orders] = await db.query(
      `SELECT total_amount, status 
     FROM eorders 
     WHERE order_id = ? 
     LIMIT 1`,
      [orderId],
    );

    if (!orders.length) {
      return res.status(404).json({ message: "Order not found" });
    }

    const order = orders[0];

    if (order.status === "paid") {
      return res.status(400).json({ message: "Order already paid" });
    }

    const amount = Number(order.total_amount);

    // Check if already created razorpay order
    const [existing] = await db.query(
      `SELECT razorpay_order_id 
      FROM order_payments 
      WHERE order_id = ? 
      AND status IN ('created','pending')
      LIMIT 1`,
      [orderId],
    );

    if (existing.length > 0) {
      return res.status(200).json({
        key: process.env.RAZOR_API_KEY,
        orderId: existing[0].razorpay_order_id,
        amount: amount * 100,
        currency: "INR",
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: orderId.toString(),
      payment_capture: 1,
    });

    await PaymentModel.createOrder({
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount,
    });

    return res.status(200).json({
      key: process.env.RAZOR_API_KEY,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
    });
  }

  //   verify Payment
  async verifyPayment(req, res) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      const body = `${razorpay_order_id}|${razorpay_payment_id}`;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZOR_SECRET_KEY)
        .update(body)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ status: "invalid signature" });
      }

      // check status
      const [payments] = await db.query(
        `SELECT status, order_id 
          FROM order_payments 
          WHERE razorpay_order_id = ?
          LIMIT 1`,
        [razorpay_order_id],
      );

      if (!payments.length) {
        return res.status(404).json({ status: "payment not found" });
      }

      const payment = payments[0];

      const [order] = await db.query(
        `SELECT status FROM eorders WHERE order_id = ?`,
        [payment.order_id],
      );

      if (order[0]?.status !== "paid") {
        return res.json({ status: "pending" });
      }

      // If webhook already updated
      if (payment.status === "success") {
        return res.json({
          status: "success",
          orderId: payment.order_id,
        });
      }

      return res.json({
        status: "pending",
        message: "Waiting for confirmation",
      });
    } catch (error) {
      console.error("Verify Payment Error:", error);
      res.status(500).json({ message: "Payment verification failed" });
    }
  }

  // payment status
  async paymentStatus(req, res) {
    res.set("Cache-Control", "no-store");
    const { orderId } = req.params;

    const [order] = await db.query(
      `SELECT status FROM eorders WHERE order_id = ?`,
      [orderId],
    );

    return res.json({
      paymentStatus: order.status,
    });
  }

  async refundPayment(req, res) {
    try {
      const { orderId } = req.body;

      // Get successful payment for this order
      const [payment] = await db.query(
        `SELECT razorpay_payment_id, amount 
       FROM order_payments
       WHERE order_id = ? AND status = 'success'
       LIMIT 1`,
        [orderId],
      );

      if (!payment) {
        return res.status(400).json({ message: "No successful payment found" });
      }

      // Call Razorpay refund API
      const refund = await razorpay.payments.refund(
        payment.razorpay_payment_id,
        {
          amount: payment.amount * 100, // full refund
        },
      );

      // Insert refund as new payment row (audit trail)
      await db.query(
        `INSERT INTO order_payments 
       (order_id, razorpay_order_id, razorpay_payment_id, amount, status, payment_method, raw_webhook)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          refund.order_id || null,
          refund.id,
          payment.amount,
          "refunded",
          "refund",
          JSON.stringify(refund),
        ],
      );

      // Update order status
      await db.query(
        `UPDATE eorders SET status = 'cancelled' WHERE order_id = ?`,
        [orderId],
      );

      res.json({ message: "Refund successful", refund });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Refund failed" });
    }
  }
}

module.exports = new PaymentController();
