// Calls Migadu's API to host business mailboxes. Endpoints follow https://migadu.com/api/.
// Migadu bills the whole account, so every customer's domains and mailboxes sit under one Migadu account.
const BASE_URL = 'https://api.migadu.com/v1';
const TIMEOUT_MS = 15000;

// Returns { status, data }. Throws only when the account is not set up, so the owner sees a clear message.
const migaduRequest = async (method, path, body) => {
  const username = process.env.MIGADU_USERNAME;
  const apiKey = process.env.MIGADU_API_KEY;
  if (!username || !apiKey) {
    throw Object.assign(new Error('Email hosting is not set up yet. Please try again later.'), { status: 503, expose: true });
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${apiKey}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
};

// Looks a domain up. Returns the domain, or null if this account does not have it yet.
const getDomain = async (name) => {
  const { status, data } = await migaduRequest('GET', `/domains/${encodeURIComponent(name)}`);
  if (status === 200) return data;
  return null;
};

// Adds the domain to the account. External DNS is used, so the records are written in our own DNS zone.
const createDomain = async (name) => {
  const { status, data } = await migaduRequest('POST', '/domains', {
    name,
    create_default_addresses: false,
    hosted_dns: false,
  });
  if (status !== 200) throw new Error(`Migadu could not add ${name}: ${data.message || status}`);
  return data;
};

// The DNS records the domain needs: MX, SPF, DKIM, DMARC and the verification record. Names are relative to the domain.
const getRecords = async (name) => {
  const { status, data } = await migaduRequest('GET', `/domains/${encodeURIComponent(name)}/records`);
  if (status !== 200) throw new Error(`Migadu did not return the DNS records for ${name}`);
  return data;
};

// Turns the domain on once its DNS records are in place. Returns false while DNS is still spreading.
const activateDomain = async (name) => {
  const { status } = await migaduRequest('GET', `/domains/${encodeURIComponent(name)}/activate`);
  return status === 200;
};

// Creates a mailbox. The owner is sent an invitation to set their own password, so we never hold it.
const createMailbox = async ({ domain, localPart, displayName, recoveryEmail }) => {
  const { status, data } = await migaduRequest('POST', `/domains/${encodeURIComponent(domain)}/mailboxes`, {
    local_part: localPart,
    name: displayName,
    password_method: 'invitation',
    password_recovery_email: recoveryEmail,
  });
  if (status !== 200) throw new Error(`Migadu could not create ${localPart}@${domain}: ${data.message || status}`);
  return data;
};

module.exports = { getDomain, createDomain, getRecords, activateDomain, createMailbox };
