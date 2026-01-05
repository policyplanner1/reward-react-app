const cartModel = require("../models/cartModel");
const db = require("../../config/database");
const fs = require("fs");
const path = require("path");
const { use } = require("react");

class CartController {
  // Get cart items
  async getCart(req, res) {
    try {
      const userId = req?.user.id;

      if(!userId){
        return res.status(400).json({ success: false, message: "User ID is required" });
      }
      
      const cartItems = await cartModel.getAllCartItems();
      res.status(200).json({ success: true, data: cartItems });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new CartController();
