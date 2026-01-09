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

// autosuggest products
router.get("/search/suggestions", ProductController.getSearchSuggestions);

// Load Products
router.get("/search/products", ProductController.loadProducts);

// search history
router.post("/search/history", ProductController.saveSearchHistory);
router.get("/search/history", ProductController.getSearchHistory);

/*==================================================Wishlist======================================*/
// add to wishlist
router.post("/wishlist", auth, ProductController.addToWishlist);

// remove from wishlist
router.delete(
  "/wishlist/:product_id/:variant_id",
  auth,
  ProductController.removeFromWishlist
);

// get my wishlist
router.get("/wishlist", auth, ProductController.getMyWishlist);

// check wishlist
router.get(
  "/wishlist/check/:product_id/:variant_id",
  auth,
  ProductController.checkWishlist
);

module.exports = router;
