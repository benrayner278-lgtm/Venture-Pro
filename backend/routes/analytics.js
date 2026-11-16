const express = require('express');
const { rateLimit } = require('express-rate-limit');
const auth = require('../middleware/auth');
const { requireAdmin, trackAppVisit, reportWorkbook } = require('../controllers/analyticsController');

const router = express.Router();

// Page views from the app. Limited per IP so the table cannot be flooded.
const visitLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests' } });

router.post('/visit', visitLimiter, trackAppVisit);
router.get('/report.xlsx', auth, requireAdmin, reportWorkbook);

module.exports = router;
