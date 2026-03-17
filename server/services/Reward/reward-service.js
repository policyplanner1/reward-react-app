const db = require("../../config/database");
const RewardModel = require("../../models/rewardModel");

class RewardService {
  // CALCULATE REWARD
  calculateReward(amount, rule) {
    let reward = 0;

    if (rule.reward_type === "fixed") {
      reward = rule.reward_value;
    } else {
      reward = (amount * rule.reward_value) / 100;
    }

    if (rule.max_reward) {
      reward = Math.min(reward, rule.max_reward);
    }

    return Math.floor(reward);
  }

  // APPLY REWARD
  async processOrderReward({
    user_id,
    product_id,
    variant_id,
    order_id,
    order_amount,
  }) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const config = await RewardModel.getProductReward(product_id, variant_id);

      if (!config) {
        await conn.commit();
        return { reward: 0 };
      }

      let earnedReward = 0;

      //  EARN
      if (config.can_earn_reward) {
        earnedReward = this.calculateReward(order_amount, config);

        if (earnedReward > 0) {
          await RewardModel.updateWallet(conn, user_id, earnedReward);

          await RewardModel.insertWalletTransaction(conn, {
            user_id,
            title: "Reward Earned",
            description: `Earned on order #${order_id}`,
            type: "credit",
            coins: earnedReward,
            category: "reward",
            reference_id: order_id,
          });
        }
      }

      await conn.commit();

      return { reward: earnedReward };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }

  //  REDEEM WALLET
  async applyWallet({ user_id, variant, wallet_balance }) {
    if (!variant.reward_redemption_limit) return 0;

    return Math.min(wallet_balance, variant.reward_redemption_limit);
  }
}

module.exports = new RewardService();
