const express = require("express");
const router = express.Router();
const TermController = require("../controller/termsController");
const auth = require("../../ecommerce/v1/middlewares/auth");

// current status
router.get("/current-status", auth, TermController.getTermsStatus);

// accept Term
router.post("/accept-terms", auth, TermController.updateTerms);

module.exports = router;
