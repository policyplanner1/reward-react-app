const express = require("express");
const router = express.Router();
const CheckoutController = require("../controllers/checkoutController");
const auth = require("../middlewares/auth");