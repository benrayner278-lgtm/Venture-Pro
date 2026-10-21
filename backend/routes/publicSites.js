const express = require('express');
const { publicSite } = require('../controllers/sitesController');

const router = express.Router();

router.get('/:slug', publicSite);

module.exports = router;
