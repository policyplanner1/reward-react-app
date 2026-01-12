const express = require("express");
const router = express.Router();
const CheckoutController = require("../controllers/checkoutController");
const auth = require("../middlewares/auth");

// get cart checkout Details
// router.get("/get-cart", auth, CheckoutController.getCheckoutCart);
router.get("/get-cart", CheckoutController.getCheckoutCart);

// Get buy now checkout Details
// router.get("/get-buy-now", auth, CheckoutController.getBuyNowCheckout);
router.get("/get-buy-now", CheckoutController.getBuyNowCheckout);

// Place Order from Cart
// router.post("/cart", auth, CheckoutController.checkoutCart);
router.post("/cart", CheckoutController.checkoutCart);

// place Order from Buy Now
// router.post("/buy-now", auth, CheckoutController.buyNow);
router.post("/buy-now", CheckoutController.buyNow);

module.exports = router;
