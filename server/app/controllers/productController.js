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
      const sortBy = req.query.sortBy || "created_at";
      const sortOrder = req.query.sortOrder || "DESC";

      const { products, category_name, totalItems } =
        await ProductModel.getProductsByCategory({
          search,
          sortBy,
          sortOrder,
          limit,
          offset,
          categoryId,
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

  // product By ID
  async getProductById(req, res) {}

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
}

module.exports = new ProductController();
