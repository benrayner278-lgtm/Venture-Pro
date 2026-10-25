// The plan list, shared by checkout, billing, site publishing and chat limits.
// Prices are in pence (GBP). Keep in step with the plan list on the landing page (frontend/app/page.tsx).
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    interval: 'month',
    sites: 0,
    chatPerDay: 40,
    portfolio: false,
    booking: false,
    features: ['40 chatbot messages a day', 'One free mockup', 'No hosting'],
  },
  standard: {
    name: 'Standard',
    price: 3000,
    interval: 'month',
    sites: 1,
    chatPerDay: 100,
    portfolio: false,
    booking: false,
    features: ['100 chatbot messages a day', 'Hosting for 1 website', 'Website editing tools'],
  },
  premium: {
    name: 'Premium',
    price: 4500,
    interval: 'month',
    sites: 1,
    chatPerDay: 500,
    portfolio: true,
    booking: false,
    features: ['500 chatbot messages a day', 'Portfolio maker', 'Hosting for 1 website'],
  },
  business: {
    name: 'Business',
    price: 6000,
    interval: 'month',
    sites: 3,
    chatPerDay: 1000,
    portfolio: true,
    booking: true,
    features: ['1,000 chatbot messages a day', 'Everything in Premium', 'Hosting for 3 websites', 'Custom booking system (coming soon)'],
  },
  corporate: {
    name: 'Corporate',
    price: 17999,
    interval: 'month',
    sites: 5,
    chatPerDay: 1000,
    portfolio: true,
    booking: true,
    features: ['Up to 5 websites', 'Everything in Business', 'Custom booking system (coming soon)'],
  },
};

// Plans a customer can buy. Free is not bought.
const PAID_PLANS = Object.fromEntries(Object.entries(PLANS).filter(([, plan]) => plan.price > 0));

// Names used before the rename. Existing accounts still store these.
const LEGACY_PLAN_KEYS = { starter: 'standard', professional: 'premium', enterprise: 'corporate' };

// Subscriptions bought before the rename were charged these amounts (US cents), so the webhook still recognises them.
const LEGACY_PRICE_KEYS = { 2999: 'standard', 7999: 'premium', 19999: 'corporate' };

// Turns any stored plan name into a current plan key. Unknown names count as Free.
const planKey = (plan) => {
  const key = LEGACY_PLAN_KEYS[plan] || plan;
  return PLANS[key] ? key : 'free';
};

// Finds the plan key for a Stripe subscription amount in pence or legacy cents.
const planKeyForAmount = (amount) => {
  const match = Object.keys(PAID_PLANS).find((key) => PAID_PLANS[key].price === amount);
  return match || LEGACY_PRICE_KEYS[amount] || null;
};

module.exports = { PLANS, PAID_PLANS, planKey, planKeyForAmount };
