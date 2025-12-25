const db = require("../config/database");

class ManagerModel {

  // ================================
  //  1. BASIC STATS (CARDS)
  // ================================
  async fetchStats() {
    const [[vendorCount]] = await db.execute(`SELECT COUNT(*) AS totalVendors FROM vendors`);
    const [[pendingVendors]] = await db.execute(`SELECT COUNT(*) AS pendingApprovals FROM vendors WHERE status='pending'`);

    const [[activeProducts]] = await db.execute(`SELECT COUNT(*) AS activeProducts FROM products WHERE status='approved'`);

    const [[revenue]] = await db.execute(`
      SELECT COALESCE(SUM(sale_price * stock), 0) AS totalRevenue 
      FROM products 
      WHERE status='approved'
    `);

    return {
      totalVendors: vendorCount.totalVendors,
      pendingApprovals: pendingVendors.pendingApprovals,
      activeProducts: activeProducts.activeProducts,
      totalRevenue: revenue.totalRevenue
    };
  }

  // ================================
  //  2. CHARTS DATA
  // ================================
  async fetchCharts() {

    // --- MONTHLY REVENUE ---
    const [monthlyRevenue] = await db.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%b') AS month,
        COALESCE(SUM(sale_price * stock), 0) AS revenue
      FROM products
      WHERE status='approved'
      GROUP BY MONTH(created_at)
      ORDER BY MONTH(created_at)
    `);

    // --- MONTHLY VENDORS ---
    const [monthlyVendors] = await db.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%b') AS month,
        COUNT(*) AS total
      FROM vendors
      GROUP BY MONTH(created_at)
      ORDER BY MONTH(created_at)
    `);

    // --- MONTHLY PRODUCTS ---
    const [monthlyProducts] = await db.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%b') AS month,
        COUNT(*) AS total
      FROM products
      GROUP BY MONTH(created_at)
      ORDER BY MONTH(created_at)
    `);

    // --- WEEKLY VENDORS ---
    const [weeklyVendors] = await db.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%a') AS day,
        COUNT(*) AS total
      FROM vendors
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY created_at
    `);

    // --- WEEKLY PRODUCTS ---
    const [weeklyProducts] = await db.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%a') AS day,
        COUNT(*) AS total
      FROM products
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY created_at
    `);

    return {
      monthlyRevenue,
      monthlyVendors,
      monthlyProducts,
      weeklyVendors,
      weeklyProducts
    };
  }
}

module.exports = new ManagerModel();
