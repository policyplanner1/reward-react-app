const db = require("../../config/database");
const fs = require("fs");
const path = require("path");

class authModel {
  // FIND BY EMAIL
  async findByEmail(email) {
    const [rows] = await db.execute(
      "SELECT user_id FROM customer WHERE email = ?",
      [email.toLowerCase()]
    );
    return rows[0];
  }

    // CREATE CUSTOMER
  async createCustomer(data) {
    const { name, email, phone, password } = data;

    const [result] = await db.execute(
      `INSERT INTO customer 
       (name, email, phone, password) 
       VALUES (?, ?, ?, ?)`,
      [name, email.toLowerCase(), phone, password]
    );

    return result.insertId;
  }

  // Login
  async findCustomerForLogin(email) {
    const [rows] = await db.execute(
      `SELECT 
       user_id,
       name,
       email,
       phone,
       password,
       status
     FROM customer
     WHERE email = ?`,
      [email.toLowerCase()]
    );

    return rows[0];
  }

  // Get User By ID
  async getUserById(userId) {
    const [rows] = await db.execute(
      `SELECT user_id, name, email, phone, status 
     FROM customer 
     WHERE user_id = ?`,
      [userId]
    );

    return rows[0];
  }

  // Fetch Countries
  async getAllCountries() {
    const [rows] = await db.execute(
      `SELECT 
         country_id,
         country_name,
         country_code
       FROM countries
       WHERE status = 1
       ORDER BY country_name`
    );

    return rows;
  }

  // Fetch States by Country ID
  async getStatesByCountry(countryId) {
    const [rows] = await db.execute(
      `SELECT 
         state_id,
         state_name
       FROM states
       WHERE country_id = ? AND status = 1
       ORDER BY state_name`,
      [countryId]
    );

    return rows;
  }
}

module.exports = new authModel();
