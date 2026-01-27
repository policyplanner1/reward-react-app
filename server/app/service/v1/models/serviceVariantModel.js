const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class ServiceVariantModel {
  // create a variant
  async create(data) {
    const [result] = await db.execute(
      `INSERT INTO service_variants
      (service_id, variant_name, title, short_description, price)
      VALUES (?, ?, ?, ?, ?)`,
      [
        data.service_id,
        data.variant_name,
        data.title,
        data.short_description,
        data.price,
      ],
    );

    return result.insertId;
  }

  //   find by service
  async findByServiceId(serviceId) {
    const [rows] = await db.execute(
      `SELECT id, variant_name,title, short_description, price
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

  // create a variant section
  async addVariantSection(data) {
    const [result] = await db.execute(
      `INSERT INTO service_variant_sections
      (variant_id, section_type, title, content, sort_order)
      VALUES (?, ?, ?, ?, ?)`,
      [
        data.variant_id,
        data.section_type,
        data.title || null,
        JSON.stringify(data.content),
        data.sort_order || 0,
      ],
    );
    return result.insertId;
  }

  // Find variant Section
  async getVariantSection(variantId) {
    const [rows] = await db.execute(
      `SELECT section_type, title, content
       FROM service_variant_sections
       WHERE variant_id = ?
       ORDER BY sort_order`,
      [variantId],
    );

    return rows.map((r) => ({
      section_type: r.section_type,
      title: r.title,
      content: JSON.parse(r.content),
    }));
  }

  // delete a variant section
  async deleteVariantSection(id) {
    await db.execute(`DELETE FROM service_variant_sections WHERE id = ?`, [id]);
  }
}

module.exports = new ServiceVariantModel();
