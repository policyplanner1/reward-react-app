const bcrypt = require("bcryptjs");
const db = require("../config/database");
const { generateToken } = require("../utils/jwt");
const { generateOTP, hashOTP } = require("../utils/optGenerate");
const { sendOtpEmail } = require("../config/mail");

//

const authController = {
  /* ============================================================
       REGISTER USER (Auto-create vendor if role = vendor)
     ============================================================ */
  register: async (req, res, forcedRole = null) => {
    try {
      const { name, email, password, phone } = req.body;
      const role = forcedRole || req.body.role;

      if (!name || !email || !password || !role) {
        return res.status(400).json({
          success: false,
          message: "Name, Email, password and role are required",
        });
      }

      if (password.length < 5) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 5 characters long",
        });
      }

      const [existing] = await db.execute(
        "SELECT user_id FROM users WHERE email = ?",
        [email.toLowerCase()]
      );

      if (existing.length > 0) {
        return res.status(409).json({
          success: false,
          message: "User already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      // Create User
      const [insertUser] = await db.execute(
        "INSERT INTO users (name, email, password, role, phone, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
        [name, email.toLowerCase(), hashedPassword, role, phone || null]
      );

      //  Otp Creation
      const otp = generateOTP();
      const otpHash = hashOTP(otp);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await db.execute("DELETE FROM user_otps WHERE user_id = ?", [
        insertUser.insertId,
      ]);

      await db.execute(
        `INSERT INTO user_otps (user_id, otp_hash, expires_at)
         VALUES (?, ?, ?)`,
        [insertUser.insertId, otpHash, expiresAt]
      );

      // vendor creation
      if (role === "vendor") {
        await db.execute(
          "INSERT INTO vendors (user_id, status, created_at) VALUES (?, 'pending', NOW())",
          [insertUser.insertId]
        );
      }

      await sendOtpEmail(email, otp);

      return res.status(201).json({
        success: true,
        message: "OTP sent to your email",
        data: {
          user_id: insertUser.insertId,
          email,
        },
      });
    } catch (err) {
      console.error("Registration Error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  /* ============================================================
       Verify OTP
     ============================================================ */
  verifyOtp: async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    const otpHash = hashOTP(otp);

    const [rows] = await db.execute(
      `
      SELECT u.user_id, u.role, u.email
        FROM users u
        JOIN user_otps o ON o.user_id = u.user_id
        WHERE u.email = ?
          AND o.otp_hash = ?
          AND o.expires_at > NOW()
        ORDER BY o.created_at DESC
        LIMIT 1
    `,
      [email.toLowerCase(), otpHash]
    );

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    const user = rows[0];

    await db.execute("UPDATE users SET is_verified = 1 WHERE user_id = ?", [
      user.user_id,
    ]);

    await db.execute("DELETE FROM user_otps WHERE user_id = ?", [user.user_id]);

    let vendorData = null;

    if (user.role === "vendor") {
      const [data] = await db.execute(
        "SELECT * from vendors where user_id= ?",
        [user.user_id]
      );

      vendorData = {
        vendor_id: data[0]?.vendor_id,
        status: data[0]?.status,
      };
    }
    const token = generateToken({
      user_id: user.user_id,
      vendor_id: vendorData?.vendor_id || null,
      role: user.role,
      email: user.email,
    });

    return res.json({
      success: true,
      message: `${user.role} registered successfully`,
      data: {
        user: {
          user_id: user.user_id,
          role: user.role,
          email: user.email,
          phone: user.phone,
        },
        vendor: vendorData,
        token,
      },
    });
  },

  // resend OTP
  resendOtp: async (req, res) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const [users] = await db.execute(
      "SELECT user_id FROM users WHERE email = ?",
      [email.toLowerCase()]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const userId = users[0].user_id;

    await db.execute("DELETE FROM user_otps WHERE user_id = ?", [userId]);

    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.execute(
      `INSERT INTO user_otps (user_id, otp_hash, expires_at)
     VALUES (?, ?, ?)`,
      [userId, otpHash, expiresAt]
    );

    await sendOtpEmail(email, otp);

    return res.json({
      success: true,
      message: "OTP resent successfully",
    });
  },

  /* ============================================================
       LOGIN USER (Loads correct vendor_id)
     ============================================================ */
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [
        email.toLowerCase(),
      ]);

      if (rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const user = rows[0];

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      if (user.is_verified !== 1) {
        return res.status(403).json({
          success: false,
          message: "User is not verified",
        });
      }

      // 🎯 Get correct vendor profile (approved > pending > others)
      let vendorData = null;
      let vendorId = null;

      if (user.role === "vendor") {
        const [vendorRows] = await db.execute(
          `SELECT *
           FROM vendors
           WHERE user_id = ?
           ORDER BY 
             CASE status 
               WHEN 'approved' THEN 1
               WHEN 'pending' THEN 2
               ELSE 3
             END,
             vendor_id DESC
           LIMIT 1`,
          [user.user_id]
        );

        if (vendorRows.length > 0) {
          vendorData = vendorRows[0];
          vendorId = vendorData.vendor_id;
        }
      }

      // ⭐ MUST include vendor_id in token
      const token = generateToken({
        user_id: user.user_id,
        vendor_id: vendorId,
        email: user.email,
        role: user.role,
      });

      return res.json({
        success: true,
        message: "Login successful",
        data: {
          user,
          vendor: vendorData,
          token,
        },
      });
    } catch (err) {
      console.error("Login Error:", err);
      return res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  },

  /* ============================================================
       PROFILE
     ============================================================ */
  getProfile: async (req, res) => {
    try {
      const [rows] = await db.execute(
        "SELECT user_id, name, email, role, phone FROM users WHERE user_id = ?",
        [req.user.user_id]
      );

      if (rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      return res.json({
        success: true,
        data: rows[0],
      });
    } catch (err) {
      console.error("Profile Error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  },

  /* ============================================================
       LOGOUT
     ============================================================ */
  logout: (req, res) => {
    res.clearCookie();
    return res.json({ success: true, message: "Logout successful" });
  },
};

module.exports = authController;
