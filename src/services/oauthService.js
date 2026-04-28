const axios = require("axios");
const supabase = require("../database/supabase");

/**
 * Exchange GitHub authorization code for access token
 */
async function exchangeCodeForToken(code) {
  try {
    const response = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: "application/json" },
      },
    );

    if (response.data.error) {
      throw new Error(response.data.error_description || response.data.error);
    }

    return response.data.access_token;
  } catch (error) {
    throw new Error(`Failed to exchange code for token: ${error.message}`);
  }
}

/**
 * Get GitHub user info using access token
 */
async function getGitHubUserInfo(githubToken) {
  try {
    const response = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    return {
      github_id: response.data.id,
      github_username: response.data.login,
      email: response.data.email,
    };
  } catch (error) {
    throw new Error(`Failed to fetch GitHub user info: ${error.message}`);
  }
}

/**
 * Get or create user in database
 */
async function getOrCreateUser(githubInfo) {
  const { github_id, github_username, email } = githubInfo;

  // Check if user exists
  const { data: existingUser, error: queryError } = await supabase
    .from("users")
    .select("*")
    .eq("github_id", github_id)
    .maybeSingle();

  if (queryError && queryError.code !== "PGRST116") {
    throw queryError;
  }

  if (existingUser) {
    return existingUser;
  }

  // Create new user (default role: analyst)
  const { data: newUser, error: insertError } = await supabase
    .from("users")
    .insert([
      {
        github_id,
        github_username,
        email,
        role: "analyst",
      },
    ])
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  return newUser;
}

/**
 * Store refresh token in database
 */
async function storeRefreshToken(userId, tokenData) {
  const { data, error } = await supabase
    .from("refresh_tokens")
    .insert([
      {
        user_id: userId,
        token: tokenData.token,
        expires_at: tokenData.expiresAt.toISOString(),
      },
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Verify and get refresh token from database
 */
async function verifyAndGetRefreshToken(token) {
  const { data, error } = await supabase
    .from("refresh_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Check if token has expired
  if (new Date(data.expires_at) < new Date()) {
    // Delete expired token
    await supabase.from("refresh_tokens").delete().eq("id", data.id);
    return null;
  }

  return data;
}

/**
 * Delete refresh token from database
 */
async function deleteRefreshToken(token) {
  const { error } = await supabase
    .from("refresh_tokens")
    .delete()
    .eq("token", token);

  if (error) {
    throw error;
  }
}

module.exports = {
  exchangeCodeForToken,
  getGitHubUserInfo,
  getOrCreateUser,
  storeRefreshToken,
  verifyAndGetRefreshToken,
  deleteRefreshToken,
};
