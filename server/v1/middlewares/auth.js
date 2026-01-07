const User = require("../models/customerModel");
const jwt = require("jsonwebtoken");

auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const decodedToken = jwt.verify(token, process.env.CUSTOMER_JWT_SECRET);

    if (!decodedToken || !decodedToken.id) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const user = await User.getUserById(decodedToken.id);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.log("Authentication Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = auth;
