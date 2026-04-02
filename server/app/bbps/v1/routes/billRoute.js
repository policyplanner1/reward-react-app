const express = require("express");
const router = express.Router();
const BillController = require("../controllers/billController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// Categories
router.get("/categories", auth, BillController.getCategories);

// Operators
router.get("/operators", auth, BillController.getOperators);

// Grouped operators
router.get("/operators-grouped", auth, BillController.getGroupedOperators);

// Operator details
router.get("/operator/:id", auth, BillController.getOperatorDetails);

// fetch bill details
router.post("/fetch-bill", auth, BillController.fetchBill);

module.exports = router;
