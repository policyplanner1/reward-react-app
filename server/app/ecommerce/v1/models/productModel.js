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

      // conditions.push("v.variant_id IS NOT NULL");

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
        sc.subcategory_name,
        v.mrp,
        v.sale_price,

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
      LEFT JOIN (
        SELECT pv.*
        FROM product_variants pv
        INNER JOIN (
          SELECT product_id, MIN(sale_price) AS min_sale_price
          FROM product_variants
          WHERE sale_price IS NOT NULL
          GROUP BY product_id
        ) mv
          ON pv.product_id = mv.product_id
         AND pv.sale_price = mv.min_sale_price
        INNER JOIN (
          SELECT product_id, MIN(variant_id) AS min_variant_id
          FROM product_variants
          GROUP BY product_id
        ) tie
          ON pv.product_id = tie.product_id
      ) v ON p.product_id = v.product_id

      LEFT JOIN sub_categories sc ON p.subcategory_id = sc.subcategory_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id

      ${whereClause}
      GROUP BY p.product_id
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

      const [rows] = await db.execute(query, [...params, limit, offset]);

      const products = rows.map((row) => ({
        product_id: row.product_id,
        product_name: row.product_name,
        brand_name: row.brand_name,
        created_at: row.created_at,
        mrp: row.mrp,
        sale_price: row.sale_price,
        images: row.images
          ? row.images.split(",").map((i) => {
              const [, image_url, , sort_order] = i.split("::");
              return { image_url, sort_order: Number(sort_order) };
            })
          : [],
      }));

      const [[{ total }]] = await db.execute(
        `
      SELECT COUNT(DISTINCT p.product_id) AS total
      FROM eproducts p
      LEFT JOIN (
        SELECT pv.*
        FROM product_variants pv
        INNER JOIN (
          SELECT product_id, MIN(sale_price) AS min_sale_price
          FROM product_variants
          WHERE sale_price IS NOT NULL
          GROUP BY product_id
        ) mv
          ON pv.product_id = mv.product_id
         AND pv.sale_price = mv.min_sale_price
        INNER JOIN (
          SELECT product_id, MIN(variant_id) AS min_variant_id
          FROM product_variants
          GROUP BY product_id
        ) tie
          ON pv.product_id = tie.product_id
      ) v ON p.product_id = v.product_id
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
    const params = [];

    const query = `
    SELECT 
      p.product_id,
      p.product_name,

      GROUP_CONCAT(
        DISTINCT CONCAT(
          pi.image_id, '::',
          pi.image_url, '::',
          pi.sort_order
        )
        ORDER BY pi.sort_order ASC
      ) AS images

    FROM eproducts p

    /* ---- ensure at least one visible variant exists ---- */
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

    LEFT JOIN product_images pi ON p.product_id = pi.product_id

    WHERE
      p.status = 'approved'
      AND p.is_visible = 1
      AND v.variant_id IS NOT NULL
      AND p.product_name LIKE ?

    GROUP BY p.product_id
    ORDER BY p.created_at DESC
    LIMIT ?
  `;

    params.push(`%${search}%`, limit);

    const [rows] = await db.execute(query, params);

    return rows.map((row) => ({
      product_id: row.product_id,
      product_name: row.product_name,
      images: row.images
        ? row.images.split(",").map((i) => {
            const [, image_url] = i.split("::");
            return { image_url };
          })
        : [],
    }));
  }

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
    });
  }

  async getSimilarProducts({
    productId,
    categoryId,
    subcategoryId,
    sub_subcategoryId,
    limit = 10,
  }) {
    const query = `
    SELECT
      p.product_id,
      p.product_name,
      p.brand_name,

      v.variant_id,
      v.sale_price,
      v.mrp,

      GROUP_CONCAT(
        DISTINCT CONCAT(
          pi.image_id, '::',
          pi.image_url, '::',
          pi.sort_order
        )
        ORDER BY pi.sort_order ASC
      ) AS images

    FROM eproducts p

    /* ---- Active category ---- */
    INNER JOIN categories c
      ON c.category_id = p.category_id
     AND c.status = 1

    /* ---- Active subcategory ---- */
    INNER JOIN sub_categories sc
      ON sc.subcategory_id = p.subcategory_id
     AND sc.status = 1

    /* ---- Active sub-subcategory ---- */
    INNER JOIN sub_sub_categories ssc
      ON ssc.sub_subcategory_id = p.sub_subcategory_id
     AND ssc.status = 1

    /* ---- Lowest price ACTIVE variant (1 per product) ---- */
 INNER JOIN (
  SELECT pv.*
  FROM product_variants pv

  /* ---- lowest sale price per product ---- */
  INNER JOIN (
    SELECT 
      product_id,
      MIN(sale_price) AS min_price
    FROM product_variants
    WHERE sale_price IS NOT NULL
    GROUP BY product_id
  ) mp
    ON pv.product_id = mp.product_id
   AND pv.sale_price = mp.min_price

  /* ---- tie-breaker: lowest variant_id ---- */
  INNER JOIN (
    SELECT 
      product_id,
      MIN(variant_id) AS min_variant_id
    FROM product_variants
    WHERE sale_price IS NOT NULL
    GROUP BY product_id
  ) tie
    ON pv.product_id = tie.product_id
   AND pv.variant_id = tie.min_variant_id

  ) v ON v.product_id = p.product_id


    /* ---- Active images only ---- */
    LEFT JOIN product_images pi
      ON pi.product_id = p.product_id

    WHERE p.status = "approved"
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
      categoryId,
      subcategoryId,
      sub_subcategoryId,
      limit,
    ]);

    return rows.map((row) => {
      let images = [];

      if (row.images) {
        images = row.images.split(",").map((i) => {
          const [, image_url] = i.split("::");
          return { image_url };
        });
      }

      return {
        product_id: row.product_id,
        product_name: row.product_name,
        brand_name: row.brand_name,
        variant_id: row.variant_id,
        sale_price: row.sale_price,
        mrp: row.mrp,
        image: images.length ? images[0].image_url : null,
      };
    });
  }
}

module.exports = new ProductModel();
