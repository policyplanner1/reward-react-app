const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class WalletModel {
  // create wallet
  async createWalletOnFirstLogin(userId) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      let FIRST_LOGIN_REWARD = 3000; 

      // check if wallet already exists
      const [wallet] = await conn.execute(
        `SELECT wallet_id FROM customer_wallet WHERE user_id = ?`,
        [userId],
      );

      if (wallet.length > 0) {
        await conn.commit();
        return false;
      }

      // create wallet with 3000 coins
      await conn.execute(
        `INSERT INTO customer_wallet (user_id, balance)
         VALUES (?, ?)`,
        [userId, FIRST_LOGIN_REWARD],
      );

      // add transaction record
      await conn.execute(
        `INSERT INTO wallet_transactions
         (user_id, activity, coins, reference_type)
         VALUES (?, ?, ?, ?)`,
        [userId, "First Login Bonus", FIRST_LOGIN_REWARD, "FIRST_LOGIN"],
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
