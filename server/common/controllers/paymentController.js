const PaymentModel = require("../models/paymentModel");
const Razorpay = require("razorpay");
const crypto = require("crypto");

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

      // Optional: update payment status here
      // await PaymentModel.updateStatus(razorpay_order_id, 'paid');

      res.json({ status: "success" });
    } catch (error) {
      console.error("Verify Payment Error:", error);
      res.status(500).json({ message: "Payment verification failed" });
    }
  }
}

module.exports = new PaymentController();
