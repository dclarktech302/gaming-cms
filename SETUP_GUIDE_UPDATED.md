# OneDrive to S3 Sync - Updated Setup Guide (MSAL)

🎉 **Your implementation now uses Microsoft's official MSAL library with PKCE security!**

---

## Quick Start

### Step 1: Get Authorization URL

Call this endpoint to get the OAuth URL:

```bash
curl https://gaming-cms.vercel.app/api/oauth/authorize-url
```

**Response:**
```json
{
  "authUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...",
  "message": "Visit this URL to authorize OneDrive access",
  "note": "This URL includes PKCE for enhanced security"
}
```

### Step 2: Visit the Authorization URL

1. Copy the `authUrl` from the response
2. Visit it in your browser
3. Sign in with your Microsoft account
4. Accept the permissions

### Step 3: Complete OAuth Callback

You'll be redirected to:
```
https://gaming-cms.vercel.app/api/oauth/callback?code=...
```

The page will show your tokens. Copy them.

### Step 4: Add Tokens to Vercel

Go to Vercel → Project Settings → Environment Variables:

```
ONEDRIVE_ACCESS_TOKEN=<your_token>
ONEDRIVE_REFRESH_TOKEN=<your_refresh_token>
```

### Step 5: Create Webhook Subscription

```bash
curl -X POST https://gaming-cms.vercel.app/api/webhook/setup-onedrive
```

**Done!** Your OneDrive → S3 sync is now active.

---

## What's Different? (MSAL vs Manual OAuth)

### Before (Manual Implementation)
- ❌ Manual token refresh logic
- ❌ No PKCE security
- ❌ Complex error handling
- ❌ Token management in main code

### After (MSAL Implementation)
- ✅ Automatic token refresh
- ✅ PKCE included automatically
- ✅ Built-in error handling
- ✅ Clean separation of concerns

---

## API Endpoints

### 1. Get Authorization URL
```
GET /api/oauth/authorize-url
```

Returns the OAuth URL with PKCE parameters.

### 2. OAuth Callback
```
GET /api/oauth/callback?code=<authorization_code>
```

Exchanges authorization code for tokens using MSAL.

### 3. Setup Webhook
```
POST /api/webhook/setup-onedrive
```

Creates OneDrive webhook subscription for Xbox Game DVR folder.

### 4. List Subscriptions
```
GET /api/webhook/list-subscriptions
```

Shows all active webhook subscriptions.

### 5. Delete Subscription
```
DELETE /api/webhook/subscription/:id
```

Removes a webhook subscription.

### 6. Webhook Receiver
```
POST /api/webhook/onedrive
```

Receives OneDrive change notifications (called by Microsoft).

---

## Environment Variables

Required in `.env` and Vercel:

```bash
# Azure App Registration
ONEDRIVE_CLIENT_ID=
ONEDRIVE_CLIENT_SECRET=
ONEDRIVE_TENANT_ID=common
ONEDRIVE_REDIRECT_URI=https://gaming-cms.vercel.app/api/oauth/callback

# Webhook Security
WEBHOOK_SECRET=gaming-cms-onedrive-webhook-secret-2024

# Tokens (populated after OAuth)
ONEDRIVE_ACCESS_TOKEN=
ONEDRIVE_REFRESH_TOKEN=

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your_key>
AWS_SECRET_ACCESS_KEY=<your_secret>
S3_BUCKET_NAME=<your_bucket>
S3_FOLDER_PATH=gamingclips
```

---

## How It Works

```
┌─────────────┐
│   Xbox      │ Records UFC5 fight
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  OneDrive   │ Xbox uploads to Videos/Xbox Game DVR
└──────┬──────┘
       │
       │ Webhook notification
       ▼
┌─────────────┐
│ Your API    │ POST /api/webhook/onedrive
└──────┬──────┘
       │
       ├─▶ Download from OneDrive (MSAL auth)
       │
       ├─▶ Upload to S3
       │
       └─▶ Delete from OneDrive (optional)
```

---

## Security Features

### ✅ MSAL (Microsoft Authentication Library)
- Official Microsoft library
- Automatic token management
- Built-in security best practices

### ✅ PKCE (Proof Key for Code Exchange)
- Protects against authorization code interception
- Automatically included in auth URLs
- Required by modern OAuth 2.0

### ✅ Automatic Token Refresh
- MSAL checks token expiration
- Refreshes automatically when needed
- No manual token management

### ✅ Webhook Validation
- `clientState` validates notification source
- Rejects unauthorized notifications
- Prevents spoofing attacks

### ✅ HTTPS Everywhere
- Enforced by Vercel
- TLS encryption for all requests
- Secure token transmission

---

## Testing

### 1. Test Authorization
```bash
curl https://gaming-cms.vercel.app/api/oauth/authorize-url
```

### 2. Test Webhook Setup
```bash
curl -X POST https://gaming-cms.vercel.app/api/webhook/setup-onedrive
```

### 3. Test Subscription List
```bash
curl https://gaming-cms.vercel.app/api/webhook/list-subscriptions
```

### 4. Manual File Sync Test
1. Upload a video to `Videos/Xbox Game DVR` in OneDrive
2. Check server logs for webhook notification
3. Verify file appears in S3 bucket

---

## Troubleshooting

### "No valid token available"
**Solution:** Complete OAuth flow first:
1. GET `/api/oauth/authorize-url`
2. Visit the URL
3. Add tokens to Vercel environment variables
4. Redeploy

### "Xbox Game DVR folder not found"
**Solution:** Create the folder in OneDrive:
```
Videos/Xbox Game DVR
```

### "Invalid clientState"
**Solution:** Verify `WEBHOOK_SECRET` matches in:
- `.env` file
- Vercel environment variables
- Webhook subscription

### Token Refresh Fails
**Solution:** MSAL handles this automatically. If it fails:
1. Check `ONEDRIVE_REFRESH_TOKEN` is set
2. Refresh token may be expired (90 days)
3. Re-run OAuth flow to get new tokens

---

## Files Modified

1. **[api/auth-config.js](api/auth-config.js)** (NEW)
   - MSAL configuration
   - Token management
   - Auto-refresh logic

2. **[api/index.js](api/index.js)** (UPDATED)
   - Uses MSAL for all auth
   - Simplified token handling
   - Better error handling

3. **[.env](.env)** (UPDATED)
   - Added MSAL-specific variables
   - Organized sections

4. **[package.json](package.json)** (UPDATED)
   - Added `@azure/msal-node`
   - Updated dependencies

---

## Deployment Checklist

- [ ] Install dependencies: `npm install`
- [ ] Set environment variables in Vercel
- [ ] Deploy to Vercel: `git push`
- [ ] Get auth URL: `GET /api/oauth/authorize-url`
- [ ] Complete OAuth flow
- [ ] Add tokens to Vercel
- [ ] Redeploy with tokens
- [ ] Create webhook subscription
- [ ] Test with manual file upload

---

## Documentation

- [SECURITY_BEST_PRACTICES.md](SECURITY_BEST_PRACTICES.md) - Detailed security analysis
- [ONEDRIVE_SETUP_COMPLETE.md](ONEDRIVE_SETUP_COMPLETE.md) - Original setup guide
- [OneDrive Webhook Setup Guide.MD](OneDrive Webhook Setup Guide.MD) - Step-by-step instructions

---

## Cost

**FREE!** 🎉

- Microsoft Graph API: Free for personal use
- Vercel: Free tier
- AWS S3: Pay only for storage/bandwidth

vs. Make.com: $10+/month

---

Ready to sync! 🎮 → ☁️ → 🪣
