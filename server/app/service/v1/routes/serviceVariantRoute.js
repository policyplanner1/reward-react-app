const express = require("express");
const router = express.Router();
const ServiceVariantController = require("../controllers/serviceVariantController");


// add Variant
router.post("/create-variant", ServiceVariantController.addVariant);

// Get variant by Id
router.get("/find/:serviceId", ServiceVariantController.getVariantsByService);

// delete a variant
router.delete("/remove/:id", ServiceVariantController.deleteVariant);

module.exports = router;
