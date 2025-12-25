const express = require("express");
const router = express.Router();
const db = require("../config/database");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const managerController = require("../controllers/managerController");

// Manager Stats API
router.get(
  "/stats",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  async (req, res) => {
    try {
      // Total Vendors
      const [[vendors]] = await db.execute(
        "SELECT COUNT(*) AS totalVendors FROM vendors"
      );

      // Pending vendor approvals
      const [[pendingVendors]] = await db.execute(
        "SELECT COUNT(*) AS pendingApprovals FROM vendors WHERE status='pending'"
      );

      // Active approved products
      const [[activeProducts]] = await db.execute(
        "SELECT COUNT(*) AS activeProducts FROM products WHERE status='approved'"
      );

      // Monthly revenue (Dummy for now; set to 0)
      const [[revenue]] = await db.execute(`
      SELECT IFNULL(SUM(sale_price), 0) AS totalRevenue FROM products WHERE status='approved'
    `);

      // For charts (dummy monthly)
      const monthlyLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
      const monthlyRevenue = [50000, 60000, 45000, 80000, 75000, 90000];
      const vendorCount = [5, 10, 12, 15, 20, 22];
      const productCount = [20, 25, 28, 35, 40, 48];

      res.json({
        success: true,
        data: {
          totalVendors: vendors.totalVendors,
          pendingApprovals: pendingVendors.pendingApprovals,
          activeProducts: activeProducts.activeProducts,
          totalRevenue: revenue.totalRevenue,

          // For Charts
          monthlyLabels,
          monthlyRevenue,
          vendorCount,
          productCount,
        },
      });
    } catch (err) {
      console.error("Stats Error:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// All Vendor list
router.get(
  "/all-vendors",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  managerController.vendorList
);

// approve product
router.put(
  "/product/approve/:productId",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  managerController.approveProduct
);

// reject product
router.put(
  "/product/reject/:productId",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  managerController.rejectProduct
);

// resubmission product request
router.put(
  "/product/resubmission/:productId",
  authenticateToken,
  authorizeRoles("vendor_manager", "admin"),
  managerController.resubmissionRequest
);

// Get all Documents
router.get(
  "/documents",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.getAllDocuments
);

// create a document
router.post(
  "/create-document",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.createDocument
);

// get document details by Id
router.get(
  "/document/:id",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.getDocumentById
);

// document update
router.put(
  "/update-document/:id",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.updateDocument
);

// delete document
router.delete(
  "/delete-document/:id",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.deleteDocument
);

// create pair of category and documents
router.post(
  "/create-category-documents",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.createCategoryDocument
);

// fetch category linked Documents
router.get(
  "/category-documents",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.getAllCategoryDocs
);

// get category document By Id
router.get(
  "/category-documents/:id",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.getCategoryDocById
);

// delete category Document
router.delete(
  "/category-documents/:id",
  authenticateToken,
  authorizeRoles("vendor_manager"),
  managerController.deleteCategoryDocument
);

module.exports = router;
