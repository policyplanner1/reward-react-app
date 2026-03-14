const express = require("express");
const router = express.Router();
const goalController = require("../controllers/goalController");

router.get("/goals", goalController.getGoals);

router.post("/select-goal", goalController.selectGoal);

router.get("/user-goal/:user_id", goalController.getUserGoal);

module.exports = router;