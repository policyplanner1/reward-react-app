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
  if (s.includes("rto")) return "rto";
  if (s.includes("ndr")) return "ndr";

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
