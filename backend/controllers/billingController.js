const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const prisma = new PrismaClient();

// Get user's billing information
const getBillingInfo = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

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
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      subscription: subscription || null,
    });
  } catch (error) {
    console.error('Get billing info error:', error);
    res.status(500).json({ error: `Failed to fetch billing info: ${error.message}` });
  }
};

// Get user's invoice history
const getInvoices = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get invoices from Stripe if customer exists
    if (user.stripeCustomerId) {
      const invoices = await stripe.invoices.list({
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
    res.status(500).json({ error: `Failed to fetch invoices: ${error.message}` });
  }
};

// Get available plans
const getPlans = async (req, res) => {
  try {
    const plans = {
      free: {
        name: 'Free',
        price: 0,
        interval: 'month',
        features: ['1 business plan/month', 'Basic email templates', 'Community support', '5GB storage'],
      },
      starter: {
        name: 'Starter',
        price: 2999,
        interval: 'month',
        features: ['Chat assistant', '10 business plans/month', 'Basic templates'],
      },
      professional: {
        name: 'Professional',
        price: 7999,
        interval: 'month',
        features: ['Unlimited chat', 'Unlimited business plans', 'All templates', 'Priority support'],
      },
      enterprise: {
        name: 'Enterprise',
        price: 19999,
        interval: 'month',
        features: ['Everything in Professional', 'Custom integrations', 'Dedicated support', 'API access'],
      },
    };

    res.json(plans);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: `Failed to fetch plans: ${error.message}` });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

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
    const canceledSubscription = await stripe.subscriptions.cancel(user.stripeSubscriptionId);

    // Update user in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'free',
        subscriptionStatus: 'canceled',
        stripeSubscriptionId: null,
      },
    });

    res.json({ message: 'Subscription canceled successfully', subscription: canceledSubscription });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: `Failed to cancel subscription: ${error.message}` });
  }
};

module.exports = { getBillingInfo, getInvoices, getPlans, cancelSubscription };
