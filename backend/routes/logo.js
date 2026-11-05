const express = require('express');
const { generateLogo, getLogoDraft, saveLogoDraft } = require('../controllers/logoController');
const auth = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/generate', auth, aiLimiter, generateLogo);
router.get('/draft', auth, getLogoDraft);
router.put('/draft', auth, saveLogoDraft);

module.exports = router;
