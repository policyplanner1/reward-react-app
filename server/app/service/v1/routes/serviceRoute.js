const express = require("express");
const router = express.Router();
const ServiceController = require("../controllers/serviceController");
const upload = require("../../../../middleware/serviceCategoryUpload");

// Fetch Active Services
router.get("/all-services", ServiceController.getServices);

// Get By Id
router.get("/find/:id", ServiceController.getServiceById);

// ======================Admin Routes===================================
// Create a services
router.post(
  "/create-service",
  upload.single("service_image"),
  ServiceController.createService,
);

// update
router.put(
  "/update/:id",
  upload.single("service_image"),
  ServiceController.updateService,
);

// Delete
router.delete("/remove/:id", ServiceController.deleteService);

module.exports = router;
