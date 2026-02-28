const axios = require("axios");
const db = require("../../config/database");

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
async function trackShipment(awbNumber) {
  try {
    const token = await getXpressToken();

    const response = await axios.get(
      `https://shipment.xpressbees.com/api/shipments2/track/${awbNumber}`,
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

// ==========================
// CANCEL SHIPMENT
// ==========================
async function cancelShipmentExpressBees(awb) {
  try {
    const token = await getXpressToken();

    const response = await axios.post(
      "https://shipment.xpressbees.com/api/shipments2/cancel",
      { awb },
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
      "XpressBees Cancel Error:",
      error.response?.data || error.message,
    );

    return {
      status: false,
      error: error.response?.data || error.message,
    };
  }
}

async function cancelShipment(shipmentId) {
  // 1 Fetch shipment
  const [rows] = await db.query(
    `SELECT * FROM order_shipments WHERE id = ? LIMIT 1`,
    [shipmentId],
  );

  if (!rows.length) {
    throw new Error("Shipment not found");
  }

  const shipment = rows[0];

  // 2 Check cancellable statuses
  if (!["pending", "booked", "picked_up"].includes(shipment.shipping_status)) {
    throw new Error("Cancellation not allowed at current shipment stage");
  }

  // 3 Call courier cancel
  const cancelResponse = await cancelShipmentExpressBees(shipment.awb_number);

  if (!cancelResponse.status) {
    throw new Error("Courier cancel failed");
  }

  // 4 Update DB
  await db.query(
    `UPDATE order_shipments
     SET shipping_status = 'cancelled'
     WHERE id = ?`,
    [shipmentId],
  );

  return shipment.order_id;
}

module.exports = {
  bookShipment,
  checkServiceability,
  trackShipment,
  cancelShipmentExpressBees,
  cancelShipment,
};
