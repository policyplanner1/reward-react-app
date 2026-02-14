const ProductModel = require("../models/productModel");
const db = require("../../../../config/database");
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

        const salePrice = product.sale_price ? Number(product.sale_price) : 0;

        const discountPercent = product.reward_redemption_limit
          ? Number(product.reward_redemption_limit)
          : 0;

        const discountAmount = Math.round((salePrice * discountPercent) / 100);

        const finalPrice = salePrice - discountAmount;

        // extra discount
        const mrp = product.mrp ? Number(product.mrp) : 0;

        const mrpDiscountPercent =
          mrp > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

        return {
          id: product.product_id,
          title: product.product_name,
          brand: product.brand_name,
          category: product.category_name,
          subcategory: product.subcategory_name,
          sub_subcategory: product.sub_subcategory_name,
          short_description: product.short_description,
          image: mainImage,
          price: salePrice ? `₹${salePrice}` : null,
          originalPrice: product.mrp ? `₹${Number(product.mrp)}` : null,
          discount: `${mrpDiscountPercent}%`,
          rating: 4.6,
          reviews: "18.9K",
          pointsPrice: salePrice ? `₹${finalPrice}` : null,
          points: discountAmount,
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

      const processedProducts = products.map((product) => {
        const mainImage =
          product.images && product.images.length
            ? product.images[0].image_url
            : null;

        const salePrice = product.sale_price ? Number(product.sale_price) : 0;

        const discountPercent = product.reward_redemption_limit
          ? Number(product.reward_redemption_limit)
          : 0;

        const discountAmount = Math.round((salePrice * discountPercent) / 100);

        const finalPrice = salePrice - discountAmount;

        // extra discount
        const mrp = product.mrp ? Number(product.mrp) : 0;

        const mrpDiscountPercent =
          mrp > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

        return {
          id: product.product_id,
          title: product.product_name,
          brand: product.brand_name,
          category: product.category_name,
          subcategory: product.subcategory_name,
          sub_subcategory: product.sub_subcategory_name,
          image: mainImage,
          price: salePrice ? `₹${salePrice}` : null,
          originalPrice: product.mrp ? `₹${Number(product.mrp)}` : null,
          discount: `${mrpDiscountPercent}%`,
          rating: 4.6,
          reviews: "18.9K",
          pointsPrice: salePrice ? `₹${finalPrice}` : null,
          points: discountAmount,
        };
      });

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
        variants: product.variants.map((variant) => {
          // Numbers only
          const salePrice = Number(variant.sale_price) || 0;
          const mrp = Number(variant.mrp) || 0;
          const rewardDiscountPercent =
            Number(variant.reward_redemption_limit) || 0;

          // Reward discount on sale price
          const rewardDiscountAmount = Math.round(
            (salePrice * rewardDiscountPercent) / 100,
          );

          const finalPrice = salePrice - rewardDiscountAmount;

          // Effective discount from MRP
          const mrpDiscountPercent =
            mrp > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

          return {
            ...variant,
            discount: `${mrpDiscountPercent}%`,
            rating: 4.6,
            reviews: "18.9K",
            pointsPrice: finalPrice ? `₹${finalPrice}` : null,
            points: rewardDiscountAmount,
          };
        }),
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
        `SELECT * FROM categories
        WHERE status = 1 AND is_visible_in_ui = 1
        ORDER BY category_name ASC`,
      );

      const processedCategories = rows.map((category) => ({
        id: category.category_id,
        name: category.category_name,
        image: category.cover_image,
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
        `SELECT * FROM sub_categories WHERE category_id = ? AND status = 1`,
        [categoryId],
      );

      const processedSubCategories = data.map((subcategory) => ({
        id: subcategory.subcategory_id,
        name: subcategory.subcategory_name,
        image: subcategory.cover_image,
      }));

      res.json({
        success: true,
        data: processedSubCategories,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Similar Products
  async getSimilarProducts(req, res) {
    try {
      const productId = Number(req.params.productId);
      const { category_id, subcategory_id, sub_subcategory_id } = req.query;

      if (
        !productId ||
        !category_id ||
        !subcategory_id ||
        !sub_subcategory_id
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid request",
        });
      }

      const products = await ProductModel.getSimilarProducts({
        productId,
        categoryId: Number(category_id),
        subcategoryId: Number(subcategory_id),
        sub_subcategoryId: Number(sub_subcategory_id),
        limit: 10,
      });

      return res.json({
        success: true,
        products,
      });
    } catch (error) {
      console.error("Get similar products error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch similar products",
      });
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

      const processedProducts = products.map((product) => {
        const mainImage =
          product.images && product.images.length
            ? product.images[0].image_url
            : null;

        const salePrice = product.sale_price ? Number(product.sale_price) : 0;

        const discountPercent = product.reward_redemption_limit
          ? Number(product.reward_redemption_limit)
          : 0;

        const discountAmount = Math.round((salePrice * discountPercent) / 100);

        const finalPrice = salePrice - discountAmount;

        const mrp = product.mrp ? Number(product.mrp) : 0;

        const mrpDiscountPercent =
          mrp > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

        return {
          id: product.product_id,
          title: product.product_name,
          image: mainImage,
          price: `₹${salePrice}`,
          originalPrice: `₹${mrp}`,
          discount: `${mrpDiscountPercent}%`,
          pointsPrice: `₹${finalPrice}`,
          points: discountAmount,
        };
      });

      return res.json({
        success: true,
        products: processedProducts,
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
        [userId, keyword],
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
        [userId],
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
}
module.exports = new ProductController();
