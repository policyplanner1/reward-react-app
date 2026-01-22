const express = require("express");
const router = express.Router();
const v1ProductRoutes = require("./productRoute");
const v1CartRoutes = require("./cartRoute");
const v1CheckoutRoutes = require("./checkoutRoute");
const v1OrderRoutes = require("./ordersRoute");
const v1AuthRoutes = require("./authRoute");
const v1WishlistRoutes = require("./wishlistRoute");


router.use("/auth", v1AuthRoutes);
router.use("/product", v1ProductRoutes);
router.use("/cart", v1CartRoutes);
router.use("/checkout", v1CheckoutRoutes);
router.use("/orders", v1OrderRoutes);
router.use("/wishlist", v1WishlistRoutes);

module.exports = router;