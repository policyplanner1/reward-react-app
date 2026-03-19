const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class FitnessModel {
  async upsertSteps(data) {
    const {
      customer_id,
      step_date,
      steps,
      distance_km,
      calories,
      active_minutes,
    } = data;

    const query = `
      INSERT INTO fitness_steps
      (user_id, step_date, steps, distance_km, calories, active_minutes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        steps = VALUES(steps),
        distance_km = VALUES(distance_km),
        calories = VALUES(calories),
        active_minutes = VALUES(active_minutes)
    `;

    await db.execute(query, [
      customer_id,
      step_date,
      steps,
      distance_km,
      calories,
      active_minutes,
    ]);
  }

  async getTodaySteps(customerId, date) {
    const [rows] = await db.execute(
      `SELECT * FROM fitness_steps WHERE user_id = ? AND step_date = ?`,
      [customerId, date],
    );
    return rows[0];
  }

  async getGoal(customerId) {
    const [rows] = await db.execute(
      `SELECT * FROM fitness_goals WHERE user_id = ? ORDER BY goal_id DESC LIMIT 1`,
      [customerId],
    );
    return rows[0];
  }

  async updateStreak(customerId, streak) {
    await db.execute(
      `INSERT INTO fitness_streaks (user_id, current_streak)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE current_streak = ?`,
      [customerId, streak, streak],
    );
  }

  async addWalletTransaction(customerId, coins, activity) {
    await db.execute(
      `INSERT INTO wallet_transactions (user_id, coins, activity)
       VALUES (?, ?, ?)`,
      [customerId, coins, activity],
    );

    await db.execute(
      `UPDATE customer_wallet
       SET balance = balance + ?
       WHERE user_id = ?`,
      [coins, customerId],
    );
  }
}

module.exports = new FitnessModel();
