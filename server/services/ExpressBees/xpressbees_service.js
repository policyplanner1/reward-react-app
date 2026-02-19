const axios = require("axios");

let cachedToken = null;
let tokenExpiry = null;

async function getXpressToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await axios.post(
    "https://shipment.xpressbees.com/api/users/login",
    {
      email: process.env.XPRESS_EMAIL,
      password: process.env.XPRESS_PASSWORD,
    },
  );

  if (!response.data.status) {
    throw new Error(response.data.message);
  }

  const token = response.data.data;

  cachedToken = token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;

  return token;
}

async function bookShipment(payload) {
  const token = await getXpressToken();

  const response = await axios.post(
    "https://shipment.xpressbees.com/api/shipments2",
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
}

module.exports = {
  bookShipment,
};
