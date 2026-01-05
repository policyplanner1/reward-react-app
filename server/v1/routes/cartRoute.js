const express = require("express");
const router = express.Router();
const CartController = require("../controllers/cartController");
const auth = require("../middlewares/auth");

/* ======================================================cart============================================ */
router.get("/cart", auth, CartController.getCart);

module.exports = router;
