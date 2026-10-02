const express = require('express');
const { createCheckoutSession, getPlans } = require('../controllers/checkoutController');

const router = express.Router();

// Get available plans
router.get('/plans', getPlans);

// Create checkout session
router.post('/create-session', createCheckoutSession);

module.exports = router;
