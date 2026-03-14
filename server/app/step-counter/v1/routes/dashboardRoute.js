const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// Dashboard Routes
router.get("/dashboard/:user_id", auth, dashboardController.getDashboard);

module.exports = router;
