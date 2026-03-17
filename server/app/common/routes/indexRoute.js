const express = require("express");
const router = express.Router();

const settingRoutes = require("./settingRoute");

router.use("/settings", settingRoutes);

module.exports = router;
