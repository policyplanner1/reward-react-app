const express = require("express");
const router = express.Router();
const ProductController = require("../controllers/productController");
const auth = require("../middlewares/auth");
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

// similar Products
router.get(
  "/similar/:productId",
  ProductController.getSimilarProducts
);

// autosuggest products
router.get("/search/suggestions", ProductController.getSearchSuggestions);

// Load Products
router.get("/search/products", ProductController.loadProducts);

// save search history
router.post("/search/history", ProductController.saveSearchHistory);

//fetch search history
router.get("/search/history", ProductController.getSearchHistory);

module.exports = router;
