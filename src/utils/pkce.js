const crypto = require("crypto");

/**
 * Generate PKCE verifier and challenge for OAuth flow
 */
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  return { verifier, challenge };
}

/**
 * Generate random state for OAuth
 */
function generateOAuthState() {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Validate PKCE verifier against challenge
 */
function validatePKCE(verifier, challenge) {
  const computed = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  return computed === challenge;
}

module.exports = {
  generatePKCE,
  generateOAuthState,
  validatePKCE,
};
