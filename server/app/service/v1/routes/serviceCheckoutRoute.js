const express = require("express");
const router = express.Router();
const ServiceCheckoutController = require("../controllers/serviceCheckoutController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// add to checkout
router.post("/cart", auth, ServiceCheckoutController.addToCheckout);

// bundle checkout
router.post("/bundle", auth, ServiceCheckoutController.bundleCheckout);

// buy now
router.post("/buy-now", auth, ServiceCheckoutController.buyNow);

// get cart checkout Details
router.get("/checkout-preview", auth, ServiceCheckoutController.getCheckoutPreview);

// Get buy now checkout Details
router.get("/buy-now-preview", auth, ServiceCheckoutController.getBuyNowPreview);


module.exports = router;
