const PaymentModel = require("../models/paymentModel");
const { initiateSale, checkStatus } = require("../utils/payment-service");

class PaymentController {
  // 1.start the payment
  async startPayment(req, res) {
    const order = {
      orderId: req.body.orderId,
      txnId: "TXN" + Date.now(),
      amount: req.body.amount,
      email: req.body.email,
      mobile: req.body.mobile,
    };

    const pgRes = await initiateSale(order);

    await PaymentModel.createTxn({
      orderId: order.orderId,
      merchantTxnNo: order.txnId,
      amount: order.amount,
      tranCtx: pgRes.tranCtx,
    });

    const redirectUrl = `${pgRes.redirectURI}?tranCtx=${pgRes.tranCtx}`;
    return res.json({ redirectUrl });
  }

  // 2.Payment Advice from PG
  async paymentAdvice(req, res) {
    try {
      const data = req.body;

      const statusRes = await checkStatus({
        merchantTxnNo: data.merchantTxnNo,
        amount: data.amount,
      });

      if (statusRes.status === "SUCCESS") {
        await PaymentModel.updateStatus(data.merchantTxnNo, "SUCCESS", statusRes);
      } else {
        await PaymentModel.updateStatus(data.merchantTxnNo, "FAILED", statusRes);
      }

      res.send("OK");
    } catch (e) {
      res.status(500).send("Error");
    }
  }

  // 3.Settlement Advice
  async settlementAdvice(req, res) {
    const { merchantTxnNo } = req.body;
    await PaymentModel.markSettled(merchantTxnNo);
    res.send("OK");
  }
}

module.exports = new PaymentController();
