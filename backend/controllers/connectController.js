const prisma = require('../lib/prisma');
const { getStripe } = require('../lib/stripe');

// Stripe Connect Express accounts let each business receive payments from its own customers.
// The platform takes no fee for now. The business does Stripe's short sign-up, then gets paid out to its bank.
const FRONTEND_ORIGIN = (process.env.FRONTEND_URL || 'https://venture-pro.io').split(',')[0].trim();

const statusOf = (account) => ({
  connected: Boolean(account.details_submitted),
  paymentsEnabled: Boolean(account.charges_enabled),
  payoutsEnabled: Boolean(account.payouts_enabled),
});

// Starts the sign-up with Stripe, creating the connected account the first time. Returns the link to open.
const startOnboarding = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const stripe = getStripe();

    let accountId = user.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: user.email,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        business_type: 'individual',
        metadata: { userId: user.id },
      });
      accountId = account.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeAccountId: accountId } });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${FRONTEND_ORIGIN}/settings?payments=refresh`,
      return_url: `${FRONTEND_ORIGIN}/settings?payments=done`,
      type: 'account_onboarding',
    });
    res.json({ url: link.url });
  } catch (error) {
    console.error('Start payments onboarding error:', error);
    res.status(500).json({ error: 'Could not start payment setup. Please try again.' });
  }
};

// Reads the account from Stripe, so the page can show whether payments are ready.
const getPaymentStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.stripeAccountId) return res.json({ connected: false, paymentsEnabled: false, payoutsEnabled: false });

    const account = await getStripe().accounts.retrieve(user.stripeAccountId);
    const status = statusOf(account);
    if (status.paymentsEnabled !== user.paymentsEnabled) {
      await prisma.user.update({ where: { id: user.id }, data: { paymentsEnabled: status.paymentsEnabled } });
    }
    res.json(status);
  } catch (error) {
    console.error('Get payments status error:', error);
    res.status(500).json({ error: 'Could not check payment setup' });
  }
};

module.exports = { startOnboarding, getPaymentStatus };
