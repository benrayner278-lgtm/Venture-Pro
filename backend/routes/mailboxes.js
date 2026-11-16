const express = require('express');
const { listMailboxes, createMailbox } = require('../controllers/mailboxController');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', listMailboxes);
router.post('/', createMailbox);

module.exports = router;
