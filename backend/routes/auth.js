const express = require('express');
const { signup, login } = require('../controllers/authController');
const { getAccount, updateAccount, changePassword, deleteAccount } = require('../controllers/accountController');
const { requestReset, resetPassword } = require('../controllers/passwordResetController');
const { authLimiter } = require('../middleware/rateLimit');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.post('/forgot', authLimiter, requestReset);
router.post('/reset', authLimiter, resetPassword);
router.get('/me', auth, getAccount);
router.patch('/me', auth, updateAccount);
router.delete('/me', auth, deleteAccount);
router.post('/password', auth, authLimiter, changePassword);

module.exports = router;
