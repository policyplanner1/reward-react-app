const ProductModel = require("../models/productModel");
const db = require("../config/database");
const fs = require("fs");
const path = require("path");
const { moveFile } = require("../utils/moveFile");

class ProductController {
  // create Product
  async createProduct(req, res) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const vendorId = req.user.vendor_id;
      const body = req.body;

      if (!vendorId) {
        return res.status(404).json({
          success: false,
          message: "Vendor ID is required",
        });
      }

      const [vendorRows] = await db.query(
        `SELECT * FROM vendors WHERE vendor_id = ?`,
        [vendorId]
      );

      if (!vendorRows.length) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      const vendor = vendorRows[0];

      if (vendor.status !== "approved") {
        return res.status(403).json({
          success: false,
          message: "Vendor not approved",
        });
      }

      if (!body.category_id && !body.custom_category) {
        return res.status(400).json({
          success: false,
          message: "Category ID is required",
        });
      }

      // 1️⃣ Create product entry
      const productId = await ProductModel.createProduct(
        connection,
        vendorId,
        body
      );

      // 2️⃣ Prepare folder structure
      const baseFolder = path.join(
        __dirname,
        "../uploads/products",
        `${vendorId}`,
        `${productId}`
      );
      const imagesFolder = path.join(baseFolder, "images");
      const docsFolder = path.join(baseFolder, "documents");
      const variantFolder = path.join(baseFolder, "variants");

      [baseFolder, imagesFolder, docsFolder, variantFolder].forEach(
        (folder) => {
          if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
        }
      );

      // 3️⃣ Move files from temp → final folders
      const movedFiles = [];

      if (req.files && req.files.length) {
        for (const file of req.files) {
          const filename = path.basename(file.path);
          let newPath;

          // Main product images
          if (file.fieldname === "images") {
            newPath = path.join(imagesFolder, filename);
            file.finalPath = `products/${vendorId}/${productId}/images/${filename}`;
          }
          // Documents (fieldname is numeric ID)
          else if (!isNaN(parseInt(file.fieldname))) {
            newPath = path.join(docsFolder, filename);
            file.finalPath = `products/${vendorId}/${productId}/documents/${filename}`;
          }
          // Variant images (fieldname like variant_0_image)
          else if (file.fieldname.startsWith("variant_")) {
            newPath = path.join(variantFolder, filename);
            file.finalPath = `products/${vendorId}/${productId}/variants/${filename}`;
          } else {
            continue; // skip unknown field
          }

          await moveFile(file.path, newPath);
          movedFiles.push(file);
        }
      }

      // 4️⃣ Insert main product images
      const mainImages = movedFiles.filter((f) => f.fieldname === "images");
      if (mainImages.length) {
        await ProductModel.insertProductImages(
          connection,
          productId,
          mainImages
        );
      }

      // 5️⃣ Insert product documents
      const docFiles = movedFiles.filter((f) => !isNaN(parseInt(f.fieldname)));
      if (docFiles.length) {
        await ProductModel.insertProductDocuments(
          connection,
          productId,
          body.category_id,
          docFiles
        );
      }

      // 6️⃣ Handle variants
      if (body.variants) {
        const variants =
          typeof body.variants === "string"
            ? JSON.parse(body.variants)
            : body.variants;

        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];
          const variantId = await ProductModel.createProductVariant(
            connection,
            productId,
            variant
          );

          // Variant images
          const variantFiles = movedFiles.filter((f) =>
            f.fieldname.startsWith(`variant_${i}_`)
          );
          if (variantFiles.length) {
            await ProductModel.insertProductVariantImages(
              connection,
              variantId,
              variantFiles
            );
          }
        }
      }

      await connection.commit();
      return res.json({ success: true, productId });
    } catch (err) {
      if (connection) await connection.rollback();
      console.error("PRODUCT CREATE ERROR:", err);
      return res.status(500).json({ success: false, message: err.message });
    } finally {
      if (connection) connection.release();
    }
  }
  // Get product by ID
  async getProductDetailsById(req, res) {
    try {
      const productId = req.params.id;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      const product = await ProductModel.getProductDetailsById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      return res.json({
        success: true,
        product,
      });
    } catch (error) {
      console.error("GET PRODUCT BY ID ERROR:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // Update Product
  async updateProduct(req, res) {
    let connection;

    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const productId = req.params.id;
      const vendorId = req.user.vendor_id;
      const body = req.body;
      const files = req.files;
      if (!productId) {
        return res
          .status(400)
          .json({ success: false, message: "Product ID is required" });
      }

      await ProductModel.updateProduct(
        connection,
        productId,
        vendorId,
        body,
        files
      );

      await connection.commit();
      return res.json({
        success: true,
        message: "Product updated successfully",
      });
    } catch (err) {
      if (connection) await connection.rollback();
      console.error("PRODUCT UPDATE ERROR:", err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    } finally {
      if (connection) connection.release();
    }
  }

  // Delete Product
  async deleteProduct(req, res) {
    let connection;

    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const vendorId = req.user.vendor_id;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor ID is required",
        });
      }

      const productId = req.params.id;

      if (!productId) {
        return res
          .status(400)
          .json({ success: false, message: "Product ID is required" });
      }

      await ProductModel.deleteProduct(connection, productId, vendorId);

      await connection.commit();
      return res.json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (err) {
      if (connection) await connection.rollback();
      console.error("PRODUCT DELETE ERROR:", err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    } finally {
      if (connection) connection.release();
    }
  }

  // Get all Products
  async getAllProductDetails(req, res) {
    try {
      // filters
      const user = req?.user;
      const role = user?.role;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const search = req.query.search || "";
      const status = req.query.status || "";
      const sortBy = req.query.sortBy || "created_at";
      const sortOrder =
        req.query.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

      // fetch product Details
      const { products, totalItems } = await ProductModel.getAllProductDetails({
        search,
        status,
        sortBy,
        sortOrder,
        limit,
        offset,
      });

      const processedProducts = products.map((product) => {
        let images = [];
        try {
          images = JSON.parse(product.images);
        } catch {
          images = [];
        }

        return {
          ...product,
          images,
          main_image: images.length ? images[0].image_url : null,
        };
      });

      const normalizedProducts =
        role === "vendor_manager"
          ? processedProducts
              .filter((p) => p.status !== "pending")
              .map((p) => ({
                ...p,
                status: p.status === "sent_for_approval" ? "pending" : p.status,
              }))
          : processedProducts;

      // Stats calculation
      const statsSource =
        role === "vendor_manager"
          ? processedProducts
              .filter((p) => p.status !== "pending")
              .map((p) => ({
                ...p,
                status: p.status === "sent_for_approval" ? "pending" : p.status,
              }))
          : processedProducts;

      const stats = statsSource.reduce(
        (acc, product) => {
          acc.total += 1;
          if (product.status === "pending") acc.pending += 1;
          if (product.status === "approved") acc.approved += 1;
          if (product.status === "rejected") acc.rejected += 1;
          if (product.status === "resubmission") acc.resubmission += 1;
          return acc;
        },
        {
          pending: 0,
          approved: 0,
          rejected: 0,
          resubmission: 0,
          total: 0,
        }
      );

      return res.json({
        success: true,
        products: normalizedProducts,
        stats,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      });
    } catch (err) {
      console.error("GET ALL PRODUCTS ERROR:", err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // Get all products by vendor
  async getProductsByVendor(req, res) {
    try {
      const vendorId = req.params.vendorId;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor ID is required",
        });
      }

      const products = await ProductModel.getProductsByVendor(vendorId);

      return res.json({
        success: true,
        products,
      });
    } catch (err) {
      console.error("GET PRODUCTS BY VENDOR ERROR:", err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // My Listed Products
  async getMyListedProducts(req, res) {
    try {
      const vendorId = req.user.vendor_id;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor ID is required",
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const search = req.query.search || "";
      const status = req.query.status || "";
      const sortBy = req.query.sortBy || "created_at";
      const sortOrder =
        req.query.sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

      const { products, totalItems } = await ProductModel.getProductsByVendor(
        vendorId,
        { search, status, sortBy, sortOrder, limit, offset }
      );

      const processedProducts = products.map((product) => {
        let images = [];
        try {
          images = JSON.parse(product.images);
        } catch {
          images = [];
        }

        return {
          ...product,
          images,
          main_image: images.length ? images[0].image_url : null,
        };
      });

      // Stats calculation
      const stats = processedProducts.reduce(
        (acc, product) => {
          acc.total += 1;
          if (product.status === "pending") acc.pending += 1;
          if (product.status === "sent_for_approval")
            acc.sent_for_approval += 1;
          if (product.status === "approved") acc.approved += 1;
          if (product.status === "rejected") acc.rejected += 1;
          if (product.status === "resubmission") acc.resubmission += 1;
          return acc;
        },
        {
          pending: 0,
          sent_for_approval: 0,
          approved: 0,
          rejected: 0,
          resubmission: 0,
          total: 0,
        }
      );

      return res.json({
        success: true,
        products: processedProducts,
        stats,
        total: totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      });
    } catch (err) {
      console.error("Get my product list Error:", err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // Get categories documents based on Id
  async getRequiredDocuments(req, res) {
    try {
      const categoryID = req.params.id;
      const documents = await ProductModel.getRequiredDocumentsByCategory(
        categoryID
      );

      return res.json({ success: true, data: documents });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // Update product status
  // async updateStatus(req, res) {
  //   try {
  //     const { productId } = req.params;
  //     const { status, rejectionReason } = req.body;

  //     const allowed = ["approved", "rejected", "pending"];
  //     if (!allowed.includes(status)) {
  //       return res
  //         .status(400)
  //         .json({ success: false, message: "Invalid status" });
  //     }

  //     const updated = await ProductModel.updateProductStatus(
  //       productId,
  //       status,
  //       rejectionReason || null
  //     );

  //     if (!updated) {
  //       return res
  //         .status(404)
  //         .json({ success: false, message: "Product not found" });
  //     }

  //     return res.json({
  //       success: true,
  //       message: `Product ${status}`,
  //     });
  //   } catch (err) {
  //     return res.status(500).json({ success: false, message: "Server error" });
  //   }
  // }

  // Get approved Products Details
  async approvedProductList(req, res) {
    try {
      const vendorId = req.query.vendorId;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor ID is required",
        });
      }

      const products = await ProductModel.getApprovedProductList(vendorId);

      return res.json({
        success: true,
        products,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Error fetching approved product List",
      });
    }
  }

  // fetch Details according to approved product selected
  async approvedProducts(req, res) {
    try {
      const productId = req.params.productId;

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      const products = await ProductModel.getApprovedProducts(productId);

      return res.json({
        success: true,
        products,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Error fetching approved product Details",
      });
    }
  }

  async approvalRequest(req, res) {
    const vendorId = req.user.vendor_id;
    const productId = req.params.productId;

    if (!vendorId || !productId) {
      return res.status(400).json({
        success: false,
        message: "Vendor and Product Id is required",
      });
    }

    const [productRows] = await db.query(
      `SELECT * FROM products WHERE product_id = ? AND vendor_id = ? `,
      [productId, vendorId]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const product = productRows[0];

    if (
      productRows.length > 0 &&
      (product.status == "pending" || product.status == "resubmission")
    ) {
      await db.query(
        `UPDATE products
         SET status = 'sent_for_approval'
         WHERE product_id = ?`,
        [product.product_id]
      );
    }

    return res.json({
      success: true,
      message: "Product sent for approval successfully",
    });
  }
  catch(err) {
    return res.status(500).json({
      success: false,
      message: "Error fetching approved product List",
    });
  }
}

module.exports = new ProductController();
