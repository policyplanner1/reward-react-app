const FitnessModel = require("../models/fitnessModel");
const db = require("../../../../config/database");

class FitnessService {
  // steps
  async syncSteps(customerId, payload) {
    const { steps, distance_km, calories, active_minutes, date } = payload;

    // -------------------------------
    // Anti cheat
    // -------------------------------
    if (steps > 40000) {
      throw new Error("Invalid step count");
    }

    // -------------------------------
    // 1. Get goal
    // -------------------------------
    const goal = await FitnessModel.getGoal(customerId);

    if (!goal) {
      return { message: "No goal set" };
    }

    // -------------------------------
    // 2. STEP DELTA VALIDATION
    // -------------------------------
    const existingSteps = await FitnessModel.getStepsByDate(customerId, date);

    if (existingSteps) {
      const previousSteps = existingSteps.steps;

      //  Case 1: Same or lower steps → ignore
      if (steps <= previousSteps) {
        return {
          message: "No new steps to process",
          goalAchieved: Math.max(previousSteps, steps) >= goal.daily_steps,
          reward: 0,
        };
      }

      //  Case 2: Unrealistic jump (anti-cheat)
      const stepDiff = steps - previousSteps;

      if (stepDiff > 20000) {
        throw new Error("Suspicious step increase detected");
      }
    }

    // -------------------------------
    // 3. SAVE STEPS (ALWAYS if valid)
    // -------------------------------
    await FitnessModel.upsertSteps({
      customer_id: customerId,
      step_date: date,
      steps,
      distance_km,
      calories,
      active_minutes,
    });

    // -------------------------------
    // 4. CHECK GOAL (AFTER SAVE)
    // -------------------------------
    let goalAchieved = false;

    if (steps >= goal.daily_steps) {
      goalAchieved = true;
    } else {
      return {
        message: "Steps synced",
        goalAchieved: false,
        reward: 0,
      };
    }

    // -------------------------------
    // 5. STREAK LOGIC
    // -------------------------------
    const streakData = await FitnessModel.getStreak(customerId);

    let currentStreak = 1;
    let longestStreak = 1;

    const today = new Date(date);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (streakData) {
      const lastDate = new Date(streakData.last_goal_completed_date);

      const lastDateStr = lastDate.toISOString().slice(0, 10);
      const todayStr = today.toISOString().slice(0, 10);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      if (lastDateStr === yesterdayStr) {
        currentStreak = streakData.current_streak + 1;
      } else if (lastDateStr === todayStr) {
        // already processed today → don't increase
        currentStreak = streakData.current_streak;
      } else {
        currentStreak = 1;
      }

      longestStreak = Math.max(streakData.longest_streak, currentStreak);
    }

    // -------------------------------
    // 6. TRANSACTION START
    // -------------------------------
    const conn = await db.getConnection();
    await conn.beginTransaction();

    try {
      let totalReward = 0;
      let unlockedAchievements = [];

      // -------------------------------
      // Update streak INSIDE TX
      // -------------------------------
      await conn.execute(
        `INSERT INTO fitness_streaks 
       (user_id, current_streak, longest_streak, last_goal_completed_date)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         current_streak = ?,
         longest_streak = ?,
         last_goal_completed_date = ?`,
        [
          customerId,
          currentStreak,
          longestStreak,
          date,
          currentStreak,
          longestStreak,
          date,
        ],
      );

      // -------------------------------
      // GOAL REWARD (once per day)
      // -------------------------------
      const alreadyGoalRewarded = await FitnessModel.hasReward(
        customerId,
        date,
        "goal",
        null,
      );

      if (!alreadyGoalRewarded) {
        const goalCoins = 50;

        await FitnessModel.insertRewardLog(
          customerId,
          date,
          "goal",
          null,
          goalCoins,
          conn,
        );

        totalReward += goalCoins;
      }

      // -------------------------------
      // STREAK BONUS
      // -------------------------------
      if (currentStreak === 7 || currentStreak === 14) {
        const alreadyStreakRewarded = await FitnessModel.hasReward(
          customerId,
          date,
          "streak",
          currentStreak,
        );

        if (!alreadyStreakRewarded) {
          const streakCoins = currentStreak === 7 ? 100 : 200;

          await FitnessModel.insertRewardLog(
            customerId,
            date,
            "streak",
            currentStreak,
            streakCoins,
            conn,
          );

          totalReward += streakCoins;
        }
      }

      // -------------------------------
      // ACHIEVEMENTS
      // -------------------------------
      const allAchievements = await FitnessModel.getAllAchievements();
      const userAchievements =
        await FitnessModel.getUserAchievements(customerId);

      for (const achievement of allAchievements) {
        if (userAchievements.includes(achievement.achievement_id)) continue;

        let unlock = false;

        if (achievement.type === "steps" && steps >= achievement.target_value) {
          unlock = true;
        }

        if (
          achievement.type === "streak" &&
          currentStreak >= achievement.target_value
        ) {
          unlock = true;
        }

        if (unlock) {
          const alreadyGiven = await FitnessModel.hasReward(
            customerId,
            date,
            "achievement",
            achievement.achievement_id,
          );

          if (!alreadyGiven) {
            await FitnessModel.unlockAchievement(
              customerId,
              achievement.achievement_id,
            );

            await FitnessModel.insertRewardLog(
              customerId,
              date,
              "achievement",
              achievement.achievement_id,
              achievement.reward_coins,
              conn,
            );

            totalReward += achievement.reward_coins || 0;

            unlockedAchievements.push({
              id: achievement.achievement_id,
              title: achievement.title,
            });
          }
        }
      }

      // -------------------------------
      // WALLET UPDATE
      // -------------------------------
      if (totalReward > 0) {
        await conn.execute(
          `INSERT INTO wallet_transactions (user_id, coins, activity)
         VALUES (?, ?, ?)`,
          [customerId, totalReward, "Fitness Reward"],
        );

        await conn.execute(
          `UPDATE customer_wallet
         SET balance = balance + ?
         WHERE user_id = ?`,
          [totalReward, customerId],
        );
      }

      // -------------------------------
      // COMMIT
      // -------------------------------
      await conn.commit();

      return {
        message: "Steps synced",
        goalAchieved,
        reward: totalReward,
        currentStreak,
        unlockedAchievements,
      };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
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

  // Get todays summary (for dashboard)
  async getTodaySummary(customerId) {
    const today = new Date().toISOString().slice(0, 10);

    const stepsData = await FitnessModel.getStepsByDate(customerId, today);
    const goal = await FitnessModel.getGoal(customerId);

    const steps = stepsData?.steps || 0;

    return {
      steps,
      goal_steps: goal?.daily_steps || 0,
      progress_percent: goal
        ? Math.min((steps / goal.daily_steps) * 100, 100)
        : 0,
      distance_km: stepsData?.distance_km || 0,
      calories: stepsData?.calories || 0,
      active_minutes: stepsData?.active_minutes || 0,
    };
  }
}

module.exports = new FitnessService();
