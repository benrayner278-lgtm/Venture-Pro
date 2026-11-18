// The plan list, shared by checkout, billing, site publishing, bookings and chat limits.
// Prices are in pence (GBP). Keep the descriptions in step with the landing page (frontend/app/page.tsx).
const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    interval: 'month',
    summary: 'Try the builder, the chatbot and the logo maker before you pay.',
    sites: 0,
    mailboxes: 0,
    chatPerDay: 10,
    tweaksPerMonth: 5,
    portfolio: false,
    booking: false,
    features: [
      '10 chatbot messages a day',
      '5 website changes a month',
      'AI website designs and previews',
      'AI logo builder',
      'Business plan, email and legal templates',
      'Publishing a website needs a paid plan',
    ],
  },
  standard: {
    name: 'Standard',
    price: 2999,
    interval: 'month',
    summary: 'Your business online, with one live website.',
    sites: 1,
    mailboxes: 1,
    chatPerDay: 30,
    tweaksPerMonth: 20,
    portfolio: false,
    booking: false,
    features: [
      '30 chatbot messages a day',
      '20 website changes a month',
      'Publish 1 live website on your own address',
      'AI website design, with fonts, colours and style controls',
      'AI logo builder',
      'Business plan, email and legal templates',
    ],
  },
  premium: {
    name: 'Premium',
    price: 4499,
    interval: 'month',
    summary: 'Everything in Standard, plus a portfolio to show your work.',
    sites: 1,
    mailboxes: 3,
    chatPerDay: 50,
    tweaksPerMonth: 40,
    portfolio: true,
    booking: true,
    features: [
      '50 chatbot messages a day',
      '40 website changes a month',
      'Publish 1 live website',
      'Portfolio maker with photo uploads',
      'Online booking and card payments on your website',
      'Everything in Standard',
    ],
  },
  business: {
    name: 'Business',
    price: 5999,
    interval: 'month',
    summary: 'Run up to three live websites.',
    sites: 3,
    mailboxes: 5,
    chatPerDay: 60,
    tweaksPerMonth: 60,
    portfolio: true,
    booking: true,
    features: [
      '60 chatbot messages a day',
      '60 website changes a month',
      'Publish up to 3 live websites',
      'Everything in Premium',
    ],
  },
  corporate: {
    name: 'Corporate',
    price: 17999,
    interval: 'month',
    summary: 'For teams and brands that need five websites.',
    sites: 5,
    mailboxes: 10,
    chatPerDay: 150,
    tweaksPerMonth: 150,
    portfolio: true,
    booking: true,
    features: [
      'Up to 5 live websites',
      '150 chatbot messages a day',
      '150 website changes a month',
      'Online booking on every website',
      'Everything in Business',
    ],
  },
};

// Plans a customer can buy. Free is not bought.
const PAID_PLANS = Object.fromEntries(Object.entries(PLANS).filter(([, plan]) => plan.price > 0));

// Names used before the rename. Existing accounts still store these.
const LEGACY_PLAN_KEYS = { starter: 'standard', professional: 'premium', enterprise: 'corporate' };

// Subscriptions bought before the rename were charged these amounts (US cents), so the webhook still recognises them.
// The 2999 amount is the same as the new Standard price, so it is already matched above.
const LEGACY_PRICE_KEYS = { 7999: 'premium', 19999: 'corporate' };

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
