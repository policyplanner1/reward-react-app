const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/paymentController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// create payment
router.post("/create-order", PaymentController.createOrder);

// verify payment
router.post("/verify-payment", PaymentController.verifyPayment);

module.exports = router;
