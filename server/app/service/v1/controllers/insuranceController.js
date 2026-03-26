const db = require("../../../../config/database");

class InsuranceController {
  // start enquiry
  async startEnquiry(req, res) {
    const { insurance_type } = req.body;
    // {
    //   insurance_type: "health";
    // }

    if (!insurance_type) {
      return res.status(400).json({
        success: false,
        message: "Insurance type is required",
      });
    }

    const userId = req.user?.user_id;
    // const userId = 1;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const result = await db.execute(
      `INSERT INTO insurance_enquiries (user_id, insurance_type)
     VALUES (?, ?)`,
      [userId, insurance_type],
    );

    res.json({
      success: true,
      enquiry_id: result.insertId,
    });
  }

  // save steps
  async saveStep(req, res) {
    const { enquiry_id, step, section, data } = req.body;

    if (!enquiry_id || !step || !section || !data) {
      return res.status(400).json({
        success: false,
        message: "enquiry_id, step, section and data are required",
      });
    }

    const userId = req.user?.user_id;
    // const userId = 1;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    // 1. Get existing form_data
    const [rows] = await db.execute(
      `SELECT form_data FROM insurance_enquiries WHERE id = ? AND user_id = ?`,
      [enquiry_id, userId],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Invalid enquiry",
      });
    }

    let formData = rows[0]?.form_data || {};

    try {
      if (typeof formData === "string") {
        formData = JSON.parse(formData);
      }
    } catch (e) {
      formData = {};
    }

    // 2. Merge new section
    formData[section] = data;

    // 3. invalidate plan if core data changes
    if (section === "members" || section === "health") {
      await db.execute(
        `UPDATE insurance_enquiries 
       SET selected_plan = NULL 
       WHERE id = ? AND user_id = ?`,
        [enquiry_id, userId],
      );
    }

    // 4. Update DB
    await db.execute(
      `UPDATE insurance_enquiries
     SET form_data = ?, step_completed = ?
     WHERE id = ? AND user_id = ?`,
      [JSON.stringify(formData), step, enquiry_id, userId],
    );

    res.json({ success: true });
  }

  // Get Enquiry
  async getEnquiry(req, res) {
    const userId = req.user?.user_id;
    // const userId = 1;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const [rows] = await db.execute(
      `SELECT * FROM insurance_enquiries WHERE id = ? AND user_id = ?`,
      [req.params.id, userId],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    res.json({ success: true, data: rows[0] });
  }

  // Final Submission
  async completeEnquiry(req, res) {
    const { enquiry_id } = req.body;

    if (!enquiry_id) {
      return res.status(400).json({
        success: false,
        message: "enquiry_id is required",
      });
    }

    const userId = req.user?.user_id;
    // const userId = 1;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    const [rows] = await db.execute(
      `SELECT form_data, selected_plan 
     FROM insurance_enquiries 
     WHERE id = ? AND user_id = ?`,
      [enquiry_id, userId],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    let formData = rows[0].form_data;

    try {
      if (typeof formData === "string") {
        formData = JSON.parse(formData);
      }
    } catch (e) {
      return res.status(500).json({
        success: false,
        message: "Invalid form data",
      });
    }

    // Validation
    if (!formData.members) {
      return res.status(400).json({
        success: false,
        message: "Members missing",
      });
    }

    if (!formData.basic) {
      return res.status(400).json({
        success: false,
        message: "Basic details missing",
      });
    }

    if (!formData.health) {
      return res.status(400).json({
        success: false,
        message: "Coverage details missing",
      });
    }

    await db.execute(
      `UPDATE insurance_enquiries
     SET status = 'completed'
     WHERE id = ? AND user_id = ?`,
      [enquiry_id, userId],
    );
    res.json({
      success: true,
      message: "Enquiry completed",
    });
  }

  // plan selection
  async selectPlan(req, res) {
    const { enquiry_id, plan } = req.body;

    if (!enquiry_id || !plan) {
      return res.status(400).json({
        success: false,
        message: "enquiry_id and plan are required",
      });
    }

    if (!plan.planId || !plan.selectedPremium) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan data",
      });
    }

    const userId = req.user?.user_id;
    // const userId = 1

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized user",
      });
    }

    await db.execute(
      `UPDATE insurance_enquiries
     SET selected_plan = ?
     WHERE id = ? AND user_id = ?`,
      [JSON.stringify(plan), enquiry_id, userId],
    );

    res.json({ success: true });
  }
}

module.exports = new InsuranceController();
