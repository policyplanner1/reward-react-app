const goalModel = require("../models/goalModel");

// GET GOALS
exports.getGoals = async (req, res) => {
  try {
    const goals = await goalModel.getGoals();

    res.json({
      success: true,
      goals,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// SELECT GOAL
exports.selectGoal = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    // const userId = 1;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const { goal_id } = req.body;

    if (!goal_id) {
      return res.status(400).json({
        success: false,
        message: "goal_id required",
      });
    }

    const goal = await goalModel.getGoalById(goal_id);

    if (goal.length === 0) {
      return res.json({
        success: false,
        message: "Goal not found",
      });
    }

    const goalData = goal[0];

    const startDate = new Date();

    const endDate = new Date();
    endDate.setDate(startDate.getDate() + goalData.days_required);

    await goalModel.selectGoal({
      userId,
      goal_id,
      start_date: startDate,
      end_date: endDate,
    });

    res.json({
      success: true,
      message: "Goal selected successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// get user goal
exports.getUserGoal = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    // const userId = 1;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const [rows] = await db.query(
      `
      SELECT 
        g.id AS goal_id,
        g.steps,
        g.days_required,
        g.reward_coins,
        ug.start_date,
        ug.end_date,
        ug.current_streak
      FROM user_selected_goal ug
      JOIN activity_goals g ON g.id = ug.goal_id
      WHERE ug.user_id = ?
      AND ug.status = 'active'
    `,
      [userId],
    );

    if (rows.length === 0) {
      return res.json({
        success: false,
        message: "No active goal found",
      });
    }

    res.json({
      success: true,
      goal: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
