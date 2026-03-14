const express = require("express");
const router = express.Router();
const v1GoalRoutes = require("./goalRoute");
const v1BmiRoutes = require("./goalRoute");
const v1DashboardRoutes = require("./dashboardRoute");

router.use('/goals', v1GoalRoutes);
router.use('/bmi', v1BmiRoutes);
router.use('/dashboard', v1DashboardRoutes);

module.exports = router;