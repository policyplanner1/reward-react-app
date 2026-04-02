const express = require("express");
const router = express.Router();
const BillController = require("../controllers/billController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// Categories
router.get("/categories", BillController.getCategories);

// Operators
router.get("/operators", BillController.getOperators);

// Grouped operators
router.get("/operators-grouped", BillController.getGroupedOperators);

// Operator details
router.get("/operator/:id", BillController.getOperatorDetails);

// fetch bill details
router.post("/fetch-bill", BillController.fetchBill);

module.exports = router;
