const axios = require("axios");
const qs = require("qs");
const { generateInitiateHash, generateCommandHash } = require("./payment-hash");

const MERCHANT_ID = "T_03332";

// initialize the payment
async function initiateSale(order) {
  const payload = {
    merchantId: MERCHANT_ID,
    merchantTxnNo: order.txnId,
    amount: order.amount.toFixed(2),
    currencyCode: "356",
    payType: "0",
    customerEmailID: order.email,
    customerMobileNo: order.mobile,
    transactionType: "SALE",
    txnDate: Date.now().toString(),
    returnURL: "https://yourdomain.com/api/pg/payment-advice",
    addlParam1: "Test1",
    addlParam2: "Test2",
  };

  payload.secureHash = generateInitiateHash(payload);

  const { data } = await axios.post(
    "https://qa.phicommerce.com/pg/api/v2/initiateSale",
    payload,
  );

  return data;
}

// confirm the payment
async function checkStatus(txn) {
  const body = {
    merchantID: MERCHANT_ID,
    merchantTxnNo: txn.merchantTxnNo,
    originalTxnNo: txn.merchantTxnNo,
    amount: txn.amount,
    transactionType: "STATUS",
  };

  body.secureHash = generateCommandHash(body, "STATUS");

  const { data } = await axios.post(
    "https://qa.phicommerce.com/pg/api/command",
    qs.stringify(body),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  return data;
}

// refund
async function refund(txn) {
  const body = {
    merchantID: MERCHANT_ID,
    merchantTxnNo: "REF" + Date.now(),
    originalTxnNo: txn.originalTxnNo,
    amount: txn.amount,
    transactionType: "REFUND",
  };

  body.secureHash = generateCommandHash(body, "REFUND");

  const { data } = await axios.post(
    "https://qa.phicommerce.com/pg/api/command",
    qs.stringify(body),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  return data;
}

module.exports = { initiateSale, checkStatus, refund };
