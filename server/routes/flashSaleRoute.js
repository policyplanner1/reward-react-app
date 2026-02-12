const express = require("express");
const router = express.Router();
const flashController = require("../controllers/flashController");
const { uploadFlashBanner } = require("../middleware/flashUpload");
const { authorizeRoles } = require("../middleware/auth");

// create flash sale
router.post(
  "/flash-sale",
  // authorizeRoles("vendor_manager", "admin"),
  uploadFlashBanner.single("banner_image"),
  flashController.createFlashSale,
);

// add items to flash sale
router.post(
  "/flash-sale/:id/items",
  // authorizeRoles("vendor_manager", "admin"),
  flashController.addItems,
);

// get flash sale details
router.get(
  "/flash-sale",
  // authorizeRoles("vendor_manager", "admin"),
  flashController.getFlashSales,
);

// activate flash sale
router.put(
  "/flash-sale/:id/activate",
  // authorizeRoles("vendor_manager", "admin"),
  flashController.activate,
);

// get flash sale product details
router.get(
  "/flash-sale-products",
  // authorizeRoles("vendor_manager", "admin"),
  flashController.getActiveProducts,
);

// edit flash sale details
router.get(
  "/flash-sale/:id",
  // authorizeRoles("vendor_manager", "admin"),
  flashController.getFlashSaleById,
);

// update flash sale
router.put(
  "/flash-sale/:id",
  // authorizeRoles("vendor_manager", "admin"),
  uploadFlashBanner.single("banner_image"),
  flashController.updateFlashSale,
);

module.exports = router;
