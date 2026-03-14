const express = require("express");
const router = express.Router();
const bmiController = require("../controllers/bmiController");

router.post("/calculate-bmi", bmiController.calculateBMI);
router.post("/bmi-plan", bmiController.getBMIPlan);

module.exports = router;