const db = require("../../../../config/database");

// calculate BMI
exports.calculateBMI = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    // const userId = 1;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const { height_ft, weight_kg, goal_type } = req.body;

    // convert feet to meters
    const height_m = height_ft * 0.3048;

    const bmi = weight_kg / (height_m * height_m);

    let bmi_category = "";

    if (bmi < 18.5) bmi_category = "Underweight";
    else if (bmi < 25) bmi_category = "Normal";
    else if (bmi < 30) bmi_category = "Overweight";
    else bmi_category = "Obesity";

    // save profile
    await db.query(
      `INSERT INTO user_health_profile
      (user_id,height_cm,weight_kg,bmi,bmi_category)
      VALUES (?,?,?,?,?)`,
      [userId, height_m * 100, weight_kg, bmi.toFixed(1), bmi_category],
    );

    // get step plan
    const [plan] = await db.query(
      `SELECT week,daily_steps,expected_result
       FROM bmi_plans
       WHERE goal_type = ?`,
      [goal_type],
    );

    res.json({
      success: true,
      bmi: bmi.toFixed(1),
      bmi_category,
      plan,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false });
  }
};

// Get BMI plan
exports.getBMIPlan = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    // const userId = 1;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const { goal_type } = req.body;

    // Get user health data
    const [profile] = await db.query(
      `SELECT height_cm, weight_kg 
       FROM user_health_profile
       WHERE user_id = ? 
       ORDER BY id DESC LIMIT 1`,
      [userId],
    );

    if (profile.length === 0) {
      return res.json({
        success: false,
        message: "User health profile not found",
      });
    }

    const height_cm = profile[0].height_cm;
    const weight_kg = profile[0].weight_kg;

    // Convert height to meters
    const height_m = height_cm / 100;

    // BMI calculation
    const bmi = weight_kg / (height_m * height_m);

    let bmi_category = "";

    if (bmi < 18.5) bmi_category = "Underweight";
    else if (bmi < 25) bmi_category = "Normal";
    else if (bmi < 30) bmi_category = "Overweight";
    else bmi_category = "Obesity";

    // Update BMI in table
    await db.query(
      `UPDATE user_health_profile
       SET bmi=?, bmi_category=?
       WHERE user_id=?`,
      [bmi.toFixed(1), bmi_category, userId],
    );

    // Get step plan
    const [plan] = await db.query(
      `SELECT week, daily_steps, expected_result
       FROM bmi_plans
       WHERE goal_type = ?`,
      [goal_type],
    );

    res.json({
      success: true,
      bmi: bmi.toFixed(1),
      bmi_category,
      weekly_plan: plan,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
