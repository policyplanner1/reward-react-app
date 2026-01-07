const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middlewares/auth");

/*============================================Profile=================================================*/
// User registration
router.post("/register", authController.registerUser);

// user Login
router.post("/login", authController.loginUser);

// edit Profile

/*=============================================Address================================================*/

// Fetch all the countries
router.get("/countries", authController.getCountries);

// fetch all the state of the country
router.get("/states/:country_id", authController.getStatesByCountry);

// add address

// update address

// delete address

// fetch addresses

// Get address By ID

module.exports = router;
