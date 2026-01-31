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
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ message: "orderId and amount required" });
    }

    // check if already paid
    const existing = await db.query(
      `SELECT * FROM order_payments 
        WHERE order_id = ? AND status = 'success' 
        LIMIT 1`,
      [orderId],
    );

    if (existing.length > 0) {
      return res.status(400).json({
        message: "Order already paid",
      });
    }

    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency: "INR",
      receipt: orderId.toString(),
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
      const [payment] = await db.query(
        `SELECT status, order_id 
       FROM order_payments 
       WHERE razorpay_order_id = ?`,
        [razorpay_order_id],
      );

      if (!payment) {
        return res.status(404).json({ status: "payment not found" });
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
    const { orderId } = req.params;

    const [order] = await db.query(
      `SELECT status FROM eorders WHERE order_id = ?`,
      [orderId],
    );

    return res.json({
      paymentStatus: order.status,
    });
  }
}

module.exports = new PaymentController();
