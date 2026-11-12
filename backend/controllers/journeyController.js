// The guided journey: idea and plan, then website, then booking, then payments.
// Each step's status is worked out from the owner's data, so the Start here page always matches what is done.
const prisma = require('../lib/prisma');
const { PLANS, planKey } = require('../lib/plans');

const getJourney = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [projectCount, sites] = await Promise.all([
      prisma.project.count({ where: { userId: user.id, businessName: { not: null } } }),
      prisma.site.findMany({ where: { userId: user.id }, select: { id: true, bookingSettings: true, customDomainVerifiedAt: true } }),
    ]);
    const plan = PLANS[planKey(user.plan)];

    const bookingOn = sites.some((site) => site.bookingSettings?.enabled === true);
    const domainOn = sites.some((site) => site.customDomainVerifiedAt);
    // Own domains need a paid plan. Booking and card payments (with the shop) need Business or above.
    const domainAllowed = plan.price > 0;
    const steps = [
      {
        key: 'plan',
        title: 'Shape your business idea',
        description: 'Talk through your idea with the assistant and save a plan.',
        done: projectCount > 0,
        href: projectCount > 0 ? '/business-plan' : '/dashboard',
        action: projectCount > 0 ? 'Open your plan' : 'Start your plan',
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
        requiredPlan: 'Business',
        href: plan.booking ? '/bookings' : '/billing?needs=booking',
        action: !plan.booking ? 'Unlock with the Business plan' : bookingOn ? 'Change booking' : 'Set up booking',
      },
      {
        key: 'payments',
        title: 'Take payments',
        description: 'Connect Stripe so customers can pay you by card. Venture-Pro takes no fee on it.',
        done: Boolean(user.paymentsEnabled),
        allowed: plan.booking,
        requiredPlan: 'Business',
        href: plan.booking ? '/settings' : '/billing?needs=payments',
        action: !plan.booking ? 'Unlock with the Business plan' : user.paymentsEnabled ? 'Payments are ready' : 'Set up payments',
      },
    ];

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
