const prisma = require('../lib/prisma');

// Get all projects for a user
const getProjects = async (req, res) => {
  try {
    const userId = req.userId;

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

// Get single project
const getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    // Verify project belongs to user
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (project.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
};

// Create new project
const createProject = async (req, res) => {
  try {
    const userId = req.userId;
    const { businessName, niche, targetAudience, description } = req.body || {};

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const project = await prisma.project.create({
      data: {
        userId,
        businessName: businessName || 'Untitled Project',
        niche: niche || '',
        targetAudience: targetAudience || '',
        description: description || '',
        status: 'draft',
      },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;
    const { businessName, niche, targetAudience, description, websiteContent, emailTemplates, legalDocs, status } = req.body || {};

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Verify project belongs to user
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (project.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(businessName !== undefined && { businessName }),
        ...(niche !== undefined && { niche }),
        ...(targetAudience !== undefined && { targetAudience }),
        ...(description !== undefined && { description }),
        ...(websiteContent !== undefined && { websiteContent }),
        ...(emailTemplates !== undefined && { emailTemplates }),
        ...(legalDocs !== undefined && { legalDocs }),
        ...(status !== undefined && { status }),
      },
    });

    res.json(updatedProject);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Verify project belongs to user
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (project.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
};

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject };
