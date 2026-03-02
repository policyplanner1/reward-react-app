const ReviewModel = require("../models/reviewModel");
const db = require("../../../../config/database");

class ReviewController {
  // submit review
  async submitReview(req, res) {
    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const userId = req.user?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const {
        product_id,
        variant_id,
        order_id,
        rating,
        value_for_money,
        good_quality,
        smooth_experience,
        review_text,
      } = req.body;

      // Basic validation
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Invalid rating" });
      }

      //  1 verify purchase
      const [orderCheck] = await conn.execute(
        `
       SELECT 1
        FROM eorders o
        JOIN eorder_items oi ON oi.order_id = o.order_id
        WHERE o.order_id = ?
        AND o.user_id = ?
        AND o.status = 'delivered'
        AND oi.variant_id = ?
        LIMIT 1;
        `,
        [order_id, userId, variant_id],
      );

      if (orderCheck.length === 0) {
        await conn.rollback();
        return res.status(400).json({
          success: false,
          message: "Product not eligible for review",
        });
      }

      //   2 Insert Review
      const reviewId = await ReviewModel.createReview(
        {
          user_id: userId,
          product_id,
          variant_id,
          order_id,
          rating,
          value_for_money,
          good_quality,
          smooth_experience,
          review_text,
        },
        conn,
      );

      //   3 update product rating summary
      await conn.execute(
        `
      UPDATE eproducts
      SET 
        avg_rating = ((avg_rating * rating_count + ?) / (rating_count + 1)),
        rating_count = rating_count + 1
      WHERE product_id = ?
    `,
        [rating, product_id],
      );

      await conn.commit();

      res.status(201).json({
        success: true,
        message: "Review submitted successfully",
      });
    } catch (err) {
      await conn.rollback();
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          success: false,
          message: "You already reviewed this product",
        });
      }

      console.error(err);
      return res.status(500).json({ message: "Failed to submit review" });
    } finally {
      conn.release();
    }
  }

  //  fetch reviews
  async getProductReviews(req, res) {
    try {
      const { productId } = req.params;

      const reviews = await ReviewModel.getProductReviews(productId);

      const reviewIds = reviews.map((r) => r.review_id);
      const media = await ReviewModel.getReviewMedia(reviewIds);

      const groupedMedia = {};

      media.forEach((m) => {
        if (!groupedMedia[m.review_id]) {
          groupedMedia[m.review_id] = [];
        }
        groupedMedia[m.review_id].push(m);
      });

      const final = reviews.map((r) => ({
        ...r,
        media: groupedMedia[r.review_id] || [],
      }));

      res.json(final);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  }
}
module.exports = new ReviewController();
