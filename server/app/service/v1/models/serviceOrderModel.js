const db = require("../../../../config/database");

class ServiceOrderModel {
  async create(data) {
    const [result] = await db.execute(
      `INSERT INTO service_orders
    (user_id, service_id, variant_id, enquiry_id, price, status)
    VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.service_id,
        data.variant_id,
        data.enquiry_id,
        data.price,
        data.status,
      ],
    );

    const insertId = result.insertId;
    const ref = `SP-ORD-${1000 + insertId}`;

    await db.execute(`UPDATE service_orders SET order_ref = ? WHERE id = ?`, [
      ref,
      insertId,
    ]);

    return {
      id: insertId,
      order_ref: ref,
    };
  }
}

module.exports = new ServiceOrderModel();
