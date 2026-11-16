// Writes the DNS records a mailbox domain needs (from Migadu) into our Cloudflare zone, so the address
// works on a site's subdomain such as sophia.venture-pro.io. Records that already exist are left alone,
// so it is safe to run again.
const API = 'https://api.cloudflare.com/client/v4';
const TIMEOUT_MS = 15000;

const cfRequest = async (path, options = {}) => {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!apiToken || !zoneId) {
    throw Object.assign(new Error('Email hosting is not set up yet. Please try again later.'), { status: 503, expose: true });
  }
  const response = await fetch(`${API}/zones/${zoneId}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(`Cloudflare DNS request failed: ${data.errors?.[0]?.message || response.status}`);
  }
  return data.result;
};

// Migadu names are relative to the domain ("@" is the domain itself). Cloudflare wants the full name.
const fullName = (domain, name) => (name === '@' ? domain : `${name}.${domain}`);

// Compares record values without the quotes and trailing dot that DNS providers add or drop.
const normalise = (value) => String(value || '').replace(/^"|"$/g, '').replace(/\.$/, '').trim().toLowerCase();

// Turns the Migadu records response into a flat list of { type, name, content, priority }.
const flattenRecords = (domain, records) => {
  const list = [];
  for (const mx of records.mx_records || []) list.push({ type: 'MX', name: mx.name, content: mx.value, priority: mx.priority });
  if (records.spf) list.push({ type: 'TXT', name: records.spf.name, content: records.spf.value });
  if (records.dmarc) list.push({ type: 'TXT', name: records.dmarc.name, content: records.dmarc.value });
  if (records.dns_verification) list.push({ type: 'TXT', name: records.dns_verification.name, content: records.dns_verification.value });
  for (const key of records.dkim || []) list.push({ type: 'CNAME', name: key.name, content: key.value });
  return list.map((record) => ({ ...record, name: fullName(domain, record.name) }));
};

// A name that has mail records (MX, TXT) but no web record stops answering the wildcard for the web.
// The site's address is that name, so this adds a proxied placeholder that the Worker route answers for.
const ensureWebRecord = async (domain) => {
  const existing = await cfRequest(`/dns_records?name=${encodeURIComponent(domain)}&per_page=100`);
  if (existing.some((item) => item.type === 'A' || item.type === 'AAAA' || item.type === 'CNAME')) return 0;
  await cfRequest('/dns_records', {
    method: 'POST',
    body: JSON.stringify({ type: 'A', name: domain, content: '192.0.2.1', ttl: 1, proxied: true }),
  });
  return 1;
};

// Adds each record unless the same record already exists.
const writeRecords = async (domain, records) => {
  let added = 0;
  added += await ensureWebRecord(domain);
  for (const record of flattenRecords(domain, records)) {
    const existing = await cfRequest(`/dns_records?type=${record.type}&name=${encodeURIComponent(record.name)}&per_page=100`);
    if (existing.some((item) => normalise(item.content) === normalise(record.content))) continue;
    await cfRequest('/dns_records', {
      method: 'POST',
      body: JSON.stringify({
        type: record.type,
        name: record.name,
        content: record.content,
        ttl: 1,
        proxied: false,
        ...(record.priority !== undefined ? { priority: record.priority } : {}),
      }),
    });
    added += 1;
  }
  return added;
};

module.exports = { writeRecords, flattenRecords, fullName };
