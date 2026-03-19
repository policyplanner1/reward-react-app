const express = require("express");
const router = express.Router();
const v1GoalRoutes = require("./goalRoute");


router.use('/goals', v1GoalRoutes);


module.exports = router;