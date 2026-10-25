const prisma = require('../lib/prisma');
const { getAnthropic } = require('../lib/anthropic');
const { PLANS, planKey } = require('../lib/plans');

// Returns the project if it belongs to userId; otherwise sends 404/403 and returns null
const loadOwnedProject = async (projectId, userId, res) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }
  if (project.userId !== userId) {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return project;
};

// Process a chat message and get AI response
const processMessage = async (req, res) => {
  try {
    const { message, projectId } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    // If a project is given, it must belong to the caller
    if (projectId && !(await loadOwnedProject(projectId, req.userId, res))) return;

    // Each plan has a daily chatbot limit. The count resets at midnight UTC.
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { chatPerDay } = PLANS[planKey(user.plan)];
    const day = new Date().toISOString().slice(0, 10);
    const usageKey = { userId_day: { userId: req.userId, day } };
    const usage = await prisma.chatDailyUsage.findUnique({ where: usageKey });
    if ((usage?.count || 0) >= chatPerDay) {
      return res.status(429).json({
        error: `You have used today's ${chatPerDay} chatbot messages. The limit resets at midnight UTC, or you can upgrade your plan.`,
      });
    }

    const response = await getAnthropic().messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    // Token counts for working out cost per message. The message text itself is not logged.
    const { input_tokens, output_tokens, cache_read_input_tokens = 0, cache_creation_input_tokens = 0 } = response.usage;
    console.log('Chat usage:', JSON.stringify({ userId: req.userId, model: response.model, input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens }));

    await prisma.chatDailyUsage.upsert({
      where: usageKey,
      create: { userId: req.userId, day, count: 1 },
      update: { count: { increment: 1 } },
    });

    const aiMessage = response.content[0].type === 'text' ? response.content[0].text : '';

    res.json({ message: aiMessage });
  } catch (error) {
    console.error('Process message error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
};

// Save a chat message
const saveMessage = async (req, res) => {
  try {
    const { projectId, userMessage, aiResponse } = req.body || {};

    if (!projectId || !userMessage || !aiResponse) {
      return res.status(400).json({ error: 'projectId, userMessage, and aiResponse are required' });
    }

    if (!(await loadOwnedProject(projectId, req.userId, res))) return;

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
    res.status(500).json({ error: 'Failed to save message' });
  }
};

// Get all messages for a project
const getMessages = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!(await loadOwnedProject(projectId, req.userId, res))) return;

    const messages = await prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

// Delete a message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { project: { select: { userId: true } } },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (message.project.userId !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.chatMessage.delete({
      where: { id: messageId },
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

module.exports = { processMessage, saveMessage, getMessages, deleteMessage, loadOwnedProject };
