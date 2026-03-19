const express = require("express");
const router = express.Router();
const WalletController = require("../controllers/walletController");
const auth = require("../../../ecommerce/v1/middlewares/auth");

// Wallet
router.get("/history", auth, WalletController.getWalletHistory);



module.exports = router;
