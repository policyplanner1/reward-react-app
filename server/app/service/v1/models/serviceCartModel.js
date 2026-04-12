const db = require("../../../../config/database");

// helper function
const CDN_BASE_URL = "https://cdn.rewardplanners.com";
function getPublicUrl(path) {
  if (!path) return null;
  return `${CDN_BASE_URL}/${path}`;
}

class ServiceCartModel {
  // get or create cart item
  async getOrCreateCart(userId) {
    const [rows] = await db.execute(
      `SELECT * FROM service_cart 
     WHERE user_id = ? AND status = 'active'
     ORDER BY id DESC 
     LIMIT 1`,
      [userId],
    );

    if (rows.length) return rows[0];

    const [result] = await db.execute(
      `INSERT INTO service_cart (user_id, status) VALUES (?, 'active')`,
      [userId],
    );

    return { id: result.insertId, user_id: userId };
  }

  // add item to cart
  async addItem(cartId, data) {
    // check if same variant already exists
    const [existing] = await db.execute(
      `SELECT * FROM service_cart_items 
       WHERE cart_id = ? AND variant_id = ?`,
      [cartId, data.variant_id],
    );

    if (existing.length) {
      // increase quantity
      await db.execute(
        `UPDATE service_cart_items 
         SET quantity = quantity + 1 
         WHERE id = ?`,
        [existing[0].id],
      );
      return;
    }

    await db.execute(
      `INSERT INTO service_cart_items
      (cart_id, service_id, variant_id, price)
      VALUES (?, ?, ?, ?)`,
      [cartId, data.service_id, data.variant_id, data.price],
    );
  }

  // get cart items
  async getCart(cartId) {
    const [rows] = await db.execute(
      `
      SELECT 
        ci.id,
        ci.quantity,
        ci.price,

        s.name AS service_name,
        sv.variant_name,
        sv.id as variant_id,
        sv.service_id,
        sv.title,
        sv.image_url

      FROM service_cart_items ci
      JOIN services s ON s.id = ci.service_id
      JOIN service_variants sv ON sv.id = ci.variant_id

      WHERE ci.cart_id = ?
      `,
      [cartId],
    );

    const formatted = rows.map((item) => ({
      ...item,
      image_url: getPublicUrl(item.image_url),
    }));

    return formatted;
  }

  // remove item from cart
  async removeItem(itemId) {
    await db.execute(`DELETE FROM service_cart_items WHERE id = ?`, [itemId]);
  }

  // clear cart
  async clearCart(cartId) {
    await db.execute(`DELETE FROM service_cart_items WHERE cart_id = ?`, [
      cartId,
    ]);
  }
}

module.exports = new ServiceCartModel();
