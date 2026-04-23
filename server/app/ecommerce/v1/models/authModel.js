const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class authModel {
  /* ======================================================
     BASIC USER QUERIES
  ====================================================== */

  async findByEmail(email) {
    const [rows] = await db.execute(
      `SELECT user_id, name, email, password, status, is_verified, token_version
       FROM customer
       WHERE email = ?`,
      [email],
    );
    return rows[0];
  }

  async findById(userId) {
    const [rows] = await db.execute(
      `SELECT user_id, name, email, status, is_verified, token_version,last_login_at
       FROM customer
       WHERE user_id = ?`,
      [userId],
    );
    return rows[0];
  }

  // async createCustomer(data) {
  //   const {
  //     name,
  //     email,
  //     phone,
  //     password,
  //     verification_token,
  //     verification_token_expiry,
  //   } = data;

  //   const [result] = await db.execute(
  //     `INSERT INTO customer
  //      (name, email, phone, password,
  //       verification_token, verification_token_expiry)
  //      VALUES (?, ?, ?, ?, ?, ?)`,
  //     [
  //       name,
  //       email,
  //       phone,
  //       password,
  //       verification_token,
  //       verification_token_expiry,
  //     ],
  //   );

  //   return result.insertId;
  // }

  /* ======================================================
     ACCOUNT ACTIVATION
  ====================================================== */

  async findEmployeeByEmail(email) {
    const [rows] = await db.execute(
      `SELECT 
        id,
        company_id,
        name,
        email,
        contact AS phone
     FROM company_users
     WHERE email = ?
     LIMIT 1`,
      [email.toLowerCase()],
    );

    return rows[0];
  }

  async storeActivationOTP(email, otp) {
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.execute(
      `INSERT INTO email_otps
     (email, otp, expiry)
     VALUES (?, ?, ?)`,
      [email.toLowerCase(), otp, expiry],
    );
  }

  async verifyOTP(email, otp) {
    const [rows] = await db.execute(
      `SELECT id, attempt_count
     FROM email_otps
     WHERE email = ?
     AND otp = ?
     AND expiry > NOW()
     LIMIT 1`,
      [email, otp],
    );

    return rows[0];
  }

  async incrementOtpAttempts(email) {
    await db.execute(
      `UPDATE email_otps
     SET attempt_count = attempt_count + 1
     WHERE email = ?`,
      [email],
    );
  }

  async getOtpAttempts(email) {
    const [rows] = await db.execute(
      `SELECT attempt_count
     FROM email_otps
     WHERE email = ?
     ORDER BY id DESC
     LIMIT 1`,
      [email],
    );

    return rows[0];
  }

  async markOTPVerified(email) {
    await db.execute(
      `UPDATE email_otps
     SET is_verified = 1
     WHERE email = ?
     ORDER BY id DESC
     LIMIT 1`,
      [email],
    );
  }

  async checkOTPVerified(email) {
    const [rows] = await db.execute(
      `SELECT is_verified
     FROM email_otps
     WHERE email = ?
     ORDER BY id DESC
     LIMIT 1`,
      [email],
    );

    return rows[0]?.is_verified === 1;
  }

  async deleteOTP(email) {
    await db.execute(
      `DELETE FROM email_otps
     WHERE email = ?`,
      [email.toLowerCase()],
    );
  }

  async createCustomer(data) {
    const { company_id, company_user_id, name, email, phone, password } = data;
    const normalizedPhone = phone ? phone : "";

    const [result] = await db.execute(
      `INSERT INTO customer
     (
       company_id,
       company_user_id,
       name,
       email,
       phone,
       password,
       is_verified
     )
     VALUES (?,?, ?, ?, ?, ?, 1)`,
      [
        company_id,
        company_user_id,
        name,
        email.toLowerCase(),
        normalizedPhone,
        password,
      ],
    );

    return result.insertId;
  }

  /* ======================================================
     EMAIL VERIFICATION
  ====================================================== */

  async findByVerificationToken() {
    const [rows] = await db.execute(
      `SELECT user_id, name, verification_token, verification_token_expiry
       FROM customer
       WHERE verification_token IS NOT NULL`,
    );
    return rows;
  }

  async markEmailVerified(userId) {
    await db.execute(
      `UPDATE customer
       SET is_verified = 1,
           verification_token = NULL,
           verification_token_expiry = NULL
       WHERE user_id = ?`,
      [userId],
    );
  }

  /* ======================================================
     PASSWORD RESET
  ====================================================== */

  async saveResetToken(userId, hashedToken, expiryDate) {
    await db.execute(
      `UPDATE customer
       SET reset_token = ?,
           reset_token_expiry = ?
       WHERE user_id = ?`,
      [hashedToken, expiryDate, userId],
    );
  }

  async findByResetToken() {
    const [rows] = await db.execute(
      `SELECT user_id, reset_token, reset_token_expiry
       FROM customer
       WHERE reset_token IS NOT NULL`,
    );
    return rows;
  }

  async getUserPassword(conn, userId) {
    const [rows] = await conn.execute(
      `SELECT password FROM customer WHERE user_id = ?`,
      [userId],
    );

    return rows[0];
  }

  async updatePassword(conn, userId, hashedPassword) {
    await conn.execute(
      `UPDATE customer
       SET password = ?,
           reset_token = NULL,
           reset_token_expiry = NULL
       WHERE user_id = ?`,
      [hashedPassword, userId],
    );
  }

  async incrementTokenVersion(conn, userId) {
    await conn.execute(
      `UPDATE customer
       SET token_version = token_version + 1
       WHERE user_id = ?`,
      [userId],
    );
  }
  /* ======================================================
     CHECK EXISTING DEVICE
  ====================================================== */
  async checkExistingDevice(userId, deviceInfo) {
    const [rows] = await db.execute(
      `SELECT id
     FROM customer_refresh_tokens
     WHERE user_id = ?
     AND device_info = ?
     LIMIT 1`,
      [userId, deviceInfo],
    );

    return rows.length > 0;
  }

  /* ======================================================
     LOGIN TRACKING
  ====================================================== */

  async updateLoginMeta(userId, ipAddress) {
    await db.execute(
      `UPDATE customer
       SET last_login_at = NOW(),
           last_login_ip = ?
       WHERE user_id = ?`,
      [ipAddress, userId],
    );
  }

  /* ======================================================
     REFRESH TOKEN MANAGEMENT
  ====================================================== */

  async storeRefreshToken(userId, token, expiresAt, deviceInfo, ipAddress) {
    await db.execute(
      `INSERT INTO customer_refresh_tokens
       (user_id, token, expires_at, device_info, ip_address)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, token, expiresAt, deviceInfo, ipAddress],
    );
  }

  async findRefreshToken(userId, token) {
    const [rows] = await db.execute(
      `SELECT id
       FROM customer_refresh_tokens
       WHERE user_id = ?
         AND token = ?
         AND expires_at > NOW()`,
      [userId, token],
    );
    return rows[0];
  }

  async deleteRefreshToken(userId, token) {
    await db.execute(
      `DELETE FROM customer_refresh_tokens
       WHERE user_id = ? AND token = ?`,
      [userId, token],
    );
  }

  async deleteAllUserRefreshTokens(conn, userId) {
    await conn.execute(
      `DELETE FROM customer_refresh_tokens
       WHERE user_id = ?`,
      [userId],
    );
  }

  async cleanupExpiredRefreshTokens() {
    await db.execute(
      `DELETE FROM customer_refresh_tokens
       WHERE expires_at <= NOW()`,
    );
  }

  /* ======================================================
    verification token management
  ====================================================== */
  async updateVerificationToken(userId, hashedToken, expiry) {
    await db.execute(
      `UPDATE customer
     SET verification_token = ?,
         verification_token_expiry = ?
     WHERE user_id = ?`,
      [hashedToken, expiry, userId],
    );
  }

  // Customer Info
  async getUserInfo(userId) {
    const [[user]] = await db.execute(
      `
    SELECT 
      cu.user_id,
      cu.name,
      cu.email,
      cu.phone,

      cw.balance AS reward_points,

      ca.address_id,
      ca.address_type,
      ca.address1,
      ca.address2,
      ca.city,
      ca.zipcode,
      ca.landmark,

      s.state_name,
      c.country_name

    FROM customer cu

    LEFT JOIN customer_wallet cw
    ON cu.user_id = cw.user_id

    LEFT JOIN customer_addresses ca
      ON cu.user_id = ca.user_id
      AND ca.is_default = 1
      AND ca.status = 1

    LEFT JOIN states s
      ON ca.state_id = s.state_id

    LEFT JOIN countries c
      ON ca.country_id = c.country_id

    WHERE cu.user_id = ?
      AND cu.status = 1

    LIMIT 1
    `,
      [userId],
    );

    if (!user) return null;

    return {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      phone: user.phone,

      rewardPoints: user.reward_points ?? 0,

      defaultAddress: user.address_id
        ? {
            addressId: user.address_id,
            type: user.address_type,
            line1: user.address1,
            line2: user.address2,
            city: user.city,
            state: user.state_name,
            country: user.country_name,
            zipcode: user.zipcode,
            landmark: user.landmark,
          }
        : null,
    };
  }

  // Delete Customer
  async deleteCustomerAccount(userId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Soft delete customer
      await connection.execute(
        `UPDATE customer
       SET status = 0,
           token_version = token_version + 1
       WHERE user_id = ?`,
        [userId],
      );

      // Remove cart items
      await connection.execute(`DELETE FROM cart_items WHERE user_id = ?`, [
        userId,
      ]);

      // Remove wishlist
      await connection.execute(
        `DELETE FROM customer_wishlist WHERE user_id = ?`,
        [userId],
      );

      // Remove addresses
      await connection.execute(
        `DELETE FROM customer_addresses WHERE user_id = ?`,
        [userId],
      );

      // Remove notifications
      await connection.execute(`DELETE FROM notifications WHERE user_id = ?`, [
        userId,
      ]);

      // Remove refresh tokens
      await connection.execute(
        `DELETE FROM customer_refresh_tokens WHERE user_id = ?`,
        [userId],
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
}

module.exports = new authModel();
