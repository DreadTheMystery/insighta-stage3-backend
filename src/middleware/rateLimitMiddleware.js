const rateLimit = require("express-rate-limit");

/**
 * General API rate limiter: 100 requests per 15 minutes
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: "error",
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth rate limiter: 5 requests per minute
 */
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    status: "error",
    message: "Too many authentication attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Strict rate limiter: 50 requests per hour
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    status: "error",
    message: "Rate limit exceeded",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter,
  strictLimiter,
};
