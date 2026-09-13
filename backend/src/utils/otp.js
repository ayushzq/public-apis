const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const SALT_ROUNDS = 10;
const MAX_VERIFY_ATTEMPTS = 5;

/** Generates a cryptographically random 6-digit numeric code as a string. */
function generateOtpCode() {
  const max = 10 ** OTP_LENGTH;
  const num = crypto.randomInt(0, max);
  return num.toString().padStart(OTP_LENGTH, "0");
}

function getExpiryDate() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

async function hashOtp(code) {
  return bcrypt.hash(code, SALT_ROUNDS);
}

async function compareOtp(code, hash) {
  return bcrypt.compare(code, hash);
}

module.exports = {
  OTP_LENGTH,
  OTP_TTL_MINUTES,
  MAX_VERIFY_ATTEMPTS,
  generateOtpCode,
  getExpiryDate,
  hashOtp,
  compareOtp,
};
