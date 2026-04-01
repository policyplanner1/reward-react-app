const axios = require('axios');
const headerUtil = require('../utils/header');

exports.payBill = async (data) => {
  const headers = await headerUtil.payHeaders(
    data.utility_acc_no,
    data.amount,
    process.env.EKO_USER_CODE
  );

  const payload = {
    ...data,
    user_code: process.env.EKO_USER_CODE,
    client_ref_id: Date.now(),
    hc_channel: "0"
  };

  const res = await axios.post(
    `${process.env.EKO_BASE_URL}billpayments/paybill?initiator_id=${process.env.EKO_INITIATOR_ID}`,
    payload,
    { headers }
  );

  return res.data;
};