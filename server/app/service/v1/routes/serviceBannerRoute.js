const express = require("express");
const router = express.Router();
const ServiceBannerController = require("../controllers/serviceBannerController");

// Create banner
router.post("/create", ServiceBannerController.createBanner);

// get Banners
router.get("/", ServiceBannerController.getBanners);

module.exports = router;
