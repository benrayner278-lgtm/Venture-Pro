const express = require('express');
const { generateWebsite } = require('../controllers/websiteController');

const router = express.Router();

router.post('/generate', generateWebsite);

module.exports = router;
