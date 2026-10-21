const express = require('express');
const { generateWebsite } = require('../controllers/websiteController');
const auth = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/generate', auth, aiLimiter, generateWebsite);

module.exports = router;
