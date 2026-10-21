const jwt = require('jsonwebtoken');

// Verifies "Authorization: Bearer <jwt>" and sets req.userId from the token
const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// For legacy routes with a :userId param: reject if it is not the caller
const requireSelf = (req, res, next) => {
  if (req.params.userId && req.params.userId !== req.userId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

module.exports = authMiddleware;
module.exports.requireSelf = requireSelf;
