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
// router.get("/countries", authController.getCountries);

// fetch all the state of the country
// router.get("/states/:country_id", authController.getStatesByCountry);

// Fetch all the states
router.get("/states", authController.getStates);


// add address
// router.post("/address", auth, authController.addAddress);
router.post("/address", authController.addAddress);

// update address
// router.put("/address/:address_id", auth, authController.updateAddress);
router.put("/address/:address_id", authController.updateAddress);

// delete address
// router.delete("/address/:address_id", auth, authController.deleteAddress);
router.delete("/address/:address_id", authController.deleteAddress);

// fetch addresses
// router.get("/addresses", auth, authController.getAddresses);
router.get("/addresses", authController.getMyAddresses);

// Get address By ID
// router.get("/address/:address_id", auth, authController.getAddressById);
router.get("/address/:address_id", authController.getAddressById);

/*===================================================Wishlist===========================================*/

module.exports = router;
