const AuthModel = require("../models/authModel");
const AddressModel = require("../models/addressModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES_DAYS = 7;

class AuthController {
  // Basic Registration and Login
  async registerUser(req, res) {
    try {
      const { name, email, phone, password, cpassword } = req.body;

      if (!name || !email || !phone || !password || !cpassword)
        return res.status(400).json({ message: "All fields required" });

      if (password !== cpassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existing = await AuthModel.findByEmail(normalizedEmail);
      if (existing)
        return res.status(409).json({ message: "Email already registered" });

      if (password.length < 6)
        return res.status(400).json({ message: "Password too short" });

      const hashedPassword = await bcrypt.hash(password, 10);

      await AuthModel.createCustomer({
        name,
        email: normalizedEmail,
        phone:phone,
        password: hashedPassword,
      });

      return res.status(201).json({
        success: true,
        message: "Registration successful",
      });
    } catch (err) {
      return res.status(500).json({ success: false });
    }
  }

  async loginUser(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password)
        return res.status(400).json({ message: "Email and password required" });

      const normalizedEmail = email.trim().toLowerCase();

      const user = await AuthModel.findByEmail(normalizedEmail);
      if (!user)
        return res.status(401).json({ message: "Invalid credentials" });

      if (Number(user.status) !== 1)
        return res.status(403).json({ message: "Account inactive" });

      const match = await bcrypt.compare(password, user.password);
      if (!match)
        return res.status(401).json({ message: "Invalid credentials" });

      const accessToken = jwt.sign(
        { user_id: user.user_id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" },
      );

      return res.json({
        success: true,
        accessToken,
        user: {
          id: user.user_id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false,message:err.message });
    }
  }

  /* ======================================================
     REGISTER
  ====================================================== */
  // async registerUser(req, res) {
  //   try {
  //     const { name, email, phone, password, cpassword } = req.body;

  //     if (!name || !email || !password || !cpassword)
  //       return res
  //         .status(400)
  //         .json({ success: false, message: "Please fill all fields" });

  //     if (password !== cpassword) {
  //       return res
  //         .status(400)
  //         .json({ success: false, message: "Passwords do not match" });
  //     }

  //     const normalizedEmail = email.trim().toLowerCase();

  //     const existing = await AuthModel.findByEmail(normalizedEmail);
  //     if (existing)
  //       return res
  //         .status(409)
  //         .json({ success: false, message: "Email already registered" });

  //     if (password.length < 8)
  //       return res
  //         .status(400)
  //         .json({ success: false, message: "Password too weak" });

  //     const hashedPassword = await bcrypt.hash(password, 12);

  //     const rawToken = crypto.randomBytes(32).toString("hex");
  //     const hashedToken = await bcrypt.hash(rawToken, 10);

  //     const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  //     const userId = await AuthModel.createCustomer({
  //       name,
  //       email: normalizedEmail,
  //       phone,
  //       password: hashedPassword,
  //       verification_token: hashedToken,
  //       verification_token_expiry: expiry,
  //     });

  //     // Send email with rawToken
  //     // https://yourdomain.com/verify-email?token=rawToken

  //     return res.status(201).json({
  //       success: true,
  //       message: "Registration successful. Please verify email.",
  //     });
  //   } catch (err) {
  //     return res.status(500).json({ success: false });
  //   }
  // }

  /* ======================================================
     VERIFY EMAIL
  ====================================================== */
  // async verifyEmail(req, res) {
  //   try {
  //     const { token } = req.query;

  //     if (!token) {
  //       return res.status(400).send("Invalid verification link.");
  //     }

  //     const users = await AuthModel.findByVerificationToken();

  //     for (const user of users) {
  //       const isMatch = await bcrypt.compare(token, user.verification_token);

  //       if (
  //         isMatch &&
  //         user.verification_token_expiry &&
  //         new Date() < new Date(user.verification_token_expiry)
  //       ) {
  //         await AuthModel.markEmailVerified(user.user_id);

  //         return res.send(`
  //         <html>
  //           <head>
  //             <title>Email Verified</title>
  //           </head>
  //           <body style="font-family:sans-serif;text-align:center;margin-top:50px;">
  //             <h2>Email verified successfully </h2>
  //             <p>You can now return to the app and login.</p>
  //           </body>
  //         </html>
  //       `);
  //       }
  //     }

  //     return res.status(400).send(`
  //     <html>
  //       <body style="font-family:sans-serif;text-align:center;margin-top:50px;">
  //         <h2>Invalid or expired verification link </h2>
  //         <p>Please request a new verification email.</p>
  //       </body>
  //     </html>
  //   `);
  //   } catch (error) {
  //     return res.status(500).send("Internal server error");
  //   }
  // }

  /* ======================================================
     LOGIN
  ====================================================== */
  // async loginUser(req, res) {
  //   try {
  //     const { email, password } = req.body;

  //     const normalizedEmail = email.trim().toLowerCase();

  //     const user = await AuthModel.findByEmail(normalizedEmail);

  //     if (!user) return res.status(401).json({ success: false });

  //     if (!user.is_verified)
  //       return res
  //         .status(403)
  //         .json({ success: false, message: "Email not verified" });

  //     if (Number(user.status) !== 1)
  //       return res.status(403).json({ success: false });

  //     const match = await bcrypt.compare(password, user.password);
  //     if (!match) return res.status(401).json({ success: false });

  //     const accessToken = jwt.sign(
  //       { user_id: user.user_id, token_version: user.token_version },
  //       process.env.ACCESS_TOKEN_SECRET,
  //       { expiresIn: ACCESS_EXPIRES },
  //     );

  //     const refreshToken = jwt.sign(
  //       { user_id: user.user_id },
  //       process.env.REFRESH_TOKEN_SECRET,
  //       { expiresIn: `${REFRESH_EXPIRES_DAYS}d` },
  //     );

  //     const expiryDate = new Date(
  //       Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  //     );

  //     await AuthModel.storeRefreshToken(
  //       user.user_id,
  //       refreshToken,
  //       expiryDate,
  //       req.headers["user-agent"],
  //       req.ip,
  //     );

  //     await AuthModel.updateLoginMeta(user.user_id, req.ip);

  //     return res.json({
  //       success: true,
  //       accessToken,
  //       refreshToken,
  //     });
  //   } catch (err) {
  //     return res.status(500).json({ success: false });
  //   }
  // }

  /* ======================================================
     REFRESH ACCESS TOKEN
  ====================================================== */
  // async refreshAccessToken(req, res) {
  //   try {
  //     const { refreshToken } = req.body;

  //     const payload = jwt.verify(
  //       refreshToken,
  //       process.env.REFRESH_TOKEN_SECRET,
  //     );

  //     const exists = await AuthModel.findRefreshToken(
  //       payload.user_id,
  //       refreshToken,
  //     );
  //     if (!exists) return res.status(403).json({ success: false });

  //     const user = await AuthModel.findById(payload.user_id);

  //     const newAccessToken = jwt.sign(
  //       { user_id: user.user_id, token_version: user.token_version },
  //       process.env.ACCESS_TOKEN_SECRET,
  //       { expiresIn: ACCESS_EXPIRES },
  //     );

  //     return res.json({ success: true, accessToken: newAccessToken });
  //   } catch {
  //     return res.status(401).json({ success: false });
  //   }
  // }

  /* ======================================================
     LOGOUT (Single Device)
  ====================================================== */
  // async logoutUser(req, res) {
  //   try {
  //     const { refreshToken } = req.body;

  //     const payload = jwt.verify(
  //       refreshToken,
  //       process.env.REFRESH_TOKEN_SECRET,
  //     );

  //     await AuthModel.deleteRefreshToken(payload.user_id, refreshToken);

  //     return res.json({ success: true });
  //   } catch {
  //     return res.status(400).json({ success: false });
  //   }
  // }

  /* ======================================================
     LOGOUT ALL DEVICES
  ====================================================== */
  // async logoutAllDevices(req, res) {
  //   try {
  //     await AuthModel.deleteAllUserRefreshTokens(req.user.user_id);
  //     await AuthModel.incrementTokenVersion(req.user.user_id);

  //     return res.json({ success: true });
  //   } catch {
  //     return res.status(500).json({ success: false });
  //   }
  // }

  /* ======================================================
     FORGOT PASSWORD
  ====================================================== */
  // async forgotPassword(req, res) {
  //   try {
  //     const { email } = req.body;

  //     const user = await AuthModel.findByEmail(email);
  //     if (!user) return res.json({ success: true });

  //     const rawToken = crypto.randomBytes(32).toString("hex");
  //     const hashedToken = await bcrypt.hash(rawToken, 10);
  //     const expiry = new Date(Date.now() + 15 * 60 * 1000);

  //     await AuthModel.saveResetToken(user.user_id, hashedToken, expiry);

  //     // Send rawToken in email

  //     return res.json({ success: true });
  //   } catch {
  //     return res.status(500).json({ success: false });
  //   }
  // }

  /* ======================================================
     RESET PASSWORD
  ====================================================== */
  // async resetPassword(req, res) {
  //   try {
  //     const { token, newPassword } = req.body;

  //     const users = await AuthModel.findByResetToken();

  //     for (const user of users) {
  //       const match = await bcrypt.compare(token, user.reset_token);

  //       if (match && new Date() < user.reset_token_expiry) {
  //         const hashed = await bcrypt.hash(newPassword, 12);

  //         await AuthModel.updatePassword(user.user_id, hashed);
  //         await AuthModel.incrementTokenVersion(user.user_id);
  //         await AuthModel.deleteAllUserRefreshTokens(user.user_id);

  //         return res.json({ success: true });
  //       }
  //     }

  //     return res.status(400).json({ success: false });
  //   } catch {
  //     return res.status(500).json({ success: false });
  //   }
  // }

  // resend verification

  // async resendVerification(req, res) {
  //   try {
  //     const { email } = req.body;

  //     if (!email) {
  //       return res.status(400).json({ success: false });
  //     }

  //     const normalizedEmail = email.trim().toLowerCase();

  //     const user = await AuthModel.findByEmail(normalizedEmail);

  //     if (!user) {
  //       return res.json({ success: true });
  //     }

  //     if (user.is_verified) {
  //       return res.json({ success: true });
  //     }

  //     if (
  //       user.verification_token_expiry &&
  //       new Date(user.verification_token_expiry) >
  //         new Date(Date.now() - 30 * 1000)
  //     ) {
  //       return res.json({ success: true });
  //     }

  //     const rawToken = crypto.randomBytes(32).toString("hex");
  //     const hashedToken = await bcrypt.hash(rawToken, 10);
  //     const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  //     await AuthModel.updateVerificationToken(
  //       user.user_id,
  //       hashedToken,
  //       expiry,
  //     );

  //     // Send email with:
  //     // https://yourdomain.com/verify-email?token=rawToken

  //     return res.json({
  //       success: true,
  //       message:
  //         "If your email is registered, a verification link has been sent.",
  //     });
  //   } catch (error) {
  //     return res.status(500).json({ success: false });
  //   }
  // }

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
        data,
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
        order_id,
      );

      if (alreadyReviewed) {
        return res.status(400).json({
          success: false,
          message: "Review already submitted",
        });
      }

      // create Review
      const reviewId = await AuthModel.addReview({
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

        await AuthModel.addReviewMedia(reviewId, mediaData);
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
