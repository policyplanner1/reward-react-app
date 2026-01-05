const express = require("express");
const router = express.Router();
const CartController = require("../controllers/cartController");
const auth = require("../middlewares/auth");

/* ======================================================cart============================================ */
// get cart
router.get("/cart", auth, CartController.getCart);

// add to cart
router.post("/cart", auth, CartController.addToCart);

module.exports = router;
