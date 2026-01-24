const db = require("../../../../config/database");

class ServiceEnquiryModel {
  async create(data) {
    const [result] = await db.execute(
      `INSERT INTO service_enquiries
      (service_id,variant_id, name, city, mobile, email, enquiry_data)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.service_id,
        data.variant_id,
        data.name,
        data.city || null,
        data.mobile,
        data.email || null,
        JSON.stringify(data.enquiry_data || {}),
      ],
    );

    return result.insertId;
  }

  async findAll() {
    const [rows] = await db.execute(
      `SELECT * FROM service_enquiries ORDER BY created_at DESC`,
    );

    // Parse JSON before returning
    return rows.map((r) => ({
      ...r,
      enquiry_data: r.enquiry_data ? JSON.parse(r.enquiry_data) : {},
    }));
  }

  // Get Enquiry By Id
  async findById(id) {
    const [rows] = await db.execute(
      `
    SELECT 
      se.id,
      se.name,
      se.city,
      se.mobile,
      se.email,
      se.status,
      se.enquiry_data,
      se.created_at,
      s.name AS service_name,
      sv.variant_name AS variant_name,
      sv.title as variant_title
    FROM service_enquiries se
    JOIN services s ON s.id = se.service_id
    LEFT JOIN service_variants sv ON sv.id = se.variant_id
    WHERE se.id = ?
    `,
      [id],
    );

    if (!rows.length) return null;

    const r = rows[0];

    return {
      ...r,
      enquiry_data: r.enquiry_data ? JSON.parse(r.enquiry_data) : {},
    };
  }
}

module.exports = new ServiceEnquiryModel();
