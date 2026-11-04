const express = require('express');
const rateLimit = require('express-rate-limit').rateLimit;
const auth = require('../middleware/auth');
const { listPresets, getOwnerBookings, updateSettings, applyTemplate, advisor, confirmBooking, cancelBooking, createPublicBooking } = require('../controllers/bookingController');

const router = express.Router();

// Booking requests from visitors: 20 per 15 minutes per IP.
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many booking requests. Please try again later.',
});

router.get('/presets', auth, listPresets);
router.get('/sites/:siteId', auth, getOwnerBookings);
router.put('/sites/:siteId/settings', auth, updateSettings);
router.post('/sites/:siteId/template', auth, applyTemplate);
router.post('/sites/:siteId/advisor', auth, express.json({ limit: '40kb' }), advisor);
router.post('/:bookingId/confirm', auth, confirmBooking);
router.delete('/:bookingId', auth, cancelBooking);
router.post('/public/:slug', bookingLimiter, express.urlencoded({ extended: false, limit: '10kb' }), createPublicBooking);

module.exports = router;
