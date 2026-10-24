const express = require('express');
const { generateWebsite, proofreadText } = require('../controllers/websiteController');
const auth = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/generate', auth, aiLimiter, generateWebsite);
router.post('/proofread', auth, aiLimiter, proofreadText);

module.exports = router;
