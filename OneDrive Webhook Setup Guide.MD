# OneDrive Webhook Setup Guide

This enables automatic file uploads from OneDrive to S3 without Make.com.

## Step 1: Register Azure App (Get OAuth Tokens)

1. Go to https://portal.azure.com/
2. Search for "App registrations" → Click it
3. Click "New registration"
4. Name: `Gaming CMS OneDrive`
5. Supported account types: `Accounts in this organizational directory only`
6. Redirect URI: `https://gaming-cms.vercel.app/callback` (or your domain)
7. Click "Register"

## Step 2: Add API Permissions

1. In your app, go to "API permissions"
2. Click "Add a permission"
3. Select "Microsoft Graph"
4. Select "Delegated permissions"
5. Search and check these permissions:
   - `Files.ReadWrite.All` (read/write files)
   - `offline_access` (refresh token)
6. Click "Add permissions"
7. Click "Grant admin consent"

## Step 3: Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Description: `OneDrive Webhook Secret`
4. Expiry: `12 months`
5. Click "Add"
6. **Copy the secret value immediately** (you'll only see it once)

## Step 4: Get Required Tokens

You need:
- **Client ID** (from app overview)
- **Client Secret** (from step 3)
- **Access Token** (from OAuth flow)
- **Refresh Token** (from OAuth flow)

### Get Access Token via OAuth Flow

1. Go to this URL (replace `CLIENT_ID`):
```
https://login.microsoftonline.com/common/oauth2/v2.0/authorize?
client_id=CLIENT_ID
&response_type=code
&scope=Files.ReadWrite.All offline_access
&redirect_uri=https://gaming-cms.vercel.app/callback
```

2. Sign in with your Microsoft account
3. Accept permissions
4. You'll be redirected to `https://gaming-cms.vercel.app/callback?code=...`
5. **Copy the `code` value**

### Exchange Code for Tokens

Make a POST request (use Postman or curl):

```bash
curl -X POST https://login.microsoftonline.com/common/oauth2/v2.0/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=AUTHORIZATION_CODE" \
  -d "redirect_uri=https://gaming-cms.vercel.app/callback" \
  -d "grant_type=authorization_code" \
  -d "scope=Files.ReadWrite.All offline_access"
```

Response will include:
```json
{
  "access_token": "eyJ0eXAi...",
  "refresh_token": "0.AXoA...",
  "expires_in": 3600,
  ...
}
```

## Step 5: Add Environment Variables to Vercel

In Vercel project settings → Environment Variables, add:

```
ONEDRIVE_ACCESS_TOKEN=eyJ0eXAi...
ONEDRIVE_REFRESH_TOKEN=0.AXoA...
ONEDRIVE_CLIENT_ID=YOUR_CLIENT_ID
ONEDRIVE_CLIENT_SECRET=YOUR_CLIENT_SECRET
WEBHOOK_SECRET=your-random-secret-string
VERCEL_URL=https://gaming-cms.vercel.app
```

## Step 6: Update api/index.js

Add the webhook code from `webhook-addition.js` to your `api/index.js`:

1. Import axios and PutObjectCommand at the top
2. Add the webhook endpoint: `POST /api/webhook/onedrive`
3. Add the setup endpoint: `POST /api/webhook/setup-onedrive`

## Step 7: Activate Webhook Subscription

Once deployed, make a POST request to your backend:

```bash
curl -X POST https://gaming-cms.vercel.app/api/webhook/setup-onedrive
```

This will create a subscription for OneDrive to notify your webhook when files are added to `Videos/Xbox Game DVR`.

## How It Works

```
1. You record UFC5 fight on Xbox
2. Xbox uploads to OneDrive → Videos/Xbox Game DVR
3. OneDrive notifies your webhook
4. Backend downloads file from OneDrive
5. Backend uploads to S3
6. Backend deletes from OneDrive
7. Your CMS refreshes and shows new video
```

## Token Refresh

Access tokens expire in ~1 hour. You'll need to refresh them:

```javascript
// In your backend
if (tokenExpired) {
  const newTokens = await refreshAccessToken(ONEDRIVE_REFRESH_TOKEN);
  // Update env vars or store in database
}
```

## Troubleshooting

### "Invalid token"
- Access token expired (get new one using refresh token)
- Token doesn't have right permissions

### "Webhook failed to validate"
- Webhook URL not publicly accessible
- Response is not returning validation token

### "File not found"
- Check file path includes "Xbox Game DVR"
- Make sure file is actually in OneDrive

### "Subscription expired"
- Subscriptions last 24 hours
- You need to renew them periodically (or set longer expiry)

## Notes

- Tokens are sensitive — never commit `.env` file
- Access tokens: valid for ~1 hour
- Refresh tokens: valid for ~90 days
- Subscriptions: expire after time specified (set to 24 hours above)
- You may need to manually refresh subscription daily or weekly

## Cost Comparison

- **Make.com:** $10+/month (paid plan)
- **OneDrive Webhook:** FREE (uses Microsoft Graph API)
- **Your backend:** Already running on Vercel (free)

Total: **$0** (just add env variables)