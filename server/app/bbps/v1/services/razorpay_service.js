const Razorpay = require("razorpay");

const instance = new Razorpay({
  key_id: process.env.RAZOR_API_KEY,
  key_secret: process.env.RAZOR_SECRET_KEY,
});

exports.createOrder = async (amount, receipt) => {
  return await instance.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt,
  });
};