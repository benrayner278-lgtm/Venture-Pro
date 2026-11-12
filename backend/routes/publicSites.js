const express = require('express');
const { publicSite, publicSiteByDomain, publicBookingPage, publicBookingPageByDomain, publicShopPage, publicShopPageByDomain } = require('../controllers/sitesController');

const router = express.Router();

router.get('/domain/:host/book', publicBookingPageByDomain);
router.get('/domain/:host/shop', publicShopPageByDomain);
router.get('/domain/:host', publicSiteByDomain);
router.get('/:slug/book', publicBookingPage);
router.get('/:slug/shop', publicShopPage);
router.get('/:slug', publicSite);

module.exports = router;
