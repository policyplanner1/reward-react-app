const db = require("../../config/database");
const fs = require("fs");
const path = require("path");

class cartModel {
  // Get all cart item
  async getUserCart(userId) {
    const query = `
      SELECT 
        ci.cart_item_id,
        ci.quantity,

        p.product_id,
        p.product_name,

        v.variant_id,
        v.size,
        v.color,
        v.mrp,
        v.sale_price,

        (ci.quantity * v.sale_price) AS item_total,

        GROUP_CONCAT(
          DISTINCT CONCAT(
            pi.image_id, '::',
            pi.image_url, '::',
            pi.sort_order
          )
          ORDER BY pi.sort_order ASC
        ) AS images

      FROM cart_items ci
      JOIN products p
        ON ci.product_id = p.product_id
      JOIN product_variants v
        ON ci.variant_id = v.variant_id
      LEFT JOIN product_images pi
        ON p.product_id = pi.product_id

      WHERE ci.user_id = ?
      GROUP BY ci.cart_item_id
      ORDER BY ci.created_at DESC
    `;

    const [rows] = await db.execute(query, [userId]);

    let cartTotal = 0;

    const items = rows.map((row) => {
      let images = [];

      if (row.images) {
        images = row.images.split(",").map((img) => {
          const [, image_url] = img.split("::");
          return { image_url };
        });
      }

      cartTotal += Number(row.item_total);

      return {
        cart_item_id: row.cart_item_id,
        product_id: row.product_id,
        variant_id: row.variant_id,

        title: row.product_name,
        image: images.length ? images[0].image_url : null,

        size: row.size,
        color: row.color,

        mrp: row.mrp,
        sale_price: row.sale_price,
        quantity: row.quantity,
        item_total: row.item_total,
      };
    });

    return {
      items,
      cartTotal,
    };
  }
}

module.exports = new cartModel();
