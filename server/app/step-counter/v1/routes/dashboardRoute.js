const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

// Dashboard Routes
router.get("/dashboard/:user_id", dashboardController.getDashboard);

module.exports = router;