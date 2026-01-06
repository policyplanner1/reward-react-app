const db = require("../../config/database");
const fs = require("fs");
const path = require("path");

class orderModel {
  async getOrderHistory({ userId, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const [rows] = await db.execute(
      `
      SELECT
        o.order_id,
        o.total_amount,
        o.status,
        o.created_at,

        COUNT(oi.order_item_id) AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.user_id = ?
      GROUP BY o.order_id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [userId, limit, offset]
    );

    const [[{ total }]] = await db.execute(
      `
      SELECT COUNT(*) AS total
      FROM orders
      WHERE user_id = ?
      `,
      [userId]
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
      FROM orders
      WHERE order_id = ? AND user_id = ?
      `,
      [orderId, userId]
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
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id
      WHERE oi.order_id = ?
      GROUP BY oi.order_item_id
      `,
      [orderId]
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
}

module.exports = new orderModel();
