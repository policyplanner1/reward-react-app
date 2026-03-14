const express = require("express");
const router = express.Router();
const goalController = require("../controllers/goalController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

router.get("/goals", goalController.getGoals);

router.post("/select-goal", auth, goalController.selectGoal);

router.get("/user-goal/:user_id", auth, goalController.getUserGoal);

module.exports = router;
