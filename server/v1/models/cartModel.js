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
      JOIN eproducts p
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

  // Add to cart
  async addToCart({ userId, productId, variantId, quantity }) {
    const [[variant]] = await db.execute(
      `
      SELECT variant_id, stock
      FROM product_variants
      WHERE variant_id = ? AND product_id = ?
      `,
      [variantId, productId]
    );

    if (!variant) {
      throw new Error("INVALID_VARIANT");
    }

    if (variant.stock < quantity) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    // 2 Insert or update cart item
    await db.execute(
      `
      INSERT INTO cart_items (user_id, product_id, variant_id, quantity)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        quantity = quantity + VALUES(quantity)
      `,
      [userId, productId, variantId, quantity]
    );

    return true;
  }

  // check quantity
  async checkVariantStock(variantId) {
    const [[row]] = await db.execute(
      `
      SELECT 
        variant_id,
        stock
      FROM product_variants
      WHERE variant_id = ?
      `,
      [variantId]
    );

    if (!row) {
      throw new Error("VARIANT_NOT_FOUND");
    }

    return {
      variant_id: row.variant_id,
      stock: row.stock,
      inStock: row.stock > 0,
    };
  }

  // update cart item
  async updateCartItem({ userId, cartItemId, quantity }) {
    // 1 Fetch cart item + variant stock
    const [[row]] = await db.execute(
      `
      SELECT 
        ci.cart_item_id,
        ci.variant_id,
        v.stock
      FROM cart_items ci
      JOIN product_variants v
        ON ci.variant_id = v.variant_id
      WHERE ci.cart_item_id = ? AND ci.user_id = ?
      `,
      [cartItemId, userId]
    );

    if (!row) {
      throw new Error("CART_ITEM_NOT_FOUND");
    }

    // 2 Quantity = 0 → remove item
    if (quantity === 0) {
      await db.execute(`DELETE FROM cart_items WHERE cart_item_id = ?`, [
        cartItemId,
      ]);
      return { removed: true };
    }

    // 3 Stock validation
    if (quantity > row.stock) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    // 4 Update quantity
    await db.execute(
      `
      UPDATE cart_items
      SET quantity = ?
      WHERE cart_item_id = ?
      `,
      [quantity, cartItemId]
    );

    return { updated: true };
  }

  // delete cart item
  async deleteCartItem({ userId, cartItemId }) {
    const [result] = await db.execute(
      `
      DELETE FROM cart_items
      WHERE cart_item_id = ? AND user_id = ?
      `,
      [cartItemId, userId]
    );

    if (result.affectedRows === 0) {
      throw new Error("CART_ITEM_NOT_FOUND");
    }

    return true;
  }

  // remove all car items
  async clearCart(userId) {
    await db.execute(
      `
      DELETE FROM cart_items
      WHERE user_id = ?
      `,
      [userId]
    );

    return true;
  }
}

module.exports = new cartModel();
