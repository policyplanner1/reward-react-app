const express = require("express");
const router = express.Router();
const CheckoutController = require("../controllers/checkoutController");
const auth = require("../middlewares/auth");

// Place Order from Cart
router.post("/cart", auth, CheckoutController.checkoutCart);

// place Order from Buy Now
router.post("/buy-now", auth, CheckoutController.buyNow);

// get cart checkout Details
router.get("/cart", auth, CheckoutController.getCheckoutCart);

// Get buy now checkout Details


module.exports = router;
