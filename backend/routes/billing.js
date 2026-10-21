const express = require('express');
const { getBillingInfo, getInvoices, getPlans, cancelSubscription } = require('../controllers/billingController');
const auth = require('../middleware/auth');
const { requireSelf } = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/plans/list', getPlans);

// Preferred: the user comes from the token
router.get('/me', getBillingInfo);
router.get('/me/invoices', getInvoices);
router.post('/me/cancel', cancelSubscription);

// Legacy paths: :userId must match the token (403 otherwise)
router.get('/:userId', requireSelf, getBillingInfo);
router.get('/:userId/invoices', requireSelf, getInvoices);
router.post('/:userId/cancel', requireSelf, cancelSubscription);

module.exports = router;
