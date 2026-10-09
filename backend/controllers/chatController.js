const { PrismaClient } = require('@prisma/client');
const Anthropic = require('@anthropic-ai/sdk');

const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Process a chat message and get AI response
const processMessage = async (req, res) => {
  try {
    const { message, userId } = req.body;

    if (!message || !userId) {
      return res.status(400).json({ error: 'message and userId are required' });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const aiMessage = response.content[0].type === 'text' ? response.content[0].text : '';

    res.json({ message: aiMessage });
  } catch (error) {
    console.error('Process message error:', error);
    res.status(500).json({ error: `Failed to process message: ${error.message}` });
  }
};

// Save a chat message
const saveMessage = async (req, res) => {
  try {
    const { projectId, userMessage, aiResponse } = req.body;

    if (!projectId || !userMessage || !aiResponse) {
      return res.status(400).json({ error: 'projectId, userMessage, and aiResponse are required' });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const message = await prisma.chatMessage.create({
      data: {
        projectId,
        userMessage,
        aiResponse,
      },
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Save message error:', error);
    res.status(500).json({ error: `Failed to save message: ${error.message}` });
  }
};

// Get all messages for a project
const getMessages = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: `Failed to fetch messages: ${error.message}` });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ error: 'messageId is required' });
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await prisma.chatMessage.delete({
      where: { id: messageId },
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: `Failed to delete message: ${error.message}` });
  }
};

module.exports = { processMessage, saveMessage, getMessages, deleteMessage };
