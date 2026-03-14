const db = require("../../../../config/database");

// GET ALL GOALS
exports.getGoals = async () => {
  const [rows] = await db.query("SELECT * FROM activity_goals");
  return rows;
};

// GET GOAL BY ID
exports.getGoalById = async (goal_id) => {
  const [rows] = await db.query("SELECT * FROM activity_goals WHERE id = ?", [
    goal_id,
  ]);
  return rows;
};

// INSERT USER GOAL
exports.selectGoal = async (data) => {
  const query = `
  INSERT INTO user_selected_goal
  (user_id, goal_id, start_date, end_date, status, current_streak)
  VALUES (?, ?, ?, ?, 'active', 0)
  `;

  const [result] = await db.query(query, [
    data.user_id,
    data.goal_id,
    data.start_date,
    data.end_date,
  ]);

  return result;
};

// GET USER ACTIVE GOAL
exports.getUserGoal = async (user_id) => {
  const query = `
  SELECT g.*, ug.start_date, ug.end_date, ug.current_streak
  FROM user_selected_goal ug
  JOIN activity_goals g ON g.id = ug.goal_id
  WHERE ug.user_id = ?
  AND ug.status = 'active'
  `;

  const [rows] = await db.query(query, [user_id]);

  return rows;
};
