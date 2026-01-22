const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class ServiceModel {
  async create(data) {
    const sql = `
      INSERT INTO services
      (category_id, name, description, price, estimated_days, status,service_image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      data.category_id,
      data.name,
      data.description || null,
      data.price,
      data.estimated_days || null,
      data.status ?? 1,
      data.service_image,
    ];

    const [result] = await db.execute(sql, params);
    return result.insertId;
  }

  async findAll(filters = {}) {
    let sql = `
      SELECT 
        s.*,
        c.name AS category_name
      FROM services s
      JOIN service_categories c ON c.id = s.category_id
      WHERE s.status = 1
    `;

    const params = [];

    if (filters.category_id) {
      sql += ` AND s.category_id = ?`;
      params.push(filters.category_id);
    }

    sql += ` ORDER BY s.created_at DESC`;

    const [rows] = await db.execute(sql, params);
    return rows;
  }

  async findById(id) {
    const [rows] = await db.execute(
      `
      SELECT 
        s.*,
        c.name AS category_name
      FROM services s
      JOIN service_categories c ON c.id = s.category_id
      WHERE s.id = ?
      `,
      [id],
    );
    return rows[0];
  }

  async update(id, data) {
    const sql = `
      UPDATE services
      SET
        category_id = ?,
        name = ?,
        description = ?,
        price = ?,
        estimated_days = ?,
        status = ?,
        service_image = ?
      WHERE id = ?
    `;

    const params = [
      data.category_id,
      data.name,
      data.description || null,
      data.price,
      data.estimated_days || null,
      data.status ?? 1,
      data.service_image || null,
      id,
    ];

    const [result] = await db.execute(sql, params);
    return result.affectedRows;
  }

  async updateImage(id, imagePath) {
    const [result] = await db.execute(
      `UPDATE services SET service_image = ? WHERE id = ?`,
      [imagePath, id],
    );
    return result.affectedRows;
  }

  async delete(id) {
    // Soft delete
    const [result] = await db.execute(
      `UPDATE services SET status = 0 WHERE id = ?`,
      [id],
    );
    return result.affectedRows;
  }

  // By category Id search
  async findByCategoryId(categoryId) {
    const [rows] = await db.execute(
      `
    SELECT 
      id,
      name,
      description,
      price,
      estimated_days,
      service_image
    FROM services
    WHERE category_id = ? AND status = 1
    ORDER BY id DESC
    `,
      [categoryId],
    );

    return rows;
  }
}

module.exports = new ServiceModel();
