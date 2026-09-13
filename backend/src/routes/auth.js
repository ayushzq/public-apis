const express = require("express");
const rateLimit = require("express-rate-limit");
const { sendOtp, resendOtp, verifyOtp } = require("../controllers/authController");

const router = express.Router();

// Prevents OTP-spam / brute force: 10 requests per 15 minutes per IP.
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
});

router.post("/send-otp", otpLimiter, sendOtp);
router.post("/resend-otp", otpLimiter, resendOtp);
router.post("/verify-otp", otpLimiter, verifyOtp);

module.exports = router;
