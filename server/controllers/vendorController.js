const VendorModel = require("../models/vendorModel");
const categoryModel = require("../models/categoryModel");
const subCategoryModel = require("../models/subCategoryModel");
const subSubCategoryModel = require("../models/subSubCategoryModel");
const productModel = require("../models/productModel");
const db = require("../config/database");
const fs = require("fs");
const path = require("path");

// helper function to upload the images and docs
async function moveVendorFiles(vendorId, files) {
  const targetDir = path.join(
    __dirname,
    "../uploads/vendors",
    vendorId.toString(),
    "documents"
  );

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const key of Object.keys(files)) {
    const file = files[key][0];

    const newPath = path.join(targetDir, file.filename);
    fs.renameSync(file.path, newPath);

    file.path = newPath;
  }
}

class VendorController {
  /* ============================================================
        ONBOARD VENDOR (Common Documents Only)
  ============================================================ */
  async onboardVendor(req, res) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const userId = req.user?.user_id;
      const vndID = req.user?.vendor_id;
      const data = req.body;
      const files = req.files;

      // fetch vendor
      const [rows] = await connection.query(
        `SELECT status FROM vendors WHERE vendor_id = ? AND user_id = ?`,
        [vndID, userId]
      );

      if (!rows.length) {
        throw new Error("Vendor not found");
      }

      // block approved vendor
      if (rows[0].status === "approved") {
        return res.status(400).json({
          success: false,
          message: "Vendor already approved",
        });
      }

      if (rows[0].status === "sent_for_approval") {
        return res.status(400).json({
          success: false,
          message: "Onboarding already submitted",
        });
      }

      const vendor = await VendorModel.createVendor(
        connection,
        data,
        userId,
        vndID
      );

      await VendorModel.insertAddress(connection, vndID, "business", data);
      await VendorModel.insertAddress(connection, vndID, "billing", data);
      await VendorModel.insertAddress(connection, vndID, "shipping", data);

      await VendorModel.insertBankDetails(connection, vndID, data);
      await VendorModel.insertContacts(connection, vndID, data);

      if (files) {
        await moveVendorFiles(vndID, files);
        await VendorModel.insertCommonDocuments(connection, vndID, files);
      }

      await connection.commit();

      return res.status(201).json({
        success: true,
        message: "Vendor onboarded successfully",
        vndID,
      });
    } catch (err) {
      if (connection) await connection.rollback();

      console.error("ONBOARD ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Onboarding failed",
        error: err.message,
      });
    } finally {
      if (connection) connection.release();
    }
  }

  /* ============================================================
        GET A SPECIFIC VENDOR
  ============================================================ */
  async getVendor(req, res) {
    try {
      const vendorId = req.params.vendorId;

      if (!vendorId) {
        return res.status(404).json({
          success: false,
          message: "Vendor ID is required",
        });
      }

      const data = await VendorModel.getVendorById(vendorId);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      return res.json({ success: true, data });
    } catch (err) {
      console.error("GET VENDOR ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ============================================================
        GET ALL VENDORS (Admin & Manager)
  ============================================================ */
  async getAllVendors(req, res) {
    try {
      const status = req.query.status || null;
      const vendors = await VendorModel.getAllVendors(status);

      return res.json({ success: true, data: vendors });
    } catch (err) {
      console.error("GET ALL VENDORS ERROR:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ============================================================
        UPDATE VENDOR STATUS (Admin / Vendor Manager)
  ============================================================ */
  async updateVendorStatus(req, res) {
    try {
      const { vendorId } = req.params;
      let { status, rejectionReason } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status field is required",
        });
      }

      status = status.toLowerCase().trim();

      const allowed = ["approved", "rejected", "pending"];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
        });
      }

      const updated = await VendorModel.updateVendorStatus(
        vendorId,
        status,
        rejectionReason || null
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      return res.json({
        success: true,
        message: `Vendor status updated to ${status}`,
      });
    } catch (err) {
      console.error("STATUS UPDATE ERROR:", err);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: err.message,
      });
    }
  }

  // vendor manager creates category
  async createCategory(req, res) {
    try {
      const data = req.body;

      await categoryModel.createCategory(data);

      res.status(201).json({
        success: true,
        message: "Category created successfully",
      });
    } catch (error) {
      console.error("category creation error:", error);
      res.status(500).json({
        success: false,
        message: "Category creation error",
        error: error.message,
      });
    }
  }

  // update category by vendor manager
  async updateCategory(req, res) {
    try {
      const categoryID = req.params.id;
      const data = req.body;

      const updatedCategory = await categoryModel.updateCategory(
        categoryID,
        data
      );

      if (!updatedCategory) {
        return res.status(404).json({
          success: false,
          message: "Category not found or no changes made",
        });
      }

      res.status(200).json({
        success: true,
        data: updatedCategory,
        message: "Category updated successfully",
      });
    } catch (error) {
      console.error("category updating error:", error);
      res.status(500).json({
        success: false,
        message: "Category updating error",
        error: error.message,
      });
    }
  }

  // // vendor manager fetch all categories
  // async getAllCategories(req, res) {
  //   try {
  //     const data = await categoryModel.getAllCategories();

  //     res.status(200).json({
  //       success: true,
  //       data,
  //       message: data.length ? "Fetched all categories" : "No categories found",
  //     });
  //   } catch (error) {
  //     console.error("fetching category error:", error);
  //     res.status(500).json({
  //       success: false,
  //       message: "Error fetching categories",
  //       error: error.message,
  //     });
  //   }
  // }

  // get category by ID
  async getCategoryById(req, res) {
    try {
      const categoryID = req.params.id;

      const data = await categoryModel.getCategoryById(categoryID);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Category not found",
        });
      }

      res.status(200).json({
        success: true,
        data,
        message: "Category fetched by ID",
      });
    } catch (error) {
      console.error("fetching category by ID error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching category by ID",
        error: error.message,
      });
    }
  }

  // delete a category
  async deleteCategory(req, res) {
    try {
      const categoryID = req.params.id;

      const data = await categoryModel.deleteCategory(categoryID);

      res.status(200).json({
        success: true,
        data,
        message: "Category deleted successfully",
      });
    } catch (error) {
      console.error("delete category error:", error);
      res.status(500).json({
        success: false,
        message: "error deleting category",
        error: error.message,
      });
    }
  }

  // create Sub Categories
  async createSubCategory(req, res) {
    try {
      const data = req.body;

      await subCategoryModel.createSubCategory(data);

      res.status(201).json({
        success: true,
        message: "sub category created successfully",
      });
    } catch (error) {
      console.error("sub category creation error:", error);
      res.status(500).json({
        success: false,
        message: "sub category creation error",
        error: error.message,
      });
    }
  }

  // GET ALL SUB CATEGORIES
  async getAllSubCategories(req, res) {
    try {
      const categories = await subCategoryModel.getAllSubCategories();

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("Get all sub categories error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching sub categories",
        error: error.message,
      });
    }
  }

  // GET SUB CATEGORY BY ID
  async getSubCategoryById(req, res) {
    try {
      const id = req.params.id;

      const category = await subCategoryModel.getSubCategoryById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Sub category not found",
        });
      }

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error("Get sub category error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching sub category",
        error: error.message,
      });
    }
  }

  // UPDATE SUB CATEGORY
  async updateSubCategory(req, res) {
    try {
      const id = req.params.id;
      const data = req.body;

      const updated = await subCategoryModel.updateSubCategory(id, data);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Sub category not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Sub category updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Update sub category error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating sub category",
        error: error.message,
      });
    }
  }

  // DELETE SUB CATEGORY
  async deleteSubCategory(req, res) {
    try {
      const id = req.params.id;

      const deleted = await subCategoryModel.deleteSubCategory(id);

      if (deleted === 0) {
        return res.status(404).json({
          success: false,
          message: "Sub category not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Sub category deleted successfully",
      });
    } catch (error) {
      console.error("Delete sub category error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting sub category",
        error: error.message,
      });
    }
  }

  // CREATE subSubCategory
  async createSubSubCategory(req, res) {
    try {
      const data = req.body;

      await subSubCategoryModel.createSubSubCategory(data);

      res.status(201).json({
        success: true,
        message: "Sub-Sub Category created successfully",
      });
    } catch (error) {
      console.error("Create Sub-Sub Category error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating Sub-Sub Category",
        error: error.message,
      });
    }
  }

  // GET ALL subSubCategory
  async getAllSubSubCategories(req, res) {
    try {
      const categories = await subSubCategoryModel.getAllSubSubCategories();

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("Get Sub-Sub Categories error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching Sub-Sub Categories",
        error: error.message,
      });
    }
  }

  // GET BY ID subSubCategory
  async getSubSubCategoryById(req, res) {
    try {
      const id = req.params.id;

      const category = await subSubCategoryModel.getSubSubCategoryById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Sub-Sub Category not found",
        });
      }

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      console.error("Get Sub-Sub Category error:", error);
      res.status(500).json({
        success: false,
        message: "Error fetching Sub-Sub Category",
        error: error.message,
      });
    }
  }

  // UPDATE subSubCategory
  async updateSubSubCategory(req, res) {
    try {
      const id = req.params.id;
      const data = req.body;

      const updated = await subSubCategoryModel.updateSubSubCategory(id, data);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Sub-Sub Category not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Sub-Sub Category updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Update Sub-Sub Category error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating Sub-Sub Category",
        error: error.message,
      });
    }
  }

  // Get approved Vendor Details
  async approvedVendorList(req, res) {
    try {
      const vendors = await VendorModel.getApprovedVendorList();

      return res.json({
        success: true,
        vendors,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Error fetching approved Vendor List",
      });
    }
  }

  // DELETE subSubCategory
  async deleteSubSubCategory(req, res) {
    try {
      const id = req.params.id;

      const deleted = await subSubCategoryModel.deleteSubSubCategory(id);

      if (deleted === 0) {
        return res.status(404).json({
          success: false,
          message: "Sub-Sub Category not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Sub-Sub Category deleted successfully",
      });
    } catch (error) {
      console.error("Delete Sub-Sub Category error:", error);
      res.status(500).json({
        success: false,
        message: "Error deleting Sub-Sub Category",
        error: error.message,
      });
    }
  }

  // get my details
  async getMyDetails(req, res) {
    try {
      const vendorId = req.user.vendor_id;
      const userId = req.user?.user_id;

      if (!vendorId) {
        return res.status(404).json({
          success: false,
          message: "Vendor ID is required",
        });
      }

      const [vendorRows] = await db.query(
        `SELECT * FROM vendors WHERE vendor_id = ? AND user_id = ?`,
        [vendorId, userId]
      );

      if (!vendorRows.length) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found",
        });
      }

      const vendor = vendorRows[0];

      return res.json({ success: true, vendor });
    } catch (error) {
      console.error("Get my Details Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getStats(req, res) {
    try {
      const vendorId = req.user?.vendor_id;

      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: "Vendor ID is required",
        });
      }

      const stats = await productModel.getProductStatsByVendor(vendorId);

      return res.json({
        success: true,
        stats,
      });
    } catch (err) {
      console.error("Error Fetching vendor Stats:", err);
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
}

module.exports = new VendorController();
