const db = require("../../../../config/database");

// helper function
const CDN_BASE_URL = "https://cdn.rewardplanners.com";
function getPublicUrl(path) {
  if (!path) return null;
  return `${CDN_BASE_URL}/${path}`;
}

class ServiceOrderModel {
  // create order
  async create(data) {
    const [result] = await db.execute(
      `INSERT INTO service_orders
    (user_id, service_id, variant_id, enquiry_id, price, parent_order_id, bundle_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.service_id,
        data.variant_id,
        data.enquiry_id,
        data.price,
        data.parent_order_id,
        data.bundle_id || null,
        data.status,
      ],
    );

    const insertId = result.insertId;
    const ref = `SP-ORD-${1000 + insertId}`;

    await db.execute(`UPDATE service_orders SET order_ref = ? WHERE id = ?`, [
      ref,
      insertId,
    ]);

    return {
      id: insertId,
      order_ref: ref,
    };
  }

  // get my orders
  async getUserOrders(userId, status = null) {
    let sql = `
    SELECT 
      so.id,
      so.order_ref,
      so.price,
      so.status,
      so.created_at,

      s.name AS service_name,
      sv.variant_name,
      sv.image_url

    FROM service_orders so
    JOIN services s ON s.id = so.service_id
    LEFT JOIN service_variants sv ON sv.id = so.variant_id

    WHERE so.user_id = ?
  `;

    const params = [userId];

    if (status && status !== "all") {
      sql += ` AND so.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY so.created_at DESC`;

    const [rows] = await db.execute(sql, params);
    return rows.map((row) => ({
      ...row,
      image_url: row.image_url ? getPublicUrl(row.image_url) : null,
    }));
  }

  // order detail by Id
  async getOrderById(orderId, userId) {
    const [rows] = await db.execute(
      `
    SELECT 
      so.*,
      s.name AS service_name,
      sv.variant_name,
      sv.title,
      sv.image_url

    FROM service_orders so
    JOIN services s ON s.id = so.service_id
    LEFT JOIN service_variants sv ON sv.id = so.variant_id

    WHERE so.id = ? AND so.user_id = ?
    `,
      [orderId, userId],
    );

    const order = rows[0];

    if (!order) return null;

    return {
      ...order,
      image_url: order.image_url ? getPublicUrl(order.image_url) : null,
    };
  }

  // update status
  async updateStatus(orderId, status) {
    const [result] = await db.execute(
      `UPDATE service_orders 
     SET status = ? 
     WHERE id = ?`,
      [status, orderId],
    );

    return result.affectedRows;
  }
}

module.exports = new ServiceOrderModel();
