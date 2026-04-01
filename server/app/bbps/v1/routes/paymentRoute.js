const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/paymentController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// 
// router.get("/status", auth, PaymentController.getOnboardingStatus);

module.exports = router;
