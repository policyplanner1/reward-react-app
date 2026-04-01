const express = require("express");
const router = express.Router();
const v1PaymentRoutes = require("./paymentRoute");

router.use("/pay", v1PaymentRoutes);

module.exports = router;