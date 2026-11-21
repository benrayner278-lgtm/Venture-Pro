const express = require('express');
const rateLimit = require('express-rate-limit').rateLimit;
const auth = require('../middleware/auth');
const { getShop, updateShop, updateContact, generateForm, saveForm, setupChat, previewClasses, saveClasses, startCheckout, completeCheckout } = require('../controllers/shopController');
const { aiLimiter } = require('../middleware/rateLimit');

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
router.post('/sites/:siteId/form', auth, generateForm);
router.put('/sites/:siteId/form', auth, saveForm);
router.post('/sites/:siteId/setup', auth, aiLimiter, setupChat);
router.put('/sites/:siteId/contact', auth, updateContact);
router.post('/sites/:siteId/classes/preview', auth, previewClasses);
router.put('/sites/:siteId/classes', auth, saveClasses);
router.post('/public/:slug/checkout', shopLimiter, express.urlencoded({ extended: false, limit: '24kb' }), startCheckout);
router.get('/public/:slug/complete', completeCheckout);

module.exports = router;
