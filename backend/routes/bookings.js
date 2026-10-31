const express = require('express');
const rateLimit = require('express-rate-limit').rateLimit;
const auth = require('../middleware/auth');
const { getOwnerBookings, updateSettings, confirmBooking, cancelBooking, createPublicBooking } = require('../controllers/bookingController');

const router = express.Router();

// Booking requests from visitors: 20 per 15 minutes per IP.
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many booking requests. Please try again later.',
});

router.get('/sites/:siteId', auth, getOwnerBookings);
router.put('/sites/:siteId/settings', auth, updateSettings);
router.post('/:bookingId/confirm', auth, confirmBooking);
router.delete('/:bookingId', auth, cancelBooking);
router.post('/public/:slug', bookingLimiter, express.urlencoded({ extended: false, limit: '10kb' }), createPublicBooking);

module.exports = router;
