const express = require("express");
const router = express.Router();

const settingRoutes = require("./settingRoute");
const supportRoutes = require("./supportRoute");
const termRoutes = require("./termRoute");

router.use("/settings", settingRoutes);
router.use("/support", supportRoutes);
router.use("/terms", termRoutes);

module.exports = router;
