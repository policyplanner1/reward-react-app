const express = require("express");
const router = express.Router();
const CheckoutController = require("../controllers/checkoutController");
const auth = require("../middlewares/auth");


router.post("/cart", auth, CheckoutController.checkoutCart);
router.post("/buy-now", auth, CheckoutController.buyNow);

module.exports = router;
