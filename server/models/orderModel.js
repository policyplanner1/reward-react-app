const db = require("../config/database");

class OrderModel {
  async getAdminOrderHistory({
    orderId = null,
    orderRef = null,
    status = null,
    userId = null,
    companyId = null,
    fromDate = null,
    toDate = null,
    page = 1,
    limit = 10,
  }) {
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    if (orderId) {
      conditions.push("o.order_id = ?");
      params.push(orderId);
    }

    if (orderRef) {
      conditions.push("o.order_ref = ?");
      params.push(orderRef);
    }

    if (status) {
      conditions.push("o.status = ?");
      params.push(status);
    }

    if (userId) {
      conditions.push("o.user_id = ?");
      params.push(userId);
    }

    if (companyId) {
      conditions.push("o.company_id = ?");
      params.push(companyId);
    }

    if (fromDate) {
      conditions.push("DATE(o.created_at) >= ?");
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push("DATE(o.created_at) <= ?");
      params.push(toDate);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [rows] = await db.execute(
      `
    SELECT
      o.order_id,
      o.order_ref,
      o.user_id,
      o.company_id,
      o.total_amount,
      o.status,
      o.created_at,

      COUNT(oi.order_item_id) AS item_count,

      (
        SELECT p.product_name
        FROM eorder_items oii
        JOIN eproducts p ON oii.product_id = p.product_id
        WHERE oii.order_id = o.order_id
        LIMIT 1
      ) AS product_name,

      (
        SELECT p.brand_name
        FROM eorder_items oii
        JOIN eproducts p ON oii.product_id = p.product_id
        WHERE oii.order_id = o.order_id
        LIMIT 1
      ) AS brand_name,

      (
        SELECT pi.image_url
        FROM eorder_items oii
        JOIN product_images pi
          ON oii.product_id = pi.product_id
        WHERE oii.order_id = o.order_id
        ORDER BY pi.sort_order ASC
        LIMIT 1
      ) AS image

    FROM eorders o
    LEFT JOIN eorder_items oi 
      ON o.order_id = oi.order_id

    ${whereClause}

    GROUP BY o.order_id
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
    `,
      [...params, limit, offset],
    );

    const [[{ total }]] = await db.execute(
      `
    SELECT COUNT(*) AS total
    FROM eorders o
    ${whereClause}
    `,
      params,
    );

    return {
      orders: rows,
      total,
    };
  }
}

module.exports = new OrderModel();
