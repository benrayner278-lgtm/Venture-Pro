const { getStripe } = require('../lib/stripe');

const prisma = require('../lib/prisma');
const { PAID_PLANS, planKeyForAmount } = require('../lib/plans');
const { recordPaidSession } = require('./shopController');
const { CREDIT_PRICE_PENCE, MIN_CREDIT_PURCHASE, MAX_CREDIT_PURCHASE, fulfilCreditPurchase } = require('../lib/credits');

// Buys credits for the basket. One Checkout session for the whole quantity, paid once.
const createCreditCheckout = async (req, res) => {
  try {
    const credits = Number(req.body?.credits);
    if (!Number.isInteger(credits) || credits < MIN_CREDIT_PURCHASE || credits > MAX_CREDIT_PURCHASE) {
      return res.status(400).json({ error: `Buy between ${MIN_CREDIT_PURCHASE} and ${MAX_CREDIT_PURCHASE} credits at a time` });
    }

    const userId = req.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let stripeCustomerId = user.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId } });
    }

    const base = process.env.FRONTEND_URL || 'http://localhost:3000';
    const session = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Venture-Pro credits',
              description: 'Credits for website changes and chatbot messages once your monthly or daily allowance has run out.',
            },
            unit_amount: CREDIT_PRICE_PENCE,
          },
          quantity: credits,
        },
      ],
      mode: 'payment',
      billing_address_collection: 'required',
      success_url: `${base}/billing?credits=success`,
      cancel_url: `${base}/billing?credits=canceled`,
      metadata: { kind: 'credits', userId, credits: String(credits) },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Credit checkout error:', error);
    res.status(500).json({ error: 'Failed to start the credit checkout' });
  }
};

const createCheckoutSession = async (req, res) => {
  try {
    const { planId } = req.body || {};
    const userId = req.userId;

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    if (!PAID_PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    const plan = PAID_PLANS[planId];

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
          const plan = planKeyForAmount(subscription.items.data[0].price.unit_amount);

          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: plan || 'standard',
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
          const plan = planKeyForAmount(subscription.items.data[0].price.unit_amount);

          await prisma.user.update({
            where: { id: userId },
            data: {
              plan: plan || 'standard',
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

      // Shop payments are made on the owner's connected account, so the event carries event.account.
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.metadata?.kind === 'shop' && event.account) {
          await recordPaidSession(session, event.account);
          console.log(`✅ Shop order recorded for session ${session.id}`);
        }
        if (session.metadata?.kind === 'credits' && session.payment_status === 'paid') {
          const added = await fulfilCreditPurchase(session);
          console.log(added ? `✅ Credits added for session ${session.id}` : `Credits already added for session ${session.id}`);
        }
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
  res.json(PAID_PLANS);
};

module.exports = { createCheckoutSession, createCreditCheckout, handleWebhook, getPlans };
