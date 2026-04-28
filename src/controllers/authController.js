const {
  exchangeCodeForToken,
  getGitHubUserInfo,
  getOrCreateUser,
  storeRefreshToken,
  verifyAndGetRefreshToken,
  deleteRefreshToken,
} = require("../services/oauthService");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../services/tokenService");
const { generatePKCE, generateOAuthState } = require("../utils/pkce");
const supabase = require("../database/supabase");

/**
 * Initiate GitHub OAuth flow
 */
function initiateGitHubOAuth(req, res) {
  try {
    const { verifier, challenge } = generatePKCE();
    const state = generateOAuthState();

    // Store in httpOnly cookies
    res.cookie("oauth_pkce_verifier", verifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: process.env.GITHUB_REDIRECT_URI,
      scope: "user:email",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    return res.json({
      status: "success",
      authUrl,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Failed to initiate OAuth",
    });
  }
}

/**
 * Handle GitHub OAuth callback
 */
async function handleGitHubCallback(req, res) {
  try {
    const { code, state } = req.query;
    const cookieState = req.cookies.oauth_state;
    const pkceVerifier = req.cookies.oauth_pkce_verifier;

    if (!code || !state || !cookieState || !pkceVerifier) {
      return res.status(400).json({
        status: "error",
        message: "Missing authorization parameters",
      });
    }

    if (state !== cookieState) {
      return res.status(403).json({
        status: "error",
        message: "State mismatch - possible CSRF attack",
      });
    }

    // Exchange code for GitHub token
    const githubToken = await exchangeCodeForToken(code);

    // Get GitHub user info
    const githubUserInfo = await getGitHubUserInfo(githubToken);

    // Get or create user in our database
    const user = await getOrCreateUser(githubUserInfo);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshTokenData = generateRefreshToken(user);

    // Store refresh token in database
    await storeRefreshToken(user.id, refreshTokenData);

    // Clear OAuth cookies
    res.clearCookie("oauth_pkce_verifier");
    res.clearCookie("oauth_state");

    // Set httpOnly refresh token cookie
    res.cookie("refresh_token", refreshTokenData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({
      status: "success",
      accessToken,
      user: {
        id: user.id,
        username: user.github_username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("OAuth callback error:", error);
    return res.status(500).json({
      status: "error",
      message: "OAuth callback failed",
    });
  }
}

/**
 * Refresh access token
 */
async function refreshAccessToken(req, res) {
  try {
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        status: "error",
        message: "Refresh token required",
      });
    }

    // Verify refresh token exists and hasn't expired
    const storedToken = await verifyAndGetRefreshToken(refreshToken);
    if (!storedToken) {
      return res.status(403).json({
        status: "error",
        message: "Invalid or expired refresh token",
      });
    }

    // Get user info
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", storedToken.user_id)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({
        status: "error",
        message: "User not found",
      });
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    return res.json({
      status: "success",
      accessToken: newAccessToken,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Token refresh error:", error);
    return res.status(500).json({
      status: "error",
      message: "Token refresh failed",
    });
  }
}

/**
 * Logout user
 */
async function logout(req, res) {
  try {
    const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
    }

    res.clearCookie("refresh_token");
    res.clearCookie("oauth_pkce_verifier");
    res.clearCookie("oauth_state");

    return res.json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Logout error:", error);
    return res.status(500).json({
      status: "error",
      message: "Logout failed",
    });
  }
}

/**
 * Get current user info
 */
async function getCurrentUser(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Not authenticated",
      });
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id, github_username, email, role, created_at")
      .eq("id", req.user.userId)
      .maybeSingle();

    if (error || !user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    return res.json({
      status: "success",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Failed to fetch user info",
    });
  }
}

module.exports = {
  initiateGitHubOAuth,
  handleGitHubCallback,
  refreshAccessToken,
  logout,
  getCurrentUser,
};
