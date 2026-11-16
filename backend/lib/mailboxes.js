// Sets up a business mailbox: the domain on Migadu, its DNS records in our zone, then the mailbox itself.
// Each step can be run again, so a request that stopped half way is finished by pressing the button again.
const { getDomain, createDomain, getRecords, activateDomain, createMailbox } = require('./migadu');
const { writeRecords } = require('./mailDns');

const MAIL_ROOT = 'venture-pro.io';
const LOCAL_PART = /^[a-z0-9][a-z0-9._-]{0,29}$/;

// The subdomain a site's mail lives on, such as sophia.venture-pro.io.
const siteMailDomain = (site) => `${site.slug}.${MAIL_ROOT}`;

// Makes sure the domain is on Migadu with its DNS records, and turns it on. Returns false while DNS is still spreading.
const ensureMailDomain = async (domain) => {
  if (!(await getDomain(domain))) await createDomain(domain);
  await writeRecords(domain, await getRecords(domain));
  return activateDomain(domain);
};

// Creates the mailbox on Migadu. The owner gets an invitation by email to choose their password.
// Returns 'ready' when the mailbox exists, or 'setting_up' when the domain is not active yet.
const provisionMailbox = async ({ domain, localPart, displayName, recoveryEmail }) => {
  const active = await ensureMailDomain(domain);
  if (!active) return 'setting_up';
  try {
    await createMailbox({ domain, localPart, displayName, recoveryEmail });
  } catch (error) {
    // The mailbox was made on an earlier attempt that did not finish saving. That still counts as ready.
    if (!/already exists/i.test(error.message)) throw error;
  }
  return 'ready';
};

module.exports = { MAIL_ROOT, LOCAL_PART, siteMailDomain, provisionMailbox };
