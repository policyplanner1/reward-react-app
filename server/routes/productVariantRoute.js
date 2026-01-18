const express = require("express");
const router = express.Router();
const VariantController = require("../controllers/variantController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const { productUpload } = require("../middleware/productUpload");

// Get variants by product
router.get(
  "/product/:productId",
  authenticateToken,
  authorizeRoles("vendor", "vendor_manager", "admin"),
  VariantController.getVariantsByProduct
);

// Get single variant
router.get(
  "/:variantId",
  authenticateToken,
  authorizeRoles("vendor", "vendor_manager", "admin"),
  VariantController.getVariantById
);

// Update variant
router.put(
  "/:variantId",
  authenticateToken,
  authorizeRoles("vendor"),
  VariantController.updateVariant
);

//  GET variant images 
router.get(
  "/:variantId/images",
  authenticateToken,
  authorizeRoles("vendor", "vendor_manager", "admin"),
  VariantController.getVariantImages
);

// Upload variant images
router.post(
  "/:variantId/images",
  authenticateToken,
  authorizeRoles("vendor"),
  productUpload.array("images", 5),
  VariantController.uploadVariantImages
);

//  Delete variant image 
router.delete(
  "/images/:imageId",
  authenticateToken,
  authorizeRoles("vendor"),
  VariantController.deleteVariantImage
);

// Visibility
router.patch(
  "/visibility/:variantId",
  authenticateToken,
  authorizeRoles("vendor"),
  VariantController.Visibility,
);

module.exports = router;
