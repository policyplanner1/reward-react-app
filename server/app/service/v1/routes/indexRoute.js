const express = require("express");
const router = express.Router();

const serviceCategoryRoute = require("./serviceCategoryRoute");
const serviceRoute = require("./serviceRoute");
const serviceDocumentRoute = require("./serviceDocumentRoute");
const serviceEnquiryRoute = require("./serviceEnquiryRoute");
const serviceVariantRoute = require("./serviceVariantRoute");
const serviceFormRoute = require("./serviceFormRoute");
const serviceOrderRoute = require("./serviceOrderRoute");
const serviceOrderDocumentRoute = require("./serviceOrderDocument");

router.use("/category", serviceCategoryRoute);
router.use("/service", serviceRoute);
router.use("/service-document",serviceDocumentRoute)
router.use("/service-enquiry",serviceEnquiryRoute)
router.use("/service-variant",serviceVariantRoute)
router.use("/service-form",serviceFormRoute)
router.use("/service-orders",serviceOrderRoute)
router.use("/service-order-documents",serviceOrderDocumentRoute)

module.exports = router;
