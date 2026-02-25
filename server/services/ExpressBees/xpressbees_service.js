const axios = require("axios");

let cachedToken = null;
let tokenExpiry = null;

const API_BASE = "https://shipment.xpressbees.com/api";

// ==========================
// TOKEN HANDLER
// ==========================
async function getXpressToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await axios.post(
      `${API_BASE}/users/login`,
      {
        email: process.env.XPRESS_EMAIL,
        password: process.env.XPRESS_PASSWORD,
      },
      { timeout: 10000 }
    );

    if (!response.data.status) {
      throw new Error(response.data.message);
    }

    cachedToken = response.data.data;

    // 55 min validity
    tokenExpiry = Date.now() + 55 * 60 * 1000;

    return cachedToken;

  } catch (error) {
    console.error("XpressBees Login Error:", error.response?.data || error.message);
    throw new Error("Failed to authenticate with XpressBees");
  }
}

// ==========================
// GENERIC REQUEST WRAPPER
// ==========================
async function makeRequest(endpoint, payload) {
  try {
    const token = await getXpressToken();

    const response = await axios.post(
      `${API_BASE}${endpoint}`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    return response.data;

  } catch (error) {

    // Auto refresh token if 401
    if (error.response?.status === 401) {
      cachedToken = null;
      tokenExpiry = null;

      const token = await getXpressToken();

      const retry = await axios.post(
        `${API_BASE}${endpoint}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      return retry.data;
    }

    console.error("XpressBees API Error:", error.response?.data || error.message);
    throw new Error("XpressBees request failed");
  }
}

// ==========================
// BOOK SHIPMENT
// ==========================
async function bookShipment(payload) {
  return await makeRequest("/shipments2", payload);
}

// ==========================
// CHECK SERVICEABILITY
// ==========================
async function checkServiceability(payload) {
  return await makeRequest("/courier/serviceability", payload);
}

module.exports = {
  bookShipment,
  checkServiceability,
};