const express = require("express");
const router = express.Router();

const serviceCategoryRoute = require("./serviceCategoryRoute");
const serviceRoute = require("./serviceRoute");
const serviceDocumentRoute = require("./serviceDocumentRoute");
const serviceEnquiryRoute = require("./serviceEnquiryRoute");
const serviceVariantRoute = require("./serviceVariantRoute");
const serviceFormRoute = require("./serviceFormRoute");
const serviceOrderRoute = require("./serviceOrderRoute");

router.use("/category", serviceCategoryRoute);
router.use("/service", serviceRoute);
router.use("/service-document",serviceDocumentRoute)
router.use("/service-enquiry",serviceEnquiryRoute)
router.use("/service-variant",serviceVariantRoute)
router.use("/service-form",serviceFormRoute)
router.use("/service-orders",serviceOrderRoute)

module.exports = router;
