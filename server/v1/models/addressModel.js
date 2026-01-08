const db = require("../../config/database");
const fs = require("fs");
const path = require("path");

class AddressModel {
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

    // Fetch States
  async getAllStates() {
    const [rows] = await db.execute(
      `SELECT 
         state_id,
         state_name
       FROM states
       WHERE status = 1
       ORDER BY state_name`
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

  // add address
  async addAddress(data) {
    const {
      user_id,
      address_type,
      is_default,
      address1,
      address2,
      city,
      zipcode,
      country_id,
      state_id,
      landmark,
      contact_name,
      contact_phone,
      latitude,
      longitude,
    } = data;

    const [result] = await db.execute(
      `INSERT INTO customer_addresses (
      user_id,
      address_type,
      is_default,
      address1,
      address2,
      city,
      zipcode,
      country_id,
      state_id,
      landmark,
      contact_name,
      contact_phone,
      latitude,
      longitude
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        address_type,
        is_default,
        address1,
        address2,
        city,
        zipcode,
        country_id,
        state_id,
        landmark,
        contact_name,
        contact_phone,
        latitude,
        longitude,
      ]
    );

    return result.insertId;
  }

  //   clear Default Address
  async clearDefault(userId) {
    await db.execute(
      `UPDATE customer_addresses
       SET is_default = 0
       WHERE user_id = ?`,
      [userId]
    );
  }

  //   Update address
  async updateAddress(addressId, userId, data) {
    const [result] = await db.execute(
      `UPDATE customer_addresses SET
        address_type = ?,
        is_default = ?,
        address1 = ?,
        address2 = ?,
        city = ?,
        zipcode = ?,
        country_id = ?,
        state_id = ?,
        landmark = ?,
        contact_name = ?,
        contact_phone = ?,
        latitude = ?,
        longitude = ?
       WHERE address_id = ? AND user_id = ?`,
      [
        data.address_type,
        data.is_default,
        data.house_no,
        data.area,
        data.locality,
        data.city,
        data.zipcode,
        data.country_id,
        data.state_id,
        data.landmark,
        data.contact_name,
        data.contact_phone,
        data.latitude,
        data.longitude,
        addressId,
        userId,
      ]
    );

    return result.affectedRows;
  }

  //   Delete address
  async deleteAddress(addressId, userId) {
    const [result] = await db.execute(
      `DELETE FROM customer_addresses
       WHERE address_id = ? AND user_id = ?`,
      [addressId, userId]
    );

    return result.affectedRows;
  }

  //   Fetch address by user
  async getAddressesByUser(userId) {
    const [rows] = await db.execute(
      `SELECT *
       FROM customer_addresses
       WHERE user_id = ? AND status = 1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    return rows;
  }

  //   Fetch address by ID
  async getAddressById(addressId, userId) {
    const [rows] = await db.execute(
      `SELECT *
       FROM customer_addresses
       WHERE address_id = ? AND user_id = ?`,
      [addressId, userId]
    );

    return rows[0];
  }
}

module.exports = new AddressModel();
