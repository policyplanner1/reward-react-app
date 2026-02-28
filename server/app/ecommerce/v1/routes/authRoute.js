const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const auth = require("../middlewares/auth");
const optionalAuth = require("../middlewares/optionalAuth");
const { uploadReviewMedia } = require("../../../../middleware/productUpload");

/*============================================Profile=================================================*/

router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.get("/verify-email", authController.verifyEmail);
router.post("/refresh", authController.refreshAccessToken);
router.post("/logout", auth, authController.logoutUser);
router.post("/logout-all", auth, authController.logoutAllDevices);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/resend-verification", authController.resendVerification);

/*=============================================Address================================================*/
// Fetch all the countries
// router.get("/countries", authController.getCountries);

// fetch all the state of the country
// router.get("/states/:country_id", authController.getStatesByCountry);

// Fetch all the states
router.get("/states", authController.getStates);

// add address
router.post("/address", auth, authController.addAddress);

// update address
router.put("/address/:address_id", auth, authController.updateAddress);

// delete address
router.delete("/address/:address_id", auth, authController.deleteAddress);

// fetch addresses
router.get("/addresses", auth, authController.getMyAddresses);

// Get address By ID
router.get("/address/:address_id", auth, authController.getAddressById);

/*===================================================User Information===========================================*/
router.get("/user-info", optionalAuth, authController.getUserInfo);

/*===================================================Review===========================================*/

// Add review
router.post(
  "/reviews",
  /* auth, */
  // uploadReviewMedia,
  authController.submitReview,
);

// fetch reviews
router.get("/reviews/:product_id", authController.getProductReviews);

module.exports = router;
