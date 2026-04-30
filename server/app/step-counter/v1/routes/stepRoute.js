const express = require("express");
const router = express.Router();
const StepController = require("../controllers/stepController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// steps sync
router.post("/sync", auth, StepController.syncSteps);

module.exports = router;
