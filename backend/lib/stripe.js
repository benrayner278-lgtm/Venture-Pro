// Lazily create the Stripe client so the server can boot without a key
let client;
const getStripe = () => {
  if (!client) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
    client = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return client;
};
module.exports = { getStripe };
