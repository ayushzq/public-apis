const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { sendOtpEmail } = require("../utils/mailer");
const {
  generateOtpCode,
  getExpiryDate,
  hashOtp,
  compareOtp,
  MAX_VERIFY_ATTEMPTS,
} = require("../utils/otp");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_MS = 60 * 1000;

function isValidEmail(email) {
  return typeof email === "string" && EMAIL_REGEX.test(email);
}

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
}

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    about: user.about,
    onlineStatus: user.onlineStatus,
    themePreference: user.themePreference,
  };
}

/**
 * POST /api/auth/send-otp
 * Creates (or reuses, if <60s old) an OTP for this email, hashes it,
 * stores it, and emails the plaintext code to the user.
 */
async function sendOtp(req, res) {
  try {
    const { email } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const lastOtp = await prisma.otp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });

    if (lastOtp && Date.now() - lastOtp.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        message: "Please wait before requesting another code.",
      });
    }

    const code = generateOtpCode();
    const codeHash = await hashOtp(code);

    await prisma.otp.create({
      data: {
        email,
        codeHash,
        expiresAt: getExpiryDate(),
      },
    });

    await sendOtpEmail(email, code);

    return res.json({ message: "OTP sent successfully." });
  } catch (err) {
    console.error("sendOtp error:", err);
    return res.status(500).json({ message: "Could not send the code. Please try again." });
  }
}

/**
 * POST /api/auth/resend-otp
 * Identical to send-otp but explicitly named for the "Resend OTP"
 * button on the frontend, which enforces its own 60s cooldown UI too.
 */
async function resendOtp(req, res) {
  return sendOtp(req, res);
}

/**
 * POST /api/auth/verify-otp
 * Validates the code against the latest unconsumed OTP for the email,
 * enforces expiry + max-attempt limits, then creates the user (first
 * login) or reuses the existing one, and issues a JWT session.
 */
async function verifyOtp(req, res) {
  try {
    const { email, code } = req.body;
    if (!isValidEmail(email) || typeof code !== "string" || code.length !== 6) {
      return res.status(400).json({ message: "Invalid email or code." });
    }

    const otp = await prisma.otp.findFirst({
      where: { email, consumed: false },
      orderBy: { createdAt: "desc" },
    });

    if (!otp) {
      return res.status(400).json({ message: "No active code found. Please request a new one." });
    }

    if (otp.expiresAt < new Date()) {
      return res.status(400).json({ message: "This code has expired. Please request a new one." });
    }

    if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
      return res.status(429).json({ message: "Too many attempts. Please request a new code." });
    }

    const isMatch = await compareOtp(code, otp.codeHash);

    if (!isMatch) {
      await prisma.otp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return res.status(400).json({ message: "Incorrect code. Please try again." });
    }

    await prisma.otp.update({
      where: { id: otp.id },
      data: { consumed: true },
    });

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0],
          onlineStatus: true,
          waSession: { create: { status: "disconnected" } },
        },
      });
    } else {
      user = await prisma.user.update({
        where: { email },
        data: { onlineStatus: true, lastSeenAt: new Date() },
      });
    }

    const token = signToken(user);
    return res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error("verifyOtp error:", err);
    return res.status(500).json({ message: "Could not verify the code. Please try again." });
  }
}

module.exports = { sendOtp, resendOtp, verifyOtp };
