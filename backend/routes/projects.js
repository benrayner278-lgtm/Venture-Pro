const express = require('express');
const { getProjects, getProject, createProject, updateProject, deleteProject } = require('../controllers/projectController');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.get('/', getProjects);
router.get('/:projectId', getProject);
router.post('/', createProject);
router.put('/:projectId', updateProject);
router.delete('/:projectId', deleteProject);

module.exports = router;
