const express = require('express');
const { processMessage, saveMessage, getMessages, deleteMessage } = require('../controllers/chatController');
const auth = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimit');

const router = express.Router();
router.use(auth);

router.post('/message', aiLimiter, processMessage);
router.post('/save', saveMessage);
router.get('/:projectId', getMessages);
router.delete('/:messageId', deleteMessage);

module.exports = router;
