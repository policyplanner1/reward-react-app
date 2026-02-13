const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class authModel {
   /* ======================================================
     BASIC USER QUERIES
  ====================================================== */

  async findByEmail(email) {
    const [rows] = await db.execute(
      `SELECT user_id, email, password, status, is_verified, token_version
       FROM customer
       WHERE email = ?`,
      [email]
    );
    return rows[0];
  }
  

  async findById(userId) {
    const [rows] = await db.execute(
      `SELECT user_id, name, email, status, is_verified, token_version
       FROM customer
       WHERE user_id = ?`,
      [userId]
    );
    return rows[0];
  }

  async createCustomer(data) {
    const {
      name,
      email,
      phone,
      password,
      verification_token,
      verification_token_expiry,
    } = data;

    const [result] = await db.execute(
      `INSERT INTO customer
       (name, email, phone, password,
        verification_token, verification_token_expiry)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        phone,
        password,
        verification_token,
        verification_token_expiry,
      ]
    );

    return result.insertId;
  }

  /* ======================================================
     EMAIL VERIFICATION
  ====================================================== */

  async findByVerificationToken() {
    const [rows] = await db.execute(
      `SELECT user_id, verification_token, verification_token_expiry
       FROM customer
       WHERE verification_token IS NOT NULL`
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
      [userId]
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
      [hashedToken, expiryDate, userId]
    );
  }

  async findByResetToken() {
    const [rows] = await db.execute(
      `SELECT user_id, reset_token, reset_token_expiry
       FROM customer
       WHERE reset_token IS NOT NULL`
    );
    return rows;
  }

  async updatePassword(userId, hashedPassword) {
    await db.execute(
      `UPDATE customer
       SET password = ?,
           reset_token = NULL,
           reset_token_expiry = NULL
       WHERE user_id = ?`,
      [hashedPassword, userId]
    );
  }

  async incrementTokenVersion(userId) {
    await db.execute(
      `UPDATE customer
       SET token_version = token_version + 1
       WHERE user_id = ?`,
      [userId]
    );
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
      [ipAddress, userId]
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
      [userId, token, expiresAt, deviceInfo, ipAddress]
    );
  }

  async findRefreshToken(userId, token) {
    const [rows] = await db.execute(
      `SELECT id
       FROM customer_refresh_tokens
       WHERE user_id = ?
         AND token = ?
         AND expires_at > NOW()`,
      [userId, token]
    );
    return rows[0];
  }

  async deleteRefreshToken(userId, token) {
    await db.execute(
      `DELETE FROM customer_refresh_tokens
       WHERE user_id = ? AND token = ?`,
      [userId, token]
    );
  }

  async deleteAllUserRefreshTokens(userId) {
    await db.execute(
      `DELETE FROM customer_refresh_tokens
       WHERE user_id = ?`,
      [userId]
    );
  }

  async cleanupExpiredRefreshTokens() {
    await db.execute(
      `DELETE FROM customer_refresh_tokens
       WHERE expires_at <= NOW()`
    );
  }
  /*==============================Review============================*/
  // check if review Exist

  async reviewExists(userId, variantId, orderId) {
    const [rows] = await db.execute(
      `
      SELECT review_id
      FROM product_reviews
      WHERE user_id = ? AND variant_id = ? AND order_id <=> ?
      `,
      [userId, variantId, orderId]
    );

    return rows.length > 0;
  }

  // add Review
  async addReview(data) {
    const {
      user_id,
      product_id,
      variant_id,
      order_id,
      rating,
      value_for_money,
      good_quality,
      smooth_experience,
      review_text,
    } = data;

    const [result] = await db.execute(
      `
      INSERT INTO product_reviews (
        user_id,
        product_id,
        variant_id,
        order_id,
        rating,
        value_for_money,
        good_quality,
        smooth_experience,
        review_text
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user_id,
        product_id,
        variant_id,
        order_id,
        rating,
        value_for_money,
        good_quality,
        smooth_experience,
        review_text,
      ]
    );

    return result.insertId;
  }

  // add Review Media
  async addReviewMedia(reviewId, mediaList) {
    if (!mediaList.length) return;

    const values = mediaList.map((m, index) => [
      reviewId,
      m.media_url,
      m.media_type,
      index + 1,
    ]);

    await db.query(
      `
      INSERT INTO product_review_media
      (review_id, media_url, media_type, sort_order)
      VALUES ?
      `,
      [values]
    );
  }

  // Get Review By Products
  async  getReviewsByProduct(productId) {
    const [reviews] = await db.execute(
      `
      SELECT
        r.review_id,
        r.rating,
        r.review_text,
        r.value_for_money,
        r.good_quality,
        r.smooth_experience,
        r.created_at,
        c.name AS customer_name
      FROM product_reviews r
      JOIN customer c ON c.user_id = r.user_id
      WHERE r.product_id = ?
        AND r.status = 'approved'
      ORDER BY r.created_at DESC
      `,
      [productId]
    );

    for (const review of reviews) {
      const [media] = await db.execute(
        `
        SELECT media_url, media_type
        FROM product_review_media
        WHERE review_id = ?
        ORDER BY sort_order
        `,
        [review.review_id]
      );

      review.media = media;
    }

    return reviews;
  }
}

module.exports = new authModel();
