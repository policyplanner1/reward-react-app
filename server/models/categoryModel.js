const db = require("../config/database");

class CategoryModel {
  async createCategory(data) {
    try {
      const categoryName = data.name ? data.name : "";

      const [result] = await db.execute(
        `INSERT INTO categories (category_name, created_at) VALUES (?, NOW())`,
        [categoryName]
      );

      return result.insertId;
    } catch (error) {
      console.error("Error creating category:", error);
      throw error;
    }
  }

  // GET ALL CATEGORIES
  // async getAllCategories() {
  //   try {
  //     const [rows] = await db.execute(`SELECT * FROM categories`);
  //     return rows;
  //   } catch (error) {
  //     console.error("Error fetching categories:", error);
  //     throw error;
  //   }
  // }

  // GET CATEGORY BY ID
  async getCategoryById(id) {
    try {
      const [rows] = await db.execute(`SELECT * FROM categories WHERE category_id = ?`, [
        id,
      ]);
      return rows[0];
    } catch (error) {
      console.error("Error fetching category:", error);
      throw error;
    }
  }

  // UPDATE CATEGORY
  async updateCategory(id, data) {
    try {
      const categoryName = data.name;
      const categoryStatus = data.status;

      const [result] = await db.execute(
        `UPDATE categories SET category_name = ?,status = ? WHERE category_id = ?`,
        [categoryName,categoryStatus, id]
      );

      if (result.affectedRows === 0) {
        return null; 
      }

      // fetch the updated category
      const [rows] = await db.execute(`SELECT * FROM categories WHERE category_id = ?`, [
        id,
      ]);

      return rows[0];
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  }

  // DELETE CATEGORY
  async deleteCategory(id) {
    try {
      const [result] = await db.execute(`DELETE FROM categories WHERE category_id = ?`, [
        id,
      ]);

      return result.affectedRows;
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  }
}

module.exports = new CategoryModel();
