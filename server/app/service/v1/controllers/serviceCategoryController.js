const db = require("../../../../config/database");
const fs = require("fs");
const path = require("path");
const ServiceCategoryModel = require("../models/serviceCategoryModel");
const { UPLOAD_BASE } = require("../../../../config/path");

class ServiceCatalogController {
  // Find all categories
  async getCategories(req, res) {
    try {
      const categories = await ServiceCategoryModel.findAll(true);

      res.json({
        success: true,
        data: categories,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // create category
  async createCategory(req, res) {
    try {
      const { name, status } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      // 1. Create category
      const categoryId = await ServiceCategoryModel.create({
        name,
        icon: null,
        status,
      });

      let iconPath = null;

      if (req.file) {
        const categoryDir = path.join(
          UPLOAD_BASE,
          "service-category",
          String(categoryId),
        );

        fs.mkdirSync(categoryDir, { recursive: true });

        const finalPath = path.join(categoryDir, req.file.filename);

        fs.copyFileSync(req.file.path, finalPath);
        fs.unlinkSync(req.file.path);

        iconPath = `uploads/service-category/${categoryId}/${req.file.filename}`;

        await ServiceCategoryModel.update(categoryId, {
          name,
          icon: iconPath,
          status,
        });
      }

      res.status(201).json({
        success: true,
        message: "Service category created successfully",
        data: {
          id: categoryId,
          icon: iconPath,
        },
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // Get category By Id
  async getCategoryById(req, res) {
    try {
      const { id } = req.params;

      const category = await ServiceCategoryModel.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      res.json({
        success: true,
        data: category,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // Update category
  async updateCategory(req, res) {
    try {
      const { id } = req.params;

      const affected = await ServiceCategoryModel.update(id, req.body);

      if (!affected) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      res.json({
        success: true,
        message: "Service category updated successfully",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  // Delete Category
  async deleteCategory(req, res) {
    try {
      const { id } = req.params;

      const affected = await ServiceCategoryModel.delete(id);

      if (!affected) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      res.json({
        success: true,
        message: "Service category removed successfully",
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new ServiceCatalogController();
