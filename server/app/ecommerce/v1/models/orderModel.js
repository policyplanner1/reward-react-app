const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class orderModel {
  async getOrderHistory({
    userId,
    orderId = null,
    status = null,
    fromDate = null,
    toDate = null,
    page = 1,
    limit = 10,
  }) {
    const offset = (page - 1) * limit;

    const conditions = ["o.user_id = ?"];
    const params = [userId];

    if (orderId) {
      conditions.push("o.order_id = ?");
      params.push(orderId);
    }

    if (status) {
      conditions.push("o.status = ?");
      params.push(status);
    }

    if (fromDate) {
      conditions.push("DATE(o.created_at) >= ?");
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push("DATE(o.created_at) <= ?");
      params.push(toDate);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const [rows] = await db.execute(
      `
    SELECT
      o.order_id,
      o.total_amount,
      o.status,
      o.created_at,

      COUNT(oi.order_item_id) AS item_count,

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

  //   Get order details
  async getOrderDetails({ userId, orderId }) {
    // 1 Fetch order
    const [[order]] = await db.execute(
      `
      SELECT
        order_id,
        total_amount,
        status,
        created_at
      FROM eorders
      WHERE order_id = ? AND user_id = ?
      `,
      [orderId, userId],
    );

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    // 2 Fetch order items
    const [items] = await db.execute(
      `
      SELECT
        oi.order_item_id,
        oi.product_id,
        oi.variant_id,
        oi.quantity,
        oi.price,

        p.product_name,

        GROUP_CONCAT(
          DISTINCT pi.image_url
          ORDER BY pi.sort_order ASC
        ) AS images
      FROM eorder_items oi
      JOIN eproducts p ON oi.product_id = p.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id
      WHERE oi.order_id = ?
      GROUP BY oi.order_item_id
      `,
      [orderId],
    );

    const processedItems = items.map((i) => ({
      order_item_id: i.order_item_id,
      product_id: i.product_id,
      variant_id: i.variant_id,
      title: i.product_name,
      image: i.images ? i.images.split(",")[0] : null,
      quantity: i.quantity,
      price: i.price,
      item_total: i.quantity * i.price,
    }));

    return {
      order,
      items: processedItems,
    };
  }

  // Get cancellation Details
  async getCancellationDetails({ userId, orderId }) {
    // 1 Order validation + address + user
    const [[order]] = await db.execute(
      `
    SELECT 
      o.order_id,
      o.address_id,
      o.status, 
      o.total_amount,

      ca.address_type,
      ca.address1,
      ca.address2,
      ca.city,
      ca.zipcode,
      ca.landmark,

      cu.name AS customer_name,

      s.state_name,
      c.country_name

    FROM eorders o
    JOIN customer_addresses ca 
      ON o.address_id = ca.address_id
    JOIN customer cu
      ON o.user_id = cu.user_id
    LEFT JOIN states s
      ON ca.state_id = s.state_id
    LEFT JOIN countries c
      ON ca.country_id = c.country_id

    WHERE o.order_id = ?
      AND o.user_id = ?
    `,
      [orderId, userId],
    );

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    // 2 Timeline
    const [timeline] = await db.execute(
      `
    SELECT event, event_time
    FROM order_cancellation_timeline
    WHERE order_id = ?
    ORDER BY event_time ASC
    `,
      [orderId],
    );

    // 3 Refunds
    const [refunds] = await db.execute(
      `
    SELECT refund_amount, refund_method, status
    FROM order_refunds
    WHERE order_id = ?
    `,
      [orderId],
    );

    const totalRefund = refunds.reduce(
      (sum, r) => sum + Number(r.refund_amount),
      0,
    );

    return {
      orderId: order.order_id,
      status: order.status,

      customer: {
        name: order.customer_name,
      },

      address: {
        type: order.address_type,
        line1: order.address1,
        line2: order.address2,
        city: order.city,
        state: order.state_name,
        country: order.country_name,
        zipcode: order.zipcode,
        landmark: order.landmark,
      },

      timeline: timeline.map((t) => ({
        label: t.event.replace(/_/g, " "),
        date: t.event_time,
      })),

      refunds: refunds.map((r) => ({
        amount: r.refund_amount,
        method: r.refund_method,
        status: r.status,
      })),

      totalRefund,
    };
  }
}

module.exports = new orderModel();
