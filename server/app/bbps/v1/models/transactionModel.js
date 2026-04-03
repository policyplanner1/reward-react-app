const db = require("../../../../config/database");

class TransactionModel {
  // create a new transaction
  async create(data) {
    const sql = `
    INSERT INTO bbps_transactions 
    (user_id, operator_id, utility_acc_no, cycle_number, amount, bbps_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
    const [res] = await db.execute(sql, [
      data.user_id,
      data.operator_id,
      data.utility_acc_no,
      data.cycle_number,
      data.amount,
      "INIT",
    ]);
    return res.insertId;
  }

  //   Link payment reference number to transaction
  async linkPayment(transaction_id, payment_id) {
    await db.execute(`UPDATE bbps_transactions SET payment_id=? WHERE id=?`, [
      payment_id,
      transaction_id,
    ]);
  }

  //  update Transaction status
  async updateStatus(transaction_id, status, response) {
    await db.execute(
      `UPDATE bbps_transactions SET bbps_status=?, bbps_response=? WHERE id=?`,
      [status, JSON.stringify(response), transaction_id],
    );
  }

  // get transaction by id
  async getByPaymentId(payment_id) {
    const [rows] = await db.execute(
      `SELECT * FROM bbps_transactions WHERE payment_id=?`,
      [payment_id],
    );
    return rows[0];
  }

  // get retryable transactions
  async getRetryable() {
    const [rows] = await db.execute(`
    SELECT * FROM bbps_transactions
    WHERE bbps_status = 'FAILED_RETRY'
    AND retry_count < max_retry
  `);

    return rows;
  }

  // Increment retry count
  async incrementRetry(id) {
    await db.execute(
      `
    UPDATE bbps_transactions 
    SET retry_count = retry_count + 1 
    WHERE id = ?
  `,
      [id],
    );
  }

  // Get transaction By ID
  async getById(id) {
    const [rows] = await db.execute(
      `SELECT * FROM bbps_transactions WHERE id = ?`,
      [id],
    );

    return rows[0];
  }

  // Get transaction by status
  async getByStatus(status) {
    const [rows] = await db.execute(
      `SELECT * FROM bbps_transactions WHERE bbps_status = ?`,
      [status],
    );

    return rows;
  }
}

module.exports = new TransactionModel();
