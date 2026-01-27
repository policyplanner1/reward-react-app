const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const managerController = require("../controllers/managerController");
const CategoryAttributeController = require("../controllers/categoryAttributeController");

// Manager Stats API
router.get(
  "/stats",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  async (req, res) => {
    try {
      const [[vendorStats]] = await db.execute(`
        SELECT
          COUNT(CASE WHEN status != 'pending' THEN 1 END) AS totalVendors,
          SUM(status='pending') AS pendingApprovals,
          SUM(status='sent_for_approval') AS sentForApproval,
          SUM(status='approved') AS approvedVendors,
          SUM(status='rejected') AS rejectedVendors
        FROM vendors
      `);

      const [[productStats]] = await db.execute(`
        SELECT
          COUNT(CASE WHEN status != 'pending' THEN 1 END) AS totalProducts,
          SUM(status = 'pending') AS pendingProducts,
          SUM(status = 'sent_for_approval') AS sentForApprovalProducts,
          SUM(status = 'resubmission') AS resubmissionProducts,
          SUM(status = 'approved') AS approvedProducts,
          SUM(status = 'rejected') AS rejectedProducts
        FROM eproducts
      `);

      res.json({
        success: true,
        data: {
          ...vendorStats,
          ...productStats,
          totalRevenue: 0,
          charts: {
            monthlyLabels: [],
            monthlyRevenue: [],
            vendorCount: [],
            productCount: [],
          },
        },
      });
    } catch (err) {
      console.error("Stats Error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
);

// All Vendor list
router.get(
  "/all-vendors",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  managerController.vendorList,
);

// approve product
router.put(
  "/product/approve/:productId",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  managerController.approveProduct,
);

// reject product
router.put(
  "/product/reject/:productId",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  managerController.rejectProduct,
);

// resubmission product request
router.put(
  "/product/resubmission/:productId",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  managerController.resubmissionRequest,
);

// Get all Documents
router.get(
  "/documents",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.getAllDocuments,
);

// create a document
router.post(
  "/create-document",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.createDocument,
);

// get document details by Id
router.get(
  "/document/:id",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.getDocumentById,
);

// document update
router.put(
  "/update-document/:id",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.updateDocument,
);

// delete document
router.delete(
  "/delete-document/:id",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.deleteDocument,
);

// create pair of category and documents
router.post(
  "/create-category-documents",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.createCategoryDocument,
);

// fetch category linked Documents
router.get(
  "/category-documents",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.getAllCategoryDocs,
);

// get category document By Id
router.get(
  "/category-documents/:id",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.getCategoryDocById,
);

// delete category Document
router.delete(
  "/category-documents/:id",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.deleteCategoryDocument,
);

// Get all the attributes
router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin", "vendor_manager"),
  CategoryAttributeController.list,
);

// create attribute
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin", "vendor_manager"),
  CategoryAttributeController.create,
);

// Update an attribute
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "vendor_manager"),
  CategoryAttributeController.update,
);

// Delete attribute
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "vendor_manager"),
  CategoryAttributeController.remove,
);

module.exports = router;
