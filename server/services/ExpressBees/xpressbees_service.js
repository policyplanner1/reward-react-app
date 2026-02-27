const axios = require("axios");

let cachedToken = null;
let tokenExpiry = null;

// ==========================
// TOKEN HANDLER
// ==========================
async function getXpressToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
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

    cachedToken = response.data.data;

    tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;

    return cachedToken;
  } catch (error) {
    console.error(
      "XpressBees Login Error:",
      error.response?.data || error.message,
    );
    throw new Error("Failed to authenticate with XpressBees");
  }
}
// ==========================
// BOOK SHIPMENT
// ==========================
async function bookShipment(payload) {
  try {
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
  } catch (error) {
    console.error(
      "XpressBees Booking Error:",
      error.response?.data || error.message,
    );
    throw new Error("Shipment booking failed");
  }
}

// ==========================
// CHECK SERVICEABILITY
// ==========================
async function checkServiceability(payload) {
  try {
    const token = await getXpressToken();

    const response = await axios.post(
      "https://shipment.xpressbees.com/api/courier/serviceability",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "XpressBees Serviceability Error:",
      error.response?.data || error.message,
    );
    throw new Error("Serviceability check failed");
  }
}

// ==========================
// TRACK SHIPMENT
// ==========================
async function trackShipment(payload) {
  try {
    const token = await getXpressToken();

    const response = await axios.post(
      "https://shipment.xpressbees.com/api/shipments/track",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "XpressBees Tracking Error:",
      error.response?.data || error.message,
    );

    return {
      status: false,
      message: "Tracking failed",
    };
  }
}

module.exports = {
  bookShipment,
  checkServiceability,
  trackShipment,
};
