const express = require('express');
const { generateWebsite, proofreadText, saveWebsite, latestWebsite } = require('../controllers/websiteController');
const auth = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/generate', auth, aiLimiter, generateWebsite);
router.post('/proofread', auth, aiLimiter, proofreadText);
router.post('/save', auth, saveWebsite);
router.get('/latest', auth, latestWebsite);

module.exports = router;
