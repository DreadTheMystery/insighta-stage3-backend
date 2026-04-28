const jwt = require("jsonwebtoken");

/**
 * Verify access token from Authorization header
 */
function verifyAccessToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      message: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: "error",
        message: "Access token expired, use refresh token",
      });
    }
    return res.status(403).json({
      status: "error",
      message: "Invalid access token",
    });
  }
}

/**
 * Verify role-based access
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Not authenticated",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: `This action requires one of: ${allowedRoles.join(", ")}`,
      });
    }

    next();
  };
}

module.exports = {
  verifyAccessToken,
  requireRole,
};
