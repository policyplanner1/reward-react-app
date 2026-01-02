const express = require("express");
const router = express.Router();
const ProductController = require("../../app/controllers/productController");

/* ======================================================Product Listing============================================ */

// Product Listing
router.get("/all-products", ProductController.getAllProducts);

// get Products by Category
router.get("/by-category/:categoryId", ProductController.getProductsByCategory);

// Get a Product by ID
router.get("/by-product/:productId", ProductController.getProductById);

/* ======================================================Categories============================================ */

// categories
router.get("/categories", ProductController.getCategories);

// subcategories by category ID
router.get(
  "/subcategories/:categoryId",
  ProductController.getSubcategoriesByCategory
);

/* ======================================================Suggestion============================================ */

// autosuggest products
router.get("/search/suggestions", ProductController.getSearchSuggestions);

// Load Products
router.get("/search/products", ProductController.loadProducts);

// search history
router.post("/search/history", ProductController.saveSearchHistory);
router.get("/search/history", ProductController.getSearchHistory);






module.exports = router;
