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
          brand: product.brand_name,
          category: product.category_name,
          subcategory: product.subcategory_name,
          sub_subcategory: product.sub_subcategory_name,
          image: mainImage,
          price: `₹${salePrice}`,
          originalPrice: `₹${mrp}`,
          discount: `${mrpDiscountPercent}%`,
          pointsPrice: `₹${finalPrice}`,
          points: discountAmount,
          rating: 4.6,
          reviews: "18.9K",
        };
      });

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

      if (req.user?.user_id) {
        await db.execute(
          `
            INSERT INTO recently_viewed (user_id, product_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE viewed_at = CURRENT_TIMESTAMP
          `,
          [req.user.user_id, productId],
        );
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

  // discovery categories
  // async getCategoryDiscovery(req, res) {
  //   try {
  //     // 1. Top Categories
  //     const [topCategories] = await db.execute(`
  //         SELECT
  //           c.category_id,
  //           c.category_name,
  //           c.cover_image,
  //           COUNT(p.product_id) AS product_count

  //         FROM categories c

  //         JOIN eproducts p
  //           ON p.category_id = c.category_id
  //         AND p.status = 'approved'
  //         AND p.is_visible = 1
  //         AND p.is_searchable = 1

  //         WHERE c.status = 1
  //           AND c.is_visible_in_ui = 1

  //         GROUP BY c.category_id
  //         ORDER BY product_count DESC
  //         LIMIT 5
  //       `);

  //     // 2. New & Upcoming
  //     const [newLaunches] = await db.execute(`
  //       SELECT
  //         p.product_id,
  //         p.product_name,
  //         p.brand_name,
  //         v.mrp,
  //         v.sale_price,
  //         v.reward_redemption_limit,

  //         GROUP_CONCAT(
  //           DISTINCT CONCAT(
  //             pi.image_id, '::',
  //             pi.image_url, '::',
  //             pi.sort_order
  //           )
  //           ORDER BY pi.sort_order ASC
  //         ) AS images

  //       FROM eproducts p

  //       /* ---- Cheapest Visible Variant ---- */
  //       LEFT JOIN product_variants v
  //         ON v.variant_id = (
  //           SELECT pv2.variant_id
  //           FROM product_variants pv2
  //           WHERE pv2.product_id = p.product_id
  //             AND pv2.is_visible = 1
  //             AND pv2.sale_price IS NOT NULL
  //           ORDER BY pv2.sale_price ASC, pv2.variant_id ASC
  //           LIMIT 1
  //         )

  //       LEFT JOIN product_images pi
  //         ON pi.product_id = p.product_id

  //       WHERE
  //         p.status = 'approved'
  //         AND p.is_visible = 1
  //         AND p.is_searchable = 1
  //         AND v.variant_id IS NOT NULL

  //       GROUP BY p.product_id
  //       ORDER BY p.created_at DESC
  //       LIMIT 5
  //     `);

  //     // 3. Recently Viewed
  // let recentlyViewed = [];
  // // const userId = req.user?.user_id;
  // const userId = 1;

  // if (userId) {
  //   const [rows] = await db.execute(
  //     `
  //   SELECT
  //     p.product_id,
  //     p.product_name,
  //     v.sale_price,
  //     v.mrp,

  //     GROUP_CONCAT(
  //       DISTINCT CONCAT(
  //         pi.image_id, '::',
  //         pi.image_url, '::',
  //         pi.sort_order
  //       )
  //       ORDER BY pi.sort_order ASC
  //     ) AS images

  //   FROM recently_viewed rv

  //   JOIN eproducts p
  //     ON p.product_id = rv.product_id

  //   LEFT JOIN product_variants v
  //     ON v.variant_id = (
  //       SELECT pv2.variant_id
  //       FROM product_variants pv2
  //       WHERE pv2.product_id = p.product_id
  //         AND pv2.is_visible = 1
  //         AND pv2.sale_price IS NOT NULL
  //       ORDER BY pv2.sale_price ASC, pv2.variant_id ASC
  //       LIMIT 1
  //     )

  //   LEFT JOIN product_images pi
  //     ON pi.product_id = p.product_id

  //   WHERE
  //     rv.user_id = ?
  //     AND p.status = 'approved'
  //     AND p.is_visible = 1
  //     AND p.is_searchable = 1
  //     AND v.variant_id IS NOT NULL

  //   GROUP BY p.product_id
  //   ORDER BY rv.viewed_at DESC
  //   LIMIT 5
  // `,
  //     [userId],
  //   );

  //   recentlyViewed = rows;
  // }

  //     return res.json({
  //       success: true,
  //       data: {
  //         topCategories,
  //         newLaunches,
  //         recentlyViewed,
  //       },
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ success: false });
  //   }
  // }

  // Get Recent Products
  async getRecentProducts(req, res) {
    try {
      const userId = req.user?.user_id;
      // const userId = 1;
      let recentlyViewed = [];

      if (!userId) {
        return res.json({ success: true, data: [] });
      }

      const query = `
      SELECT
        p.product_id,
        p.product_name,
        p.brand_name,
        v.variant_id,
        v.sale_price,
        v.mrp,
        v.reward_redemption_limit,

        GROUP_CONCAT(
          DISTINCT CONCAT(
            pi.image_id, '::',
            pi.image_url, '::',
            pi.sort_order
          )
          ORDER BY pi.sort_order ASC
        ) AS images

      FROM recently_viewed rv

      INNER JOIN eproducts p
        ON p.product_id = rv.product_id

      INNER JOIN product_variants v
        ON v.variant_id = (
          SELECT pv2.variant_id
          FROM product_variants pv2
          WHERE pv2.product_id = p.product_id
            AND pv2.is_visible = 1
            AND pv2.sale_price IS NOT NULL
          ORDER BY pv2.sale_price ASC, pv2.variant_id ASC
          LIMIT 1
        )

      LEFT JOIN product_images pi
        ON pi.product_id = p.product_id

      WHERE
        rv.user_id = ?
        AND p.status = 'approved'
        AND p.is_deleted = 0
        AND p.is_visible = 1
        AND p.is_searchable = 1

      GROUP BY p.product_id
      ORDER BY rv.viewed_at DESC
      LIMIT 6
    `;

      const [rows] = await db.execute(query, [userId]);

      recentlyViewed = rows.map((row) => {
        const salePrice = row.sale_price ? Number(row.sale_price) : 0;
        const mrp = row.mrp ? Number(row.mrp) : 0;
        const discountPercent = row.reward_redemption_limit
          ? Number(row.reward_redemption_limit)
          : 0;

        // Reward discount amount
        const discountAmount = Math.round((salePrice * discountPercent) / 100);

        // Final reward price
        const finalPrice = salePrice - discountAmount;

        // Total discount vs MRP
        const mrpDiscountPercent =
          mrp > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

        // Parse images
        let images = [];
        if (row.images) {
          images = row.images.split(",").map((item) => {
            const [, image_url] = item.split("::");
            return { image_url };
          });
        }

        return {
          product_id: row.product_id,
          product_name: row.product_name,
          brand_name: row.brand_name,
          variant_id: row.variant_id,

          image: images.length ? images[0].image_url : null,

          price: `₹${salePrice}`,
          originalPrice: `₹${mrp}`,
          discount: `${mrpDiscountPercent}%`,
          pointsPrice: `₹${finalPrice}`,
          points: discountAmount,
          rating: 4.6,
          reviews: "18.9K",
        };
      });

      return res.json({
        success: true,
        data: recentlyViewed,
      });
    } catch (error) {
      console.error("Error fetching recent products:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // Get recommendations
  async getUserRecommendations(req, res) {
    try {
      const userId = req.user?.user_id;
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized user",
        });
      }

      const products = await ProductModel.getUserRecommendations(userId, limit);

      return res.status(200).json({
        success: true,
        total: products.length,
        products,
      });
    } catch (error) {
      console.error("Recommendation error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch recommendations",
      });
    }
  }

  // Get New Arrivals
  async getNewArrivals(req, res) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      const products = await ProductModel.getNewArrivals(limit);

      return res.status(200).json({
        success: true,
        total: products.length,
        products,
      });
    } catch (error) {
      console.error("New arrivals error:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch new arrivals",
      });
    }
  }

  // Customer also Bought
  async getCustomersAlsoBought(req, res) {
    try {
      const productId = Number(req.params.productId);
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Invalid product id",
        });
      }

      const products = await ProductModel.getCustomersAlsoBought(
        productId,
        limit,
      );

      return res.status(200).json({
        success: true,
        total: products.length,
        products,
      });
    } catch (error) {
      console.error("Customers also bought error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch recommendations",
      });
    }
  }

  // Trending Products
  async getTrendingProducts(req, res) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const days = req.query.days ? Number(req.query.days) : 30;

      const products = await ProductModel.getTrendingProducts(limit, days);

      return res.status(200).json({
        success: true,
        total: products.length,
        products,
      });
    } catch (error) {
      console.error("Trending products error:", error);

      return res.status(500).json({
        success: false,
        message: "Unable to fetch trending products",
      });
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

  // category with subcategories
  async getCategoriesWithSubcategories(req, res) {
    try {
      const [rows] = await db.execute(`
      SELECT 
        c.category_id,
        c.category_name,
        c.cover_image AS category_image,
        sc.subcategory_id,
        sc.subcategory_name,
        sc.cover_image AS subcategory_image
      FROM categories c
      LEFT JOIN sub_categories sc 
        ON sc.category_id = c.category_id 
        AND sc.status = 1
      WHERE c.status = 1 
        AND c.is_visible_in_ui = 1
      ORDER BY c.category_name ASC, sc.subcategory_name ASC
    `);

      const categoryMap = {};

      rows.forEach((row) => {
        // If category not yet added
        if (!categoryMap[row.category_id]) {
          categoryMap[row.category_id] = {
            id: row.category_id,
            name: row.category_name,
            image: row.category_image,
            subcategories: [],
          };
        }

        // If subcategory exists
        if (row.subcategory_id) {
          categoryMap[row.category_id].subcategories.push({
            id: row.subcategory_id,
            name: row.subcategory_name,
            image: row.subcategory_image,
          });
        }
      });

      const result = Object.values(categoryMap);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Similar Products
  async getSimilarProducts(req, res) {
    try {
      const productId = Number(req.params.productId);
      const limit = req.query.limit ? Number(req.query.limit) : 10;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Invalid product id",
        });
      }

      const products = await ProductModel.getSimilarProducts({
        productId,
        limit,
      });

      return res.status(200).json({
        success: true,
        total: products.length,
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

      const suggestions = await ProductModel.getSearchSuggestions({
        search: q,
        limit,
      });

      res.json({
        success: true,
        suggestions,
      });
    } catch (err) {
      console.error("Search suggestion error:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
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
      if (!req.user?.user_id) {
        return res.status(401).json({ success: false });
      }

      const userId = req.user?.user_id;
      const keyword = (req.body.keyword || "").trim();

      if (!keyword) {
        return res.json({ success: true });
      }

      // Save history
      await db.execute(
        `INSERT INTO search_history (user_id, keyword) 
       VALUES (?, ?) 
       ON DUPLICATE KEY UPDATE created_at = CURRENT_TIMESTAMP`,
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
      if (!req.user?.user_id) {
        return res.status(401).json({ success: false });
      }

      const userId = req.user?.user_id;
      const [rows] = await db.execute(
        `SELECT keyword 
       FROM search_history 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 10`,
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
