const express = require("express");
const router = express.Router();
const ServiceCategoryController = require("../controllers/serviceCategoryController");

// Fetch Active Services
router.get("/all-categories", ServiceCategoryController.getCategories);

// Create a category
router.post("/create-category", ServiceCategoryController.createCategory);

// Get By Id
router.get("/find/:id", ServiceCategoryController.getCategoryById);

// update
router.put("/update/:id", ServiceCategoryController.updateCategory);

// Delete
router.delete("/remove/:id", ServiceCategoryController.deleteCategory);

module.exports = router;
