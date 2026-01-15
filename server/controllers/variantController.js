const VariantModel = require("../models/variantModel");
const db = require("../config/database");


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
      const variantId = Number(req.params.variantId);

      await VariantModel.insertVariantImages(
        variantId,
        req.files.map((f) => ({
          path: `variants/${variantId}/${f.filename}`,
        }))
      );

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
      const { variantId } = req.params;
      const { image_url } = req.body;

      if (!image_url) {
        return res.status(400).json({
          success: false,
          message: "image_url is required",
        });
      }

      await VariantModel.deleteVariantImage(variantId, image_url);

      return res.json({
        success: true,
        message: "Image removed",
      });
    } catch (err) {
      console.error("DELETE VARIANT IMAGE ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getVariantImages(req, res) {
    try {
      const { variantId } = req.params;

      const [rows] = await db.execute(
        `SELECT image_url
         FROM product_variant_images
         WHERE variant_id = ?`,
        [variantId]
      );

      return res.json({
        success: true,
        images: rows.map((r) => r.image_url),
      });
    } catch (error) {
      console.error("GET VARIANT IMAGES ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch variant images",
      });
    }
  }
}
module.exports = new VariantController();
