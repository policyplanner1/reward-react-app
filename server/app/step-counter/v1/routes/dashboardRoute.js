const express = require("express");
const router = express.Router();
const DashboardController = require("../controllers/dashboardController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// Dashboard
router.get("/", auth, DashboardController.getDashboard);

module.exports = router;
