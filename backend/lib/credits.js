const prisma = require('./prisma');

// Credits are bought on top of the daily or monthly allowance. Each credit is worth 15p.
const CREDIT_PRICE_PENCE = 15;
const MIN_CREDIT_PURCHASE = 10;
const MAX_CREDIT_PURCHASE = 1000;

// How many credits one action uses once the allowance for it has run out.
const CREDIT_COST = { chat: 1, websiteChange: 12 };

// Takes credits from the balance only if there are enough. Returns true when they were taken.
const spendCredits = async (userId, amount) => {
  const result = await prisma.user.updateMany({
    where: { id: userId, creditBalance: { gte: amount } },
    data: { creditBalance: { decrement: amount } },
  });
  return result.count === 1;
};

// Gives credits back, for example when the AI call failed after the credits were taken.
const refundCredits = async (userId, amount) => {
  await prisma.user.update({ where: { id: userId }, data: { creditBalance: { increment: amount } } });
};

// Adds the credits from a paid Checkout session. A repeat webhook for the same session adds nothing.
const fulfilCreditPurchase = async (session) => {
  const userId = session.metadata?.userId;
  const credits = Number(session.metadata?.credits);
  if (!userId || !Number.isInteger(credits) || credits < MIN_CREDIT_PURCHASE || credits > MAX_CREDIT_PURCHASE) return false;

  try {
    await prisma.$transaction([
      prisma.creditPurchase.create({
        data: { userId, stripeSessionId: session.id, credits, amountPence: session.amount_total || 0 },
      }),
      prisma.user.update({ where: { id: userId }, data: { creditBalance: { increment: credits } } }),
    ]);
    return true;
  } catch (error) {
    // P2002 means this session was already recorded, so there is nothing to add.
    if (error.code === 'P2002') return false;
    throw error;
  }
};

module.exports = {
  CREDIT_PRICE_PENCE,
  MIN_CREDIT_PURCHASE,
  MAX_CREDIT_PURCHASE,
  CREDIT_COST,
  spendCredits,
  refundCredits,
  fulfilCreditPurchase,
};
