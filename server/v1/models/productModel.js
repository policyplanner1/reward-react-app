const db = require("../../config/database");
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

        FROM products p

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
            GROUP BY product_id
          ) minv
            ON pv.product_id = minv.product_id
          AND pv.sale_price = minv.min_sale_price
          INNER JOIN (
            SELECT product_id, MIN(variant_id) AS min_variant_id
            FROM product_variants
            GROUP BY product_id
          ) tie
            ON pv.product_id = tie.product_id
        ) v ON p.product_id = v.product_id


        /* ---- Images ---- */
        LEFT JOIN product_images pi 
          ON p.product_id = pi.product_id

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
          created_at: row.created_at,
          mrp: row.mrp,
          sale_price: row.sale_price,
          images,
        };
      });

      /* ===============================
         TOTAL COUNT
      =============================== */
      const [[{ total }]] = await db.execute(
        `
          SELECT COUNT(DISTINCT p.product_id) AS total
          FROM products p
          ${whereClause}
        `,
        params
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
        FROM products p
        LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN sub_categories sc ON p.subcategory_id = sc.subcategory_id
        LEFT JOIN sub_sub_categories ssc ON p.sub_subcategory_id = ssc.sub_subcategory_id
        WHERE p.product_id = ?
        `,
        [productId]
      );

      if (!productRows.length) return null;
      const product = productRows[0];

      // 2 Get product images
      const [images] = await db.execute(
        `SELECT image_url FROM product_images WHERE product_id = ?`,
        [productId]
      );
      product.images = images.map((img) => img.image_url);

      // 3 Get product variants
      const [variants] = await db.execute(
        `SELECT * FROM product_variants WHERE product_id = ?`,
        [productId]
      );

      // 4 Get images for each variant
      for (const variant of variants) {
        const [variantImages] = await db.execute(
          `SELECT image_url FROM product_variant_images WHERE variant_id = ?`,
          [variant.variant_id]
        );
        variant.images = variantImages.map((img) => img.image_url);
        variant.customAttributes = JSON.parse(
          variant.custom_attributes || "{}"
        );
      }
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

      if (categoryId) {
        conditions.push("p.category_id = ?");
        params.push(categoryId);
      }

      if (search) {
        conditions.push("p.product_name LIKE ?");
        params.push(`%${search}%`);
      }

      // price filters
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

        FROM products p

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
            GROUP BY product_id
          ) minv
            ON pv.product_id = minv.product_id
          AND pv.sale_price = minv.min_sale_price
          INNER JOIN (
            SELECT product_id, MIN(variant_id) AS min_variant_id
            FROM product_variants
            GROUP BY product_id
          ) tie
            ON pv.product_id = tie.product_id
        ) v ON p.product_id = v.product_id

        /* ---- categories ---- */
        LEFT JOIN categories c ON c.category_id = p.category_id

        /* ---- Images ---- */
        LEFT JOIN product_images pi 
          ON p.product_id = pi.product_id

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
          created_at: row.created_at,
          mrp: row.mrp,
          sale_price: row.sale_price,
          images,
        };
      });

      /* ===============================
         TOTAL COUNT
      =============================== */
      const [[{ total }]] = await db.execute(
        `
          SELECT COUNT(DISTINCT p.product_id) AS total
            FROM products p
            LEFT JOIN (
              SELECT pv.*
              FROM product_variants pv
              INNER JOIN (
                SELECT product_id, MIN(sale_price) AS min_sale_price
                FROM product_variants
                WHERE sale_price IS NOT NULL
                GROUP BY product_id
              ) minv
                ON pv.product_id = minv.product_id
              AND pv.sale_price = minv.min_sale_price
              INNER JOIN (
                SELECT product_id, MIN(variant_id) AS min_variant_id
                FROM product_variants
                GROUP BY product_id
              ) tie
                ON pv.product_id = tie.product_id
            ) v ON p.product_id = v.product_id
            ${whereClause}
        `,
        params
      );

      return {
        products,
        category_name: rows[0]?.category_name || null,
        totalItems: total,
      };
    } catch (error) {
      console.error("Error fetching all products:", error);
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

      FROM products p

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
      FROM products p
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
        params
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
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push("p.product_name LIKE ?");
      params.push(`%${search}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

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

    FROM products p
    LEFT JOIN product_images pi ON p.product_id = pi.product_id
    ${whereClause}
    GROUP BY p.product_id
    ORDER BY p.created_at DESC
    LIMIT ?
  `;

    const [rows] = await db.execute(query, [...params, limit]);

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
    return this.getAllProducts({
      search,
      sortBy: "created_at",
      sortOrder: "DESC",
      limit,
      offset,
    });
  }
}

module.exports = new ProductModel();
