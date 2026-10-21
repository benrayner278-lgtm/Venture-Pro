const { rateLimit } = require('express-rate-limit');

// Login/signup: 20 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

// AI endpoints: 30 requests per minute per user (falls back to IP)
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => (req.userId ? `user:${req.userId}` : req.ip),
  message: { error: 'Too many requests, please slow down' },
});

module.exports = { authLimiter, aiLimiter };
