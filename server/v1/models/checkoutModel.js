const db = require("../../config/database");
const fs = require("fs");
const path = require("path");

class CheckoutModel {
  async checkoutCart(userId, companyId = null) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // 1 Fetch cart items
      const [cartItems] = await conn.execute(
        `
        SELECT 
          ci.product_id,
          ci.variant_id,
          ci.quantity,
          v.sale_price,
          v.stock
        FROM cart_items ci
        JOIN product_variants v ON ci.variant_id = v.variant_id
        WHERE ci.user_id = ?
        `,
        [userId]
      );

      if (cartItems.length === 0) {
        throw new Error("CART_EMPTY");
      }

      // 2 Validate stock
      for (const item of cartItems) {
        if (item.quantity > item.stock) {
          throw new Error("OUT_OF_STOCK");
        }
      }

      // 3 Calculate total
      const totalAmount = cartItems.reduce(
        (sum, i) => sum + i.quantity * i.sale_price,
        0
      );

      // 4 Create order
      const [orderRes] = await conn.execute(
        `
        INSERT INTO orders (user_id, company_id, total_amount)
        VALUES (?, ?, ?)
        `,
        [userId, companyId, totalAmount]
      );

      const orderId = orderRes.insertId;

      // 5 Create order items
      for (const item of cartItems) {
        await conn.execute(
          `
          INSERT INTO order_items
            (order_id, product_id, variant_id, quantity, price)
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            orderId,
            item.product_id,
            item.variant_id,
            item.quantity,
            item.sale_price,
          ]
        );

        // 6 Deduct stock
        await conn.execute(
          `
          UPDATE product_variants
          SET stock = stock - ?
          WHERE variant_id = ?
          `,
          [item.quantity, item.variant_id]
        );
      }

      // 7 Clear cart
      await conn.execute(`DELETE FROM cart_items WHERE user_id = ?`, [userId]);

      await conn.commit();
      return orderId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async buyNow({ userId, productId, variantId, quantity, companyId = null }) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      // 1 Fetch variant
      const [[variant]] = await conn.execute(
        `
      SELECT sale_price, stock
      FROM product_variants
      WHERE variant_id = ? AND product_id = ?
      `,
        [variantId, productId]
      );

      if (!variant) {
        throw new Error("INVALID_VARIANT");
      }

      if (quantity > variant.stock) {
        throw new Error("OUT_OF_STOCK");
      }

      const totalAmount = quantity * variant.sale_price;

      // 2 Create order
      const [orderRes] = await conn.execute(
        `
      INSERT INTO orders (user_id, company_id, total_amount)
      VALUES (?, ?, ?)
      `,
        [userId, companyId, totalAmount]
      );

      const orderId = orderRes.insertId;

      // 3 Create order item
      await conn.execute(
        `
      INSERT INTO order_items
        (order_id, product_id, variant_id, quantity, price)
      VALUES (?, ?, ?, ?, ?)
      `,
        [orderId, productId, variantId, quantity, variant.sale_price]
      );

      // 4 Deduct stock
      await conn.execute(
        `
      UPDATE product_variants
      SET stock = stock - ?
      WHERE variant_id = ?
      `,
        [quantity, variantId]
      );

      await conn.commit();
      return orderId;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  // GET CHECKOUT CART DETAILS
  async getCheckoutCart(userId) {
    const [rows] = await db.execute(
      `
      SELECT 
        ci.cart_item_id,
        ci.quantity,

        p.product_id,
        p.product_name,

        v.variant_id,
        v.sale_price,
        v.stock,

        (ci.quantity * v.sale_price) AS item_total,

        GROUP_CONCAT(
          DISTINCT pi.image_url
          ORDER BY pi.sort_order ASC
        ) AS images

      FROM cart_items ci
      JOIN products p ON ci.product_id = p.product_id
      JOIN product_variants v ON ci.variant_id = v.variant_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id

      WHERE ci.user_id = ?
      GROUP BY ci.cart_item_id
      `,
      [userId]
    );

    if (rows.length === 0) {
      throw new Error("CART_EMPTY");
    }

    let totalAmount = 0;

    const items = rows.map((row) => {
      if (row.quantity > row.stock) {
        throw new Error("OUT_OF_STOCK");
      }

      totalAmount += Number(row.item_total);

      return {
        cart_item_id: row.cart_item_id,
        product_id: row.product_id,
        variant_id: row.variant_id,
        title: row.product_name,
        image: row.images ? row.images.split(",")[0] : null,
        price: row.sale_price,
        quantity: row.quantity,
        item_total: row.item_total,
        stock: row.stock,
      };
    });

    return {
      items,
      totalAmount,
    };
  }

  // Get buy now checkout Details
  async getBuyNowCheckout({ productId, variantId, quantity }) {
    const [[row]] = await db.execute(
      `
    SELECT 
      p.product_id,
      p.product_name,
      v.variant_id,
      v.sale_price,
      v.stock,
      GROUP_CONCAT(pi.image_url ORDER BY pi.sort_order ASC) AS images
    FROM product_variants v
    JOIN products p ON v.product_id = p.product_id
    LEFT JOIN product_images pi ON p.product_id = pi.product_id
    WHERE v.variant_id = ? AND p.product_id = ?
    GROUP BY v.variant_id
    `,
      [variantId, productId]
    );

    if (!row) {
      throw new Error("INVALID_VARIANT");
    }

    if (quantity > row.stock) {
      throw new Error("OUT_OF_STOCK");
    }

    return {
      item: {
        product_id: row.product_id,
        variant_id: row.variant_id,
        title: row.product_name,
        image: row.images ? row.images.split(",")[0] : null,
        price: row.sale_price,
        quantity,
        item_total: quantity * row.sale_price,
        stock: row.stock,
      },
      totalAmount: quantity * row.sale_price,
    };
  }
}
module.exports = new CheckoutModel();
