const VariantModel = require("../models/variantModel");
const db = require("../config/database");
const path = require("path");
const fs = require("fs");
const variantModel = require("../models/variantModel");

class VariantController {
  // 1. List all variants of a product
  async getVariantsByProduct(req, res) {
    try {
      const productId = Number(req.params.productId);

      const variants = await VariantModel.getVariantsByProduct(productId);

      return res.json({
        success: true,
        data: variants,
      });
    } catch (err) {
      console.error("GET VARIANTS ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 2. Get single variant details
  async getVariantById(req, res) {
    try {
      const variantId = Number(req.params.variantId);

      const variant = await VariantModel.getVariantById(variantId);
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Variant not found",
        });
      }

      return res.json({ success: true, data: variant });
    } catch (err) {
      console.error("GET VARIANT ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 3. Update variant (price, stock, dates)
  async updateVariant(req, res) {
    try {
      const variantId = Number(req.params.variantId);
      const data = req.body;

      await VariantModel.updateVariant(variantId, data);

      return res.json({
        success: true,
        message: "Variant updated successfully",
      });
    } catch (err) {
      console.error("UPDATE VARIANT ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 4. Upload variant images
  async uploadVariantImages(req, res) {
    try {
      const vendorId = req.user.vendor_id;
      const variantId = Number(req.params.variantId);

      if (!req.files || !req.files.length) {
        return res.status(400).json({
          success: false,
          message: "No images uploaded",
        });
      }

      // Product Id
      const [[variant]] = await db.execute(
        `SELECT product_id FROM product_variants WHERE variant_id = ?`,
        [variantId],
      );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Variant not found",
        });
      }

      const productId = variant.product_id;

      // images
      const variantFolder = path.join(
        __dirname,
        "../uploads/products",
        vendorId.toString(),
        productId.toString(),
        "variants",
        variantId.toString(),
      );

      if (!fs.existsSync(variantFolder)) {
        fs.mkdirSync(variantFolder, { recursive: true });
      }

      const imagesToInsert = [];

      for (const file of req.files) {
        const filename = path.basename(file.path);
        const newPath = path.join(variantFolder, filename);

        //  Move file from temp → final location
        fs.renameSync(file.path, newPath);

        const finalPath = `products/${vendorId}/${productId}/variants/${variantId}/${filename}`;

        imagesToInsert.push({ path: finalPath });
      }

      await VariantModel.insertVariantImages(variantId, imagesToInsert);

      return res.json({
        success: true,
        message: "Images uploaded",
      });
    } catch (err) {
      console.error("UPLOAD VARIANT IMAGE ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // 5. Delete variant image
  async deleteVariantImage(req, res) {
    try {
      const imageId = Number(req.params.imageId);

      //  Get image record
      const [[image]] = await db.execute(
        `
      SELECT image_url
      FROM product_variant_images
      WHERE image_id = ?
      `,
        [imageId],
      );

      if (!image) {
        return res.status(404).json({
          success: false,
          message: "Image not found",
        });
      }

      // 2 Delete DB row
      await db.execute(
        `DELETE FROM product_variant_images WHERE image_id = ?`,
        [imageId],
      );

      // 3 Delete physical file
      const filePath = path.join(__dirname, "../uploads", image.image_url);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return res.json({
        success: true,
        message: "Image deleted",
      });
    } catch (err) {
      console.error("DELETE VARIANT IMAGE ERROR:", err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  async getVariantImages(req, res) {
    try {
      const { variantId } = req.params;

      const [rows] = await db.execute(
        `
      SELECT image_id, image_url
      FROM product_variant_images
      WHERE variant_id = ?
      ORDER BY image_id ASC
      `,
        [variantId],
      );

      return res.json({
        success: true,
        images: rows,
      });
    } catch (error) {
      console.error("GET VARIANT IMAGES ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch variant images",
      });
    }
  }

  // Product Variant Visibility
  async Visibility(req, res) {
    try {
      const { variantId } = req.params;
      const { is_visible } = req.body;

      if (typeof is_visible !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "is_visible must be a boolean",
        });
      }

      const updated = await variantModel.updateVisibility({
        variantId,
        isVisible: is_visible,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Variant not found or not authorized",
        });
      }

      return res.json({
        success: true,
        message: "Variant visibility updated successfully",
        data: { variantId, is_visible },
      });
    } catch (error) {
      console.error("Visibility update error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update visibility",
      });
    }
  }

  // update the reward limit
  async updateRewardRedemptionLimit(req, res) {
    try {
      const { product_id, variant_id, reward_redemption_limit } = req.body;

      if (!product_id || !variant_id || reward_redemption_limit === undefined) {
        return res.status(400).json({
          success: false,
          message:
            "product_id, variant_id and reward_redemption_limit are required",
        });
      }

      // check variant belongs to product
      const isValid = await variantModel.checkVariantProductRelation(
        product_id,
        variant_id,
      );

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: "Invalid product_id and variant_id combination",
        });
      }

      await variantModel.updateRewardLimit(
        product_id,
        variant_id,
        reward_redemption_limit,
      );

      return res.status(200).json({
        success: true,
        message: "Reward redemption limit updated successfully",
      });
    } catch (err) {
      console.error("Update reward limit error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
module.exports = new VariantController();
