// The guided journey: idea and plan, then website, then email, then domain, booking and payments.
// Each step's status is worked out from the owner's data, so the Progress page always matches what is done.
const prisma = require('../lib/prisma');
const { PLANS, planKey } = require('../lib/plans');

// Counts the owner's ready mailboxes. If the mailbox table is missing (db push not yet run), the rest of the
// Progress page still loads: the email step shows as not done, and the error is logged.
const readyMailboxes = async (userId) => {
  try {
    return await prisma.mailbox.count({ where: { userId, status: 'ready' } });
  } catch (error) {
    console.error('Count mailboxes failed (has prisma db push run?):', error.message);
    return 0;
  }
};

const getJourney = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [thread, sites, mailboxCount] = await Promise.all([
      prisma.assistantThread.findUnique({ where: { userId: user.id }, select: { messages: true } }),
      prisma.site.findMany({ where: { userId: user.id }, select: { id: true, bookingSettings: true, customDomainVerifiedAt: true } }),
      readyMailboxes(user.id),
    ]);
    const plan = PLANS[planKey(user.plan)];

    const bookingOn = sites.some((site) => site.bookingSettings?.enabled === true);
    const talkedThrough = Array.isArray(thread?.messages) && thread.messages.some((turn) => turn.role === 'user');
    const domainOn = sites.some((site) => site.customDomainVerifiedAt);
    // Own domains need a paid plan. Booking and card payments (with the shop) need Premium or above.
    const domainAllowed = plan.price > 0;
    const allSteps = [
      {
        key: 'plan',
        title: 'Shape your business idea',
        description: 'Talk through your idea with the assistant and save a plan.',
        done: talkedThrough,
        href: '/dashboard',
        action: talkedThrough ? 'Open Chat' : 'Start in Chat',
      },
      {
        key: 'website',
        title: 'Build your website',
        description: 'Create your site, then publish it to your own web address.',
        done: sites.length > 0,
        href: '/website-builder',
        action: sites.length > 0 ? 'Open your website' : 'Build my website',
      },
      {
        key: 'email',
        title: 'Set up your email address',
        description: 'Create a business address such as hello@yourbusiness.venture-pro.io. You choose the name and confirm it yourself.',
        done: mailboxCount > 0,
        allowed: plan.mailboxes > 0,
        requiredPlan: 'Standard',
        href: plan.mailboxes > 0 ? '/email' : '/billing?needs=email',
        action: plan.mailboxes < 1 ? 'Unlock with a paid plan' : mailboxCount > 0 ? 'Manage email' : 'Create my email address',
      },
      {
        key: 'domain',
        title: 'Set up your domain',
        description: 'Use your own web address, such as yourbusiness.com, or keep your free venture-pro.io address.',
        done: domainOn,
        allowed: domainAllowed,
        requiredPlan: 'Standard',
        href: domainAllowed ? '/domain' : '/billing?needs=domain',
        action: !domainAllowed ? 'Unlock with a paid plan' : domainOn ? 'Manage your domain' : 'Set up my domain',
      },
      {
        key: 'booking',
        title: 'Add online booking',
        description: 'Let customers book appointments straight from your site.',
        done: bookingOn,
        allowed: plan.booking,
        requiredPlan: 'Premium',
        href: plan.booking ? '/bookings' : '/billing?needs=booking',
        action: !plan.booking ? 'Unlock with the Premium plan' : bookingOn ? 'Change booking' : 'Set up booking',
      },
      {
        key: 'payments',
        title: 'Take payments',
        description: 'Connect Stripe so customers can pay you by card. Venture-Pro takes no fee on it.',
        done: Boolean(user.paymentsEnabled),
        allowed: plan.booking,
        requiredPlan: 'Premium',
        href: plan.booking ? '/settings' : '/billing?needs=payments',
        action: !plan.booking ? 'Unlock with the Premium plan' : user.paymentsEnabled ? 'Payments are ready' : 'Set up payments',
      },
    ];
    // Booking and payments are left off the board on plans that do not include them.
    const steps = allSteps.filter((step) => plan.booking || (step.key !== 'booking' && step.key !== 'payments'));

    // The first step not yet done is the next one. A step the plan does not include is skipped for "next".
    const next = steps.find((step) => !step.done && step.allowed !== false);
    const stepsWithState = steps.map((step) => ({
      ...step,
      state: step.done ? 'done' : step === next ? 'next' : step.allowed === false ? 'locked' : 'todo',
    }));

    res.json({
      steps: stepsWithState,
      doneCount: steps.filter((step) => step.done).length,
      total: steps.length,
      nextKey: next ? next.key : null,
      plan: plan.name,
    });
  } catch (error) {
    console.error('Get journey error:', error);
    res.status(500).json({ error: 'Could not load your progress' });
  }
};

module.exports = { getJourney };
