const ProductModel = require("../models/productModel");
const db = require("../../config/database");
const fs = require("fs");
const path = require("path");

class ProductController {
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
      console.error("Get All Products Error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new ProductController();
