const express = require('express');
const { getBillingInfo, getInvoices, getPlans, cancelSubscription } = require('../controllers/billingController');

const router = express.Router();

// Get user's billing information
router.get('/:userId', getBillingInfo);

// Get user's invoices
router.get('/:userId/invoices', getInvoices);

// Get available plans
router.get('/plans/list', getPlans);

// Cancel subscription
router.post('/:userId/cancel', cancelSubscription);

module.exports = router;
