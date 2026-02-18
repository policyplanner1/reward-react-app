const axios = require("axios");

let cachedToken = null;
let tokenExpiry = null;

async function getXpressToken() {
  // If token exists and not expired → reuse
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await axios.post(
    "https://shipment.xpressbees.com/api/users/login",
    {
      email: process.env.XPRESS_EMAIL,
      password: process.env.XPRESS_PASSWORD,
    }
  );

  const token = response.data.data.token;

  // Assume token valid 1 hour (confirm with them)
  cachedToken = token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;

  return token;
}
