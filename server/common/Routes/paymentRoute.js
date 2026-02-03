const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/paymentController");
const webhook=require("../utils/paymentWebHook")

// create payment
router.post('/create-order', PaymentController.createOrder);

// verify payment
router.post('/verify-payment', PaymentController.verifyPayment);

// Payment status
router.get('/payment-status/:orderId',PaymentController.paymentStatus)

// refund
router.post('/refund', PaymentController.refundPayment);

// webhook
router.post("/webhook", webhook.handleWebhook);


module.exports = router;
