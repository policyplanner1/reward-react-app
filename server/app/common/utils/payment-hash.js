const crypto = require("crypto");

const SECRET = "abc";

function generateInitiateHash(d) {
  const str =
    d.addlParam1 +
    d.addlParam2 +
    d.amount +
    d.currencyCode +
    d.customerEmailID +
    d.customerMobileNo +
    d.merchantId +
    d.merchantTxnNo +
    d.payType +
    d.returnURL +
    d.transactionType +
    d.txnDate;

  return crypto.createHmac("sha256", SECRET).update(str).digest("hex");
}

function generateCommandHash(d, type) {
  const str =
    d.merchantID + d.merchantTxnNo + d.originalTxnNo + d.amount + type;

  return crypto.createHmac("sha256", SECRET).update(str).digest("hex");
}

module.exports = { generateInitiateHash, generateCommandHash };
