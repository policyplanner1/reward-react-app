const axios = require("axios");
const https = require("https");

const agent =
  process.env.NODE_ENV === "development"
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;

//  Common API caller
const callHeaderAPI = async (endpoint, payload) => {
  try {
    const res = await axios.post(
      `${process.env.HEADER_API_URL}${endpoint}`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
        httpsAgent: agent,
      },
    );

    if (!res.data || !res.data.secret_key) {
      throw new Error("Invalid header API response");
    }

    return res.data;
  } catch (err) {
    console.error(`Header API error (${endpoint}):`, err.message);
    throw new Error("Header generation failed");
  }
};

//  Fetch Bill Headers
async function generateFetchBillHeaders(key) {
  const data = await callHeaderAPI("BBPS/secret-key.php", { key });

  return {
    "Content-Type": "application/json",
    developer_key: process.env.EKO_DEVELOPER_KEY,
    "secret-key": data.secret_key,
    "secret-key-timestamp": data.secret_key_timestamp,
  };
}

//  Pay Bill Headers
async function generatePayBillHeaders(key, utility_acc_no, amount, user_code) {
  const data = await callHeaderAPI("BBPS/request-hash.php", {
    key,
    utility_acc_no,
    amount,
    user_code,
  });

  if (!data.request_hash) {
    throw new Error("Missing request_hash in response");
  }

  return {
    "Content-Type": "application/json",
    developer_key: process.env.EKO_DEVELOPER_KEY,
    "secret-key": data.secret_key,
    "secret-key-timestamp": data.secret_key_timestamp,
    request_hash: data.request_hash,
  };
}

async function fetchHeaders() {
  return await generateFetchBillHeaders(process.env.EKO_ACCESS_KEY);
}

module.exports = {
  generateFetchBillHeaders,
  generatePayBillHeaders,
  fetchHeaders,
};
