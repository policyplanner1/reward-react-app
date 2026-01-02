const express = require("express");
const router = express.Router();
const  ProductController = require("../../app/controllers/productController");
const { authenticateToken, authorizeRoles } = require("../../middleware/auth");

// Get all products
router.get(
  "/all-products",
  ProductController.getAllProducts
);

module.exports = router;
