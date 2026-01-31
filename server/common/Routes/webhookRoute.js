const express = require("express");
const router = express.Router();
const webhook=require("../utils/paymentWebHook")

router.post("/webhook", webhook.handleWebhook);

module.exports = router;
