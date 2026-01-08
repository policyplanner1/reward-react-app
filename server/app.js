// app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

// dashboard Routes
const authRoutes = require("./routes/auth");
const vendorRoutes = require("./routes/vendorRoutes");
const managerRoutes = require("./routes/managerRoutes");
const productRoutes = require("./routes/productRoutes");
const wareHouseRoutes = require("./routes/warehouseRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const subCategoryRoutes = require("./routes/subCategoryRoutes");
const subSubCategoryRoutes = require("./routes/subSubCategoryRoutes");

// App Routes
const v1ProductRoutes = require("./v1/routes/productRoute");
const v1CartRoutes = require("./v1/routes/cartRoute");
const v1CheckoutRoutes = require("./v1/routes/checkoutRoute");
const v1OrderRoutes = require("./v1/routes/ordersRoute");
const v1AuthRoutes = require("./v1/routes/authRoute");


const app = express();

// -----------------------------
// Middleware
// -----------------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    // origin: process.env.CLIENT_URL || "http://localhost:5173",
        origin: process.env.CLIENT_URL || "https://rewardplanners.com",

    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -----------------------------
// Base route
// -----------------------------
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Reward Planners Backend is running!",
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------
// Dashboard Routes
// -----------------------------
app.use("/api/auth", authRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/product", productRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/warehouse", wareHouseRoutes);
app.use("/api/subcategory", subCategoryRoutes);
app.use("/api/subsubcategory", subSubCategoryRoutes);

// App Routes
app.use("/v1/auth", v1AuthRoutes);
app.use("/v1/product", v1ProductRoutes);
app.use("/v1/cart", v1CartRoutes);
app.use("/v1/checkout", v1CheckoutRoutes);
app.use("/v1/orders", v1OrderRoutes);

// -----------------------------
// Health check route
// -----------------------------
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is healthy",
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------
// 404 Handler
// -----------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// -----------------------------
// Global Error Handler
// -----------------------------
app.use((error, req, res, next) => {
  console.error("Unhandled Error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// -----------------------------
// Start Server
// -----------------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("\n=================================");
  console.log("🚀 Reward Planners Backend Started!");
  console.log("=================================");
  console.log(`📡 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Server URL: http://localhost:${PORT}`);
  console.log(`❤️ Health check: http://localhost:${PORT}/api/health`);
  console.log("=================================\n");
});
