const express = require("express");
const router = express.Router();
const StatsController = require("../controllers/statsController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// stats
router.get("/", auth, StatsController.getStats);

module.exports = router;
