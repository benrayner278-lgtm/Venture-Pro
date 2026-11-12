const express = require('express');
const rateLimit = require('express-rate-limit').rateLimit;
const auth = require('../middleware/auth');
const { getShop, updateShop, startCheckout, completeCheckout } = require('../controllers/shopController');

const router = express.Router();

// Shop purchase attempts from visitors: 30 per 15 minutes per IP.
const shopLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many purchase attempts. Please try again later.',
});

router.get('/sites/:siteId', auth, getShop);
router.put('/sites/:siteId', auth, updateShop);
router.post('/public/:slug/checkout', shopLimiter, express.urlencoded({ extended: false, limit: '10kb' }), startCheckout);
router.get('/public/:slug/complete', completeCheckout);

module.exports = router;
