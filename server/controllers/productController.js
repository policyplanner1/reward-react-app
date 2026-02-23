const ProductModel = require("../models/productModel");
const db = require("../config/database");
const fs = require("fs");
const path = require("path");
const { moveFile } = require("../utils/moveFile");
const { compressVideo } = require("../utils/videoCompression");

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
        [vendorId],
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

      // 1 Create product entry
      const productId = await ProductModel.createProduct(
        connection,
        vendorId,
        body,
      );

      // 1.5  Save product attributes (JSON)
      if (body.attributes) {
        const attributes =
          typeof body.attributes === "string"
            ? JSON.parse(body.attributes)
            : body.attributes;

        await ProductModel.saveProductAttributes(
          connection,
          productId,
          attributes,
        );
      }

      // 2 Prepare folder structure
      const baseFolder = path.join(
        __dirname,
        "../uploads/products",
        `${vendorId}`,
        `${productId}`,
      );
      const imagesFolder = path.join(baseFolder, "images");
      const docsFolder = path.join(baseFolder, "documents");
      const variantFolder = path.join(baseFolder, "variants");

      [baseFolder, imagesFolder, docsFolder, variantFolder].forEach(
        (folder) => {
          if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
        },
      );

      // 3 Move files from temp → final folders
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
          } else if (file.fieldname === "video") {
            const videoFolder = path.join(baseFolder, "video");
            if (!fs.existsSync(videoFolder)) {
              fs.mkdirSync(videoFolder, { recursive: true });
            }

            // 1 Validate
            if (!file.mimetype.startsWith("video/")) {
              throw new Error("Invalid video file type");
            }

            if (file.size > 50 * 1024 * 1024) {
              throw new Error("Video exceeds size limit");
            }

            // 2 Move original file from temp → product video folder
            const originalPath = path.join(
              videoFolder,
              path.basename(file.path),
            );
            await moveFile(file.path, originalPath);

            // 3 Define compressed file path
            const compressedFilename = `compressed-${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 8)}.mp4`;
            const compressedPath = path.join(videoFolder, compressedFilename);

            // 4 compress
            try {
              await compressVideo(originalPath, compressedPath);
              await fs.promises.unlink(originalPath);
            } catch (err) {
              if (fs.existsSync(originalPath)) {
                await fs.promises.unlink(originalPath);
              }
              if (fs.existsSync(compressedPath)) {
                await fs.promises.unlink(compressedPath);
              }
              throw new Error("Video compression failed");
            }

            // 5 Update file metadata for DB storage
            file.finalPath = `products/${vendorId}/${productId}/video/${compressedFilename}`;
            file.path = compressedPath;

            movedFiles.push(file);

            continue;
          } else {
            continue;
          }

          await moveFile(file.path, newPath);
          movedFiles.push(file);
        }
      }

      // 4 Insert main product images
      const mainImages = movedFiles.filter((f) => f.fieldname === "images");
      if (mainImages.length) {
        await ProductModel.insertProductImages(
          connection,
          productId,
          mainImages,
        );
      }

      // 4.5 Insert video if exists
      const videoFile = movedFiles.find((f) => f.fieldname === "video");
      if (videoFile) {
        await ProductModel.insertProductVideo(
          connection,
          productId,
          videoFile.finalPath,
        );
      }

      // 5 Insert product documents
      const docFiles = movedFiles.filter((f) => !isNaN(parseInt(f.fieldname)));
      if (docFiles.length) {
        await ProductModel.insertProductDocuments(
          connection,
          productId,
          body.category_id,
          docFiles,
        );
      }

      // 6 Handle variants
      await ProductModel.generateProductVariants(
        connection,
        productId,
        body.category_id,
        body.subcategory_id,
      );

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
        files,
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

      const { products, totalItems, stats } =
        await ProductModel.getAllProductDetails({
          search,
          status,
          sortBy,
          sortOrder,
          limit,
          offset,
          role,
        });

      const normalizedProducts = products.map((p) => ({
        ...p,
        main_image: p.images?.length ? p.images[0].image_url : null,
        status: p.status === "sent_for_approval" ? "pending" : p.status,
      }));

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
        message: err.message || "Internal server error",
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

      const { products, totalItems, stats } =
        await ProductModel.getProductsByVendor(vendorId, {
          search,
          status,
          sortBy,
          sortOrder,
          limit,
          offset,
        });

      const processedProducts = products.map((product) => ({
        ...product,
        main_image:
          product.images && product.images.length
            ? product.images[0].image_url
            : null,
      }));

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
        message: err.message || "Internal server error",
      });
    }
  }

  // Get categories documents based on Id
  async getRequiredDocuments(req, res) {
    try {
      const categoryID = req.params.id;
      const documents =
        await ProductModel.getRequiredDocumentsByCategory(categoryID);

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
      `SELECT * FROM eproducts WHERE product_id = ? AND vendor_id = ? `,
      [productId, vendorId],
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
        `UPDATE eproducts
         SET status = 'sent_for_approval'
         WHERE product_id = ?`,
        [product.product_id],
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

  // Product Visibility
  async Visibility(req, res) {
    try {
      const { productId } = req.params;
      const { is_visible } = req.body;
      const vendorId = req.user?.vendor_id;

      if (typeof is_visible !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "is_visible must be a boolean",
        });
      }

      const updated = await ProductModel.updateVisibility({
        productId,
        vendorId,
        isVisible: is_visible,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Product not found or not authorized",
        });
      }

      return res.json({
        success: true,
        message: "Product visibility updated successfully",
        data: { productId, is_visible },
      });
    } catch (error) {
      console.error("Visibility update error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update visibility",
      });
    }
  }

  // Product Searchable
  async Searchable(req, res) {
    try {
      const { productId } = req.params;
      const { is_searchable } = req.body;
      const vendorId = req.user?.vendor_id;

      if (typeof is_searchable !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "is_searchable must be a boolean",
        });
      }

      const updated = await ProductModel.updateSearchable({
        productId,
        vendorId,
        isSearchable: is_searchable,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Product not found or not authorized",
        });
      }

      return res.json({
        success: true,
        message: "Product searchable status updated successfully",
        data: { productId, is_searchable },
      });
    } catch (error) {
      console.error("Searchable update error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update searchable status",
      });
    }
  }
}

module.exports = new ProductController();
