const express = require("express");
const router = express.Router();
const ServiceController = require("../controllers/serviceController");

// Fetch Active Services
router.get("/all-services", ServiceController.getServices);

// Get By Id
router.get("/find/:id", ServiceController.getServiceById);


// ======================Admin Routes===================================
// Create a services
router.post("/create-service", ServiceController.createService);

// update
router.put("/update/:id", ServiceController.updateService);

// Delete
router.delete("/remove/:id", ServiceController.deleteService);

module.exports = router;
