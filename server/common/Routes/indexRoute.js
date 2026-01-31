const express = require("express");
const router = express.Router();
const paymentRoute = require("./paymentRoute");
const webhookRoute = require("./webhookRoute");

// Payment
router.use("/", paymentRoute);

// webhook Route
router.use("/", webhookRoute);

module.exports = router;
