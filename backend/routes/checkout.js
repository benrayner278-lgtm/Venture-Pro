const express = require('express');
const { createCheckoutSession, getPlans } = require('../controllers/checkoutController');
const auth = require('../middleware/auth');

const router = express.Router();

// Plan list is public pricing info
router.get('/plans', getPlans);
router.post('/create-session', auth, createCheckoutSession);

module.exports = router;
