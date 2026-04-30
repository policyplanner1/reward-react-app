const jwt = require("jsonwebtoken");
const User = require("../../../ecommerce/v1/models/authModel");

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    const token = authHeader.split(" ")[1];

    // verify Token
    const decoded = jwt.verify(token, process.env.CUSTOMER_JWT_SECRET);

    if (!decoded || !decoded.user_id) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // check user
    const user = await User.getUserById(decoded.user_id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (Number(user.status) !== 1) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication Error:", error);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = auth;
