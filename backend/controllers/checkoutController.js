const { getStripe } = require('../lib/stripe');

const prisma = require('../lib/prisma');

const PLANS = {
  starter: {
    name: 'Starter',
    price: 2999, // $29.99 in cents
    interval: 'month',
    features: ['Chat assistant', '10 business plans/month', 'Basic templates'],
  },
  professional: {
    name: 'Professional',
    price: 7999, // $79.99 in cents
    interval: 'month',
    features: ['Unlimited chat', 'Unlimited business plans', 'All templates', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 19999, // $199.99 in cents
    interval: 'month',
    features: ['Everything in Professional', 'Custom integrations', 'Dedicated support', 'API access'],
  },
};

const createCheckoutSession = async (req, res) => {
  try {
    const { planId } = req.body || {};
    const userId = req.userId;

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    if (!PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    const plan = PLANS[planId];

    // Create or retrieve customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create Stripe customer if not exists
    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;

      // Save Stripe customer ID to database
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId },
      });
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Venture-Pro ${plan.name} Plan`,
              description: plan.features.join(', '),
              tax_code: 'txcd_10000000', // SaaS tax code
            },
            unit_amount: plan.price,
            recurring: {
              interval: plan.interval,
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      billing_address_collection: 'required',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing?canceled=true`,
      metadata: {
        userId,
        planId,
      },
      subscription_data: {
        metadata: { userId, planId },
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = getStripe().webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

    console.log(`✅ Webhook received: ${event.type}`);

    switch (event.type) {
      case 'customer.subscription.created': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const plan = Object.keys(PLANS).find(
            (key) => PLANS[key].price === subscription.items.data[0].price.unit_amount
          );

          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: plan || 'starter',
              subscriptionStatus: 'active',
              stripeSubscriptionId: subscription.id,
            },
          });

          console.log(`✅ Subscription created for user ${userId}, plan: ${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId && subscription.status === 'active') {
          const plan = Object.keys(PLANS).find(
            (key) => PLANS[key].price === subscription.items.data[0].price.unit_amount
          );

          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: plan || 'starter',
              subscriptionStatus: subscription.status,
              stripeSubscriptionId: subscription.id,
            },
          });

          console.log(`✅ Subscription updated for user ${userId}, plan: ${plan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: 'free',
              subscriptionStatus: 'canceled',
              stripeSubscriptionId: null,
            },
          });

          console.log(`✅ Subscription canceled for user ${userId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log(`✅ Invoice payment succeeded for customer ${invoice.customer}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        console.log(`❌ Invoice payment failed for customer ${invoice.customer}`);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        console.log(`✅ Payment intent succeeded: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook verification failed' });
  }
};

const getPlans = async (req, res) => {
  res.json(PLANS);
};

module.exports = { createCheckoutSession, handleWebhook, getPlans };
