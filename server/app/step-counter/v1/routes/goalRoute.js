const express = require("express");
const router = express.Router();
const bmiController = require("../controllers/bmiController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

router.post("/calculate-bmi", auth, bmiController.calculateBMI);
router.post("/bmi-plan", auth, bmiController.getBMIPlan);

module.exports = router;
