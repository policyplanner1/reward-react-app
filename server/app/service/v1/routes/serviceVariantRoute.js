const express = require("express");
const router = express.Router();
const ServiceVariantController = require("../controllers/serviceVariantController");


// add Variant
router.post("/create-variant", ServiceVariantController.addVariant);

// Get variant by Id
router.get("/find/:serviceId", ServiceVariantController.getVariantsByService);

// delete a variant
router.delete("/remove/:id", ServiceVariantController.deleteVariant);

// Get variant Description details
router.get("/variant-section/:variantId", ServiceVariantController.getVariantSection);

// add variant section details
router.post("/variant-section", ServiceVariantController.addVariantSection);

// delete a variant section details
router.delete("/variant-section/:variantId", ServiceVariantController.deleteVariantSection);

module.exports = router;
