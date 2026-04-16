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
      so.parent_order_id,
      so.bundle_id,

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

    const ordersMap = {};

    rows.forEach((row) => {
      const parentId = row.parent_order_id;

      if (!ordersMap[parentId]) {
        ordersMap[parentId] = {
          parent_order_id: parentId,
          created_at: row.created_at,
          status: row.status,
          total_amount: 0,
          items: [],
          bundles: {},
        };
      }

      const item = {
        id: row.id,
        order_ref: row.order_ref,
        service_name: row.service_name,
        variant_name: row.variant_name,
        image_url: row.image_url ? getPublicUrl(row.image_url) : null,
        price: row.price,
        bundle_id: row.bundle_id,
      };

      //  bundle grouping
      if (row.bundle_id) {
        if (!ordersMap[parentId].bundles[row.bundle_id]) {
          ordersMap[parentId].bundles[row.bundle_id] = {
            bundle_id: row.bundle_id,
            items: [],
            bundle_total: 0,
          };
        }

        ordersMap[parentId].bundles[row.bundle_id].items.push(item);
        ordersMap[parentId].bundles[row.bundle_id].bundle_total += row.price;
      } else {
        ordersMap[parentId].items.push(item);
      }

      ordersMap[parentId].total_amount += row.price;
    });

    // convert bundles object → array
    return Object.values(ordersMap).map((order) => ({
      ...order,
      bundles: Object.values(order.bundles),
    }));
  }

  // order detail by Id
  async getOrderById(orderId, userId) {
    // Get parent_order_id for the given order
    const [[order]] = await db.execute(
      `SELECT parent_order_id 
     FROM service_orders 
     WHERE id = ? AND user_id = ?`,
      [orderId, userId],
    );

    if (!order) return null;

    const parentId = order.parent_order_id;

    // fetch all items of this order
    const [rows] = await db.execute(
      `
    SELECT 
      so.id,
      so.order_ref,
      so.price,
      so.status,
      so.bundle_id,

      s.name AS service_name,
      sv.variant_name,
      sv.title,
      sv.image_url

    FROM service_orders so
    JOIN services s ON s.id = so.service_id
    LEFT JOIN service_variants sv ON sv.id = so.variant_id

    WHERE so.parent_order_id = ? AND so.user_id = ?
    `,
      [parentId, userId],
    );

    if (!rows.length) return null;

    const response = {
      parent_order_id: parentId,
      status: rows[0].status,
      items: [],
      bundles: {},
      total_amount: 0,
    };

    rows.forEach((row) => {
      const item = {
        id: row.id,
        order_ref: row.order_ref,
        service_name: row.service_name,
        variant_name: row.variant_name,
        title: row.title,
        image_url: row.image_url ? getPublicUrl(row.image_url) : null,
        price: row.price,
      };

      if (row.bundle_id) {
        if (!response.bundles[row.bundle_id]) {
          response.bundles[row.bundle_id] = {
            bundle_id: row.bundle_id,
            items: [],
            bundle_total: 0,
          };
        }

        response.bundles[row.bundle_id].items.push(item);
        response.bundles[row.bundle_id].bundle_total += row.price;
      } else {
        response.items.push(item);
      }

      response.total_amount += row.price;
    });

    response.bundles = Object.values(response.bundles);

    return response;
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
