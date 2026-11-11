const prisma = require('../lib/prisma');
const { getStripe } = require('../lib/stripe');

// Stripe Connect accounts let each business receive payments from its own customers.
// Accounts use Stripe's Accounts v2 API with the full Stripe Dashboard. Stripe collects the fees and carries the losses,
// so the platform takes no fee and does not carry negative balances.
const FRONTEND_ORIGIN = (process.env.FRONTEND_URL || 'https://venture-pro.io').split(',')[0].trim();

// Whether the business can take card payments yet, read from the account's merchant configuration.
const paymentsReady = (account) => account?.configuration?.merchant?.capabilities?.card_payments?.status === 'active';

// Starts the sign-up with Stripe, creating the connected account the first time. Returns the link to open.
const startOnboarding = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const stripe = getStripe();

    let accountId = user.stripeAccountId;
    if (!accountId) {
      const account = await stripe.v2.core.accounts.create({
        contact_email: user.email,
        display_name: user.name || 'Venture-Pro business',
        dashboard: 'full',
        identity: { country: 'gb' },
        configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
        defaults: { responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
        metadata: { userId: user.id },
      });
      accountId = account.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeAccountId: accountId } });
    }

    const link = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          collection_options: { fields: 'eventually_due' },
          refresh_url: `${FRONTEND_ORIGIN}/settings?payments=refresh`,
          return_url: `${FRONTEND_ORIGIN}/settings?payments=done`,
        },
      },
    });
    res.json({ url: link.url });
  } catch (error) {
    console.error('Start payments onboarding error:', error);
    // Stripe's own messages (for example "signed up for Connect") explain what to fix. They never contain keys.
    if (error.type?.startsWith('Stripe')) return res.status(502).json({ error: `Stripe said: ${error.message}` });
    if (error.message === 'STRIPE_SECRET_KEY is not set') return res.status(500).json({ error: 'Payments are not switched on for this server yet.' });
    res.status(500).json({ error: 'Could not start payment setup. Please try again.' });
  }
};

// Reads the account from Stripe, so the page can show whether payments are ready.
const getPaymentStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.stripeAccountId) return res.json({ connected: false, paymentsEnabled: false });

    const account = await getStripe().v2.core.accounts.retrieve(user.stripeAccountId, {
      include: ['configuration.merchant', 'requirements'],
    });
    const enabled = paymentsReady(account);
    if (enabled !== user.paymentsEnabled) {
      await prisma.user.update({ where: { id: user.id }, data: { paymentsEnabled: enabled } });
    }
    res.json({ connected: true, paymentsEnabled: enabled });
  } catch (error) {
    console.error('Get payments status error:', error);
    res.status(500).json({ error: 'Could not check payment setup' });
  }
};

module.exports = { startOnboarding, getPaymentStatus };
