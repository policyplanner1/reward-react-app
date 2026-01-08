const express = require("express");
const router = express.Router();
const CartController = require("../controllers/cartController");
const auth = require("../middlewares/auth");

/* ======================================================cart============================================ */
// get cart
// router.get("/cart-items", auth, CartController.getCart);
router.get("/cart-items", CartController.getCart);

// add to cart
// router.post("/cart-item", auth, CartController.addToCart);
router.post("/cart-item", CartController.addToCart);

// check quantity
router.get("/cart-items/check-stock/:variantId", CartController.checkStock);

// update cart
// router.put("/cart-items/:cart_item_id", auth, CartController.updateCartItem);
router.put("/cart-items/:cart_item_id", CartController.updateCartItem);

// delete cart
// router.delete("/cart-items/:cart_item_id", auth, CartController.deleteCartItem);
router.delete("/cart-items/:cart_item_id", CartController.deleteCartItem);

// remove all cart items
// router.delete("/cart-items", auth, CartController.clearCart);
router.delete("/cart-items", CartController.clearCart);
/* ======================================================cart============================================ */

module.exports = router;
