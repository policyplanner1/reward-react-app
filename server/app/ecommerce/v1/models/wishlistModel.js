const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class wishListModel {
  // add to wishlist
  async add(userId, productId, variantId) {
    const [result] = await db.execute(
      `INSERT IGNORE INTO customer_wishlist 
       (user_id, product_id, variant_id)
       VALUES (?, ?, ?)`,
      [userId, productId, variantId]
    );

    return result.affectedRows;
  }

  // remove from wishlist
  async remove(userId, productId, variantId) {
    const [result] = await db.execute(
      `DELETE FROM customer_wishlist
       WHERE user_id = ? AND product_id = ? AND variant_id = ?`,
      [userId, productId, variantId]
    );

    return result.affectedRows;
  }

  // check if item exist in wishlist
  async exists(userId, productId, variantId) {
    const [rows] = await db.execute(
      `SELECT wishlist_id
       FROM customer_wishlist
       WHERE user_id = ? AND product_id = ? AND variant_id = ?`,
      [userId, productId, variantId]
    );

    return rows.length > 0;
  }

  // fetch all user wishlist
  async getByUser(userId) {
    const [rows] = await db.execute(
      `
      SELECT 
        w.wishlist_id,
        w.product_id,
        w.variant_id,
        p.product_name,
        v.sku,
        v.sales_price as price,
        v.mrp,
        v.stock,
        GROUP_CONCAT(
          CONCAT(o.option_name, ': ', ov.value)
          SEPARATOR ', '
        ) AS variant_attributes

      FROM customer_wishlist w
      JOIN eproducts p 
        ON p.product_id = w.product_id
      JOIN product_variants v 
        ON v.variant_id = w.variant_id

      LEFT JOIN product_variant_attributes va
        ON va.variant_id = v.variant_id
      LEFT JOIN product_variant_options o
        ON o.option_id = va.option_id
      LEFT JOIN product_variant_option_values ov
        ON ov.value_id = va.value_id

      WHERE w.user_id = ?
      GROUP BY w.wishlist_id
      ORDER BY w.created_at DESC
      `,
      [userId]
    );

    return rows;
  }

  // wishlist Badging
  async getWishlistCount(userId) {
    const [[row]] = await db.execute(
      `
    SELECT COUNT(*) AS total
    FROM customer_wishlist
    WHERE user_id = ?
    `,
      [userId]
    );

    return row.total;
  }
}

module.exports = new wishListModel();
