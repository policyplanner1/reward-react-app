const db = require("../../config/database");
const fs = require("fs");
const path = require("path");

class wishListModel {
    // remove from wishlist
  async remove(userId, productId, variantId) {
    const [result] = await db.execute(
      `DELETE FROM customer_wishlist
         WHERE user_id = ? AND product_id = ? AND variant_id = ?`,
      [userId, productId, variantId]
    );

    return result.affectedRows;
  }
}

module.exports = new wishListModel();
