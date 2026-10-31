// Custom domains let an owner serve their published site on their own address, such as www.yourbusiness.com.
// The owner proves they control the domain with a TXT record, and the domain must point at the Venture-Pro target.
const crypto = require('crypto');
const dns = require('dns').promises;

const ROOT_DOMAIN = 'venture-pro.io';
const TARGET = process.env.CUSTOM_DOMAIN_TARGET || `sites.${ROOT_DOMAIN}`;
const TXT_PREFIX = '_venture-pro';
const DOMAIN_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const TIMEOUT_MS = 8000;

// Accepts a pasted address such as https://www.yourbusiness.com/ and returns the bare hostname.
const normaliseDomain = (input) => {
  const domain = String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.$/, '');
  if (!DOMAIN_PATTERN.test(domain)) return { error: 'Enter a domain such as yourbusiness.com or www.yourbusiness.com.' };
  if (domain === ROOT_DOMAIN || domain.endsWith(`.${ROOT_DOMAIN}`)) return { error: 'That is a Venture-Pro address. Enter a domain you own.' };
  return { domain };
};

const newToken = () => crypto.randomBytes(16).toString('hex');

const lookup = async (resolve, name) => {
  try {
    return await resolve(name);
  } catch {
    return [];
  }
};

// Checks the owner's DNS: the TXT record proves ownership, and the A records must match the target's addresses.
const checkDomain = async ({ domain, token }) => {
  const [txtRecords, pointsAt, targetAddresses] = await Promise.all([
    lookup(dns.resolveTxt, `${TXT_PREFIX}.${domain}`),
    lookup(dns.resolve4, domain),
    lookup(dns.resolve4, TARGET),
  ]);
  return {
    verified: txtRecords.flat().includes(token),
    pointing: pointsAt.some((address) => targetAddresses.includes(address)),
    targetAddresses,
  };
};

// How the owner should set up their DNS. A www address uses a CNAME. A bare domain cannot use a CNAME,
// so it needs an ALIAS or ANAME record, or the target's A records.
const domainSetup = (site) => {
  if (!site.customDomain) return null;
  return {
    domain: site.customDomain,
    verified: Boolean(site.customDomainVerifiedAt),
    verifiedAt: site.customDomainVerifiedAt,
    recordType: site.customDomain.startsWith('www.') ? 'CNAME' : 'ALIAS',
    target: TARGET,
    txtName: `${TXT_PREFIX}.${site.customDomain}`,
    txtValue: site.customDomainToken,
  };
};

// Asks Cloudflare for SaaS to issue the certificate and route the domain to us. Without the Cloudflare settings
// nothing is sent, so the domain is marked verified but will not be served until those settings are added.
const registerHostname = async (domain) => {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!zoneId || !apiToken) {
    console.warn(`Custom domain ${domain} verified, but CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN are not set.`);
    return false;
  }
  const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/custom_hostnames`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostname: domain, ssl: { method: 'http', type: 'dv' } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await response.json().catch(() => ({}));
  const message = data.errors?.[0]?.message || '';
  if (response.ok && data.success !== false) return true;
  if (/already exists/i.test(message)) return true;
  throw new Error(`Cloudflare rejected ${domain}: ${message || response.status}`);
};

module.exports = { ROOT_DOMAIN, TARGET, normaliseDomain, newToken, checkDomain, domainSetup, registerHostname };
