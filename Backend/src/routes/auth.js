const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { check, validationResult } = require("express-validator");
const { createRateLimiter } = require("../middlewares/rateLimit");
const authMiddleware = require("../middlewares/auth");
const csrfProtection = require("../middlewares/csrf");
const logger = require("../utils/logger");

const router = express.Router();

const RefreshToken = require("../models/RefreshToken");

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15m
const ACCESS_TOKEN_EXPIRES_IN = `${ACCESS_TOKEN_MAX_AGE_MS / 1000}s`;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7d

// SameSite=None is required for the deployed topology (frontend on Vercel,
// backend on a separate origin) to send the cookie cross-site at all, but
// that also disables the browser's own CSRF mitigation -- see csrf.js.
// Locally, frontend/backend are both on localhost (different ports, but the
// same site for SameSite purposes), where Lax works and doesn't need
// Secure (no HTTPS in dev).
const cookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge,
});

function setAuthCookies(res, token, refreshToken) {
  res.cookie("token", token, cookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE_MS));
  }
  // Deliberately NOT httpOnly -- the frontend needs to read this and echo
  // it back as a header for the CSRF double-submit check.
  res.cookie("csrfToken", crypto.randomBytes(32).toString("hex"), {
    ...cookieOptions(ACCESS_TOKEN_MAX_AGE_MS),
    httpOnly: false,
  });
}

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many login attempts. Please try again in a few minutes."
});

const registerLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 20 });

// Register
router.post("/register", registerLimiter, [
  check("username").isString().trim().notEmpty().withMessage("Username is required"),
  check("email").isEmail(),
  check("password").isLength({ min: 6 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { username, password } = req.body;
    // The User schema lowercases email on save, but a findOne() filter
    // bypasses schema setters -- normalize here too, or "User@x.com" vs
    // "user@x.com" would both slip past this duplicate check.
    const email = String(req.body.email).toLowerCase().trim();

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      const field = existing.email === email ? "Email" : "Username";
      return res.status(409).json({ error: `${field} is already registered` });
    }

    // 12 rounds per current OWASP guidance for a financial app (10 is the
    // older, now-low default).
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User registered successfully!" });
  } catch (err) {
    // The unique index is the source of truth: a concurrent signup can still
    // race past the findOne check above.
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || "Account";
      return res.status(409).json({ error: `${field} is already registered` });
    }
    logger.error("Register Error", { err, requestId: req.id });
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    if (!req.body.email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const email = String(req.body.email).toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
    const refreshToken = crypto.randomBytes(40).toString("hex");
    
    await RefreshToken.create({
      user: user._id,
      token: refreshToken,
      expires: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
      createdByIp: req.ip,
    });

    setAuthCookies(res, token, refreshToken);
    res.json({
      role: user.role,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    logger.error("Login Error", { err, requestId: req.id });
    res.status(500).json({ error: "Login failed" });
  }
});

// Refresh token route
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: "No refresh token provided" });
    }

    const rt = await RefreshToken.findOne({ token: refreshToken }).populate("user");
    if (!rt || !rt.isActive) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    // Issue a new access token
    const token = jwt.sign({ id: rt.user._id, role: rt.user.role }, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
    setAuthCookies(res, token); // We don't rotate the refresh token here for simplicity, just re-issue access

    res.json({ message: "Token refreshed successfully" });
  } catch (err) {
    logger.error("Refresh Token Error", { err, requestId: req.id });
    res.status(500).json({ error: "Token refresh failed" });
  }
});

// Logout: clear cookies server-side -- the frontend can no longer just
// delete localStorage, since the token cookie is httpOnly and unreadable/
// unwritable from JS.
//
// csrfProtection (not authMiddleware -- logout must still work with an
// expired/invalid token, it just needs to clear cookies) because this is
// otherwise the one state-changing route in the file without a CSRF check:
// in production sameSite is "none" for the cross-origin deploy topology
// (see cookieOptions' comment), so without this a cross-site page could
// auto-submit a plain form POST here, and the browser would attach the auth
// cookie automatically and end the victim's session with no action of
// theirs.
router.post("/logout", csrfProtection, async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    try {
      await RefreshToken.findOneAndUpdate(
        { token: refreshToken },
        { revoked: new Date(), revokedByIp: req.ip }
      );
    } catch (err) {
      logger.error("Error revoking refresh token on logout", { err });
    }
  }

  res.clearCookie("token", cookieOptions());
  res.clearCookie("refreshToken", cookieOptions());
  res.clearCookie("csrfToken", { ...cookieOptions(), httpOnly: false });
  res.json({ message: "Logged out" });
});

// Returns the current user from the auth cookie, so the frontend can
// hydrate its auth state on load without ever having read the JWT itself
// (it can't -- the cookie is httpOnly).
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;
