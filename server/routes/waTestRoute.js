const express = require("express");
const router = express.Router();
const { enqueueWhatsApp } = require("../services/whatsapp/waEnqueueService");

router.post("/test", async (req, res) => {
  try {
    const { phone, order_id = 999, company_id = null } = req.body;

    const result = await enqueueWhatsApp({
      eventName: "ORDER_CREATED",
      ctx: {
        order_id,
        company_id,
        phone,
        customer_name: "Test Customer",
        total_amount: 1234
      }
    });

    return res.json({ ok: true, result });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

module.exports = router;
