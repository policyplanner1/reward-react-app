const express = require("express");
const router = express.Router();
const ProductController = require("../../app/controllers/productController");

// Product Listing
router.get("/all-products", ProductController.getAllProducts);

// get Products by Category
router.get("/by-category/:categoryId", ProductController.getProductsByCategory);

// Get a Product by ID
router.get("/by-product/:productId", ProductController.getProductById);

// categories
router.get("/categories", ProductController.getCategories);

// subcategories by category ID
router.get("/subcategories/:categoryId", ProductController.getSubcategoriesByCategory);


// autosuggest products
router.get("/search/suggestions", ProductController.getSearchSuggestions);

// Load Products
router.get("/search/products", ProductController.loadProducts);



module.exports = router;
