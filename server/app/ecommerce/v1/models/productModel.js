const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");

class ProductModel {
  // Get all products
  async getAllProducts({ search, sortBy, sortOrder, limit, offset }) {
    try {
      const conditions = [];
      const params = [];

      /* ===============================
         SEARCH
      =============================== */
      if (search) {
        conditions.push("p.product_name LIKE ?");
        params.push(`%${search}%`);
      }

      conditions.push("p.status = 'approved'");
      conditions.push("p.is_visible = 1");
      conditions.push("p.is_searchable = 1");
      conditions.push("p.is_deleted = 0");

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      /* ===============================
         SORT 
      =============================== */
      const sortableColumns = ["created_at", "product_name", "brand_name"];

      if (!sortableColumns.includes(sortBy)) {
        sortBy = "created_at";
      }

      sortOrder = sortOrder === "ASC" ? "ASC" : "DESC";

      const query = `
        SELECT 
          p.product_id,
          p.product_name,
          p.brand_name,
          p.created_at,
          p.short_description,
          c.category_name,
          sc.subcategory_name,
          ssc.name AS sub_subcategory_name,
          v.mrp,
          v.sale_price,
          v.reward_redemption_limit,

          GROUP_CONCAT(
            DISTINCT CONCAT(
              pi.image_id, '::',
              pi.image_url, '::',
              pi.type, '::',
              pi.sort_order
            )
            ORDER BY pi.sort_order ASC
          ) AS images

        FROM eproducts p

        /* ---- First Variant Only ---- */
       LEFT JOIN (
          SELECT pv.*
          FROM product_variants pv
          INNER JOIN (
            SELECT 
              product_id, 
              MIN(sale_price) AS min_sale_price
            FROM product_variants
            WHERE sale_price IS NOT NULL
              AND is_visible = 1
            GROUP BY product_id
          ) minv
            ON pv.product_id = minv.product_id
          AND pv.sale_price = minv.min_sale_price
          INNER JOIN (
            SELECT product_id, MIN(variant_id) AS min_variant_id
            FROM product_variants
            WHERE is_visible = 1
            GROUP BY product_id
          ) tie
            ON pv.product_id = tie.product_id
            AND pv.variant_id = tie.min_variant_id
            WHERE pv.is_visible = 1
        ) v ON p.product_id = v.product_id


        /* ---- Images ---- */
        LEFT JOIN product_images pi 
          ON p.product_id = pi.product_id

        /* ---- Categories ---- */
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN sub_categories sc ON p.subcategory_id = sc.subcategory_id
        LEFT JOIN sub_sub_categories ssc ON p.sub_subcategory_id = ssc.sub_subcategory_id

        ${whereClause}

        GROUP BY p.product_id
        ORDER BY p.${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `;

      const dataParams = [...params, limit, offset];
      const [rows] = await db.execute(query, dataParams);

      /* ===============================
         IMAGE PARSING
      =============================== */
      const products = rows.map((row) => {
        let images = [];

        if (row.images) {
          images = row.images.split(",").map((item) => {
            const [image_id, image_url, type, sort_order] = item.split("::");

            return {
              image_id: Number(image_id),
              image_url,
              type,
              sort_order: Number(sort_order),
            };
          });
        }

        return {
          product_id: row.product_id,
          product_name: row.product_name,
          category_name: row.category_name,
          subcategory_name: row.subcategory_name,
          sub_subcategory_name: row.sub_subcategory_name,
          brand_name: row.brand_name,
          short_description: row.short_description,
          created_at: row.created_at,
          mrp: row.mrp,
          sale_price: row.sale_price,
          reward_redemption_limit: row.reward_redemption_limit,
          images,
        };
      });

      /* ===============================
         TOTAL COUNT
      =============================== */
      const [[{ total }]] = await db.execute(
        `
          SELECT COUNT(DISTINCT p.product_id) AS total
          FROM eproducts p
          ${whereClause}
        `,
        params,
      );

      return {
        products,
        totalItems: total,
      };
    } catch (error) {
      console.error("Error fetching all products:", error);
      throw error;
    }
  }

  // Get Product By ID
  async getProductById(productId) {
    try {
      const [productRows] = await db.execute(
        `
        SELECT
          p.*,
          v.full_name AS vendor_name,
          c.category_name,
          sc.subcategory_name,
          ssc.name AS sub_subcategory_name
        FROM eproducts p
        LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN sub_categories sc ON p.subcategory_id = sc.subcategory_id
        LEFT JOIN sub_sub_categories ssc ON p.sub_subcategory_id = ssc.sub_subcategory_id
        WHERE p.product_id = ?
        `,
        [productId],
      );

      if (!productRows.length) return null;
      const product = productRows[0];

      // 2 Get product images
      const [images] = await db.execute(
        `SELECT image_url FROM product_images WHERE product_id = ?`,
        [productId],
      );
      product.images = images.map((img) => img.image_url);

      //2.5 Get product videos
      const [videos] = await db.execute(
        `SELECT video_url FROM product_videos WHERE product_id = ? LIMIT 1`,
        [productId],
      );
      product.video = videos.length ? videos[0].video_url : null;

      // 3 Get product variants
      const [variants] = await db.execute(
        `SELECT * FROM product_variants WHERE product_id = ? AND is_visible = 1`,
        [productId],
      );

      const attributeMap = {};

      for (const variant of variants) {
        variant.variant_attributes = JSON.parse(
          variant.variant_attributes || "{}",
        );

        for (const [key, value] of Object.entries(variant.variant_attributes)) {
          if (!attributeMap[key]) attributeMap[key] = new Set();
          attributeMap[key].add(value);
        }

        const [variantImages] = await db.execute(
          `
            SELECT image_url
            FROM product_variant_images
            WHERE variant_id = ?
            ORDER BY
              CASE
                WHEN sort_order = 0 THEN 999999
                ELSE sort_order
              END ASC,
              image_id ASC
          `,
          [variant.variant_id],
        );
        variant.images = variantImages.map((img) => img.image_url);
      }

      const attributes = {};
      for (const key in attributeMap) {
        attributes[key] = Array.from(attributeMap[key]);
      }

      product.attributes = attributes;
      product.variants = variants;

      return product;
    } catch (error) {
      console.error("Error fetching product by ID:", error);
      throw error;
    }
  }

  // get Products by Category
  async getProductsByCategory({
    search,
    sortBy,
    sortOrder,
    limit,
    offset,
    categoryId = null,
    priceMin = null,
    priceMax = null,
    ratingMin = null,
  }) {
    try {
      const conditions = [];
      const params = [];

      /* ===============================
       SEARCH
    =============================== */

      /* ===============================
            PRODUCT MUST BE APPROVED
          =============================== */
      conditions.push("p.status = ?");
      params.push("approved");

      conditions.push("p.is_visible = ?");
      params.push(1);

      conditions.push("p.is_deleted = ?");
      params.push(0);

      conditions.push("v.variant_id IS NOT NULL");

      if (categoryId) {
        conditions.push("p.category_id = ?");
        params.push(categoryId);
      }

      if (search) {
        conditions.push("p.product_name LIKE ?");
        params.push(`%${search}%`);
      }

      // price filters (now SAFE because v is correct)
      if (priceMin !== null) {
        conditions.push("v.sale_price >= ?");
        params.push(priceMin);
      }

      if (priceMax !== null) {
        conditions.push("v.sale_price <= ?");
        params.push(priceMax);
      }

      // rating filter
      if (ratingMin !== null) {
        conditions.push("p.avg_rating >= ?");
        params.push(ratingMin);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      /* ===============================
       SORT
    =============================== */
      const sortableColumns = ["created_at", "product_name", "brand_name"];
      if (!sortableColumns.includes(sortBy)) sortBy = "created_at";
      sortOrder = sortOrder === "ASC" ? "ASC" : "DESC";

      /* ===============================
       MAIN QUERY
    =============================== */

      const query = `
      SELECT 
        p.product_id,
        p.product_name,
        p.brand_name,
        p.avg_rating,
        p.rating_count,
        p.created_at,
        c.category_name,
        sc.subcategory_name,
        ssc.name AS sub_subcategory_name,
        v.mrp,
        v.sale_price,
        v.reward_redemption_limit,

        GROUP_CONCAT(
          DISTINCT CONCAT(
            pi.image_id, '::',
            pi.image_url, '::',
            pi.type, '::',
            pi.sort_order
          )
          ORDER BY pi.sort_order ASC
        ) AS images

      FROM eproducts p

      /* ---- Correct Cheapest Visible Variant ---- */
      LEFT JOIN product_variants v
        ON v.variant_id = (
          SELECT pv2.variant_id
          FROM product_variants pv2
          WHERE pv2.product_id = p.product_id
            AND pv2.is_visible = 1
            AND pv2.sale_price IS NOT NULL
          ORDER BY pv2.sale_price ASC, pv2.variant_id ASC
          LIMIT 1
        )

      /* ---- categories ---- */
      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN sub_categories sc ON sc.subcategory_id = p.subcategory_id 
      LEFT JOIN sub_sub_categories ssc ON ssc.sub_subcategory_id = p.sub_subcategory_id 

      /* ---- Images ---- */
      LEFT JOIN product_images pi ON p.product_id = pi.product_id

      ${whereClause}

      GROUP BY p.product_id
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

      const dataParams = [...params, limit, offset];
      const [rows] = await db.execute(query, dataParams);

      /* ===============================
       IMAGE PARSING
    =============================== */
      const products = rows.map((row) => {
        let images = [];

        if (row.images) {
          images = row.images.split(",").map((item) => {
            const [image_id, image_url, type, sort_order] = item.split("::");
            return {
              image_id: Number(image_id),
              image_url,
              type,
              sort_order: Number(sort_order),
            };
          });
        }

        return {
          product_id: row.product_id,
          product_name: row.product_name,
          brand_name: row.brand_name,
          category_name: row.category_name,
          subcategory_name: row.subcategory_name,
          sub_subcategory_name: row.sub_subcategory_name,
          created_at: row.created_at,
          avg_rating: row.avg_rating,
          rating_count: row.rating_count,
          mrp: row.mrp,
          sale_price: row.sale_price,
          reward_redemption_limit: row.reward_redemption_limit,
          images,
        };
      });

      /* ===============================
       TOTAL COUNT (uses SAME logic)
    =============================== */
      const [[{ total }]] = await db.execute(
        `
      SELECT COUNT(DISTINCT p.product_id) AS total
      FROM eproducts p

      LEFT JOIN product_variants v
        ON v.variant_id = (
          SELECT pv2.variant_id
          FROM product_variants pv2
          WHERE pv2.product_id = p.product_id
            AND pv2.is_visible = 1
            AND pv2.sale_price IS NOT NULL
          ORDER BY pv2.sale_price ASC, pv2.variant_id ASC
          LIMIT 1
        )

      ${whereClause}
      `,
        params,
      );

      return {
        products,
        category_name: rows[0]?.category_name || null,
        totalItems: total,
      };
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  }

  // Get Products By Subcategory
  async getProductsBySubcategory({
    search,
    sortBy,
    sortOrder,
    limit,
    offset,
    subcategoryId = null,
    priceMin = null,
    priceMax = null,
  }) {
    try {
      const conditions = [];
      const params = [];

      /* ===============================
       VISIBILITY RULES
    =============================== */
      conditions.push("p.status = ?");
      params.push("APPROVED");

      conditions.push("p.is_visible = ?");
      params.push(1);

      conditions.push("p.is_deleted = ?");
      params.push(0);

      conditions.push("v.variant_id IS NOT NULL");

      if (subcategoryId) {
        conditions.push("p.subcategory_id = ?");
        params.push(subcategoryId);
      }

      if (search) {
        conditions.push("p.product_name LIKE ?");
        params.push(`%${search}%`);
      }

      if (priceMin !== null) {
        conditions.push("v.sale_price >= ?");
        params.push(priceMin);
      }

      if (priceMax !== null) {
        conditions.push("v.sale_price <= ?");
        params.push(priceMax);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      const sortableColumns = ["created_at", "product_name", "brand_name"];
      if (!sortableColumns.includes(sortBy)) {
        sortBy = "created_at";
      }
      sortOrder = sortOrder === "ASC" ? "ASC" : "DESC";

      const query = `
      SELECT 
        p.product_id,
        p.product_name,
        p.brand_name,
        p.created_at,
        c.category_name,
        sc.subcategory_name,
        ssc.name AS sub_subcategory_name,
        v.mrp,
        v.sale_price,
        v.reward_redemption_limit,

        GROUP_CONCAT(
          DISTINCT CONCAT(
            pi.image_id, '::',
            pi.image_url, '::',
            pi.type, '::',
            pi.sort_order
          )
          ORDER BY pi.sort_order ASC
        ) AS images

      FROM eproducts p

      /* ---- Lowest price variant ---- */
      LEFT JOIN product_variants v
        ON v.variant_id = (
          SELECT pv2.variant_id
          FROM product_variants pv2
          WHERE pv2.product_id = p.product_id
            AND pv2.is_visible = 1
            AND pv2.sale_price IS NOT NULL
          ORDER BY pv2.sale_price ASC, pv2.variant_id ASC
          LIMIT 1
        )

      LEFT JOIN categories c ON c.category_id = p.category_id
      LEFT JOIN sub_categories sc 
        ON sc.subcategory_id = p.subcategory_id
      LEFT JOIN sub_sub_categories ssc ON ssc.sub_subcategory_id = p.sub_subcategory_id 

      LEFT JOIN product_images pi 
        ON p.product_id = pi.product_id

      ${whereClause}
      GROUP BY p.product_id
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

      const [rows] = await db.execute(query, [...params, limit, offset]);

      const products = rows.map((row) => {
        let images = [];

        if (row.images) {
          images = row.images.split(",").map((item) => {
            const [image_id, image_url, type, sort_order] = item.split("::");
            return {
              image_id: Number(image_id),
              image_url,
              type,
              sort_order: Number(sort_order),
            };
          });
        }

        return {
          product_id: row.product_id,
          product_name: row.product_name,
          brand_name: row.brand_name,
          category_name: row.category_name,
          created_at: row.created_at,
          mrp: row.mrp,
          sale_price: row.sale_price,
          reward_redemption_limit: row.reward_redemption_limit,
          subcategory_name: row.subcategory_name,
          sub_subcategory_name: row.sub_subcategory_name,
          images,
        };
      });

      const [[{ total }]] = await db.execute(
        `
      SELECT COUNT(DISTINCT p.product_id) AS total
      FROM eproducts p

      LEFT JOIN product_variants v
        ON v.variant_id = (
          SELECT pv2.variant_id
          FROM product_variants pv2
          WHERE pv2.product_id = p.product_id
            AND pv2.is_visible = 1
            AND pv2.sale_price IS NOT NULL
          ORDER BY pv2.sale_price ASC, pv2.variant_id ASC
          LIMIT 1
        )

      ${whereClause}
      `,
        params,
      );

      return {
        products,
        subcategory_name: rows[0]?.subcategory_name || null,
        totalItems: total,
      };
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  }

  // Search Suggestions
  async getSearchSuggestions({ search, limit }) {
    if (!search || search.length < 2) {
      return [];
    }

    const keyword = `%${search}%`;

    /* ========================================
     1 Category Suggestions
  ======================================== */
    const [categories] = await db.execute(
      `
    SELECT 
      category_id AS id,
      category_name AS title,
      cover_image AS image,
      'category' AS type
    FROM categories
    WHERE status = 1
      AND is_visible_in_ui = 1
      AND category_name LIKE ?
    LIMIT ?
    `,
      [keyword, limit],
    );

    /* ========================================
     2 Subcategory Suggestions
  ======================================== */
    const [subcategories] = await db.execute(
      `
    SELECT 
      subcategory_id AS id,
      subcategory_name AS title,
      cover_image AS image,
      'subcategory' AS type
    FROM sub_categories
    WHERE status = 1
      AND subcategory_name LIKE ?
    LIMIT ?
    `,
      [keyword, limit],
    );

    /* ========================================
     3 Product Suggestions
  ======================================== */
    const [products] = await db.execute(
      `
    SELECT 
      p.product_id AS id,
      p.product_name AS title,
      pi.image_url AS image,
      'product' AS type

    FROM eproducts p

    /* ---- Ensure visible priced variant exists ---- */
    LEFT JOIN product_variants v
      ON v.variant_id = (
        SELECT pv2.variant_id
        FROM product_variants pv2
        WHERE pv2.product_id = p.product_id
          AND pv2.is_visible = 1
          AND pv2.sale_price IS NOT NULL
        ORDER BY pv2.sale_price ASC, pv2.variant_id ASC
        LIMIT 1
      )

    LEFT JOIN categories c 
      ON c.category_id = p.category_id

    LEFT JOIN sub_categories sc 
      ON sc.subcategory_id = p.subcategory_id

    LEFT JOIN sub_sub_categories ssc 
      ON ssc.sub_subcategory_id = p.sub_subcategory_id

    LEFT JOIN product_images pi
      ON pi.image_id = (
        SELECT pi2.image_id
        FROM product_images pi2
        WHERE pi2.product_id = p.product_id
        ORDER BY pi2.sort_order ASC
        LIMIT 1
      )

    WHERE
      p.status = 'approved'
      AND p.is_visible = 1
      AND p.is_searchable = 1
      AND p.is_deleted = 0
      AND v.variant_id IS NOT NULL
      AND (
        p.product_name LIKE ?
        OR p.brand_name LIKE ?
        OR c.category_name LIKE ?
        OR sc.subcategory_name LIKE ?
        OR ssc.name LIKE ?
      )

    LIMIT ?
    `,
      [keyword, keyword, keyword, keyword, keyword, limit],
    );

    /* ========================================
     Combine Results
  ======================================== */
    return [...categories, ...subcategories, ...products].slice(0, limit);
  }

  // async getSearchSuggestions({ search, limit }) {
  //   if (!search) {
  //     return [];
  //   }

  //   const keyword = `%${search}%`;

  //   const query = `
  //   SELECT
  //     p.product_id,
  //     p.product_name,

  //     GROUP_CONCAT(
  //       DISTINCT CONCAT(
  //         pi.image_id, '::',
  //         pi.image_url, '::',
  //         pi.sort_order
  //       )
  //       ORDER BY pi.sort_order ASC
  //     ) AS images

  //   FROM eproducts p

  //   /* ---- Cheapest Visible Variant ---- */
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

  //   LEFT JOIN categories c
  //     ON c.category_id = p.category_id

  //   LEFT JOIN sub_categories sc
  //     ON sc.subcategory_id = p.subcategory_id

  //   LEFT JOIN sub_sub_categories ssc
  //     ON ssc.sub_subcategory_id = p.sub_subcategory_id

  //   LEFT JOIN product_images pi
  //     ON pi.product_id = p.product_id

  //   WHERE
  //     p.status = 'approved'
  //     AND p.is_visible = 1
  //     AND p.is_searchable = 1
  //     AND v.variant_id IS NOT NULL
  //     AND (
  //       p.product_name LIKE ?
  //       OR p.brand_name LIKE ?
  //       OR c.category_name LIKE ?
  //       OR sc.subcategory_name LIKE ?
  //       OR ssc.name LIKE ?
  //     )

  //   GROUP BY p.product_id
  //   ORDER BY p.created_at DESC
  //   LIMIT ?
  // `;

  //   const params = [keyword, keyword, keyword, keyword, keyword, limit];

  //   const [rows] = await db.execute(query, params);

  //   return rows.map((row) => ({
  //     product_id: row.product_id,
  //     product_name: row.product_name,
  //     images: row.images
  //       ? row.images.split(",").map((i) => {
  //           const [, image_url] = i.split("::");
  //           return { image_url };
  //         })
  //       : [],
  //   }));
  // }

  // Load Products

  async loadProducts({ search, limit, offset }) {
    return this.getProductsByCategory({
      search,
      sortBy: "created_at",
      sortOrder: "DESC",
      limit,
      offset,
      categoryId: null,
      priceMin: null,
      priceMax: null,
      ratingMin: null,
    });
  }

  async getSimilarProducts({ productId, limit = 10 }) {
    try {
      /* -------------------------------
       1 Get category hierarchy
    --------------------------------*/
      const [productRows] = await db.execute(
        `
      SELECT category_id, subcategory_id, sub_subcategory_id
      FROM eproducts
      WHERE product_id = ?
        AND status = 'approved'
        AND is_deleted = 0
        AND is_visible = 1
      `,
        [productId],
      );

      if (!productRows.length) {
        return [];
      }

      const { category_id, subcategory_id, sub_subcategory_id } =
        productRows[0];

      /* -------------------------------
       2 Fetch similar products
    --------------------------------*/
      const query = `
      SELECT
        p.product_id,
        p.product_name,
        p.brand_name,
        p.created_at,
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

      FROM eproducts p

      INNER JOIN categories c
        ON c.category_id = p.category_id
       AND c.status = 1

      INNER JOIN sub_categories sc
        ON sc.subcategory_id = p.subcategory_id
       AND sc.status = 1

      INNER JOIN sub_sub_categories ssc
        ON ssc.sub_subcategory_id = p.sub_subcategory_id
       AND ssc.status = 1

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

      WHERE p.status = 'approved'
        AND p.is_deleted = 0
        AND p.is_visible = 1
        AND p.product_id != ?
        AND (
          p.category_id = ?
          OR p.subcategory_id = ?
          OR p.sub_subcategory_id = ?
        )

      GROUP BY p.product_id
      ORDER BY RAND()
      LIMIT ?
    `;

      const [rows] = await db.execute(query, [
        productId,
        category_id,
        subcategory_id,
        sub_subcategory_id,
        limit,
      ]);

      /* -------------------------------
       3 Format response
    --------------------------------*/
      return rows.map((row) => {
        const salePrice = Number(row.sale_price || 0);
        const mrp = Number(row.mrp || 0);
        const discountPercent = Number(row.reward_redemption_limit || 0);

        const discountAmount = Math.round((salePrice * discountPercent) / 100);
        const finalPrice = salePrice - discountAmount;

        const mrpDiscountPercent =
          mrp > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

        let image = null;

        if (row.images) {
          const first = row.images.split(",")[0];
          image = first.split("::")[1];
        }

        return {
          product_id: row.product_id,
          product_name: row.product_name,
          brand_name: row.brand_name,
          variant_id: row.variant_id,
          image,
          price: `₹${salePrice}`,
          originalPrice: `₹${mrp}`,
          discount: `${mrpDiscountPercent}%`,
          pointsPrice: `₹${finalPrice}`,
          points: discountAmount,
          rating: 4.6,
          reviews: "18.9K",
        };
      });
    } catch (error) {
      console.error("Error fetching similar products:", error);
      throw error;
    }
  }

  // Get User Recommendations
  async getUserRecommendations(userId, limit = 10) {
    try {
      const query = `
      SELECT 
        p.product_id,
        p.product_name,
        p.brand_name,
        v.variant_id,
        v.sale_price,
        v.mrp,
        v.reward_redemption_limit,

        /* ---- Weighted Score ---- */
        (
          IFNULL(o.order_score, 0) +
          IFNULL(w.wishlist_score, 0) +
          IFNULL(c.cart_score, 0) +
          IFNULL(r.view_score, 0)
        ) AS total_score,

        GROUP_CONCAT(
          DISTINCT CONCAT(pi.image_id,'::',pi.image_url)
        ) AS images

      FROM eproducts p

      /* ----- Orders Weight 5 ----- */
      LEFT JOIN (
        SELECT oi.product_id, COUNT(*) * 5 AS order_score
        FROM eorder_items oi
        INNER JOIN eorders o ON o.order_id = oi.order_id
        WHERE o.user_id = ?
          AND o.status IN ('paid','delivered')
        GROUP BY oi.product_id
      ) o ON o.product_id = p.product_id

      /* ----- Wishlist Weight 4 ----- */
      LEFT JOIN (
        SELECT product_id, COUNT(*) * 4 AS wishlist_score
        FROM customer_wishlist
        WHERE user_id = ?
        GROUP BY product_id
      ) w ON w.product_id = p.product_id

      /* ----- Cart Weight 3 ----- */
      LEFT JOIN (
        SELECT product_id, COUNT(*) * 3 AS cart_score
        FROM cart_items
        WHERE user_id = ?
        GROUP BY product_id
      ) c ON c.product_id = p.product_id

      /* ----- Recently Viewed Weight 2 ----- */
      LEFT JOIN (
        SELECT product_id, COUNT(*) * 2 AS view_score
        FROM recently_viewed
        WHERE user_id = ?
        GROUP BY product_id
      ) r ON r.product_id = p.product_id

      /* ----- Active variant ----- */
      INNER JOIN product_variants v
        ON v.variant_id = (
          SELECT pv2.variant_id
          FROM product_variants pv2
          WHERE pv2.product_id = p.product_id
            AND pv2.is_visible = 1
          ORDER BY pv2.sale_price ASC
          LIMIT 1
        )

      LEFT JOIN product_images pi
        ON pi.product_id = p.product_id

      WHERE p.status = 'approved'
        AND p.is_deleted = 0
        AND p.is_visible = 1

      GROUP BY p.product_id
      HAVING total_score > 0
      ORDER BY total_score DESC
      LIMIT ?
      `;

      const [rows] = await db.execute(query, [
        userId,
        userId,
        userId,
        userId,
        limit,
      ]);

      return rows.map((row) => {
        const salePrice = Number(row.sale_price || 0);
        const mrp = Number(row.mrp || 0);
        const discountPercent = Number(row.reward_redemption_limit || 0);

        const discountAmount = Math.round((salePrice * discountPercent) / 100);
        const finalPrice = salePrice - discountAmount;

        const mrpDiscountPercent =
          mrp > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

        let image = null;

        if (row.images) {
          const first = row.images.split(",")[0];
          image = first.split("::")[1];
        }

        return {
          product_id: row.product_id,
          product_name: row.product_name,
          brand_name: row.brand_name,
          variant_id: row.variant_id,
          image,
          price: `₹${salePrice}`,
          originalPrice: `₹${mrp}`,
          discount: `${mrpDiscountPercent}%`,
          pointsPrice: `₹${finalPrice}`,
          points: discountAmount,
          score: row.total_score,
          rating: 4.6,
          reviews: "18.9K",
        };
      });
    } catch (error) {
      console.error("Recommendation model error:", error);
      throw error;
    }
  }

  // New Arrivals
  async getNewArrivals(limit = 10) {
    try {
      const query = `
      SELECT
        p.product_id,
        p.product_name,
        p.brand_name,
        p.created_at,

        v.variant_id,
        v.sale_price,
        v.mrp,
        v.reward_redemption_limit,

        GROUP_CONCAT(
          DISTINCT CONCAT(
            pi.image_id,'::',
            pi.image_url,'::',
            pi.sort_order
          )
          ORDER BY pi.sort_order ASC
        ) AS images

      FROM eproducts p

      /* Active category */
      INNER JOIN categories c
        ON c.category_id = p.category_id
       AND c.status = 1

      INNER JOIN sub_categories sc
        ON sc.subcategory_id = p.subcategory_id
       AND sc.status = 1

      INNER JOIN sub_sub_categories ssc
        ON ssc.sub_subcategory_id = p.sub_subcategory_id
       AND ssc.status = 1

      /* Lowest visible variant */
      INNER JOIN product_variants v
        ON v.variant_id = (
          SELECT pv2.variant_id
          FROM product_variants pv2
          WHERE pv2.product_id = p.product_id
            AND pv2.is_visible = 1
            AND pv2.sale_price IS NOT NULL
          ORDER BY pv2.sale_price ASC
          LIMIT 1
        )

      LEFT JOIN product_images pi
        ON pi.product_id = p.product_id

      WHERE p.status = 'approved'
        AND p.is_deleted = 0
        AND p.is_visible = 1

      GROUP BY p.product_id
      ORDER BY p.created_at DESC
      LIMIT ?
    `;

      const [rows] = await db.execute(query, [limit]);

      const products = rows.map((row) => {
        const salePrice = Number(row.sale_price || 0);
        const mrp = Number(row.mrp || 0);
        const discountPercent = Number(row.reward_redemption_limit || 0);

        const discountAmount = Math.round((salePrice * discountPercent) / 100);
        const finalPrice = salePrice - discountAmount;

        const mrpDiscountPercent =
          mrp > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

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

          created_at: row.created_at,
        };
      });

      return products;
    } catch (error) {
      console.error("Error fetching new arrivals:", error);
      throw error;
    }
  }

  // Customer also bought
  async getCustomersAlsoBought(productId, limit = 10) {
    try {
      const query = `
      SELECT
        p.product_id,
        p.product_name,
        p.brand_name,

        v.variant_id,
        v.sale_price,
        v.mrp,
        v.reward_redemption_limit,

        COUNT(*) AS frequency,

        GROUP_CONCAT(
          DISTINCT CONCAT(
            pi.image_id,'::',
            pi.image_url,'::',
            pi.sort_order
          )
          ORDER BY pi.sort_order ASC
        ) AS images

      FROM eorder_items oi1

      /* Orders containing this product */
      INNER JOIN eorder_items oi2
        ON oi1.order_id = oi2.order_id

      INNER JOIN eorders o
        ON o.order_id = oi1.order_id

      INNER JOIN eproducts p
        ON p.product_id = oi2.product_id

      /* Lowest visible variant */
      INNER JOIN product_variants v
        ON v.variant_id = (
          SELECT pv2.variant_id
          FROM product_variants pv2
          WHERE pv2.product_id = p.product_id
            AND pv2.is_visible = 1
            AND pv2.sale_price IS NOT NULL
          ORDER BY pv2.sale_price ASC
          LIMIT 1
        )

      LEFT JOIN product_images pi
        ON pi.product_id = p.product_id

      WHERE oi1.product_id = ?
        AND oi2.product_id != ?
        AND o.status IN ('paid','delivered')
        AND p.status = 'approved'
        AND p.is_deleted = 0
        AND p.is_visible = 1

      GROUP BY p.product_id
      ORDER BY frequency DESC
      LIMIT ?
    `;

      const [rows] = await db.execute(query, [productId, productId, limit]);

      const products = rows.map((row) => {
        const salePrice = Number(row.sale_price || 0);
        const mrp = Number(row.mrp || 0);
        const discountPercent = Number(row.reward_redemption_limit || 0);

        const discountAmount = Math.round((salePrice * discountPercent) / 100);
        const finalPrice = salePrice - discountAmount;

        const mrpDiscountPercent =
          mrp > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

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

          frequency: row.frequency,
          rating: 4.6,
          reviews: "18.9K",
        };
      });

      return products;
    } catch (error) {
      console.error("Error fetching customers also bought:", error);
      throw error;
    }
  }

  // Trending Products
  async getTrendingProducts(limit = 10, days = 30) {
    try {
      const query = `
      SELECT
        p.product_id,
        p.product_name,
        p.brand_name,

        v.variant_id,
        v.sale_price,
        v.mrp,
        v.reward_redemption_limit,

        SUM(oi.quantity) AS total_sold,

        GROUP_CONCAT(
          DISTINCT CONCAT(
            pi.image_id,'::',
            pi.image_url,'::',
            pi.sort_order
          )
          ORDER BY pi.sort_order ASC
        ) AS images

      FROM eorder_items oi

      INNER JOIN eorders o
        ON o.order_id = oi.order_id

      INNER JOIN eproducts p
        ON p.product_id = oi.product_id

      /* Lowest visible variant */
      INNER JOIN product_variants v
        ON v.variant_id = (
          SELECT pv2.variant_id
          FROM product_variants pv2
          WHERE pv2.product_id = p.product_id
            AND pv2.is_visible = 1
            AND pv2.sale_price IS NOT NULL
          ORDER BY pv2.sale_price ASC
          LIMIT 1
        )

      LEFT JOIN product_images pi
        ON pi.product_id = p.product_id

      WHERE o.status IN ('paid','delivered')
        AND o.created_at >= NOW() - INTERVAL ? DAY
        AND p.status = 'approved'
        AND p.is_deleted = 0
        AND p.is_visible = 1

      GROUP BY p.product_id
      ORDER BY total_sold DESC
      LIMIT ?
    `;

      const [rows] = await db.execute(query, [days, limit]);

      const products = rows.map((row) => {
        const salePrice = Number(row.sale_price || 0);
        const mrp = Number(row.mrp || 0);
        const discountPercent = Number(row.reward_redemption_limit || 0);

        const discountAmount = Math.round((salePrice * discountPercent) / 100);
        const finalPrice = salePrice - discountAmount;

        const mrpDiscountPercent =
          mrp > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

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

          total_sold: row.total_sold,
          rating: 4.6,
          reviews: "18.9K",
        };
      });

      return products;
    } catch (error) {
      console.error("Error fetching trending products:", error);
      throw error;
    }
  }

  // Best sellers
  async getBestSellers(limit = 10, days = 30) {
    try {
      const query = `
      SELECT
        p.product_id,
        p.product_name,
        p.brand_name,

        v.variant_id,
        v.sale_price,
        v.mrp,
        v.reward_redemption_limit,

        SUM(oi.quantity) AS total_sold,

        GROUP_CONCAT(
          DISTINCT CONCAT(
            pi.image_id,'::',
            pi.image_url,'::',
            pi.sort_order
          )
          ORDER BY pi.sort_order ASC
        ) AS images

      FROM eorder_items oi

      INNER JOIN eorders o
        ON o.order_id = oi.order_id

      INNER JOIN eproducts p
        ON p.product_id = oi.product_id

      /* Lowest visible variant */
      INNER JOIN product_variants v
        ON v.variant_id = (
          SELECT pv2.variant_id
          FROM product_variants pv2
          WHERE pv2.product_id = p.product_id
            AND pv2.is_visible = 1
            AND pv2.sale_price IS NOT NULL
          ORDER BY pv2.sale_price ASC
          LIMIT 1
        )

      LEFT JOIN product_images pi
        ON pi.product_id = p.product_id

      WHERE o.status IN ('paid','delivered')
        AND o.created_at >= NOW() - INTERVAL ? DAY
        AND p.status = 'approved'
        AND p.is_deleted = 0
        AND p.is_visible = 1

      GROUP BY p.product_id
      ORDER BY total_sold DESC
      LIMIT ?
    `;

      const [rows] = await db.execute(query, [days, limit]);

      const products = rows.map((row) => {
        const salePrice = Number(row.sale_price || 0);
        const mrp = Number(row.mrp || 0);
        const discountPercent = Number(row.reward_redemption_limit || 0);

        const discountAmount = Math.round((salePrice * discountPercent) / 100);
        const finalPrice = salePrice - discountAmount;

        const mrpDiscountPercent =
          mrp > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

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

          total_sold: row.total_sold,
          rating: 4.6,
          reviews: "18.9K",
        };
      });

      return products;
    } catch (error) {
      console.error("Error fetching best sellers:", error);
      throw error;
    }
  }

  // Get Most viewed products
  async getMostViewedProducts(limit = 10, days = 30) {
    try {
      const query = `
      SELECT
        p.product_id,
        p.product_name,
        p.brand_name,

        v.variant_id,
        v.sale_price,
        v.mrp,
        v.reward_redemption_limit,

        COUNT(rv.product_id) AS view_count,

        GROUP_CONCAT(
          DISTINCT CONCAT(
            pi.image_id,'::',
            pi.image_url,'::',
            pi.sort_order
          )
          ORDER BY pi.sort_order ASC
        ) AS images

      FROM recently_viewed rv

      INNER JOIN eproducts p
        ON p.product_id = rv.product_id

      /* lowest visible variant */
      INNER JOIN product_variants v
        ON v.variant_id = (
          SELECT pv2.variant_id
          FROM product_variants pv2
          WHERE pv2.product_id = p.product_id
            AND pv2.is_visible = 1
            AND pv2.sale_price IS NOT NULL
          ORDER BY pv2.sale_price ASC
          LIMIT 1
        )

      LEFT JOIN product_images pi
        ON pi.product_id = p.product_id

      WHERE rv.viewed_at >= NOW() - INTERVAL ? DAY
        AND p.status = 'approved'
        AND p.is_deleted = 0
        AND p.is_visible = 1

      GROUP BY p.product_id
      ORDER BY view_count DESC
      LIMIT ?
    `;

      const [rows] = await db.execute(query, [days, limit]);

      const products = rows.map((row) => {
        const salePrice = Number(row.sale_price || 0);
        const mrp = Number(row.mrp || 0);
        const discountPercent = Number(row.reward_redemption_limit || 0);

        const discountAmount = Math.round((salePrice * discountPercent) / 100);
        const finalPrice = salePrice - discountAmount;

        const mrpDiscountPercent =
          mrp > 0 ? Math.round(((mrp - finalPrice) / mrp) * 100) : 0;

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

          view_count: row.view_count,
          rating: 4.6,
          reviews: "18.9K",
        };
      });

      return products;
    } catch (error) {
      console.error("Error fetching most viewed products:", error);
      throw error;
    }
  }

  // Get Rop rated products
  async getTopRatedProducts(limit = 10) {
    try {
      const query = `
      SELECT
        p.product_id,
        p.product_name,
        p.brand_name,

        v.variant_id,
        v.sale_price,
        v.mrp,
        v.reward_redemption_limit,

        AVG(pr.rating) AS avg_rating,
        COUNT(pr.review_id) AS total_reviews,

        GROUP_CONCAT(
          DISTINCT CONCAT(
            pi.image_id,'::',
            pi.image_url,'::',
            pi.sort_order
          )
          ORDER BY pi.sort_order ASC
        ) AS images

      FROM product_reviews pr

      INNER JOIN eproducts p
        ON p.product_id = pr.product_id

      INNER JOIN product_variants v
        ON v.variant_id = (
          SELECT pv2.variant_id
          FROM product_variants pv2
          WHERE pv2.product_id = p.product_id
            AND pv2.is_visible = 1
            AND pv2.sale_price IS NOT NULL
          ORDER BY pv2.sale_price ASC
          LIMIT 1
        )

      LEFT JOIN product_images pi
        ON pi.product_id = p.product_id

      WHERE pr.status = 'approved'
        AND p.status = 'approved'
        AND p.is_deleted = 0
        AND p.is_visible = 1

      GROUP BY p.product_id
      HAVING total_reviews >= 3
      ORDER BY avg_rating DESC, total_reviews DESC
      LIMIT ?
    `;

      const [rows] = await db.execute(query, [limit]);

      return rows;
    } catch (error) {
      console.error("Error fetching top rated products:", error);
      throw error;
    }
  }
}

module.exports = new ProductModel();
