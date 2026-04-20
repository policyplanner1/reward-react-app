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

      // 1. Idempotency check
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

      // 2. Fetch ALL applicable rules (IMPORTANT CHANGE)
      const configs = await RewardModel.getProductRewards(
        product_id,
        variant_id,
        category_id,
        subcategory_id,
        order_amount,
      );

      if (!configs.length) {
        await conn.commit();
        return { reward: 0 };
      }

      const now = new Date();

      // 3. Filter valid rules (date + amount safety)
      const validRules = configs.filter((rule) => {
        if (!rule.is_active) return false;

        if (rule.start_date && new Date(rule.start_date) > now) return false;
        if (rule.end_date && new Date(rule.end_date) < now) return false;

        if (order_amount < rule.min_order_amount) return false;
        if (rule.max_order_amount && order_amount > rule.max_order_amount)
          return false;

        return true;
      });

      if (!validRules.length) {
        await conn.commit();
        return { reward: 0 };
      }

      // 4. Split rules (stacking logic)
      const stackableRules = validRules.filter((r) => r.is_stackable);
      const nonStackableRules = validRules.filter((r) => !r.is_stackable);

      let applicableRules = [];

      // If non-stackable exists → take only highest priority one
      if (nonStackableRules.length > 0) {
        applicableRules.push(nonStackableRules[0]);
      }

      // Add all stackable
      applicableRules.push(...stackableRules);

      // 5. Calculate total reward
      let totalReward = 0;

      for (const rule of applicableRules) {
        if (!rule.can_earn_reward) continue;

        const reward = this.calculateReward(order_amount, rule);
        totalReward += reward;
      }

      if (totalReward <= 0) {
        await conn.commit();
        return { reward: 0 };
      }

      // 6. Lock wallet
      const wallet = await RewardModel.getWalletForUpdate(conn, user_id);

      const newBalance = wallet.balance + totalReward;

      // 7. Update wallet
      await RewardModel.updateWalletBalance(conn, user_id, newBalance);

      // 8. Expiry (use FIRST rule or max expiry strategy)
      let expiryDate = null;
      const expiryDays = applicableRules[0]?.expiry_days;

      if (expiryDays) {
        expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);
      }

      // 9. Insert transaction (single consolidated entry)
      await RewardModel.insertWalletTransaction(conn, {
        user_id,
        title: "Reward Earned",
        description: `Earned on order #${order_id}`,
        type: "credit",
        coins: totalReward,
        balance_after: newBalance,
        category: "reward",
        reference_id: order_id,
        expiry_date: expiryDate,
        reason_code: "ORDER_REWARD",
      });

      // 10. Insert event log
      await RewardModel.insertEventLog(conn, {
        user_id,
        source_type: "product",
        reference_id: order_id,
      });

      await conn.commit();

      return {
        reward: totalReward,
        applied_rules: applicableRules.map((r) => r.reward_rule_id),
      };
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
