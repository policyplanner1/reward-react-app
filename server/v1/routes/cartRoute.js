const express = require("express");
const router = express.Router();
const CartController = require("../controllers/cartController");
const auth = require("../middlewares/auth");

/* ======================================================cart============================================ */
// get cart
router.get("/cart", auth, CartController.getCart);

// add to cart
router.post("/cart", auth, CartController.addToCart);

// check quantity
router.get("/cart/check-stock/:variantId", auth, CartController.checkStock);

// update cart
router.put("/cart/:cart_item_id", auth, CartController.updateCartItem);

// delete cart
router.delete("/cart/:cart_item_id", auth, CartController.deleteCartItem);

// remove all cart items
router.delete("/cart", auth, CartController.clearCart);
/* ======================================================cart============================================ */

module.exports = router;
