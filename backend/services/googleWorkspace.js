const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user',
  'https://www.googleapis.com/auth/admin.directory.group',
  'https://www.googleapis.com/auth/admin.directory.group.member',
];

const getAuth = () => {
  const clientEmail = process.env.GOOGLE_WORKSPACE_CLIENT_EMAIL;
  const privateKey = (process.env.GOOGLE_WORKSPACE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL;

  if (!clientEmail || !privateKey || !adminEmail) {
    throw new Error('Google Workspace credentials are not configured');
  }

  return new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: SCOPES,
    subject: adminEmail, // super-admin account to impersonate (domain-wide delegation)
  });
};

const getDirectory = () => google.admin({ version: 'directory_v1', auth: getAuth() });

// Create a user mailbox like hello@yourdomain.com
const createUser = async ({ primaryEmail, givenName, familyName, password }) => {
  const directory = getDirectory();
  const response = await directory.users.insert({
    requestBody: {
      primaryEmail,
      name: { givenName, familyName },
      password,
      orgUnitPath: '/',
      changePasswordAtNextLogin: true,
    },
  });
  return response.data;
};

const getUser = async (userKey) => {
  const directory = getDirectory();
  const response = await directory.users.get({ userKey });
  return response.data;
};

const listUsers = async (domain) => {
  const directory = getDirectory();
  const response = await directory.users.list({
    domain,
    maxResults: 100,
    orderBy: 'email',
  });
  return response.data.users || [];
};

const suspendUser = async (userKey) => {
  const directory = getDirectory();
  const response = await directory.users.update({
    userKey,
    requestBody: { suspended: true },
  });
  return response.data;
};

// Create a group address like info@yourdomain.com that fans out to members
const createGroup = async ({ email, name, description }) => {
  const directory = getDirectory();
  const response = await directory.groups.insert({
    requestBody: { email, name, description: description || '' },
  });
  return response.data;
};

const addGroupMember = async ({ groupEmail, memberEmail, role = 'MEMBER' }) => {
  const directory = getDirectory();
  const response = await directory.members.insert({
    groupKey: groupEmail,
    requestBody: { email: memberEmail, role },
  });
  return response.data;
};

module.exports = { createUser, getUser, listUsers, suspendUser, createGroup, addGroupMember };
