const express = require('express');
const { publicSite, publicSiteByDomain } = require('../controllers/sitesController');

const router = express.Router();

router.get('/domain/:host', publicSiteByDomain);
router.get('/:slug', publicSite);

module.exports = router;
