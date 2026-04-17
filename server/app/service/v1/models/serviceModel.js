const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

// helper function
const CDN_BASE_URL = "https://cdn.rewardplanners.com";
function getPublicUrl(path) {
  if (!path) return null;
  return `${CDN_BASE_URL}/${path}`;
}

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
    ORDER BY sort_order ASC
    `,
      [categoryId],
    );

    return rows;
  }

  async findBasicById(id) {
    const [rows] = await db.execute(
      `SELECT id, name, description, service_image
     FROM services
     WHERE id = ? AND status = 1`,
      [id],
    );
    return rows[0];
  }

  // Get home sections
  async getHomeSections() {
    const [rows] = await db.execute(`
    SELECT 
      s.id,
      s.name,
      s.service_image,
      s.description,
      s.price,
      s.is_featured,
      s.is_popular,
      s.is_recommended,
      s.section_type,
      sv.price,
      sv.image_url

    FROM services s
    LEFT JOIN service_variants sv ON sv.service_id = s.id
    WHERE s.status = 1
  `);

    // group into sections
    const sections = {
      quick_services: [],
      popular: [],
      recommended: [],
      value_added: [],
    };

    rows.forEach((item) => {
      const service = {
        id: item.id,
        name: item.name,
        price: Number(item.price),
        image: item.image_url ? getPublicUrl(item.image_url) : null,
      };

      if (item.is_featured) {
        sections.quick_services.push(service);
      }

      if (item.is_popular) {
        sections.popular.push(service);
      }

      if (item.is_recommended) {
        sections.recommended.push(service);
      }

      if (item.section_type === "value_added") {
        sections.value_added.push(service);
      }
    });

    return sections;
  }

  // Related services
  async getRelatedServices(serviceId) {
    // 1 Get category of current service
    const [[service]] = await db.execute(
      `SELECT category_id FROM services WHERE id = ?`,
      [serviceId],
    );

    if (!service) return [];

    const categoryId = service.category_id;

    // 2 Fetch related services
    const [rows] = await db.execute(
      `
  SELECT 
    s.id,
    s.name,
    s.show_enquiry,
    s.total_orders,

    sv.id AS variant_id,
    sv.price,
    sv.original_price AS mrp,
    sv.title,
    sv.image_url

  FROM services s

  JOIN (
    SELECT service_id, MIN(price) AS min_price
    FROM service_variants
    GROUP BY service_id
  ) vmin ON vmin.service_id = s.id

  JOIN service_variants sv 
    ON sv.service_id = s.id 
    AND sv.price = vmin.min_price

  WHERE 
    s.category_id = ?
    AND s.id != ?
    AND s.status = 1

  ORDER BY s.total_orders DESC, sv.price ASC
  LIMIT 10
  `,
      [categoryId, serviceId],
    );

    return rows.map((r) => ({
      service_id: r.id,
      variant_id: r.variant_id,
      name: r.name,
      enquiry: r.show_enquiry,
      title: r.title,
      price: Number(r.price),
      mrp: Number(r.mrp),
      image_url: r.image_url ? getPublicUrl(r.image_url) : null,

      // extra UI helpers
      discount_percent: r.mrp
        ? Math.round(((r.mrp - r.price) / r.mrp) * 100)
        : 0,

      coins: Math.floor(Number(r.price) * 0.1), // optional
    }));
  }
}

module.exports = new ServiceModel();
