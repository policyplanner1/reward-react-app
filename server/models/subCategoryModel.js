const db = require("../config/database");

class SubCategoryModel {
  // CREATE SUB CATEGORY
  async createSubCategory(data) {
    try {
      const subcategoryName = data.name || "";
      const categoryId = data.category_id;

      const [result] = await db.execute(
        `INSERT INTO sub_categories (category_id, subcategory_name, created_at)
         VALUES (?, ?, NOW())`,
        [categoryId, subcategoryName]
      );

      return result.insertId;
    } catch (error) {
      console.error("Error creating sub category:", error);
      throw error;
    }
  }

  // GET ALL SUB CATEGORIES
  async getAllSubCategories() {
    try {
      const [rows] = await db.execute(
        `SELECT sc.*, c.category_name 
         FROM sub_categories sc
         LEFT JOIN categories c ON sc.category_id = c.category_id`
      );
      return rows;
    } catch (error) {
      console.error("Error fetching sub categories:", error);
      throw error;
    }
  }

  // GET SUB CATEGORY BY ID
  async getSubCategoryById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT sc.*, c.category_name
         FROM sub_categories sc
         LEFT JOIN categories c ON sc.category_id = c.category_id
         WHERE sc.subcategory_id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error("Error fetching sub category:", error);
      throw error;
    }
  }

  // UPDATE SUB CATEGORY
  async updateSubCategory(id, data) {
    try {
      const subcategoryName = data.name;
      const categoryId = data.category_id;
      const status = data.status;

      const [result] = await db.execute(
        `UPDATE sub_categories 
         SET subcategory_name = ?, category_id = ?, status = ?
         WHERE subcategory_id = ?`,
        [subcategoryName, categoryId, status, id]
      );

      if (result.affectedRows === 0) return null;

      // Return updated sub category
      const [rows] = await db.execute(
        `SELECT * FROM sub_categories WHERE subcategory_id = ?`,
        [id]
      );

      return rows[0];
    } catch (error) {
      console.error("Error updating sub category:", error);
      throw error;
    }
  }

  // DELETE SUB CATEGORY
  async deleteSubCategory(id) {
    try {
      const [result] = await db.execute(
        `DELETE FROM sub_categories WHERE subcategory_id = ?`,
        [id]
      );

      return result.affectedRows;
    } catch (error) {
      console.error("Error deleting sub category:", error);
      throw error;
    }
  }
}

module.exports = new SubCategoryModel();
