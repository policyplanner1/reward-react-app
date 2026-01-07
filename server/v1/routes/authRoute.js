const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middlewares/auth");

// User registration
router.post("/register", authController.registerUser);

// user Login   
router.post("/login", authController.loginUser);

// edit Profile

// add address

// update address

// delete address

// fetch addresses

// Get address By ID

module.exports = router;
