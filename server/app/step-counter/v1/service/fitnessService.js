const FitnessModel = require("../models/fitnessModel");
const db = require("../../../../config/database");

class FitnessService {
  // steps
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

  // Dashboard
  async getDashboard(customerId) {
    const today = new Date().toISOString().slice(0, 10);

    const steps = await FitnessModel.getTodaySteps(customerId, today);
    const goal = await FitnessModel.getGoal(customerId);

    return {
      today_steps: steps?.steps || 0,
      goal_steps: goal?.daily_steps || 0,
    };
  }

  // select goal
  async selectGoal(customerId, daily_steps) {
    await db.execute(
      `INSERT INTO fitness_goals (user_id, daily_steps, start_date)
       VALUES (?, ?, CURDATE())`,
      [customerId, daily_steps],
    );
  }

  // basic profiles
  async saveBasicProfile(customerId, gender, age) {
    await db.execute(
      `INSERT INTO fitness_profiles (user_id, gender, age)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE gender=?, age=?`,
      [customerId, gender, age, gender, age],
    );
  }

  // set profile
  async saveBodyProfile(customerId, height, weight) {
    const bmi = weight / ((height / 100) * (height / 100));

    await db.execute(
      `UPDATE fitness_profiles
       SET height_cm=?, weight_kg=?, bmi=?
       WHERE user_id=?`,
      [height, weight, bmi, customerId],
    );
  }

  /* ------------------------------------------
     WALLET HISTORY
  ------------------------------------------ */
  async getWalletHistory(customerId) {
    const [rows] = await db.execute(
      `SELECT 
          coins,
          activity,
          created_at
       FROM wallet_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [customerId],
    );

    return rows;
  }

  /* ------------------------------------------
     PLAN (BMI + recommendation)
  ------------------------------------------ */
  async getPlan(customerId) {
    const [rows] = await db.execute(
      `SELECT height_cm, weight_kg, bmi, goal_type
       FROM fitness_profiles
       WHERE user_id = ?`,
      [customerId],
    );

    const profile = rows[0];

    if (!profile) {
      throw new Error("Profile not found");
    }

    let category = "";
    let recommended_steps = 6000;
    let recommended_minutes = 45;

    const bmi = profile.bmi;

    if (bmi < 18.5) {
      category = "underweight";
      recommended_steps = 5000;
    } else if (bmi < 25) {
      category = "normal";
      recommended_steps = 7000;
    } else if (bmi < 30) {
      category = "overweight";
      recommended_steps = 8000;
    } else {
      category = "obese";
      recommended_steps = 9000;
    }

    return {
      bmi,
      category,
      recommended_steps,
      recommended_minutes,
      weekly_plan: [
        { week: 1, steps: 5000 },
        { week: 2, steps: 6000 },
        { week: 3, steps: 7000 },
        { week: 4, steps: recommended_steps },
      ],
    };
  }

  /* ------------------------------------------
     ACHIEVEMENTS
  ------------------------------------------ */
  async getAchievements(customerId) {
    const [rows] = await db.execute(
      `
      SELECT 
        a.achievement_id,
        a.title,
        a.description,
        a.target_value,
        a.type,
        a.reward_coins,
        IF(ua.achievement_id IS NOT NULL, 1, 0) AS achieved
      FROM fitness_achievements a
      LEFT JOIN fitness_user_achievements ua
        ON a.achievement_id = ua.achievement_id
        AND ua.user_id = ?
      `,
      [customerId],
    );

    return rows;
  }

  /* ------------------------------------------
     CALENDAR (Monthly Progress)
  ------------------------------------------ */
  async getCalendar(customerId, month) {
    // month format: YYYY-MM

    const [rows] = await db.execute(
      `
      SELECT 
        step_date,
        steps
      FROM fitness_steps
      WHERE user_id = ?
      AND DATE_FORMAT(step_date, '%Y-%m') = ?
      `,
      [customerId, month],
    );

    const goal = await FitnessModel.getGoal(customerId);

    const calendar = {};

    rows.forEach((row) => {
     if (goal && row.steps >= goal.daily_steps) {
        calendar[row.step_date] = "completed";
      } else {
        calendar[row.step_date] = "missed";
      }
    });

    return calendar;
  }

  /* ------------------------------------------
     STATS (Graph Data)
  ------------------------------------------ */
  async getStats(customerId, range) {
    let days = 7;

    if (range === "30days") {
      days = 30;
    }

    const [rows] = await db.execute(
      `
      SELECT 
        step_date,
        steps,
        distance_km,
        calories
      FROM fitness_steps
      WHERE user_id = ?
      AND step_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY step_date ASC
      `,
      [customerId, days],
    );

    return rows;
  }
}

module.exports = new FitnessService();
