const db = require("../config/database");

class CategoryController {
  // Get all categories
  async getAllCategories(req, res) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM categories ORDER BY category_name ASC`
      );

      res.json({
        success: true,
        data: rows
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Get documents mapped with selected category
  async getCategoryDocuments(req, res) {
    try {
      const { categoryId } = req.params;

      const [docs] = await db.execute(
        `SELECT dt.document_type_id, dt.document_name, dt.document_key,
                dt.accepted_formats, dt.is_required
         FROM category_documents cd
         JOIN document_types dt ON cd.document_type_id = dt.document_type_id
         WHERE cd.category_id = ? AND dt.level='product'`,
        [categoryId]
      );

      res.json({
        success: true,
        data: docs
      });
    } catch (err) {
      return res.json({
        success: true,
        data: [],
        message:err.message
      });
    }
  }
}

module.exports = new CategoryController();
