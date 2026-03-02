const express = require("express");
const router = express.Router();
const ReviewController = require("../controllers/reviewController");
const auth = require("../middlewares/auth");

/*===================================================Review===========================================*/

// Add review
router.post(
  "/create-review",
  auth,
  ReviewController.createReview,
);

// fetch reviews
router.get("/:product_id", ReviewController.getProductReviews);

module.exports = router;
