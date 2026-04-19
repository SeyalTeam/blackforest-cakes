var firebaseAdmin = require('firebase-admin');

function buildEnvServiceAccount() {
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    return null;
  }

  return {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || '',
    private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID || '',
    auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url:
      process.env.FIREBASE_AUTH_PROVIDER_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL || ''
  };
}

function loadFileServiceAccount() {
  try {
    var serviceAccount = require('../env/firebase_env.json');
    if (
      serviceAccount &&
      serviceAccount.private_key &&
      serviceAccount.private_key.indexOf('<set-in-env>') === -1 &&
      serviceAccount.client_email &&
      serviceAccount.project_id
    ) {
      return serviceAccount;
    }
  } catch (err) {
    console.log('Firebase file credential load skipped', err.message);
  }

  return null;
}

function createNoopAdmin() {
  return {
    apps: [],
    messaging: function() {
      return {
        send: function() {
          return Promise.resolve('firebase-disabled');
        }
      };
    }
  };
}

var serviceAccount = buildEnvServiceAccount() || loadFileServiceAccount();

if (!serviceAccount) {
  console.log('Firebase admin disabled: no valid credentials found');
  module.exports = createNoopAdmin();
} else {
  if (!firebaseAdmin.apps.length) {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(serviceAccount),
      databaseURL: 'https://bloackforestcakes.firebaseio.com'
    });
  }

  module.exports = firebaseAdmin;
}
