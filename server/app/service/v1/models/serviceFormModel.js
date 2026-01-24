const db = require("../../../../config/database");

class ServiceFormModel {
  async findFormByServiceId(serviceId) {
    const [rows] = await db.execute(
      `SELECT label, field_name, field_type, options, is_required
     FROM service_enquiry_fields
     WHERE service_id = ?
     ORDER BY sort_order`,
      [serviceId],
    );

    return rows.map((r) => ({
      ...r,
      options: r.options ? JSON.parse(r.options) : null,
    }));
  }
}

module.exports = new ServiceFormModel();
