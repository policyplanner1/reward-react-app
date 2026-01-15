const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/categoryController");

router.get("/", CategoryController.getAllCategories);
router.get("/:categoryId/documents", CategoryController.getCategoryDocuments);
router.get("/attributes",CategoryController.getCategoryAttributes);

module.exports = router;
