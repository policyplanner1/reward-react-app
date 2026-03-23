const db = require("../config/database");

class RewardModel {
  // CREATE RULE
  async createRewardRule(data) {
    const {
      name,
      reward_type,
      reward_value,
      max_reward,
      min_order_amount,
      source_type,
    } = data;

    if (!reward_type || !reward_value || !source_type) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO reward_rules 
      (name, reward_type, reward_value, max_reward, min_order_amount, source_type)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        reward_type,
        reward_value,
        max_reward || null,
        min_order_amount || 0,
        source_type,
      ],
    );

    return res.json({
      success: true,
      message: "Reward rule created",
      data: { reward_rule_id: result.insertId },
    });
  }

  // GET RULES
  async getRewardRules() {
    const [rows] = await db.execute(
      `SELECT * FROM reward_rules WHERE is_active = 1`,
    );
    return rows;
  }

  // MAP PRODUCT / VARIANT
  async mapRewardToProduct(data) {
    const {
      product_id,
      variant_id,
      reward_rule_id,
      can_earn_reward,
      can_redeem_reward,
    } = data;

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
