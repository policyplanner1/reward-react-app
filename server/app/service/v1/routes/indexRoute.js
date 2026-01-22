const express = require("express");
const router = express.Router();

const serviceCategoryRoute = require("./serviceCategoryRoute");
const serviceRoute = require("./serviceRoute");

router.use("/category", serviceCategoryRoute);
router.use("/service", serviceRoute);

module.exports = router;
