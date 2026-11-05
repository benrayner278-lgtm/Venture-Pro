const express = require('express');
const authMiddleware = require('../middleware/auth');
const { checkSlug, previewSite, downloadSite, createSite, listSites, updateSite, deleteSite, setCustomDomain, checkCustomDomain, removeCustomDomain, setSiteLogo } = require('../controllers/sitesController');

const router = express.Router();

router.use(authMiddleware);

router.get('/check', checkSlug);
router.post('/preview', previewSite);
router.post('/download', downloadSite);
router.get('/', listSites);
router.post('/', createSite);
router.put('/:siteId', updateSite);
router.put('/:siteId/logo', setSiteLogo);
router.delete('/:siteId', deleteSite);
router.put('/:siteId/domain', setCustomDomain);
router.post('/:siteId/domain/check', checkCustomDomain);
router.delete('/:siteId/domain', removeCustomDomain);

module.exports = router;
