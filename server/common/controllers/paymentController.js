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
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Order ID is required",
        });
      }

      // 1 Get successful payment
      const [payments] = await conn.execute(
        `
        SELECT
          payment_id,
          razorpay_order_id,
          razorpay_payment_id,
          amount
        FROM order_payments
        WHERE order_id = ?
        AND status = 'success'
        LIMIT 1
        `,
        [orderId],
      );

      if (!payments.length) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: "No successful payment found for this order",
        });
      }

      const payment = payments[0];

      // 2 Prevent duplicate refunds
      const [existingRefund] = await conn.execute(
        `
        SELECT payment_id
        FROM order_payments
        WHERE order_id = ?
        AND status = 'refunded'
        LIMIT 1
        `,
        [orderId],
      );

      if (existingRefund.length) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: "Refund already processed",
        });
      }

      // 3 Call Razorpay refund API
      const refund = await razorpay.payments.refund(
        payment.razorpay_payment_id,
        {
          amount: Math.round(Number(payment.amount) * 100), // convert to paise
        },
      );

      // 4 Insert refund entry
      await conn.execute(
        `
        INSERT INTO order_payments
        (
          order_id,
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_refund_id,
          amount,
          status,
          payment_method,
          raw_webhook
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          payment.razorpay_order_id,
          payment.razorpay_payment_id,
          refund.id,
          payment.amount,
          "refunded",
          "razorpay_refund",
          JSON.stringify(refund),
        ],
      );

      // 5 Update order status
      await conn.execute(
        `
        UPDATE eorders
        SET
          status = 'cancelled',
          cancellation_status = 'approved'
        WHERE order_id = ?
        `,
        [orderId],
      );

      await conn.commit();

      return res.json({
        success: true,
        message: "Refund successful",
        refund_id: refund.id,
      });
    } catch (error) {
      await conn.rollback();

      console.error("Refund error:", error);

      return res.status(500).json({
        success: false,
        message: "Refund failed",
      });
    } finally {
      conn.release();
    }
  }
}

module.exports = new PaymentController();
