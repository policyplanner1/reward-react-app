const axios = require("axios");
const headerUtil = require("../utils/header");

const BASE = process.env.EKO_BASE_URL;

// 0. Get Locations
exports.getLocations = async () => {
  const headers = await headerUtil.fetchHeaders();
  const res = await axios.get(`${BASE}billpayments/operators_location`, {
    headers,
  });
  return res.data;
};

// 1. Categories
exports.getCategories = async () => {
  const headers = await headerUtil.fetchHeaders();
  const res = await axios.get(`${BASE}billpayments/operators_category`, {
    headers,
  });
  return res.data;
};

// 2. Operators
exports.getOperators = async (category_id) => {
  const headers = await headerUtil.fetchHeaders();

  const res = await axios.get(`${BASE}billpayments/operators`, { headers });

  let operators = res.data?.data || [];

  if (category_id) {
    operators = operators.filter((op) => op.operator_category == category_id);
  }

  return {
    ...res.data,
    data: operators,
  };
};

// 2.5 Grouped operators
exports.getOperatorsGrouped = async (category_id, search = "") => {
  const headers = await headerUtil.fetchHeaders();

  const [operatorsRes, locationRes] = await Promise.all([
    axios.get(`${BASE}billpayments/operators`, { headers }),
    axios.get(`${BASE}billpayments/operators_location`, { headers }),
  ]);

  let operators = operatorsRes.data?.data || [];
  const locations = locationRes.data?.data || [];

  //  STEP 1: FILTER BY CATEGORY_ID
  operators = operators.filter((op) => op.operator_category == category_id);

  //  STEP 2: SEARCH (optional)
  if (search) {
    const keyword = search.toLowerCase();
    operators = operators.filter((op) =>
      op.name?.toLowerCase().includes(keyword),
    );
  }

  //  STEP 3: MAP LOCATIONS
  const locationMap = {};
  locations.forEach((loc) => {
    locationMap[loc.operator_location_id.padStart(2, "0")] =
      loc.operator_location_name;
  });

  //  STEP 4: GROUP
  const grouped = {};

  operators.forEach((op) => {
    const locId = op.location_id.toString().padStart(2, "0");
    const locName = locationMap[locId] || "Others";

    if (!grouped[locName]) grouped[locName] = [];

    grouped[locName].push({
      operator_id: op.operator_id,
      name: op.name,
    });
  });

  return grouped;
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
exports.fetchBill = async (body, req) => {
  const headers = await headerUtil.fetchHeaders();

  const payload = {
    ...body,
    user_code: process.env.EKO_USER_CODE,
    client_ref_id: Date.now(),
    hc_channel: "0",
    source_ip: getClientIP(req) || "127.0.0.1",
  };

  const res = await axios.post(
    `${BASE}billpayments/fetchbill?initiator_id=${process.env.EKO_INITIATOR_ID}`,
    payload,
    { headers },
  );

  return res.data;
};

// 5. Pay bill
exports.payBill = async (body, req) => {
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
    source_ip: getClientIP(req) || "127.0.0.1",
  };

  const res = await axios.post(
    `${BASE}billpayments/paybill?initiator_id=${process.env.EKO_INITIATOR_ID}`,
    payload,
    { headers },
  );

  return res.data;
};

// 6. Get Client IP
const getClientIP = (req) => {
  let ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress;

  if (ip === "::1") ip = "127.0.0.1";
  else if (ip?.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");

  return ip;
};
