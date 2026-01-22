const express = require("express");
const router = express.Router();

const serviceCategoryRoute = require("./serviceCategoryRoute");
const serviceRoute = require("./serviceRoute");
const serviceDocumentRoute = require("./serviceDocumentRoute");

router.use("/category", serviceCategoryRoute);
router.use("/service", serviceRoute);
router.use("/service-document",serviceDocumentRoute)

module.exports = router;
