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
        media,
      } = req.body;

      // Basic validation
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Invalid rating" });
      }

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

      // Media (optional)
      if (media && media.length > 0) {
        await ReviewModel.addReviewMedia(reviewId, media, conn);
      }

      await conn.commit();

      res.status(201).json({
        success: true,
        message: "Review submitted successfully",
      });
    } catch (err) {
      await conn.rollback();
      console.error(err);
      res.status(500).json({ message: "Failed to submit review" });
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
