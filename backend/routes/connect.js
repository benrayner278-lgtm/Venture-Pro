const express = require('express');
const auth = require('../middleware/auth');
const { startOnboarding, getPaymentStatus } = require('../controllers/connectController');

const router = express.Router();

router.use(auth);
router.post('/onboard', startOnboarding);
router.get('/status', getPaymentStatus);

module.exports = router;
