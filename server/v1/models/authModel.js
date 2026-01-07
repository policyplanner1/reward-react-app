const db = require("../../config/database");
const fs = require("fs");
const path = require("path");

class authModel {
  /* ================================FIND BY EMAIL
  ================================= */
  async findByEmail(email) {
    const [rows] = await db.execute(
      "SELECT user_id FROM customer WHERE email = ?",
      [email.toLowerCase()]
    );
    return rows[0];
  }

  /* ================================
     CREATE CUSTOMER
  ================================= */
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
}

module.exports = new authModel();
