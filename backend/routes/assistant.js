const express = require('express');
const auth = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');
const { postMessage, getThread, listProposals, approveProposal, rejectProposal, undoProposal } = require('../controllers/assistantController');

const router = express.Router();

router.use(auth);
router.post('/message', aiLimiter, postMessage);
router.get('/thread', getThread);
router.get('/proposals', listProposals);
router.post('/proposals/:id/approve', approveProposal);
router.post('/proposals/:id/reject', rejectProposal);
router.post('/proposals/:id/undo', undoProposal);

module.exports = router;
