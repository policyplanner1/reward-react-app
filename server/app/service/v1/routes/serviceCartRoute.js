const express = require("express");
const router = express.Router();
const ServiceCartController = require("../controllers/serviceCartController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// add to cart
router.post("/add", auth, ServiceCartController.addToCart);

// Get cart
router.get("/cart-items", auth, ServiceCartController.getCart);

module.exports = router;
