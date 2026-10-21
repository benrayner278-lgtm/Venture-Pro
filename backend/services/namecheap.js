const xml2js = require('xml2js');

const SANDBOX_BASE = 'https://api.sandbox.namecheap.com/xml.response';
const PRODUCTION_BASE = 'https://api.namecheap.com/xml.response';

const getBaseUrl = () =>
  process.env.NAMECHEAP_SANDBOX === 'false' ? PRODUCTION_BASE : SANDBOX_BASE;

const getCredentials = () => {
  const {
    NAMECHEAP_API_USER,
    NAMECHEAP_API_KEY,
    NAMECHEAP_USERNAME,
    NAMECHEAP_CLIENT_IP,
  } = process.env;

  if (!NAMECHEAP_API_USER || !NAMECHEAP_API_KEY || !NAMECHEAP_USERNAME || !NAMECHEAP_CLIENT_IP) {
    throw new Error('Namecheap credentials are not configured');
  }

  return {
    ApiUser: NAMECHEAP_API_USER,
    ApiKey: NAMECHEAP_API_KEY,
    UserName: NAMECHEAP_USERNAME,
    ClientIp: NAMECHEAP_CLIENT_IP,
  };
};

const parseXml = (xml) =>
  new Promise((resolve, reject) => {
    xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

const toArray = (value) => {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
};

const callApi = async (command, params = {}) => {
  const url = new URL(getBaseUrl());
  url.search = new URLSearchParams({
    ...getCredentials(),
    Command: command,
    ...params,
  }).toString();

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Namecheap request failed with HTTP ${response.status}`);
  }

  const parsed = await parseXml(await response.text());
  const apiResponse = parsed.ApiResponse;
  if (!apiResponse) {
    throw new Error('Unexpected Namecheap response format');
  }

  if (apiResponse.$?.Status === 'ERROR' || apiResponse.Status === 'ERROR') {
    const errors = toArray(apiResponse.Errors?.Error);
    const message = errors.map((e) => (typeof e === 'string' ? e : e._ || JSON.stringify(e))).join('; ')
      || 'Unknown Namecheap error';
    throw new Error(`Namecheap error: ${message}`);
  }

  return apiResponse.CommandResponse;
};

// Check availability for up to 50 domains at once
const checkAvailability = async (domains) => {
  const commandResponse = await callApi('namecheap.domains.check', {
    DomainList: domains.join(','),
  });

  return toArray(commandResponse.DomainCheckResult).map((result) => ({
    domain: result.$.Domain,
    available: result.$.Available === 'true',
    isPremium: result.$.IsPremiumName === 'true',
    premiumPrice: result.$.PremiumRegistrationPrice || null,
    currency: result.$.Currency || 'USD',
  }));
};

// Get registration prices per TLD (e.g. com, co.uk)
const getRegistrationPrices = async (tlds) => {
  const commandResponse = await callApi('namecheap.users.getPricing', {
    ProductType: 'DOMAIN',
    ActionName: 'REGISTER',
  });

  const categories = toArray(commandResponse.UserGetPricingResult?.ProductType?.ProductCategory);

  const prices = {};
  for (const category of categories) {
    for (const product of toArray(category.Product)) {
      const name = product.$.Name;
      if (tlds.length > 0 && !tlds.includes(name)) continue;
      const yourPrice = parseFloat(product.Price?.$.YourPrice);
      if (!Number.isNaN(yourPrice)) {
        prices[name] = {
          tld: name,
          price: yourPrice,
          currency: product.Price?.$.Currency || 'USD',
        };
      }
    }
  }

  return prices;
};

// Register a domain. Contact must include:
// firstName, lastName, address1, city, state, zip, country, phone, email
const registerDomain = async ({ domain, years, contact }) => {
  const required = ['firstName', 'lastName', 'address1', 'city', 'state', 'zip', 'country', 'phone', 'email'];
  const missing = required.filter((field) => !contact[field]);
  if (missing.length > 0) {
    throw new Error(`Missing contact fields: ${missing.join(', ')}`);
  }

  const params = {
    DomainName: domain,
    Years: String(years || 1),
    AddFreeWhoisguard: 'yes',
  };

  // Namecheap requires the same contact details for all four roles
  for (const role of ['Registrant', 'Admin', 'Tech', 'AuxBilling']) {
    params[`${role}FirstName`] = contact.firstName;
    params[`${role}LastName`] = contact.lastName;
    params[`${role}Address1`] = contact.address1;
    if (contact.address2) params[`${role}Address2`] = contact.address2;
    params[`${role}City`] = contact.city;
    params[`${role}StateProvince`] = contact.state;
    params[`${role}PostalCode`] = contact.zip;
    params[`${role}Country`] = contact.country;
    params[`${role}Phone`] = contact.phone;
    params[`${role}EmailAddress`] = contact.email;
  }

  const commandResponse = await callApi('namecheap.domains.create', params);
  const result = commandResponse.DomainCreateResult;

  return {
    domain: result.$.Domain,
    registered: result.$.Registered === 'true',
    orderId: result.$.OrderID,
    transactionId: result.$.TransactionID,
    chargedAmount: result.$.ChargedAmount,
    whoisguard: result.$.WhoisguardEnable === 'true',
  };
};

module.exports = { checkAvailability, getRegistrationPrices, registerDomain };
