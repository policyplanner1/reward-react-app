const express = require("express");
const router = express.Router();

const serviceCategoryRoute = require("./serviceCategoryRoute");

router.use("/category", serviceCategoryRoute);

module.exports = router;
