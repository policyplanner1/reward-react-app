const express = require("express");
const router = express.Router();

const settingRoutes = require("./settingRoute");
const supportRoutes = require("./supportRoute");

router.use("/settings", settingRoutes);
router.use("/support", supportRoutes);

module.exports = router;
