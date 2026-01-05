const express = require("express");
const router = express.Router();
const CartController = require("../controllers/cartController");

/* ======================================================cart============================================ */
router.get("/cart", CartController.getCart);
router.post("/cart", CartController.addToCart);