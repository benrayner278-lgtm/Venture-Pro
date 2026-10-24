const bcrypt = require('bcrypt');

const prisma = require('../lib/prisma');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name || '',
  plan: user.plan,
  subscriptionStatus: user.subscriptionStatus,
  createdAt: user.createdAt,
});

const findCaller = (req) => prisma.user.findUnique({ where: { id: req.userId } });

const getAccount = async (req, res) => {
  try {
    const user = await findCaller(req);
    if (!user) return res.status(404).json({ error: 'Account not found' });
    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ error: 'Could not load your account' });
  }
};

const updateAccount = async (req, res) => {
  try {
    const { name } = req.body || {};
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (name !== undefined && (typeof name !== 'string' || name.length > 100)) {
      return res.status(400).json({ error: 'Name must be under 100 characters' });
    }

    const taken = await prisma.user.findFirst({ where: { email, NOT: { id: req.userId } } });
    if (taken) return res.status(400).json({ error: 'That email is already used by another account' });

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name: (name || '').trim() || null, email },
    });
    res.json({ user: publicUser(user) });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ error: 'Could not save your details' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'Enter your current and new password' });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: 'New password must be between 8 and 128 characters' });
    }

    const user = await findCaller(req);
    if (!user) return res.status(404).json({ error: 'Account not found' });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(400).json({ error: 'Your current password is not right' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });
    res.json({ message: 'Password changed' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Could not change your password' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body || {};
    if (typeof password !== 'string') return res.status(400).json({ error: 'Enter your password to delete your account' });

    const user = await findCaller(req);
    if (!user) return res.status(404).json({ error: 'Account not found' });
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Your password is not right' });
    }
    // Deleting while paid would leave the subscription billing with no account to manage it.
    if (user.subscriptionStatus !== 'inactive' && user.subscriptionStatus !== 'canceled') {
      return res.status(400).json({ error: 'Cancel your subscription on the Billing page before deleting your account' });
    }

    // Sites, projects and their content are removed with the account.
    await prisma.user.delete({ where: { id: user.id } });
    res.json({ message: 'Account deleted' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Could not delete your account' });
  }
};

module.exports = { getAccount, updateAccount, changePassword, deleteAccount };
