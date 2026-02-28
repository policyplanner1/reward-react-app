const cron = require("node-cron");
const xpressService = require("../xpressbees_service");
const db = require("../../../config/database");

// =====================
// STATUS MAPPING
// =====================
function mapXpressStatus(status) {
  if (!status || typeof status !== "string") return null;

  const s = status.toLowerCase();

  if (s.includes("picked")) return "picked_up";
  if (s.includes("in transit")) return "in_transit";
  if (s.includes("out for delivery")) return "out_for_delivery";
  if (s.includes("delivered")) return "delivered";

  //  NDR cases
  if (
    s.includes("ndr") ||
    s.includes("failed") ||
    s.includes("not available") ||
    s.includes("address issue") ||
    s.includes("delivery attempted")
  ) {
    return "ndr";
  }

  // RTO cases
  if (
    s.includes("rto") ||
    s.includes("returned") ||
    s.includes("return to origin")
  ) {
    return "rto";
  }

  return null;
}

// =====================
// SYNC ORDER STATUS
// =====================
async function syncOrderStatus(orderId) {
  const [shipments] = await db.query(
    `SELECT shipping_status
     FROM order_shipments
     WHERE order_id = ?`,
    [orderId],
  );

  if (!shipments.length) return;

  const statuses = shipments.map((s) => s.shipping_status);

  if (statuses.every((s) => s === "delivered")) {
    await db.query(
      `UPDATE eorders
       SET status = 'delivered'
       WHERE order_id = ?
         AND status != 'delivered'`,
      [orderId],
    );
  }

  if (statuses.every((s) => s === "rto")) {
    await db.query(
      `UPDATE eorders
       SET status = 'rto'
       WHERE order_id = ?`,
      [orderId],
    );
    return;
  }

  if (statuses.includes("ndr")) {
    await db.query(
      `UPDATE eorders
       SET status = 'delivery_failed'
       WHERE order_id = ?`,
      [orderId],
    );
    return;
  }
}

// =====================
// TRACKING UPDATE
// =====================
async function updateShipmentTracking(shipment) {
  try {
    const response = await xpressService.trackShipment(shipment.awb_number);

    if (!response || !response.status) {
      return;
    }

    if (!response.data || !response.data.current_status) {
      return;
    }

    const newStatus = mapXpressStatus(response.data.current_status);

    if (!newStatus) return;

    if (newStatus === shipment.shipping_status) return;

    await db.query(
      `UPDATE order_shipments
       SET shipping_status = ?
       WHERE id = ?`,
      [newStatus, shipment.id],
    );

    if (newStatus === "ndr") {
      const [existing] = await db.query(
        `SELECT id FROM shipment_ndr_logs
     WHERE shipment_id = ?
       AND resolved = 0
     LIMIT 1`,
        [shipment.id],
      );

      if (!existing.length) {
        await db.query(
          `INSERT INTO shipment_ndr_logs
       (shipment_id, reason)
       VALUES (?, ?)`,
          [shipment.id, response.data.current_status],
        );
      }
    }

    await syncOrderStatus(shipment.order_id);
  } catch (err) {
    console.error("Tracking update failed:", err);
  }
}

// =====================
// CRON JOB (Every 10 min)
// =====================
cron.schedule("*/10 * * * *", async () => {
  try {
    console.log("cron running");
    const [shipments] = await db.query(
      `SELECT id, order_id, awb_number, shipping_status
       FROM order_shipments
       WHERE awb_number IS NOT NULL
         AND shipping_status NOT IN ('delivered','cancelled','rto')`,
    );

    await Promise.all(
      shipments.map((shipment) => updateShipmentTracking(shipment)),
    );
  } catch (err) {
    console.error("Tracking cron error:", err);
  }
});
