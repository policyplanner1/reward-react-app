const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/paymentController");

// Initialize the Payment
router.post("/start-payment", PaymentController.startPayment);

// return from pg
router.post("/payment-advice", PaymentController.paymentAdvice);

// payment settle
router.post("/settlement-advice", PaymentController.settlementAdvice);

module.exports = router;
