const db = require("../../../../config/database");

exports.getDashboard = async (req, res) => {
  try {
    const user_id = req.params.user_id;

    const [user] = await db.query(
      "SELECT name FROM customer WHERE user_id = ?",
      [user_id],
    );

    const [goal] = await db.query(
      `
      SELECT g.steps, g.days_required, ug.current_streak
      FROM user_selected_goal ug
      JOIN activity_goals g ON g.id = ug.goal_id
      WHERE ug.user_id = ? AND ug.status='active'
    `,
      [user_id],
    );

    const [todaySteps] = await db.query(
      `
      SELECT steps, distance_km, move_minutes
      FROM daily_steps
      WHERE user_id = ?
      AND step_date = CURDATE()
    `,
      [user_id],
    );

    const [weekSteps] = await db.query(
      `
      SELECT step_date, steps
      FROM daily_steps
      WHERE user_id = ?
      AND step_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `,
      [user_id],
    );

    res.json({
      success: true,
      user: user[0],
      goal: goal[0] || null,
      today_steps: todaySteps[0] || null,
      weekly_steps: weekSteps,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
