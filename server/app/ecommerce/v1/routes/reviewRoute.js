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

// mark review helpful
router.post("/:reviewId/helpful", auth, ReviewController.markReviewHelpful);

// remove helpful vote
router.delete("/:reviewId/helpful", auth, ReviewController.removeHelpfulVote);

module.exports = router;
