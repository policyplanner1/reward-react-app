const ProductModel = require("../models/productModel");
const db = require("../../config/database");
const fs = require("fs");
const path = require("path");

class ProductController {
  // all the products
  async getAllProducts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const search = req.query.search || "";
      const sortBy = req.query.sortBy || "created_at";
      const sortOrder =
        req.query.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

      const { products, totalItems } = await ProductModel.getAllProducts({
        search,
        sortBy,
        sortOrder,
        limit,
        offset,
      });

      const processedProducts = products.map((product) => {
        const mainImage =
          product.images && product.images.length
            ? product.images[0].image_url
            : null;

        return {
          id: product.product_id,
          title: product.product_name,
          brand: product.brand_name,
          image: mainImage,

          // Variant pricing
          price: product.sale_price
            ? `₹${Number(product.sale_price).toFixed(0)}`
            : null,

          originalPrice: product.mrp
            ? `₹${Number(product.mrp).toFixed(0)}`
            : null,

          // Dummy values
          discount: "40%",
          rating: 4.6,
          reviews: "18.9K",
          pointsPrice: "₹3,736",
          points: 264,
        };
      });

      return res.json({
        success: true,
        products: processedProducts,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      });
    } catch (err) {
      console.error("Get all products error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // products by category
  async getProductsByCategory(req, res) {
    try {
      const categoryId = Number(req.params.categoryId);

      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: "Invalid category id",
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const search = req.query.search || "";

      // Sorting
      const sortBy = req.query.sortBy || "created_at";
      const sortOrder = req.query.sortOrder || "DESC";

      // Price filters
      const priceMin = req.query.priceMin ? Number(req.query.priceMin) : null;

      const priceMax = req.query.priceMax ? Number(req.query.priceMax) : null;

      const { products, category_name, totalItems } =
        await ProductModel.getProductsByCategory({
          search,
          sortBy,
          sortOrder,
          limit,
          offset,
          categoryId,
          priceMin,
          priceMax,
        });

      const processedProducts = products.map((product) => ({
        id: product.product_id,
        title: product.product_name,
        image:
          product.images && product.images.length
            ? product.images[0].image_url
            : null,

        price: product.sale_price
          ? `₹${Number(product.sale_price).toFixed(0)}`
          : null,

        originalPrice: product.mrp
          ? `₹${Number(product.mrp).toFixed(0)}`
          : null,

        discount: "40%",
        rating: 4.6,
        reviews: "18.9K",
        pointsPrice: "₹3,736",
        points: 264,
      }));

      return res.json({
        success: true,
        category_name,
        products: processedProducts,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      });
    } catch (error) {
      console.error("Get products by category error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get Products by Subcategory
  async getProductsBySubcategory(req, res) {
    try {
      const subcategoryId = Number(req.params.subcategoryId);
      if (!subcategoryId) {
        return res.status(400).json({
          success: false,
          message: "Invalid subcategory id",
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const search = req.query.search || "";

      // Sorting
      const sortBy = req.query.sortBy || "created_at";
      const sortOrder = req.query.sortOrder || "DESC";

      const priceMin = req.query.priceMin ? Number(req.query.priceMin) : null;

      const priceMax = req.query.priceMax ? Number(req.query.priceMax) : null;

      const { products, subcategory_name, totalItems } =
        await ProductModel.getProductsBySubcategory({
          search,
          sortBy,
          sortOrder,
          limit,
          offset,
          subcategoryId,
          priceMin,
          priceMax,
        });

      const processedProducts = products.map((p) => ({
        id: p.product_id,
        title: p.product_name,
        image: p.images.length ? p.images[0].image_url : null,
        price: p.sale_price ? `₹${p.sale_price}` : null,
        originalPrice: p.mrp ? `₹${p.mrp}` : null,
        discount: "40%",
        rating: 4.6,
        reviews: "18.9K",
      }));

      return res.json({
        success: true,
        subcategory_name,
        products: processedProducts,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      });
    } catch (error) {
      console.error("Get products by subcategory error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // product By ID
  async getProductById(req, res) {
    try {
      const productId = Number(req.params.productId);

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      const product = await ProductModel.getProductById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const processedProduct = {
        ...product,
        discount: "40%",
        rating: 4.6,
        reviews: "18.9K",
        pointsPrice: "₹3,736",
        points: 264,
      };

      return res.json({
        success: true,
        product: processedProduct,
      });
    } catch (error) {
      console.error("Get product by ID error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // categories
  async getCategories(req, res) {
    try {
      const [rows] = await db.execute(
        `SELECT 
        c.category_id, 
        c.category_name 
        FROM categories c 
        where c.status = 1
        ORDER BY c.category_name ASC`
      );

      const processedCategories = rows.map((category) => ({
        id: category.category_id,
        name: category.category_name,
        image: `https://via.placeholder.com/150?text=${encodeURIComponent(
          category.category_name
        )}`,
      }));

      res.json({
        success: true,
        data: processedCategories,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // subcategories by category ID
  async getSubcategoriesByCategory(req, res) {
    try {
      const categoryId = Number(req.params.categoryId);

      if (!categoryId) {
        return res.status(400).json({
          success: false,
          message: "Error : Invalid category id",
        });
      }

      const [data] = await db.execute(
        `SELECT 
          sc.subcategory_id, 
          sc.subcategory_name
        FROM sub_categories sc 
        WHERE sc.category_id = ? AND sc.status = 1`,
        [categoryId]
      );

      const processedSubCategories = data.map((subcategory) => ({
        id: subcategory.subcategory_id,
        name: subcategory.subcategory_name,
        image: `https://via.placeholder.com/150?text=${encodeURIComponent(
          subcategory.subcategory_name
        )}`,
      }));

      res.json({
        success: true,
        data: processedSubCategories,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // autosuggest products
  async getSearchSuggestions(req, res) {
    try {
      const q = (req.query.q || "").trim();
      const limit = 10;
      const products = await ProductModel.getSearchSuggestions({
        search: q,
        limit,
      });

      const suggestions = products.map((p) => ({
        id: p.product_id,
        title: p.product_name,
        image: p.images && p.images.length ? p.images[0].image_url : null,
      }));

      res.json({
        success: true,
        suggestions,
      });
    } catch (err) {
      console.error("Search suggestion error:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async loadProducts(req, res) {
    try {
      const q = (req.query.q || "").trim();

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const { products, totalItems } = await ProductModel.loadProducts({
        search: q,
        limit,
        offset,
      });

      const result = products.map((p) => ({
        id: p.product_id,
        title: p.product_name,
        image: p.images && p.images.length ? p.images[0].image_url : null,
        price: p.sale_price ? `₹${Number(p.sale_price).toFixed(0)}` : null,
        originalPrice: p.mrp ? `₹${Number(p.mrp).toFixed(0)}` : null,
      }));

      return res.json({
        success: true,
        products: result,
        total: totalItems,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
      });
    } catch (error) {
      console.error("Search products error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Save History
  async saveSearchHistory(req, res) {
    try {
      const userId = req.user?.user_id;
      const keyword = (req.body.keyword || "").trim();

      if (!keyword) {
        return res.json({ success: true });
      }

      await db.execute(
        `
      INSERT INTO search_history (user_id, keyword)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP
      `,
        [userId, keyword]
      );

      return res.json({ success: true });
    } catch (error) {
      console.error("Save search history error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get Search History
  async getSearchHistory(req, res) {
    try {
      const userId = req.user?.user_id;

      const [rows] = await db.execute(
        `
      SELECT keyword
      FROM search_history
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 10
      `,
        [userId]
      );

      return res.json({
        success: true,
        history: rows.map((r) => r.keyword),
      });
    } catch (error) {
      console.error("Get search history error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // add to wishlist
  async addToWishlist(req, res) {
    try {
      const userId = req.user.user_id;
      const { product_id, variant_id } = req.body;

      if (!product_id || !variant_id) {
        return res.status(400).json({
          success: false,
          message: "Product ID and Variant ID are required",
        });
      }

      await ProductModel.add(userId, product_id, variant_id);

      return res.json({
        success: true,
        message: "Variant added to wishlist",
      });
    } catch (error) {
      console.error("Add Wishlist Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to add to wishlist",
      });
    }
  }

  // remove from wishlist
  async removeFromWishlist(req, res) {
    try {
      const userId = req.user.user_id;
      const { product_id, variant_id } = req.params;

      const removed = await ProductModel.remove(
        userId,
        product_id,
        variant_id
      );

      if (!removed) {
        return res.status(404).json({
          success: false,
          message: "Wishlist item not found",
        });
      }

      return res.json({
        success: true,
        message: "Variant removed from wishlist",
      });
    } catch (error) {
      console.error("Remove Wishlist Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to remove from wishlist",
      });
    }
  }

  // Fetch user wishlist
  async getMyWishlist(req, res) {
    try {
      const userId = req.user.user_id;

      const wishlist = await ProductModel.getByUser(userId);

      return res.json({
        success: true,
        data: wishlist,
      });
    } catch (error) {
      console.error("Fetch Wishlist Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch wishlist",
      });
    }
  }

  // search wishlist
  async checkWishlist(req, res) {
    try {
      const userId = req.user.user_id;
      const { product_id, variant_id } = req.params;

      const exists = await ProductModel.exists(userId, product_id, variant_id);

      return res.json({
        success: true,
        in_wishlist: exists,
      });
    } catch (error) {
      console.error("Check Wishlist Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to check wishlist",
      });
    }
  }
}
module.exports = new ProductController();
