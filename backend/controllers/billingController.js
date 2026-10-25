const { getStripe } = require('../lib/stripe');

const prisma = require('../lib/prisma');
const { PAID_PLANS } = require('../lib/plans');

// Get user's billing information
const getBillingInfo = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get subscription info
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan || 'free',
      subscriptionStatus: user.subscriptionStatus || 'inactive',
      subscription: subscription || null,
    });
  } catch (error) {
    console.error('Get billing info error:', error);
    res.status(500).json({ error: 'Failed to fetch billing info' });
  }
};

// Get user's invoice history
const getInvoices = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get invoices from Stripe if customer exists
    if (user.stripeCustomerId) {
      const invoices = await getStripe().invoices.list({
        customer: user.stripeCustomerId,
        limit: 12,
      });

      const formattedInvoices = invoices.data.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount_paid,
        amountDue: invoice.amount_due,
        currency: invoice.currency,
        status: invoice.status,
        date: new Date(invoice.created * 1000),
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        pdfUrl: invoice.pdf,
        periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
        periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
      }));

      return res.json(formattedInvoices);
    }

    res.json([]);
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

// Get available plans
const getPlans = async (req, res) => {
  try {
    const plans = PAID_PLANS;

    res.json(plans);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.stripeSubscriptionId) {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    // Cancel subscription in Stripe
    const canceledSubscription = await getStripe().subscriptions.cancel(user.stripeSubscriptionId);

    // Update user in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'free',
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
      },
    });

    res.json({ message: 'Subscription canceled successfully', status: canceledSubscription.status });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

module.exports = { getBillingInfo, getInvoices, getPlans, cancelSubscription };
