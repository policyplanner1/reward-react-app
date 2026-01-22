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
        data: rows,
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
        data: docs,
      });
    } catch (err) {
      return res.json({
        success: true,
        data: [],
        message: err.message,
      });
    }
  }

  // controller
  async getCategoryAttributes(req, res) {
    try {
      const categoryId = Number(req.query.categoryId);
      const subcategoryId = req.query.subcategoryId
        ? Number(req.query.subcategoryId)
        : null;

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid category id",
        });
      }

      if (
        subcategoryId !== null &&
        (!Number.isInteger(subcategoryId) || subcategoryId <= 0)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid subcategory id",
        });
      }

      const [attributes] = await db.execute(
        `
      SELECT
        id,
        attribute_key,
        attribute_label,
        input_type,
        is_variant,
        is_required,
        sort_order
      FROM category_attributes
      WHERE
        (subcategory_id = ?)
        OR (category_id = ? AND subcategory_id IS NULL)
      ORDER BY sort_order ASC
      `,
        [subcategoryId, categoryId]
      );

      return res.status(200).json({
        success: true,
        data: attributes,
      });
    } catch (err) {
      console.error("GET CATEGORY ATTRIBUTES ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch category attributes",
      });
    }
  }
}

module.exports = new CategoryController();
