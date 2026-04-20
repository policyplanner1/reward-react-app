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
    category_id,
    subcategory_id,
  }) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      //  1. Idempotency check (VERY IMPORTANT)
      const alreadyProcessed = await RewardModel.checkEventLog(
        conn,
        user_id,
        "product",
        order_id,
      );

      if (alreadyProcessed) {
        await conn.commit();
        return { reward: 0, message: "Already rewarded" };
      }

      //  2. Get reward config 
      const config = await RewardModel.getProductReward(
        product_id,
        variant_id,
        category_id,
        subcategory_id,
      );

      if (!config) {
        await conn.commit();
        return { reward: 0 };
      }

      //  3. Validate rule
      const now = new Date();

      if (!config.is_active) {
        await conn.commit();
        return { reward: 0 };
      }

      if (config.start_date && new Date(config.start_date) > now) {
        await conn.commit();
        return { reward: 0 };
      }

      if (config.end_date && new Date(config.end_date) < now) {
        await conn.commit();
        return { reward: 0 };
      }

      if (order_amount < config.min_order_amount) {
        await conn.commit();
        return { reward: 0 };
      }

      let earnedReward = 0;

      //  4. Earn reward
      if (config.can_earn_reward) {
        earnedReward = this.calculateReward(order_amount, config);

        if (earnedReward > 0) {
          //  5. Lock wallet row (CRITICAL)
          const wallet = await RewardModel.getWalletForUpdate(conn, user_id);

          const newBalance = wallet.balance + earnedReward;

          //  6. Update wallet
          await RewardModel.updateWalletBalance(conn, user_id, newBalance);

          //  7. Calculate expiry
          let expiryDate = null;
          if (config.expiry_days) {
            expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + config.expiry_days);
          }

          //  8. Insert transaction
          await RewardModel.insertWalletTransaction(conn, {
            user_id,
            title: "Reward Earned",
            description: `Earned on order #${order_id}`,
            type: "credit",
            coins: earnedReward,
            balance_after: newBalance,
            category: "reward",
            reference_id: order_id,
            expiry_date: expiryDate,
            reason_code: "ORDER_REWARD",
          });
        }
      }

      //  9. Insert event log (prevents duplicates)
      await RewardModel.insertEventLog(conn, {
        user_id,
        source_type: "product",
        reference_id: order_id,
      });

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
