const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/**
 * Generate short-lived access token (15 minutes)
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      githubId: user.github_id,
      username: user.github_username,
      role: user.role,
      type: "access",
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );
}

/**
 * Generate long-lived refresh token (7 days)
 */
function generateRefreshToken(user) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return {
    token,
    expiresAt,
  };
}

/**
 * Verify and decode refresh token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    return null;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};
