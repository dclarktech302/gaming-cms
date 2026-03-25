# OneDrive to S3 Sync 🎮 → ☁️ → 🪣

Automatically sync Xbox Game DVR clips from OneDrive to AWS S3 using Microsoft Graph webhooks.

## 🎯 Features

- ✅ **Automatic sync** - Xbox clips automatically upload to S3
- ✅ **MSAL authentication** - Microsoft's official library with PKCE security
- ✅ **Auto token refresh** - No manual token management needed
- ✅ **Webhook notifications** - Real-time file change detection
- ✅ **Secure** - Follows Microsoft best practices (2025)

## 🚀 Quick Start

### 1. Get Authorization URL
```bash
curl https://gaming-cms.vercel.app/api/oauth/authorize-url
```

### 2. Visit URL & Authorize
Click the returned URL and sign in with your Microsoft account.

### 3. Add Tokens to Vercel
Copy tokens from callback page to Vercel environment variables.

### 4. Setup Webhook
```bash
curl -X POST https://gaming-cms.vercel.app/api/webhook/setup-onedrive
```

**Done!** Record a fight in UFC5, and it automatically appears in your S3 bucket.

## 📚 Documentation

- **[SETUP_GUIDE_UPDATED.md](SETUP_GUIDE_UPDATED.md)** - Complete setup instructions
- **[SECURITY_BEST_PRACTICES.md](SECURITY_BEST_PRACTICES.md)** - Security details
- **[IMPROVEMENTS_SUMMARY.md](IMPROVEMENTS_SUMMARY.md)** - What changed and why

## 🔒 Security

- ✅ **MSAL** - Microsoft Authentication Library
- ✅ **PKCE** - Proof Key for Code Exchange
- ✅ **Auto-refresh** - Automatic token management
- ✅ **Webhook validation** - clientState verification
- ✅ **HTTPS** - Enforced everywhere

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Xbox Console                              │
│                  (Records UFC5 gameplay)                          │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            │ Auto-upload
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                    OneDrive (Cloud Storage)                       │
│                  Videos/Xbox Game DVR folder                      │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            │ Webhook notification
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│              Your Express API (Vercel Serverless)                 │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  POST /api/webhook/onedrive                              │    │
│  │  1. Validate clientState                                 │    │
│  │  2. Get access token (MSAL auto-refresh)                 │    │
│  │  3. Download file from OneDrive                          │    │
│  │  4. Upload file to S3                                    │    │
│  │  5. Delete file from OneDrive (optional)                 │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            │ Upload
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                      AWS S3 Bucket                                │
│                  Your CMS displays videos                         │
└──────────────────────────────────────────────────────────────────┘
```

## 🔧 Tech Stack

- **Backend:** Express.js (Node.js)
- **Auth:** @azure/msal-node (MSAL)
- **API:** @microsoft/microsoft-graph-client
- **Storage:** AWS S3 (@aws-sdk/client-s3)
- **Hosting:** Vercel (Serverless)

## 📁 Project Structure

```
gaming-cms/
├── api/
│   ├── index.js           # Main Express app with endpoints
│   └── auth-config.js     # MSAL configuration & token management
├── .env                   # Environment variables (not in git)
├── package.json           # Dependencies
└── docs/
    ├── SETUP_GUIDE_UPDATED.md
    ├── SECURITY_BEST_PRACTICES.md
    └── IMPROVEMENTS_SUMMARY.md
```

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/oauth/authorize-url` | Get OAuth URL with PKCE |
| `GET` | `/api/oauth/callback` | OAuth callback handler |
| `POST` | `/api/webhook/onedrive` | Receive OneDrive notifications |
| `POST` | `/api/webhook/setup-onedrive` | Create webhook subscription |
| `GET` | `/api/webhook/list-subscriptions` | List active subscriptions |
| `DELETE` | `/api/webhook/subscription/:id` | Delete subscription |

## 🔑 Environment Variables

```bash
# Azure App Registration
ONEDRIVE_CLIENT_ID=your_client_id
ONEDRIVE_CLIENT_SECRET=your_client_secret
ONEDRIVE_TENANT_ID=common
ONEDRIVE_REDIRECT_URI=https://your-app.vercel.app/api/oauth/callback

# Webhook Security
WEBHOOK_SECRET=your_random_secret

# Tokens (from OAuth flow)
ONEDRIVE_ACCESS_TOKEN=
ONEDRIVE_REFRESH_TOKEN=

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=your_bucket
S3_FOLDER_PATH=gamingclips
```

## 🧪 Testing

```bash
# Test auth URL generation
curl https://gaming-cms.vercel.app/api/oauth/authorize-url

# Test webhook setup
curl -X POST https://gaming-cms.vercel.app/api/webhook/setup-onedrive

# List subscriptions
curl https://gaming-cms.vercel.app/api/webhook/list-subscriptions
```

## 🐛 Troubleshooting

**"No valid token available"**
→ Complete OAuth flow first

**"Xbox Game DVR folder not found"**
→ Create `Videos/Xbox Game DVR` folder in OneDrive

**"Invalid clientState"**
→ Check `WEBHOOK_SECRET` matches everywhere

**Token refresh fails**
→ MSAL handles this automatically; check refresh token is set

## 💰 Cost

**FREE!** 🎉
- Microsoft Graph API: Free (personal use)
- Vercel: Free tier
- AWS S3: Pay-per-use (pennies)

vs. Make.com: $10+/month

## 📖 Learn More

- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/)
- [MSAL Node](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-node)
- [OAuth 2.0 PKCE](https://oauth.net/2/pkce/)

## 📄 License

MIT

---

**Ready to sync your UFC5 clips automatically! 🎮⚡**
