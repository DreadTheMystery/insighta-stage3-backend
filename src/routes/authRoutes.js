const express = require("express");
const cookieParser = require("cookie-parser");
const {
  initiateGitHubOAuth,
  handleGitHubCallback,
  refreshAccessToken,
  logout,
  getCurrentUser,
} = require("../controllers/authController");
const { verifyAccessToken } = require("../middleware/authMiddleware");
const { authLimiter } = require("../middleware/rateLimitMiddleware");

const router = express.Router();

// Parse cookies middleware for this router
router.use(cookieParser());

// Initiate GitHub OAuth flow
router.post("/github", authLimiter, initiateGitHubOAuth);

// GitHub callback
router.get("/github/callback", authLimiter, handleGitHubCallback);

// Refresh access token
router.post("/refresh", authLimiter, refreshAccessToken);

// Get current user (requires authentication)
router.get("/me", verifyAccessToken, getCurrentUser);

// Logout (requires authentication)
router.post("/logout", verifyAccessToken, logout);

module.exports = router;
