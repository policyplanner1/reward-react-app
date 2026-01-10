const db = require("../../config/database");
const fs = require("fs");
const path = require("path");

class authModel {
  // FIND BY EMAIL
  async findByEmail(email) {
    const [rows] = await db.execute(
      "SELECT user_id FROM customer WHERE email = ?",
      [email.toLowerCase()]
    );
    return rows[0];
  }

  // CREATE CUSTOMER
  async createCustomer(data) {
    const { name, email, phone, password } = data;

    const [result] = await db.execute(
      `INSERT INTO customer 
       (name, email, phone, password) 
       VALUES (?, ?, ?, ?)`,
      [name, email.toLowerCase(), phone, password]
    );

    return result.insertId;
  }

  // Login
  async findCustomerForLogin(email) {
    const [rows] = await db.execute(
      `SELECT 
       user_id,
       name,
       email,
       phone,
       password,
       status
     FROM customer
     WHERE email = ?`,
      [email.toLowerCase()]
    );

    return rows[0];
  }

  // Get User By ID
  async getUserById(userId) {
    const [rows] = await db.execute(
      `SELECT user_id, name, email, phone, status 
     FROM customer 
     WHERE user_id = ?`,
      [userId]
    );

    return rows[0];
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
