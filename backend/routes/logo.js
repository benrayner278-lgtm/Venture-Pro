const express = require('express');
const { generateLogo } = require('../controllers/logoController');
const auth = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/generate', auth, aiLimiter, generateLogo);

module.exports = router;
