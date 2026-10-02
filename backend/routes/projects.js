const express = require('express');
const { getProjects, getProject, createProject, updateProject, deleteProject } = require('../controllers/projectController');

const router = express.Router();

// Get all projects for user
router.get('/', getProjects);

// Get single project
router.get('/:projectId', getProject);

// Create new project
router.post('/', createProject);

// Update project
router.put('/:projectId', updateProject);

// Delete project
router.delete('/:projectId', deleteProject);

module.exports = router;
