const crypto = require("crypto");

//  Generate timestamp
const getTimestamp = () => Math.floor(Date.now() / 1000).toString();

//  Generate secret key
const generateSecretKey = (secretKey, timestamp) => {
  return crypto.createHmac("sha256", secretKey).update(timestamp).digest("hex");
};

// Generate request hash (for payBill)
const generateRequestHash = (secretKey, payloadString) => {
  return crypto
    .createHmac("sha256", secretKey)
    .update(payloadString)
    .digest("hex");
};

//  Common headers (for categories, operators, fetchBill)
exports.fetchHeaders = async () => {
  const timestamp = getTimestamp();

  const secret_key = generateSecretKey(process.env.EKO_SECRET_KEY, timestamp);

  return {
    "Content-Type": "application/json",
    developer_key: process.env.EKO_DEVELOPER_KEY,
    "secret-key": secret_key,
    "secret-key-timestamp": timestamp,
  };
};

//  PayBill headers (IMPORTANT)
exports.payHeaders = async (utility_acc_no, amount, user_code) => {
  const timestamp = getTimestamp();

  const secret_key = generateSecretKey(process.env.EKO_SECRET_KEY, timestamp);

  //  VERY IMPORTANT: payload string format
  const payloadString = `${utility_acc_no}|${amount}|${user_code}`;

  const request_hash = generateRequestHash(
    process.env.EKO_SECRET_KEY,
    payloadString,
  );

  return {
    "Content-Type": "application/json",
    developer_key: process.env.EKO_DEVELOPER_KEY,
    "secret-key": secret_key,
    "secret-key-timestamp": timestamp,
    request_hash,
  };
};
