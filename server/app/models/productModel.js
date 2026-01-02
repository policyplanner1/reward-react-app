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
}

module.exports = new ProductModel();
