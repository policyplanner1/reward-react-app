const AuthModel = require("../models/authModel");
const db = require("../../config/database");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

  //   Login User
  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      /* ----------------------------
         FETCH CUSTOMER
      ----------------------------- */
      const user = await AuthModel.findCustomerForLogin(email);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // check status
      if (Number(user.status) !== 1) {
        return res.status(403).json({
          success: false,
          message: "Account is inactive",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Token
      const token = jwt.sign(
        {
          user_id: user.user_id,
          email: user.email,
          role: "customer",
        },
        process.env.CUSTOMER_JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "Login successful",
        token,
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Login Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Get all countries
  async getCountries(req, res) {
    try {
      const countries = await AuthModel.getAllCountries();

      return res.json({
        success: true,
        data: countries,
      });
    } catch (error) {
      console.error("Get Countries Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch countries",
      });
    }
  }

  // Get states by country ID
  async getStatesByCountry(req, res) {
    try {
      const { country_id } = req.params;

      if (!country_id) {
        return res.status(400).json({
          success: false,
          message: "Country ID is required",
        });
      }

      const states = await AuthModel.getStatesByCountry(country_id);

      return res.json({
        success: true,
        data: states,
      });
    } catch (error) {
      console.error("Get States Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch states",
      });
    }
  }
}

module.exports = new AuthController();
