const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all projects for a user
const getProjects = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: `Failed to fetch projects: ${error.message}` });
  }
};

// Get single project
const getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.query;

    if (!projectId || !userId) {
      return res.status(400).json({ error: 'Project ID and User ID are required' });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    // Verify project belongs to user
    if (!project || project.userId !== userId) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: `Failed to fetch project: ${error.message}` });
  }
};

// Create new project
const createProject = async (req, res) => {
  try {
    const { userId, businessName, niche, targetAudience, description } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

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
    res.status(500).json({ error: `Failed to create project: ${error.message}` });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, businessName, niche, targetAudience, description, websiteContent, emailTemplates, legalDocs, status } = req.body;

    if (!projectId || !userId) {
      return res.status(400).json({ error: 'Project ID and User ID are required' });
    }

    // Verify project belongs to user
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      return res.status(404).json({ error: 'Project not found' });
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
    res.status(500).json({ error: `Failed to update project: ${error.message}` });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.query;

    if (!projectId || !userId) {
      return res.status(400).json({ error: 'Project ID and User ID are required' });
    }

    // Verify project belongs to user
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: `Failed to delete project: ${error.message}` });
  }
};

module.exports = { getProjects, getProject, createProject, updateProject, deleteProject };
