const db = require("../../../../config/database");

class PaymentModel {
  // crete a payment
  async create(data) {
    const sql = `
    INSERT INTO bbps_payments (user_id, order_id, amount, status)
    VALUES (?, ?, ?, ?)
  `;
    const [result] = await db.execute(sql, [
      data.user_id,
      data.order_id,
      data.amount,
      data.status,
    ]);
    return result.insertId;
  }

  //   update payment status
  async updateStatus(order_id, status, payload, conn) {
    const sql = `
    UPDATE bbps_payments 
    SET status=?, payment_response=? 
    WHERE order_id=?
  `;
    await conn.execute(sql, [status, JSON.stringify(payload), order_id]);
  }

  // get payment by order id
  async getByOrderId(order_id, conn) {
    const [rows] = await conn.execute(
      `SELECT * FROM bbps_payments WHERE order_id=?`,
      [order_id],
    );
    return rows[0];
  }
}

module.exports = new PaymentModel();
