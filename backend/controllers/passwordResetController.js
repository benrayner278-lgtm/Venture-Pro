const crypto = require('crypto');
const bcrypt = require('bcrypt');

const prisma = require('../lib/prisma');
const { sendEmail } = require('../lib/email');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_MS = 60 * 60 * 1000;
const SENT_MESSAGE = 'If an account exists for that email, we have sent a link to reset the password.';

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Always gives the same answer, so the form cannot show which emails have an account.
const requestReset = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  try {
    if (EMAIL_RE.test(email) && email.length <= 254) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const token = crypto.randomBytes(32).toString('base64url');
        await prisma.user.update({
          where: { id: user.id },
          data: { resetTokenHash: hashToken(token), resetTokenExpiresAt: new Date(Date.now() + RESET_MS) },
        });
        const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        await sendEmail({
          to: email,
          subject: 'Reset your Venture-Pro password',
          text: `Someone asked to reset the password for your Venture-Pro account.\n\nTo choose a new password, open this link within the next hour:\n${link}\n\nIf you did not ask for this, you can ignore this email and your password will stay the same.`,
        });
      }
    }
  } catch (error) {
    console.error('Password reset request error:', error);
  }
  res.json({ message: SENT_MESSAGE });
};

const resetPassword = async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const password = req.body?.password;
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be between 8 and 128 characters' });
    }

    const user = token
      ? await prisma.user.findFirst({ where: { resetTokenHash: hashToken(token), resetTokenExpiresAt: { gt: new Date() } } })
      : null;
    if (!user) {
      return res.status(400).json({ error: 'This reset link has expired or has already been used. Ask for a new one.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(password, 10), resetTokenHash: null, resetTokenExpiresAt: null },
    });
    res.json({ message: 'Your password has been changed. You can sign in now.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Could not reset the password' });
  }
};

module.exports = { requestReset, resetPassword };
