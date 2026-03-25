// MSAL Configuration for Microsoft Authentication
import { ConfidentialClientApplication } from '@azure/msal-node';

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: process.env.ONEDRIVE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.ONEDRIVE_TENANT_ID || 'common'}`,
    clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        if (!containsPii) {
          console.log(message);
        }
      },
      piiLoggingEnabled: false,
      logLevel: process.env.NODE_ENV === 'development' ? 3 : 1, // Verbose in dev, Warning in prod
    }
  }
};

// Create MSAL client instance
const msalClient = new ConfidentialClientApplication(msalConfig);

// OAuth scopes required
const scopes = ['Files.ReadWrite.All', 'offline_access'];

// Token cache (in-memory for now, should be database in production)
const tokenCache = {
  accessToken: process.env.ONEDRIVE_ACCESS_TOKEN || null,
  refreshToken: process.env.ONEDRIVE_REFRESH_TOKEN || null,
  expiresOn: null,
};

// Get cached access token or refresh if expired
async function getAccessToken() {
  // If we have a valid cached token, return it
  if (tokenCache.accessToken && tokenCache.expiresOn && new Date() < tokenCache.expiresOn) {
    return tokenCache.accessToken;
  }

  // If we have a refresh token, use it to get a new access token
  if (tokenCache.refreshToken) {
    try {
      const refreshTokenRequest = {
        refreshToken: tokenCache.refreshToken,
        scopes: scopes,
      };

      const response = await msalClient.acquireTokenByRefreshToken(refreshTokenRequest);

      // Update cache
      tokenCache.accessToken = response.accessToken;
      tokenCache.refreshToken = response.refreshToken || tokenCache.refreshToken;
      tokenCache.expiresOn = response.expiresOn;

      console.log('Access token refreshed successfully via MSAL');
      return response.accessToken;
    } catch (error) {
      console.error('Error refreshing token via MSAL:', error.message);
      throw new Error('Token refresh failed. Please re-authenticate.');
    }
  }

  throw new Error('No valid token available. Please complete OAuth flow.');
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(code, redirectUri) {
  const tokenRequest = {
    code: code,
    scopes: scopes,
    redirectUri: redirectUri,
  };

  try {
    const response = await msalClient.acquireTokenByCode(tokenRequest);

    // Update cache
    tokenCache.accessToken = response.accessToken;
    tokenCache.refreshToken = response.account?.idTokenClaims?.refresh_token || null;
    tokenCache.expiresOn = response.expiresOn;

    return {
      accessToken: response.accessToken,
      refreshToken: tokenCache.refreshToken,
      expiresOn: response.expiresOn,
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

// Get authorization URL with PKCE
function getAuthCodeUrl(redirectUri) {
  const authCodeUrlParameters = {
    scopes: scopes,
    redirectUri: redirectUri,
    responseMode: 'query',
    prompt: 'consent', // Forces consent screen for refresh token
  };

  return msalClient.getAuthCodeUrl(authCodeUrlParameters);
}

// Export all functions and constants
module.exports = {
  msalClient,
  scopes,
  tokenCache,
  getAccessToken,
  exchangeCodeForTokens,
  getAuthCodeUrl
};
