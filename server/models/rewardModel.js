const db = require("../config/database");

class RewardModel {
  // MAP PRODUCT / VARIANT
  async mapRewardToProduct(data) {
    const {
      product_id,
      variant_id,
      reward_rule_id,
      can_earn_reward = 1,
      can_redeem_reward = 1,
    } = data;

    if (!product_id || !reward_rule_id) {
      throw new Error("product_id and reward_rule_id are required");
    }

    //  Step 1: Check if mapping exists
    const [existing] = await db.execute(
      `SELECT id FROM product_reward_settings
     WHERE product_id = ?
     AND (
       (variant_id IS NULL AND ? IS NULL)
       OR variant_id = ?
     )`,
      [product_id, variant_id || null, variant_id || null],
    );

    //  Step 2: If exists → UPDATE
    if (existing.length > 0) {
      const mappingId = existing[0].id;

      await db.execute(
        `UPDATE product_reward_settings
       SET reward_rule_id = ?,
           can_earn_reward = ?,
           can_redeem_reward = ?
       WHERE id = ?`,
        [reward_rule_id, can_earn_reward, can_redeem_reward, mappingId],
      );

      return mappingId;
    }

    // Step 3: Else → INSERT
    const [result] = await db.execute(
      `INSERT INTO product_reward_settings 
      (product_id, variant_id, reward_rule_id, can_earn_reward, can_redeem_reward)
      VALUES (?, ?, ?, ?, ?)`,
      [
        product_id,
        variant_id || null,
        reward_rule_id,
        can_earn_reward,
        can_redeem_reward,
      ],
    );

    return result.insertId;
  }

  // GET PRODUCT REWARD CONFIG
  async getProductReward(product_id, variant_id) {
    const [rows] = await db.execute(
      `
      SELECT prs.*, rr.*
      FROM product_reward_settings prs
      LEFT JOIN reward_rules rr 
      ON prs.reward_rule_id = rr.reward_rule_id
      WHERE prs.variant_id = ?
         OR prs.product_id = ?
      ORDER BY prs.variant_id DESC
      LIMIT 1
      `,
      [variant_id || 0, product_id],
    );

    return rows[0];
  }

  // WALLET UPDATE
  async updateWallet(conn, user_id, amount) {
    await conn.execute(
      `UPDATE customer_wallet SET balance = balance + ? WHERE user_id = ?`,
      [amount, user_id],
    );
  }

  // WALLET TRANSACTION
  async insertWalletTransaction(conn, data) {
    const { user_id, title, description, type, coins, category, reference_id } =
      data;

    await conn.execute(
      `INSERT INTO wallet_transactions
      (user_id, title, description, transaction_type, coins, category, reference_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, title, description, type, coins, category, reference_id],
    );
  }
}

module.exports = new RewardModel();
