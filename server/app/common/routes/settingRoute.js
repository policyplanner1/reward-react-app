const express = require("express");
const router = express.Router();
const SettingController = require("../controller/settingController");


// Product Listing
router.get("/app-settings", SettingController.getAppSettings);

module.exports = router;