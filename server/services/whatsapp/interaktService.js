const axios = require("axios");

async function sendTemplateMessage({ phone, templateName, languageCode = "en", bodyValues = [] }) {
  const baseUrl = process.env.INTERAKT_BASE_URL; // e.g. https://api.interakt.ai/v1/public/message/
  const apiKey = process.env.INTERAKT_API_KEY;

  if (!baseUrl || !apiKey) throw new Error("Interakt env missing (INTERAKT_BASE_URL / INTERAKT_API_KEY)");

  const payload = {
    countryCode: phone.startsWith("+") ? phone.slice(0, 3) : "+91", // simple default
    phoneNumber: phone.replace("+91", "").replace("+", ""),
    type: "Template",
    template: {
      name: templateName,
      languageCode,
      bodyValues
    }
  };

  const res = await axios.post(baseUrl, payload, {
    headers: {
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/json"
    },
    timeout: 15000
  });

  return res.data;
}

module.exports = { sendTemplateMessage };
