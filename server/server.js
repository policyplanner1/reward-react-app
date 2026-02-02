const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

// Route Files
const authRoutes = require('./routes/auth');
const vendorRoutes = require('./routes/vendorRoutes');
const productRoutes = require('./routes/productRoutes');
const managerRoutes = require('./routes/managerRoutes');



const app = express();

// -----------------------------
// Global Middleware (MUST COME FIRST)
// -----------------------------
app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// -----------------------------
// API ROUTES (CORRECT ORDER)
// -----------------------------
app.use('/api/auth', authRoutes);          // Auth system
app.use('/api/vendor', vendorRoutes);      // Vendor onboarding + listing
app.use('/api/products', productRoutes);   // Products
app.use('/api/manager', managerRoutes);
// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Reward Planners API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root welcome response
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Reward Planners API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout'
      },
      vendor: {
        onboard: 'POST /api/vendor/onboard',
        details: 'GET /api/vendor/:vendorId',
        list: 'GET /api/vendor',
        updateStatus: 'PUT /api/vendor/status/:vendorId',
        documents: 'GET /api/vendor/:vendorId/documents',
        documentStatus: 'PUT /api/vendor/documents/:documentId/status'
      },
      products: {
        create: 'POST /api/products/create',
        list: 'GET /api/products',
        details: 'GET /api/products/:productId',
        updateStatus: 'PUT /api/products/status/:productId'
      },
      manager: {
        stats: 'GET /api/manager/stats'
      }
    }
  });
});

// -----------------------------
// 404 Handler
// -----------------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

// -----------------------------
// Global Error Handler
// -----------------------------
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// -----------------------------
// Start Server
// -----------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`📁 Uploads served from: http://localhost:${PORT}/uploads`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
});
