const FitnessModel = require("../models/fitnessModel");
const db = require("../../../../config/database");

class FitnessService {
  async syncSteps(customerId, payload) {
    const { steps, distance_km, calories, active_minutes, date } = payload;

    // 1. Save steps
    await FitnessModel.upsertSteps({
      customer_id: customerId,
      step_date: date,
      steps,
      distance_km,
      calories,
      active_minutes,
    });

    // 2. Get goal
    const goal = await FitnessModel.getGoal(customerId);

    let reward = 0;
    let goalAchieved = false;

    if (goal && steps >= goal.daily_steps) {
      reward = 50;
      goalAchieved = true;

      // 3. Reward coins
      await FitnessModel.addWalletTransaction(
        customerId,
        reward,
        "Goal Achieved",
      );

      // 4. Update streak
      await FitnessModel.updateStreak(customerId, 1); 
    }

    return {
      message: "Steps synced",
      goalAchieved,
      reward,
    };
  }

  async getDashboard(customerId) {
    const today = new Date().toISOString().slice(0, 10);

    const steps = await FitnessModel.getTodaySteps(customerId, today);
    const goal = await FitnessModel.getGoal(customerId);

    return {
      today_steps: steps?.steps || 0,
      goal_steps: goal?.daily_steps || 0,
    };
  }

  async selectGoal(customerId, daily_steps) {
    await db.execute(
      `INSERT INTO fitness_goals (customer_id, daily_steps, start_date)
       VALUES (?, ?, CURDATE())`,
      [customerId, daily_steps],
    );
  }

  async saveBasicProfile(customerId, gender, age) {
    await db.execute(
      `INSERT INTO fitness_profiles (customer_id, gender, age)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE gender=?, age=?`,
      [customerId, gender, age, gender, age],
    );
  }

  async saveBodyProfile(customerId, height, weight) {
    const bmi = weight / ((height / 100) * (height / 100));

    await db.execute(
      `UPDATE fitness_profiles
       SET height_cm=?, weight_kg=?, bmi=?
       WHERE customer_id=?`,
      [height, weight, bmi, customerId],
    );
  }
}

module.exports = new FitnessService();
