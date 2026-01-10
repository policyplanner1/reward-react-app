const AuthModel = require("../models/authModel");
const AddressModel = require("../models/addressModel");
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

  /*====================================Address============================================*/

  // Get all countries
  async getCountries(req, res) {
    try {
      const countries = await AddressModel.getAllCountries();

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

  // Get all states
  async getStates(req, res) {
    try {
      const states = await AddressModel.getAllStates();

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

      const states = await AddressModel.getStatesByCountry(country_id);

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

  // Add address
  async addAddress(req, res) {
    try {
      // const userId = req.user?.user_id;
      const userId = 1; // Temporary hardcoded user ID for testing

      const data = req.body;

      if (!data.address1 || !data.city || !data.zipcode || !data.state_id) {
        return res.status(400).json({
          success: false,
          message: "Required address fields missing",
        });
      }

      if (Number(data.is_default) === 1) {
        await AddressModel.clearDefault(userId);
      }

      const addressId = await AddressModel.addAddress({
        ...data,
        user_id: userId,
      });

      return res.status(201).json({
        success: true,
        message: "Address added successfully",
        address_id: addressId,
      });
    } catch (error) {
      console.error("Add Address Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to add address",
      });
    }
  }

  // Update address
  async updateAddress(req, res) {
    try {
      // const userId = req.user?.user_id;
      const userId = 1; // Temporary hardcoded user ID for testing

      const { address_id } = req.params;
      const data = req.body;

      if (Number(data.is_default) === 1) {
        await AddressModel.clearDefault(userId);
      }

      const updated = await AddressModel.updateAddress(
        address_id,
        userId,
        data
      );

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: "Address not found",
        });
      }

      return res.json({
        success: true,
        message: "Address updated successfully",
      });
    } catch (error) {
      console.error("Update Address Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update address",
      });
    }
  }

  // Delete address
  async deleteAddress(req, res) {
    try {
      // const userId = req.user?.user_id;
      const userId = 1; // Temporary hardcoded user ID for testing

      const { address_id } = req.params;

      const deleted = await AddressModel.deleteAddress(address_id, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: "Address not found",
        });
      }

      return res.json({
        success: true,
        message: "Address deleted successfully",
      });
    } catch (error) {
      console.error("Delete Address Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete address",
      });
    }
  }

  // Fetch all addresses of the user
  async getMyAddresses(req, res) {
    try {
      // const userId = req.user?.user_id;
      const userId = 1; // Temporary hardcoded user ID for testing

      const addresses = await AddressModel.getAddressesByUser(userId);

      return res.json({
        success: true,
        data: addresses,
      });
    } catch (error) {
      console.error("Fetch Addresses Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch addresses",
      });
    }
  }

  // Fetch address by ID
  async getAddressById(req, res) {
    try {
      // const userId = req.user?.user_id;
      const userId = 1; // Temporary hardcoded user ID for testing

      const { address_id } = req.params;

      const address = await AddressModel.getAddressById(address_id, userId);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: "Address not found",
        });
      }

      return res.json({
        success: true,
        data: address,
      });
    } catch (error) {
      console.error("Get Address Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch address",
      });
    }
  }

  /* ==============================================Reviews==================================================*/

  // Submit Review
  async submitReview(req, res) {
    try {
      // const userId = req.user?.user_id;
      const userId = 1;

      const {
        product_id,
        variant_id,
        order_id,
        rating,
        value_for_money,
        good_quality,
        smooth_experience,
        review_text,
      } = req.body;

      const mediaFiles = req.files || [];

      // validate
      if (!product_id || !variant_id || !rating) {
        return res.status(400).json({
          success: false,
          message: "Required fields missing",
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }

      if (mediaFiles.length > 5) {
        return res.status(400).json({
          success: false,
          message: "Maximum 5 images/videos allowed",
        });
      }

      // check if review exist
      const alreadyReviewed = await AuthModel.reviewExists(
        userId,
        variant_id,
        order_id
      );

      if (alreadyReviewed) {
        return res.status(400).json({
          success: false,
          message: "Review already submitted",
        });
      }

      // create Review
      const reviewId = await ReviewModel.addReview({
        user_id: userId,
        product_id,
        variant_id,
        order_id,
        rating,
        value_for_money,
        good_quality,
        smooth_experience,
        review_text,
      });

      // Media save
      if (mediaFiles.length) {
        const mediaData = mediaFiles.map((file) => ({
          media_url: `/uploads/reviews/${file.filename}`,
          media_type: file.mimetype.startsWith("video") ? "video" : "image",
        }));

        await ReviewModel.addReviewMedia(reviewId, mediaData);
      }

      return res.json({
        success: true,
        message: "Review submitted successfully",
      });
    } catch (error) {
      console.error("Submit Review Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit review",
      });
    }
  }

  // get reviews
  async getProductReviews(req, res) {
    try {
      const productId = Number(req.params.product_id);

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
        });
      }

      const reviews = await AuthModel.getReviewsByProduct(productId);

      return res.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      console.error("Get Reviews Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch reviews",
      });
    }
  }
}

module.exports = new AuthController();
