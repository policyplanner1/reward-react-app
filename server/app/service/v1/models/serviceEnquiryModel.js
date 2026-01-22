const db = require("../../../../config/database");

class ServiceEnquiryModel {
  async create(data) {
    const [result] = await db.execute(
      `INSERT INTO service_enquiries
      (service_id, name, city, mobile, email, enquiry_data)
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.service_id,
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
}

module.exports = new ServiceEnquiryModel();
