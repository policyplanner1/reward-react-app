const express = require("express");
const router = express.Router();
const VariantController = require("../controllers/variantController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const { productUpload } = require("../middleware/productUpload");

// routes/variant.routes.js
router.get(
  "/product/:productId",
  authenticateToken,
  authorizeRoles("vendor", "vendor_manager", "admin"),
  VariantController.getVariantsByProduct
);

router.get(
  "/:variantId",
  authenticateToken,
  authorizeRoles("vendor", "vendor_manager", "admin"),
  VariantController.getVariantById
);

router.put(
  "/:variantId",
  authenticateToken,
  authorizeRoles("vendor"),
  VariantController.updateVariant
);

router.post(
  "/:variantId/images",
  authenticateToken,
  authorizeRoles("vendor"),
  productUpload.array("images", 5),
  VariantController.uploadVariantImages
);

router.delete(
  "/images/:imageId",
  authenticateToken,
  authorizeRoles("vendor"),
  VariantController.deleteVariantImage
);

module.exports = router;
