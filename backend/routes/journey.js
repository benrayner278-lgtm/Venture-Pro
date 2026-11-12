const express = require('express');
const { getJourney } = require('../controllers/journeyController');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', getJourney);

module.exports = router;
