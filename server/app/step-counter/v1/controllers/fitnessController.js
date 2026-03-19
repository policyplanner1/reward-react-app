const FitnessModel = require("../models/fitnessModel");
const FitnessService = require("../service/fitnessService");
const db = require("../../../../config/database");

class FitnessController {
  async selectGoal(req, res) {
    try {
      const userId = req.user.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { daily_steps } = req.body;

      await FitnessService.selectGoal(userId, daily_steps);

      res.json({ message: "Goal set successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async saveBasicProfile(req, res) {
    try {
      const userId = req.user.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }
      const { gender, age } = req.body;

      await FitnessService.saveBasicProfile(userId, gender, age);

      res.json({ message: "Profile updated" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async saveBodyProfile(req, res) {
    try {
      const userId = req.user.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { height_cm, weight_kg } = req.body;

      await FitnessService.saveBodyProfile(userId, height_cm, weight_kg);

      res.json({ message: "Body profile updated" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getPlan(req, res) {
    try {
      const userId = req.user.user_id;
      // const userId = 1;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const data = await FitnessService.getPlan(userId);

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new FitnessController();
