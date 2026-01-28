const db = require("../../../config/database");
const fs = require("fs");
const path = require("path");

class PaymentModel {
  async createTxn(data) {
    const sql = `
    INSERT INTO pg_transactions 
    (order_id, merchant_txn_no, amount, pg_tran_ctx) 
    VALUES (?, ?, ?, ?)
  `;
    await db.execute(sql, [
      data.orderId,
      data.merchantTxnNo,
      data.amount,
      data.tranCtx,
    ]);
  }

  //   Status update
  async updateStatus(merchantTxnNo, status, raw) {
    const sql = `
    UPDATE pg_transactions 
    SET status = ?, raw_response = ?
    WHERE merchant_txn_no = ?
  `;
    await db.execute(sql, [status, JSON.stringify(raw), merchantTxnNo]);
  }

  //   payment settlement
  async markSettled(merchantTxnNo) {
    await db.execute(
      `UPDATE pg_transactions SET settlement_status = 1 WHERE merchant_txn_no = ?`,
      [merchantTxnNo],
    );
  }
}

module.exports = new PaymentModel();
