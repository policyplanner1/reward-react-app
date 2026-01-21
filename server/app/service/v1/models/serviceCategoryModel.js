const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class ServiceCategoryModel {
  // create category
  async create() {
    const sql = `
      INSERT INTO service_categories (name, icon, status)
      VALUES (?, ?, ?)
    `;
    const params = [data.name, data.icon || null, data.status ?? 1];

    const [result] = await db.execute(sql, params);
    return result.insertId;
  }

  //   Fetch all service categories
  async findAll(onlyActive = true) {
    let sql = `SELECT * FROM service_categories`;
    if (onlyActive) {
      sql += ` WHERE status = 1`;
    }
    sql += ` ORDER BY created_at DESC`;

    const [rows] = await db.execute(sql);
    return rows;
  }

  //   Fetch by Id
  async findById(id) {
    const [rows] = await db.execute(
      `SELECT * FROM service_categories WHERE id = ?`,
      [id],
    );
    return rows[0];
  }

  //   Update
  async update(id, data) {
    const sql = `
      UPDATE service_categories
      SET name = ?, icon = ?, status = ?
      WHERE id = ?
    `;
    const params = [data.name, data.icon || null, data.status ?? 1, id];

    const [result] = await db.execute(sql, params);
    return result.affectedRows;
  }

  //   Delete
  async delete(id) {
    const [result] = await db.execute(
      `UPDATE service_categories SET status = 0 WHERE id = ?`,
      [id],
    );
    return result.affectedRows;
  }
}

module.exports = new ServiceCategoryModel();
