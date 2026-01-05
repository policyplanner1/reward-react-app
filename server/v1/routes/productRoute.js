const express = require("express");
const router = express.Router();
const ProductController = require("../controllers/productController");

/* ======================================================Product Listing============================================ */

// Product Listing
router.get("/all-products", ProductController.getAllProducts);

// get Products by Category
router.get("/by-category/:categoryId", ProductController.getProductsByCategory);

// Get a Product by ID
router.get("/product-details/:productId", ProductController.getProductById);

// products by subcategory ID
router.get(
  "/by-subcategory/:subcategoryId",
  ProductController.getProductsBySubcategory
);

/* ======================================================Categories============================================ */

// categories
router.get("/categories", ProductController.getCategories);

// subcategories list by category ID
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
