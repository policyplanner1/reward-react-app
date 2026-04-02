const crypto = require("crypto");
const PaymentModel = require("../models/paymentModel");
const TransactionModel = require("../models/transactionModel");
const razorpayService = require("../services/razorpay_service");
const ekoService = require("../services/eko_service");
const db = require("../../../../config/database");

class PaymentController {
  //   create Order
  async createOrder(req, res) {
    try {
      // const userId = req.user?.user_id;
      const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { amount, operator_id, utility_acc_no, cycle_number } = req.body;

      if (!amount || !operator_id || !utility_acc_no) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // 1. create transaction
      const transaction_id = await TransactionModel.create({
        user_id: userId,
        operator_id,
        utility_acc_no,
        cycle_number,
        amount,
      });

      // 2. create razorpay order
      const receipt = `txn_${transaction_id}`;
      const order = await razorpayService.createOrder(amount, receipt);

      // 3. save payment
      const payment_id = await PaymentModel.create({
        user_id: userId,
        order_id: order.id,
        amount,
        status: "PENDING",
      });

      // 4. link transaction
      await TransactionModel.linkPayment(transaction_id, payment_id);

      res.json({
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  //   verify Payment+Pay BBPS
  async verifyPayment(req, res) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      // verify signature
      const generated = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generated !== razorpay_signature) {
        return res.status(400).json({ error: "Invalid signature" });
      }

      // check if already processed
      const existing = await PaymentModel.getByOrderId(razorpay_order_id);

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Payment not found",
        });
      }

      if (existing.status === "SUCCESS") {
        return res.json({ success: true, message: "Already processed" });
      }

      // update payment
      await PaymentModel.updateStatus(razorpay_order_id, "SUCCESS", req.body);

      const payment = await PaymentModel.getByOrderId(razorpay_order_id);

      const transaction = await TransactionModel.getByPaymentId(payment.id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: "Transaction not found",
        });
      }

      //  CALL BBPS
      let bbpsResponse;

      try {
        bbpsResponse = await ekoService.payBill({
          utility_acc_no: transaction.utility_acc_no,
          operator_id: transaction.operator_id,
          amount: transaction.amount,
          cycle_number: transaction.cycle_number,
        }, req);

        //  Success → mark PAID
        await TransactionModel.updateStatus(
          transaction.id,
          "PAID",
          bbpsResponse,
        );
      } catch (err) {
        console.error("BBPS Error:", err.message);

        //  Failure → mark FAILED
        await TransactionModel.updateStatus(
          transaction.id,
          "FAILED",
          err.message,
        );

        return res.status(500).json({
          success: false,
          message: "BBPS payment failed",
        });
      }

      res.json({
        success: true,
        transaction_id: transaction.id,
        bbpsResponse,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new PaymentController();
