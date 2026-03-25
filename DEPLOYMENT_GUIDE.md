# Deployment Guide - Gaming CMS to Vercel

## ✅ Code is Ready to Deploy!

Your code has been successfully pushed to GitHub without secrets. Now you need to deploy to Vercel.

---

## Option 1: Deploy via Vercel Dashboard (Recommended)

### Step 1: Go to Vercel

Visit [vercel.com](https://vercel.com) and sign in.

### Step 2: Import Project

1. Click **"Add New..."** → **"Project"**
2. Select **"Import Git Repository"**
3. Choose your GitHub repo: `dclarktech302/gaming-cms`
4. Click **"Import"**

### Step 3: Configure Project

**Framework Preset:** Other
**Root Directory:** `./`
**Build Command:** (leave empty)
**Output Directory:** (leave empty)

### Step 4: Add Environment Variables

Click **"Environment Variables"** and add:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your_aws_key>
AWS_SECRET_ACCESS_KEY=<your_aws_secret>
S3_BUCKET_NAME=<your_bucket_name>
S3_FOLDER_PATH=gamingclips

ONEDRIVE_CLIENT_ID=<your_client_id>
ONEDRIVE_CLIENT_SECRET=<your_client_secret>
ONEDRIVE_TENANT_ID=common
ONEDRIVE_REDIRECT_URI=https://gaming-cms.vercel.app/api/oauth/callback
WEBHOOK_SECRET=gaming-cms-onedrive-webhook-secret-2024

NODE_ENV=prod
PORT=3000
```

**IMPORTANT:** You'll add `ONEDRIVE_ACCESS_TOKEN` and `ONEDRIVE_REFRESH_TOKEN` later after OAuth flow.

### Step 5: Deploy

Click **"Deploy"**

Vercel will deploy your app. Note the deployment URL (should be `gaming-cms.vercel.app`).

---

## Option 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login

```bash
vercel login
```

### Step 3: Deploy

```bash
cd ~/gaming-cms
vercel
```

Follow the prompts:
- **Set up and deploy?** Y
- **Which scope?** Your account
- **Link to existing project?** N (first time) or Y (subsequent)
- **Project name?** gaming-cms
- **Directory?** `./`
- **Want to override settings?** N

### Step 4: Add Environment Variables

```bash
vercel env add ONEDRIVE_CLIENT_ID
# Enter value when prompted

vercel env add ONEDRIVE_CLIENT_SECRET
# Enter value when prompted

# Repeat for all variables...
```

Or add them via Vercel Dashboard → Project Settings → Environment Variables.

### Step 5: Deploy to Production

```bash
vercel --prod
```

---

## After Deployment

### Step 1: Complete OAuth Flow

1. Get authorization URL:
```bash
curl https://gaming-cms.vercel.app/api/oauth/authorize-url
```

2. Visit the `authUrl` in your browser
3. Sign in with Microsoft account
4. Accept permissions
5. Copy the tokens from the callback page

### Step 2: Add Tokens to Vercel

Go to Vercel Dashboard → Project Settings → Environment Variables:

Add:
- `ONEDRIVE_ACCESS_TOKEN` = <your_access_token>
- `ONEDRIVE_REFRESH_TOKEN` = <your_refresh_token>

### Step 3: Redeploy

Vercel will auto-redeploy when you add env vars.

Or manually:
```bash
vercel --prod
```

### Step 4: Create Webhook Subscription

```bash
curl -X POST https://gaming-cms.vercel.app/api/webhook/setup-onedrive
```

**Expected response:**
```json
{
  "success": true,
  "message": "Webhook subscription created successfully",
  "subscription": {
    "id": "...",
    "resource": "/me/drive/items/...",
    "changeType": "created,updated",
    "expirationDateTime": "...",
    "notificationUrl": "https://gaming-cms.vercel.app/api/webhook/onedrive"
  },
  "note": "Subscription will expire in 24 hours..."
}
```

---

## Testing

### Test API Health
```bash
curl https://gaming-cms.vercel.app/api/health
```

Expected: `{"status":"ok"}`

### Test OAuth URL Generation
```bash
curl https://gaming-cms.vercel.app/api/oauth/authorize-url
```

Expected: JSON with `authUrl`

### Test Webhook Setup
```bash
curl -X POST https://gaming-cms.vercel.app/api/webhook/setup-onedrive
```

Expected: Success message with subscription details

### Test Full Flow

1. Upload a video to OneDrive → `Videos/Xbox Game DVR`
2. Check Vercel logs for webhook notification
3. Check S3 bucket for synced file

---

## Troubleshooting

### "DEPLOYMENT_NOT_FOUND"
→ Project not deployed to Vercel yet. Follow Option 1 or 2 above.

### "No access token available"
→ Complete OAuth flow and add tokens to environment variables.

### Webhook validation fails
→ Ensure `WEBHOOK_SECRET` is set in Vercel environment variables.

### Changes not deploying
→ Vercel auto-deploys on git push. Check Vercel dashboard for deployment status.

---

## Vercel Configuration

Your project uses these Vercel settings:

- **Framework:** None (Express.js serverless)
- **Node Version:** 20.x (or latest)
- **Build Command:** None (no build step)
- **Output Directory:** None
- **Install Command:** `npm install`

---

## Environment Variables Checklist

Before deploying, ensure you have:

- [ ] `AWS_REGION`
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `S3_BUCKET_NAME`
- [ ] `S3_FOLDER_PATH`
- [ ] `ONEDRIVE_CLIENT_ID` (from Azure)
- [ ] `ONEDRIVE_CLIENT_SECRET` (from Azure)
- [ ] `ONEDRIVE_TENANT_ID` (usually "common")
- [ ] `ONEDRIVE_REDIRECT_URI`
- [ ] `WEBHOOK_SECRET`

After OAuth flow:
- [ ] `ONEDRIVE_ACCESS_TOKEN`
- [ ] `ONEDRIVE_REFRESH_TOKEN`

---

## Next Steps

1. ✅ Code pushed to GitHub (no secrets)
2. ⏳ Deploy to Vercel (follow Option 1 or 2)
3. ⏳ Add environment variables
4. ⏳ Complete OAuth flow
5. ⏳ Add tokens to Vercel
6. ⏳ Create webhook subscription
7. ⏳ Test with Xbox clip upload

---

**Your code is secure and ready to deploy! 🚀**
