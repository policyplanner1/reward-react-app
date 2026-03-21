const axios = require("axios");
const db = require("../../config/database");
const AddressModel = require("../../app/ecommerce/v1/models/addressModel");

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
// Resolve NDR
// ==========================
async function resolveNDR({ shipmentId, action, new_address_id, notes }) {
  const [rows] = await db.query(
    `
    SELECT * FROM order_shipments WHERE id = ?
  `,
    [shipmentId],
  );

  const shipment = rows[0];

  if (!shipment) throw new Error("Shipment not found");

  if (!shipment.is_ndr_active) {
    throw new Error("No active NDR for this shipment");
  }

  // ==========================
  // ACTION HANDLING
  // ==========================

  // 1. RETRY DELIVERY
  if (action === "retry") {
    // await xpressService.reattemptDelivery(shipment.awb_number);
  }

  // 2. ADDRESS UPDATE + RETRY
  if (action === "address_update") {
    if (!new_address_id) {
      throw new Error("Address required");
    }

    await db.query(
      `
      UPDATE shipment_ndr_logs
      SET updated_address_id = ?
      WHERE shipment_id = ?
      AND resolved = 0
    `,
      [new_address_id, shipmentId],
    );
  }

  // 3. CANCEL SHIPMENT
  if (action === "cancel") {
    if (shipment.awb_number) {
      try {
        await xpressService.cancelShipmentExpressBees(shipment.awb_number);
      } catch (err) {
        console.error("Courier cancel failed", err);
      }
    }

    await db.query(
      `
      UPDATE order_shipments
      SET shipping_status = 'cancelled'
      WHERE id = ?
    `,
      [shipmentId],
    );
  }

  // 4. MARK AS RTO
  if (action === "rto") {
    await db.query(
      `
      UPDATE order_shipments
      SET shipping_status = 'rto'
      WHERE id = ?
    `,
      [shipmentId],
    );
  }

  // ==========================
  // CLEAR NDR FLAG
  // ==========================
  await db.query(
    `
    UPDATE order_shipments
    SET is_ndr_active = 0
    WHERE id = ?
  `,
    [shipmentId],
  );

  // ==========================
  // OPTIONAL: RESET STATUS FOR RETRY
  // ==========================
  if (action === "retry" || action === "address_update") {
    await db.query(
      `
    UPDATE order_shipments
    SET shipping_status = 'in_transit'
    WHERE id = ?
  `,
      [shipmentId],
    );
  }

  // ==========================
  // UPDATE NDR LOG
  // ==========================
  await db.query(
    `
    UPDATE shipment_ndr_logs
    SET resolved = 1,
        resolution_type = ?,
        resolution_notes = ?,
        resolved_at = NOW()
    WHERE shipment_id = ?
    AND resolved = 0
  `,
    [action, notes || null, shipmentId],
  );

  // ==========================
  // OPTIONAL: EVENT LOG
  // ==========================
  await db.query(
    `
    INSERT INTO shipment_events (shipment_id, status, description)
    VALUES (?, 'ndr_resolved', ?)
  `,
    [shipmentId, action],
  );
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
  resolveNDR,
};
