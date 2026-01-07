const AuthModel = require("../models/authModel");
const db = require("../../config/database");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");

class AuthController {
  // User Registration
  async registerUser(req, res) {
    try {
      const { name, email, phone, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Name, email, and password are required",
        });
      }

      if (password.length < 5) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 5 characters long",
        });
      }

      /* ----------------------------EMAIL EXISTS CHECK----------------------------- */
      const existingUser = await AuthModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }

      //   password hashing
      const hashedPassword = await bcrypt.hash(password, 12);

      //   user creation
      const userId = await AuthModel.createCustomer({
        name,
        email,
        phone,
        password: hashedPassword,
      });

      return res.status(201).json({
        success: true,
        message: "Registration successful",
        data: {
          user_id: userId,
          name,
          email,
          phone,
        },
      });
    } catch (error) {
      console.error("Register Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

module.exports = new AuthController();
