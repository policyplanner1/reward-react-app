const express = require("express");
const router = express.Router();
const ServiceCheckoutController = require("../controllers/serviceCheckoutController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// add to checkout
router.post("/cart", auth, ServiceCheckoutController.addToCheckout);

// buy now
router.post("/buy-now", auth, ServiceCheckoutController.buyNow);

module.exports = router;
