const express = require("express");
const router = express.Router();

const serviceCategoryRoute = require("./serviceCategoryRoute");
const serviceRoute = require("./serviceRoute");
const serviceDocumentRoute = require("./serviceDocumentRoute");
const serviceEnquiryRoute = require("./serviceEnquiryRoute");

router.use("/category", serviceCategoryRoute);
router.use("/service", serviceRoute);
router.use("/service-document",serviceDocumentRoute)
router.use("/service-enquiry",serviceEnquiryRoute)

module.exports = router;
