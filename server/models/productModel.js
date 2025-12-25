const db = require("../config/database");
const { moveFile } = require("../utils/moveFile");
const fs = require("fs");
const path = require("path");

// generate SKU
function generateSKU(productId) {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `RP-${productId}-${randomPart}`;
}

const UPLOAD_BASE = path.join(__dirname, "..", "uploads", "products");

// for image
async function processUploadedFiles(
  files,
  { vendorId, productId, imagesFolder, docsFolder, variantFolder }
) {
  const movedFiles = [];

  for (const file of files) {
    const filename = path.basename(file.path);
    let newPath;

    if (file.fieldname === "images") {
      newPath = path.join(imagesFolder, filename);
      file.finalPath = `products/${vendorId}/${productId}/images/${filename}`;
    } else if (!isNaN(parseInt(file.fieldname))) {
      newPath = path.join(docsFolder, filename);
      file.finalPath = `products/${vendorId}/${productId}/documents/${filename}`;
    } else if (file.fieldname.startsWith("variant_")) {
      newPath = path.join(variantFolder, filename);
      file.finalPath = `products/${vendorId}/${productId}/variants/${filename}`;
    } else {
      continue;
    }

    await moveFile(file.path, newPath);
    movedFiles.push(file);
  }

  return movedFiles;
}

async function generateUniqueSKU(connection, productId) {
  let sku;
  let exists = true;

  while (exists) {
    sku = generateSKU(productId);

    const [[row]] = await connection.execute(
      `SELECT 1 FROM product_variants WHERE sku = ? LIMIT 1`,
      [sku]
    );

    exists = !!row;
  }

  return sku;
}

class ProductModel {
  // create a Product
  async createProduct(connection, vendorId, data) {
    const safe = (v) => (v === undefined || v === "" ? null : v);
    let custom_category = data.custom_category || null;
    let custom_subcategory = data.custom_subcategory || null;
    let custom_sub_subcategory = data.custom_sub_subcategory || null;

    const [result] = await connection.execute(
      `INSERT INTO products 
     (vendor_id, category_id, subcategory_id, sub_subcategory_id, brand_name, manufacturer, barcode, gst,
      product_name, description, short_description,
      custom_category, custom_subcategory, custom_sub_subcategory, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        safe(vendorId),
        safe(data.category_id),
        safe(data.subcategory_id),
        safe(data.sub_subcategory_id),
        safe(data.brandName),
        safe(data.manufacturer),
        safe(data.barCode),
        safe(data.gstIn),
        safe(data.productName),
        safe(data.description),
        safe(data.shortDescription),
        custom_category,
        custom_subcategory,
        custom_sub_subcategory,
      ]
    );

    return result.insertId;
  }

  // insert product Images
  async insertProductImages(connection, productId, files) {
    for (const file of files) {
      await connection.execute(
        `INSERT INTO product_images (product_id, image_url)
       VALUES (?, ?)`,
        [productId, file.finalPath]
      );
    }
  }

  async insertProductDocuments(connection, productId, categoryId, files) {
    if (!categoryId) return;
    const [docTypes] = await connection.execute(
      `SELECT d.document_id
     FROM category_document cd
     JOIN documents d ON cd.document_id = d.document_id
     WHERE cd.category_id = ?`,
      [categoryId]
    );

    const validDocumentIds = docTypes.map((d) => d.document_id);

    for (const file of files) {
      const docId = parseInt(file.fieldname);
      if (!validDocumentIds.includes(docId)) continue;

      await connection.execute(
        `INSERT INTO product_documents 
       (product_id, document_id, file_path, mime_type)
       VALUES (?, ?, ?, ?)`,
        [productId, docId, file.finalPath, file.mimetype]
      );
    }
  }

  async createProductVariant(connection, productId, variant) {
    const safe = (v) => (v === undefined || v === "" ? null : v);

    const sku = await generateUniqueSKU(connection, productId);

    const [result] = await connection.execute(
      `INSERT INTO product_variants
      (product_id, size, color, dimension, weight, sku, mrp, sale_price, stock,manufacturing_date,expiry_date,material_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        safe(variant.size),
        safe(variant.color),
        safe(variant.dimension),
        safe(variant.weight),
        sku,
        safe(variant.mrp),
        safe(variant.salesPrice),
        safe(variant.stock),
        safe(variant.manufacturingYear),
        safe(variant.expiryDate),
        safe(variant.materialType),
      ]
    );

    return result.insertId;
  }

  async insertProductVariantImages(connection, variantId, files) {
    for (const file of files) {
      await connection.execute(
        `INSERT INTO product_variant_images (variant_id, image_url)
       VALUES (?, ?)`,
        [variantId, file.finalPath]
      );
    }
  }

  // Get required documents by category_id
  async getRequiredDocumentsByCategory(categoryId) {
    try {
      const [rows] = await db.execute(
        `SELECT d.document_id, d.document_name, d.status
       FROM documents d
       INNER JOIN category_document cd ON d.document_id = cd.document_id
       WHERE cd.category_id = ? AND d.status = 1`,
        [categoryId]
      );

      return rows;
    } catch (error) {
      console.error("Error fetching required documents:", error);
      throw error;
    }
  }

  // Get product by ID
  async getProductDetailsById(productId) {
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

      // 3 Get product documents
      const [documents] = await db.execute(
        `SELECT pd.id, pd.file_path, pd.mime_type,pd.status, d.document_name
       FROM product_documents pd
       JOIN documents d ON pd.document_id = d.document_id
       WHERE pd.product_id = ?`,
        [productId]
      );
      product.documents = documents;

      // 4 Get product variants
      const [variants] = await db.execute(
        `SELECT * FROM product_variants WHERE product_id = ?`,
        [productId]
      );

      // 5 Get images for each variant
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

  // update product by Id
  async updateProduct(connection, productId, vendorId, data, files = []) {
    const safe = (v) => (v === undefined || v === "" ? null : v);

    const custom_category = data.custom_category || null;
    const custom_subcategory = data.custom_subcategory || null;
    const custom_sub_subcategory = data.custom_sub_subcategory || null;

    // ---------- FOLDERS ----------
    const imagesFolder = path.join(
      UPLOAD_BASE,
      vendorId.toString(),
      productId.toString(),
      "images"
    );

    const docsFolder = path.join(
      UPLOAD_BASE,
      vendorId.toString(),
      productId.toString(),
      "documents"
    );

    const variantFolder = path.join(
      UPLOAD_BASE,
      vendorId.toString(),
      productId.toString(),
      "variants"
    );

    // ---------- 1 UPDATE PRODUCT ----------
    await connection.execute(
      `UPDATE products SET 
      category_id = ?, 
      subcategory_id = ?, 
      sub_subcategory_id = ?, 
      brand_name = ?, 
      manufacturer = ?, 
      barcode = ?, 
      gst = ?, 
      product_name = ?, 
      description = ?, 
      short_description = ?, 
      custom_category = ?, 
      custom_subcategory = ?, 
      custom_sub_subcategory = ?
     WHERE product_id = ?`,
      [
        safe(data.category_id),
        safe(data.subcategory_id),
        safe(data.sub_subcategory_id),
        safe(data.brandName),
        safe(data.manufacturer),
        safe(data.barCode),
        safe(data.gstIn),
        safe(data.productName),
        safe(data.description),
        safe(data.shortDescription),
        custom_category,
        custom_subcategory,
        custom_sub_subcategory,
        productId,
      ]
    );

    // ---------- 2 PROCESS FILES ----------
    const movedFiles = await processUploadedFiles(files, {
      vendorId,
      productId,
      imagesFolder,
      docsFolder,
      variantFolder,
    });

    // ---------- 3 MAIN IMAGES & DOCUMENTS ----------
    if (movedFiles.length) {
      const mainImages = movedFiles.filter((f) => f.fieldname === "images");
      const otherFiles = movedFiles.filter((f) => f.fieldname !== "images");

      if (mainImages.length) {
        await connection.execute(
          `DELETE FROM product_images WHERE product_id = ?`,
          [productId]
        );
        await this.insertProductImages(connection, productId, mainImages);
      }

      if (otherFiles.length && data.category_id) {
        await connection.execute(
          `DELETE FROM product_documents WHERE product_id = ?`,
          [productId]
        );
        await this.insertProductDocuments(
          connection,
          productId,
          data.category_id,
          otherFiles
        );
      }
    }

    // ---------- 4 VARIANTS ----------
    if (data.variants) {
      const variants = JSON.parse(data.variants);
      if (!Array.isArray(variants)) return true;

      //  A. FETCH EXISTING VARIANTS (FOR DELETE DIFF)
      const [existing] = await connection.execute(
        `SELECT variant_id FROM product_variants WHERE product_id = ?`,
        [productId]
      );

      const existingVariantIds = existing.map((v) => v.variant_id);
      const incomingVariantIds = variants
        .map((v) => v.variant_id)
        .filter(Boolean);

      //  B. DELETE REMOVED VARIANTS
      const variantsToDelete = existingVariantIds.filter(
        (id) => !incomingVariantIds.includes(id)
      );

      if (variantsToDelete.length) {
        const placeholders = variantsToDelete.map(() => "?").join(",");

        await connection.execute(
          `DELETE FROM product_variant_images 
     WHERE variant_id IN (${placeholders})`,
          variantsToDelete
        );

        await connection.execute(
          `DELETE FROM product_variants 
     WHERE variant_id IN (${placeholders})`,
          variantsToDelete
        );
      }

      //  C. UPDATE / INSERT VARIANTS
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];

        if (variant.variant_id) {
          // UPDATE
          await connection.execute(
            `UPDATE product_variants SET 
            size = ?, 
            color = ?, 
            dimension = ?, 
            weight = ?, 
            mrp = ?, 
            sale_price = ?, 
            stock = ?, 
            manufacturing_date = COALESCE(?, manufacturing_date),
            expiry_date = COALESCE(?, expiry_date),
            material_type = ?
           WHERE variant_id = ?`,
            [
              safe(variant.size),
              safe(variant.color),
              safe(variant.dimension),
              safe(variant.weight),
              safe(variant.mrp),
              safe(variant.salesPrice),
              safe(variant.stock),
              safe(variant.manufacturingYear),
              safe(variant.expiryDate),
              safe(variant.materialType),
              variant.variant_id,
            ]
          );

          const variantFiles = movedFiles.filter((f) =>
            f.fieldname.startsWith(`variant_${i}_`)
          );

          if (variantFiles.length) {
            await connection.execute(
              `DELETE FROM product_variant_images WHERE variant_id = ?`,
              [variant.variant_id]
            );

            await this.insertProductVariantImages(
              connection,
              variant.variant_id,
              variantFiles
            );
          }
        } else {
          // INSERT
          const newVariantId = await this.createProductVariant(
            connection,
            productId,
            variant
          );

          const variantFiles = movedFiles.filter((f) =>
            f.fieldname.startsWith(`variant_${i}_`)
          );

          if (variantFiles.length) {
            await this.insertProductVariantImages(
              connection,
              newVariantId,
              variantFiles
            );
          }
        }
      }
    }

    return true;
  }

  // delete product
  async deleteProduct(connection, productId, vendorId) {
    try {
      // Delete product variant images
      const [variants] = await connection.execute(
        `SELECT variant_id FROM product_variants WHERE product_id = ?`,
        [productId]
      );
      for (const variant of variants) {
        await connection.execute(
          `DELETE FROM product_variant_images WHERE variant_id = ?`,
          [variant.variant_id]
        );
      }

      // Delete product variants
      await connection.execute(
        `DELETE FROM product_variants WHERE product_id = ?`,
        [productId]
      );

      // Delete product images
      await connection.execute(
        `DELETE FROM product_images WHERE product_id = ?`,
        [productId]
      );

      // Delete product documents
      await connection.execute(
        `DELETE FROM product_documents WHERE product_id = ?`,
        [productId]
      );

      // Delete main product
      await connection.execute(
        `DELETE FROM products WHERE product_id = ? AND vendor_id = ?`,
        [productId, vendorId]
      );

      return true;
    } catch (error) {
      console.error("Error deleting product:", error);
      throw error;
    }
  }

  // Get all products
  async getAllProductDetails({
    search,
    status,
    sortBy,
    sortOrder,
    limit,
    offset,
  }) {
    try {
      const conditions = [];
      const params = [];

      if (status) {
        conditions.push("p.status = ?");
        params.push(status);
      }

      if (search) {
        conditions.push("p.product_name LIKE ?");
        params.push(`%${search}%`);
      }

      const whereClause = conditions.length
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

      // Validate sort column
      const sortableColumns = ["created_at", "product_name", "brand_name"];
      if (!sortableColumns.includes(sortBy)) sortBy = "created_at";

      const query = `SELECT 
         p.product_id,
         p.vendor_id,
         v.full_name AS vendor_name,
         p.category_id,
         c.category_name,
         p.subcategory_id,
         sc.subcategory_name,
         p.sub_subcategory_id,
         ssc.name AS sub_subcategory_name,
         p.brand_name,
         p.manufacturer,
         p.barcode,
         p.gst,
         p.product_name,
         p.description,
         p.short_description,
         p.custom_category,
         p.custom_subcategory,
         p.custom_sub_subcategory,
         p.status,
         p.rejection_reason,
         p.created_at,
           IFNULL(
          CONCAT(
            '[', 
            GROUP_CONCAT(
              DISTINCT JSON_OBJECT(
                'image_id', pi.image_id,
                'image_url', pi.image_url,
                'type', pi.type,
                'sort_order', pi.sort_order
              ) ORDER BY pi.sort_order ASC
            ),
            ']'
          ),
          '[]'
        ) AS images
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.category_id
       LEFT JOIN sub_categories sc ON p.subcategory_id = sc.subcategory_id
       LEFT JOIN sub_sub_categories ssc ON p.sub_subcategory_id = ssc.sub_subcategory_id
       LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
       LEFT JOIN product_images pi ON p.product_id = pi.product_id
      ${whereClause}
       GROUP BY p.product_id
       ORDER BY p.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
        `;

      const dataParams = [...params, limit, offset];
      const [rows] = await db.execute(query, dataParams);

      // Total count for pagination
      const [[{ total }]] = await db.execute(
        `SELECT COUNT(DISTINCT p.product_id) AS total FROM products p ${whereClause}`,
        params
      );

      return { products: rows, totalItems: total };
    } catch (error) {
      console.error("Error fetching all products:", error);
      throw error;
    }
  }

  // Get all products for a specific vendor
  async getProductsByVendor(
    vendorId,
    { search, status, sortBy, sortOrder, limit, offset }
  ) {
    try {
      let where = `WHERE p.vendor_id = ?`;
      const params = [vendorId];

      if (status) {
        where += ` AND p.status = ?`;
        params.push(status);
      }
      if (search) {
        where += ` AND p.product_name LIKE ?`;
        params.push(`%${search}%`);
      }

      // Validate sort column
      const sortableColumns = ["created_at", "product_name", "brand_name"];
      if (!sortableColumns.includes(sortBy)) sortBy = "created_at";

      const query = `
      SELECT 
        p.product_id,
        p.vendor_id,
        v.full_name AS vendor_name,
        c.category_name,
        sc.subcategory_name,
        ssc.name AS sub_subcategory_name,
        p.brand_name,
        p.product_name,
        p.status,
        p.rejection_reason,
        p.custom_category,
        p.custom_subcategory,
        p.custom_sub_subcategory,
        p.created_at,
        IFNULL(
          CONCAT(
            '[', 
            GROUP_CONCAT(
              DISTINCT JSON_OBJECT(
                'image_id', pi.image_id,
                'image_url', pi.image_url,
                'type', pi.type,
                'sort_order', pi.sort_order
              ) ORDER BY pi.sort_order ASC
            ),
            ']'
          ),
          '[]'
        ) AS images
      FROM products p
      LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN sub_categories sc ON p.subcategory_id = sc.subcategory_id
      LEFT JOIN sub_sub_categories ssc ON p.sub_subcategory_id = ssc.sub_subcategory_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id
      ${where}
      GROUP BY p.product_id
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      // Total count for pagination
      const [[{ total }]] = await db.execute(
        `SELECT COUNT(*) AS total FROM products p ${where}`,
        params.slice(0, -2) // remove limit & offset
      );

      return { products: rows, totalItems: total };
    } catch (error) {
      console.error("Error fetching products by vendor:", error);
      throw error;
    }
  }

  // async updateProductStatus(productId, status, reason) {
  //   const [result] = await db.execute(
  //     `UPDATE products
  //      SET status=?, rejection_reason=?
  //      WHERE product_id=?`,
  //     [status, reason, productId]
  //   );

  //   return result.affectedRows > 0;
  // }

  // get list name
  async getApprovedProductList(vendorId) {
    try {
      const [productRows] = await db.execute(
        `SELECT product_id, product_name FROM products WHERE status = 'approved' AND vendor_id = ?`,
        [vendorId]
      );

      return productRows;
    } catch (error) {
      console.error("Error fetching product List:", error);
      throw error;
    }
  }

  async getApprovedProducts(productId) {
    try {
      const [productRows] = await db.execute(
        `
      SELECT
        p.*,
        c.category_name,
        GROUP_CONCAT(
          CONCAT(
            '{"variant_id":', pv.variant_id,
            ',"sku":"', pv.sku, 
            '"}'
          )
          SEPARATOR ','
        ) AS variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN product_variants pv ON p.product_id = pv.product_id
      WHERE p.status = 'approved' AND p.product_id = ?
      GROUP BY p.product_id
       `,
        [productId]
      );

      if (productRows.length > 0 && productRows[0].variants) {
        productRows[0].variants = JSON.parse(
          "[" + productRows[0].variants + "]"
        );
      }

      return productRows;
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  }

  // Data table record
  async getDetails(req, res) {
    try {
      const status = req.query.status || "Pending";

      const [rows] = await db.query(
        `SELECT 
              s.id,
              s.warehousemanager_id,
              s.vendor_id,
              s.variant_id,
              s.product_id,
              s.grn,
              s.total_quantity,
              s.passed_quantity,
              s.failed_quantity,
              s.stock_in_date,
              s.location,
              s.expiry_date,
              s.status,

              p.product_name AS productName,
              COALESCE(c.category_name, p.custom_category) AS categoryName,
              v.full_name AS vendorName,
              u.name AS WarehousemanagerName,

              pv.sku AS variantSku

          FROM stock_in_entries s
          JOIN products p ON s.product_id = p.product_id
          LEFT JOIN categories c ON p.category_id = c.category_id
          LEFT JOIN sub_categories sc ON p.subcategory_id = sc.subcategory_id
          LEFT JOIN sub_sub_categories ssc ON p.sub_subcategory_id = ssc.sub_subcategory_id
          JOIN vendors v ON p.vendor_id = v.vendor_id
          JOIN users u ON s.warehousemanager_id = u.user_id

          LEFT JOIN product_variants pv 
                ON s.variant_id = pv.variant_id

          WHERE s.status = ?;

      `,
        [status]
      );

      res.json({ success: true, data: rows });
    } catch (err) {
      console.error("Fetching stock record Error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // stats
  async getProductStatsByVendor(vendorId) {
    try {
      const query = `
      SELECT
        COUNT(*) AS total,
        SUM(status = 'pending') AS pending,
        SUM(status = 'sent_for_approval') AS sent_for_approval,
        SUM(status = 'approved') AS approved,
        SUM(status = 'rejected') AS rejected,
        SUM(status = 'resubmission') AS resubmission
      FROM products
      WHERE vendor_id = ?
    `;

      const [[stats]] = await db.execute(query, [vendorId]);

      return {
        total: Number(stats.total) || 0,
        pending: Number(stats.pending) || 0,
        sent_for_approval: Number(stats.sent_for_approval) || 0,
        approved: Number(stats.approved) || 0,
        rejected: Number(stats.rejected) || 0,
        resubmission: Number(stats.resubmission) || 0,
      };
    } catch (error) {
      console.error("Error fetching product stats:", error);
      throw error;
    }
  }
}

module.exports = new ProductModel();
