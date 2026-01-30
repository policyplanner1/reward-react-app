// app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
require("dotenv").config();

// dashboard Route
const dashboardRoute = require("./routes/indexRoute");

// App Route
const ecommerceRoute=require('./app/ecommerce/v1/routes/indexRoute')
const serviceRoute=require('./app/service/v1/routes/indexRoute')
const paymentRoute=require('./common/Routes/indexRoute')

const app = express();

// Middleware
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

// Base route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Reward Planners Backend is running!",
    timestamp: new Date().toISOString(),
  });
});


// Dashboard Routes
app.use('/',dashboardRoute)

// App Routes
app.use("/v1",ecommerceRoute);
app.use("/v1",serviceRoute)
app.use("/payment",paymentRoute)

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((error, req, res, next) => {
  console.error("Unhandled Error:", error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("\n=================================");
  console.log("Reward Planners Backend Started!");
  console.log(`🔗 Server URL: http://localhost:${PORT}`);
  console.log("=================================\n");
});
