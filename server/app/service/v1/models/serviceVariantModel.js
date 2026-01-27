const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class ServiceVariantModel {
  // create a variant
  async create(data) {
    const [result] = await db.execute(
      `INSERT INTO service_variants
      (service_id, variant_name, title, short_description, features, price)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.service_id,
        data.variant_name,
        data.title,
        data.short_description,
        data.features,
        data.price,
      ],
    );

    return result.insertId;
  }

  //   find by service
  async findByServiceId(serviceId) {
    const [rows] = await db.execute(
      `SELECT id, variant_name,title, short_description,features, price
       FROM service_variants
       WHERE service_id = ? AND status = 1`,
      [serviceId],
    );
    return rows;
  }

  //   delete a service
  async delete(id) {
    await db.execute(`UPDATE service_variants SET status = 0 WHERE id = ?`, [
      id,
    ]);
  }
}

module.exports = new ServiceVariantModel();
