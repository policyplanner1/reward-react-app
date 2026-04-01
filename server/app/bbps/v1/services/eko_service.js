const axios = require("axios");
const headerUtil = require("../utils/header");

const BASE = process.env.EKO_BASE_URL;

// 1. Categories
exports.getCategories = async () => {
  const headers = await headerUtil.fetchHeaders();
  const res = await axios.get(`${BASE}billpayments/operators_category`, {
    headers,
  });
  return res.data;
};

// 2. Operators
exports.getOperators = async (category) => {
  const headers = await headerUtil.fetchHeaders();
  const res = await axios.get(
    `${BASE}billpayments/operators?category=${category}`,
    { headers },
  );
  return res.data;
};

// 3. Operator details
exports.getOperatorDetails = async (id) => {
  const headers = await headerUtil.fetchHeaders();
  const res = await axios.get(`${BASE}billpayments/operators/${id}`, {
    headers,
  });
  return res.data;
};

// 4. Fetch bill
exports.fetchBill = async (body) => {
  const headers = await headerUtil.fetchHeaders();

  const payload = {
    ...body,
    user_code: process.env.EKO_USER_CODE,
    client_ref_id: Date.now(),
    hc_channel: "0",
  };

  const res = await axios.post(
    `${BASE}billpayments/fetchbill?initiator_id=${process.env.EKO_INITIATOR_ID}`,
    payload,
    { headers },
  );

  return res.data;
};

// 5. Pay bill
exports.payBill = async (body) => {
  const headers = await headerUtil.payHeaders(
    body.utility_acc_no,
    body.amount,
    process.env.EKO_USER_CODE,
  );

  const payload = {
    ...body,
    user_code: process.env.EKO_USER_CODE,
    client_ref_id: Date.now(),
    hc_channel: "0",
  };

  const res = await axios.post(
    `${BASE}billpayments/paybill?initiator_id=${process.env.EKO_INITIATOR_ID}`,
    payload,
    { headers },
  );

  return res.data;
};
