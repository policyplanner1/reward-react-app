const express = require("express");
const router = express.Router();

const paymentRoute = require("./paymentRoute");

router.use("/payment", paymentRoute);

module.exports = router;
