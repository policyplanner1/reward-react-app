const express = require("express");
const router = express.Router();
const ReviewController = require("../controllers/reviewController");
const auth = require("../middlewares/auth");
const optionalAuth = require("../middlewares/optionalAuth");
const reviewUpload = require("../../../../middleware/reviewUpload");

/*===================================================Review===========================================*/

// Add review
router.post("/create-review", auth, ReviewController.submitReview);

// upload media after review creation
router.post(
  "/:reviewId/media",
  auth,
  reviewUpload.array("media", 5),
  ReviewController.uploadReviewMedia,
);

// fetch reviews
router.get("/all-reviews/:product_id",optionalAuth, ReviewController.getProductReviews);
// GET /reviews/10?sort=helpful
// GET /reviews/10?sort=rating_high
// GET /reviews/10?sort=rating_low
// GET /reviews/25?rating=1
// GET /reviews/25?rating=5&sort=helpful
// GET /reviews/:product_id?page=1&limit=10
// GET /reviews/:product_id?rating=5&page=1
// GET /reviews/:product_id?sort=helpful&page=2&limit=5

// mark review helpful
router.post("/:reviewId/helpful", auth, ReviewController.markReviewHelpful);

// remove helpful vote
router.delete("/:reviewId/helpful", auth, ReviewController.removeHelpfulVote);

module.exports = router;
