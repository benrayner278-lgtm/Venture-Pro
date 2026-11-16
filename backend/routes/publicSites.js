const express = require('express');
const { publicSite, publicSiteByDomain, publicBookingPage, publicBookingPageByDomain, publicShopPage, publicShopPageByDomain } = require('../controllers/sitesController');

const { recordVisit } = require('../lib/analytics');

const router = express.Router();

// Counts a page view of a published site. The site's address part is kept, not the owner's details.
const trackSite = (req, res, next) => {
  const site = req.params.slug || req.params.host || '';
  recordVisit({ req, kind: 'site', site, path: req.path });
  next();
};

router.get('/domain/:host/book', trackSite, publicBookingPageByDomain);
router.get('/domain/:host/shop', trackSite, publicShopPageByDomain);
router.get('/domain/:host', trackSite, publicSiteByDomain);
router.get('/:slug/book', trackSite, publicBookingPage);
router.get('/:slug/shop', trackSite, publicShopPage);
router.get('/:slug', trackSite, publicSite);

module.exports = router;
