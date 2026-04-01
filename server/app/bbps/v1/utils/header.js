const crypto = require('crypto');
const axios = require('axios');
const https = require('https');


const agent = new https.Agent({
  rejectUnauthorized: false  // Disable SSL verification
});

async function generateFetchBillHeaders(key) {
  // Validate if the key and developer key are provided
  const requestData = { key };

  try {
    // Define headers directly here or pass as argument if needed
    const headers = {
      'Content-Type': 'application/json'
    };

    const response = await axios.post(`${process.env.HEADER_API_URL}BBPS/secret-key.php`, requestData, {
      headers: headers,
      httpsAgent: agent // Attach the custom agent to bypass SSL verification
    });

    // You can now use the response to extract the secret_key and secret_key_timestamp
    const { secret_key, secret_key_timestamp } = response.data;

    // Return headers for Fetch Bill API
    return {
      'Content-Type': 'application/json',
      'developer_key': process.env.EKO_DEVELOPER_KEY,
      'secret-key': secret_key,
      'secret-key-timestamp': secret_key_timestamp,
    };

  } catch (error) {
    console.error('Error fetching operators category', error);
    throw new Error('Error fetching operators category');
  }
}

async function generatePayBillHeaders(key, utility_acc_no, amount, user_code) {
  // Validate if the key and developer key are provided
  const requestData = { key, utility_acc_no, amount, user_code };

  try {
    // Define headers directly here or pass as argument if needed
    const headers = {
      'Content-Type': 'application/json'
    };

    const response = await axios.post(`${process.env.HEADER_API_URL}BBPS/request-hash.php`, requestData, {
      headers: headers,
      httpsAgent: agent // Attach the custom agent to bypass SSL verification
    });

    // You can now use the response to extract the secret_key and secret_key_timestamp
    const { secret_key, secret_key_timestamp, request_hash } = response.data;

    // Return headers for Pay Bill API
    return {
      'Content-Type': 'application/json',
      'developer_key': process.env.EKO_DEVELOPER_KEY,  // Fetch from .env file
      'secret-key': secret_key,
      'secret-key-timestamp': secret_key_timestamp,
      'request_hash': request_hash,
    };
  } catch (error) {
    console.error('Error fetching operators category', error);
    throw new Error('Error fetching operators category');
  }
}

module.exports = { generateFetchBillHeaders, generatePayBillHeaders };
