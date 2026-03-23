const RewardModel = require("../models/rewardModel");
const RewardService = require("../services/Reward/reward-service");

class RewardController {
  // CREATE RULE
  async createRule(req, res) {
    try {
      const {
        name,
        reward_type,
        reward_value,
        max_reward,
        min_order_amount,
        source_type,
      } = req.body;

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
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // GET RULES
  async getRules(req, res) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM reward_rules WHERE is_active = 1`,
      );

      return res.json({
        success: true,
        data: rows,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // GET RULE BY ID
  async getRewardRuleById(req, res) {
    try {
      const { id } = req.params;

      const query = `SELECT * FROM reward_rules WHERE reward_rule_id = ?`;
      const rows = await executeQry(query, [id]);

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: "Reward rule not found",
        });
      }

      return res.json({
        success: true,
        data: rows[0],
      });
    } catch (err) {
      console.error("Get Rule Error:", err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // UPDATE RULE
  async updateRewardRule(req, res) {
    try {
      const { id } = req.params;

      const {
        name,
        reward_type,
        reward_value,
        max_reward,
        min_order_amount,
        is_active,
        source_type,
      } = req.body;

      const query = `
      UPDATE reward_rules
      SET 
        name = ?,
        reward_type = ?,
        reward_value = ?,
        max_reward = ?,
        min_order_amount = ?,
        is_active = ?,
        source_type = ?
      WHERE reward_rule_id = ?
    `;

      await executeQry(query, [
        name,
        reward_type,
        reward_value,
        max_reward,
        min_order_amount,
        is_active,
        source_type,
        id,
      ]);

      return res.json({
        success: true,
        message: "Reward rule updated",
      });
    } catch (err) {
      console.error("Update Rule Error:", err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // DEACTIVATE RULE
  async deleteRewardRule(req, res) {
    try {
      const { id } = req.params;

      const query = `
      UPDATE reward_rules
      SET is_active = 0
      WHERE reward_rule_id = ?
    `;

      await executeQry(query, [id]);

      return res.json({
        success: true,
        message: "Reward rule deactivated",
      });
    } catch (err) {
      console.error("Delete Rule Error:", err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // MAP PRODUCT
  async mapProductReward(req, res) {
    try {
      const id = await RewardModel.mapRewardToProduct(req.body);

      return res.json({
        success: true,
        message: "Mapped successfully",
        data: { id },
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // APPLY REWARD (CALL THIS IN ORDER FLOW)
  async applyReward(req, res) {
    try {
      const { user_id, product_id, variant_id, order_id, order_amount } =
        req.body;

      const result = await RewardService.processOrderReward({
        user_id,
        product_id,
        variant_id,
        order_id,
        order_amount,
      });

      return res.json({
        success: true,
        message: "Reward processed",
        data: result,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new RewardController();
