const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

transporter.verify((err) => {
  if (err) {
    console.error("SMTP Error:", err);
  } else {
    console.log("SMTP ready");
  }
});

async function sendOtpEmail(email, otp) {
  try {
    await transporter.sendMail({
      from: `"Reward Planner" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}. This OTP is valid for 10 minutes.`,
      html: `
        <h3>Verify your account</h3>
        <p>Your OTP is <b>${otp}</b></p>
        <p>This OTP is valid for 10 minutes.</p>
      `,
    });
  } catch (err) {
    console.error("Error sending OTP email:", err);
    throw err;
  }
}
module.exports = { sendOtpEmail };
