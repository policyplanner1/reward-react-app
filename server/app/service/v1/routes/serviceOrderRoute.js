const express = require("express");
const router = express.Router();
const ServiceOrderController = require("../controllers/serviceOrderController");
const auth = require("../../../ecommerce/v1/middlewares/auth");
const upload = require("../../../../middleware/serviceCategoryUpload");

// Direct Order
router.post("/direct", auth, ServiceOrderController.createDirectOrder);

// Enquiry Order
router.post(
  "/from-enquiry/:enquiryId",
  auth,
  ServiceOrderController.createEnquiryOrder,
);

// Get all orders
router.get("/my-orders", auth, ServiceOrderController.getMyOrders);

// get order details
router.get("/order-details/:id", auth, ServiceOrderController.getOrderDetails);

// upload order document
router.post(
  "/upload-document/:orderId",
  auth,
  upload.single("file"),
  ServiceOrderController.uploadDocument,
);

module.exports = router;
