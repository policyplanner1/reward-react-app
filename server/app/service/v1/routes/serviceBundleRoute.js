const express = require("express");
const router = express.Router();
const ServiceBundleController = require("../controllers/serviceBundleController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// Get Bundles
router.get("/", ServiceBundleController.getServiceBundles);

// Get Bundle Detail
router.get("/detail/:id", ServiceBundleController.getServiceBundleDetail);

module.exports = router;
