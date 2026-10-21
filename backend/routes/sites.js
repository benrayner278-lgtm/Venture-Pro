const express = require('express');
const authMiddleware = require('../middleware/auth');
const { checkSlug, previewSite, createSite, listSites, updateSite, deleteSite } = require('../controllers/sitesController');

const router = express.Router();

router.use(authMiddleware);

router.get('/check', checkSlug);
router.post('/preview', previewSite);
router.get('/', listSites);
router.post('/', createSite);
router.put('/:siteId', updateSite);
router.delete('/:siteId', deleteSite);

module.exports = router;
