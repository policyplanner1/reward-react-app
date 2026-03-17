const RewardModel = require("../models/rewardModel");
const RewardService = require("../services/Reward/reward-service");

class RewardController {
  // CREATE RULE
  async createRule(req, res) {
    try {
      const id = await RewardModel.createRewardRule(req.body);

      return res.json({
        success: true,
        message: "Reward rule created",
        data: { reward_rule_id: id },
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // GET RULES
  async getRules(req, res) {
    try {
      const data = await RewardModel.getRewardRules();

      return res.json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
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
