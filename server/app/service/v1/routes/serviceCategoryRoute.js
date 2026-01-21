const express = require("express");
const router = express.Router();
const ServiceCategoryController = require("../controllers/serviceCategoryController");

// Fetch Active Services
router.get("/categories", ServiceCategoryController.getCategories);

// Create a category
router.post("/categories", ServiceCategoryController.createCategory);

// Get By Id
router.get("/categories/:id", ServiceCategoryController.getCategoryById);

// update
router.put("/categories/:id", ServiceCategoryController.updateCategory);

// Delete
router.delete("/categories/:id", ServiceCategoryController.deleteCategory);

module.exports = router;
