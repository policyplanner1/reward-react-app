const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class WalletModel {
  // create wallet
  async createWalletOnFirstLogin(userId) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const FIRST_LOGIN_REWARD = 3000;

      // check wallet
      const [wallet] = await conn.execute(
        `SELECT wallet_id
         FROM customer_wallet
         WHERE user_id = ?`,
        [userId],
      );

      if (wallet.length > 0) {
        await conn.commit();
        return false;
      }

      // create wallet
      await conn.execute(
        `INSERT INTO customer_wallet
        (user_id, balance)
        VALUES (?, ?)`,
        [userId, FIRST_LOGIN_REWARD],
      );

      // insert transaction
      await conn.execute(
        `INSERT INTO wallet_transactions
        (user_id, title, description, transaction_type, coins, category)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          "Welcome Bonus",
          "First login reward",
          "credit",
          FIRST_LOGIN_REWARD,
          "reward",
        ],
      );

      await conn.commit();

      return true;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
}

module.exports = new WalletModel();
