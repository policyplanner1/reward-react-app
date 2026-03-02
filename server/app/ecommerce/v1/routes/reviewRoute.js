const express = require("express");
const router = express.Router();
const ReviewController = require("../controllers/reviewController");
const auth = require("../middlewares/auth");
const reviewUpload = require("../../../../middleware/reviewUpload");

/*===================================================Review===========================================*/

// Add review
router.post(
  "/create-review",
  auth,
  ReviewController.submitReview,
);

// upload media after review creation
router.post(
  "/:reviewId/media",
  auth,
  reviewUpload.array("media", 5),
  ReviewController.uploadReviewMedia
);

// fetch reviews
router.get("/:product_id", ReviewController.getProductReviews);

module.exports = router;
