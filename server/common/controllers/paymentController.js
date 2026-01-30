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

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: orderId.toString(),
    });

    res.json({
      key: process.env.RAZOR_API_KEY,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  }

  //   verify Payment
  async verifyPayment(req, res) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expected = crypto
      .createHmac("sha256", process.env.RAZOR_SECRET_KEY)
      .update(body)
      .digest("hex");

    if (expected === razorpay_signature) {
      return res.json({ status: "success" });
    }

    res.status(400).json({ status: "invalid signature" });
  }
}

module.exports = new PaymentController();
