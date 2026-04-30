const db = require("../../../config/database");

class TermsController {
  async getTermsStatus(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const [rows] = await db.execute(
        `SELECT terms_accepted FROM customer WHERE user_id = ?`,
        [userId],
      );

      return res.json({
        success: true,
        terms_accepted: !!rows[0]?.terms_accepted,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateTerms(req, res) {
    try {
      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const { accepted } = req.body;

      await db.execute(
        `UPDATE customer 
       SET terms_accepted = ? 
       WHERE user_id = ?`,
        [accepted ? 1 : 0, userId],
      );

      return res.json({
        success: true,
        message: "Updated successfully",
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new TermsController();
