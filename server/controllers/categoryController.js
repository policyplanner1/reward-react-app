const db = require("../config/database");

class CategoryController {
  // Get all categories
  async getAllCategories(req, res) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM categories ORDER BY category_name ASC`,
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
        [categoryId],
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

      const [attributes] = await db.execute(
        `
      SELECT
        ca.id,
        ca.attribute_key,
        ca.attribute_label,
        ca.input_type,
        ca.is_variant,
        ca.is_required,
        ca.sort_order,
        GROUP_CONCAT(cav.value ORDER BY cav.sort_order) AS options
      FROM category_attributes ca
      LEFT JOIN category_attribute_values cav
        ON cav.attribute_id = ca.id
      WHERE
        (ca.subcategory_id = ?)
        OR (ca.category_id = ? AND ca.subcategory_id IS NULL)
      GROUP BY ca.id
      ORDER BY ca.sort_order ASC
      `,
        [subcategoryId, categoryId],
      );

      const formatted = attributes.map((a) => ({
        ...a,
        options: a.options ? a.options.split(",") : [],
      }));

      return res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch category attributes",
      });
    }
  }
}

module.exports = new CategoryController();
