const express = require('express');
const { processMessage, saveMessage, getMessages, deleteMessage } = require('../controllers/chatController');

const router = express.Router();

// Process a chat message
router.post('/message', processMessage);

// Save a new message
router.post('/save', saveMessage);

// Get all messages for a project
router.get('/:projectId', getMessages);

// Delete a message
router.delete('/:messageId', deleteMessage);

module.exports = router;
