# UFC5 CMS - Backend API

Complete video CMS for UFC5 fight recordings with AWS S3 backend.

## Environment Variables Required

Create a `.env` file in the root directory with these variables:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=ufc5-fights-yourname
S3_FOLDER_PATH=gamingclips
NODE_ENV=development
PORT=3000
```

### Where to Get These Values

**AWS_REGION**
- Your AWS region (e.g., `us-east-1`, `us-west-2`)

**AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY**
- Go to AWS Console → IAM → Users
- Select your IAM user
- Go to "Security credentials" tab
- Under "Access keys", click "Create access key"
- Copy both values

**S3_BUCKET_NAME**
- Your S3 bucket name (e.g., `ufc5-fights-yourname`)

**S3_FOLDER_PATH**
- Folder in S3 where videos are stored (e.g., `gamingclips`)

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file** with values above

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Server runs at:** `http://localhost:3000`

## API Endpoints

### GET /api/health
Health check endpoint
```bash
curl http://localhost:3000/api/health
```

### GET /api/videos
List all videos in S3 bucket
```bash
curl http://localhost:3000/api/videos
```

Response:
```json
[
  {
    "key": "gamingclips/UFC5_Fight_001.mp4",
    "filename": "UFC5_Fight_001.mp4",
    "size_bytes": 245000000,
    "last_modified": "2025-03-19T14:30:00.000Z",
    "url": "/api/video-url?key=gamingclips/UFC5_Fight_001.mp4"
  }
]
```

### GET /api/video-url?key=FILE_KEY
Get presigned URL for specific video (expires in 1 hour)
```bash
curl "http://localhost:3000/api/video-url?key=gamingclips/UFC5_Fight_001.mp4"
```

Response:
```json
{
  "url": "https://s3.amazonaws.com/bucket/file?X-Amz-Algorithm=..."
}
```

### GET /api/videos/:filename
Get metadata for specific video
```bash
curl "http://localhost:3000/api/videos/UFC5_Fight_001.mp4"
```

## Deployment to Vercel

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "UFC5 CMS with Express backend"
   git push origin main
   ```

2. **Go to Vercel.com:**
   - Connect GitHub account
   - Select repository
   - Click "Deploy"

3. **Set Environment Variables in Vercel:**
   - In Vercel project settings → Environment Variables
   - Add all values from `.env`

4. **Redeploy** after adding env vars

## File Structure

```
├── api/
│   └── index.js           # Express server (Vercel serverless function)
├── public/
│   └── index.html         # Frontend (connects to /api)
├── package.json           # Dependencies
├── vercel.json            # Vercel configuration
├── .env.example           # Environment variables template
├── .gitignore             # Ignore sensitive files
└── README.md              # This file
```

## How It Works

1. **User opens `index.html`** in browser
2. **Frontend calls `/api/videos`** to list videos
3. **Backend connects to S3** using AWS credentials from env vars
4. **Backend returns video list** (credentials never exposed to frontend)
5. **User clicks video** → Frontend calls `/api/video-url`
6. **Backend generates presigned URL** (1 hour expiry)
7. **Frontend plays video** using presigned URL

## Security

- ✅ AWS credentials stored in server environment variables (hidden from client)
- ✅ Frontend never sees AWS credentials
- ✅ Presigned URLs expire after 1 hour
- ✅ Video access limited to S3 folder path specified in env vars
- ✅ All requests go through backend (can add authentication here if needed)

## Troubleshooting

### "S3_BUCKET_NAME not configured"
- Add `S3_BUCKET_NAME` to `.env`
- For Vercel, add to Environment Variables in project settings

### "Access Denied"
- Check IAM user has S3 permissions
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are correct

### "The specified bucket does not exist"
- Check bucket name spelling
- Bucket must exist in the region specified in `AWS_REGION`

### Videos not showing up
- Check `S3_FOLDER_PATH` matches where videos are stored
- Verify videos exist in S3 bucket

## Costs

- S3 storage: ~$2-3/month
- S3 API requests: ~$0.0004 per 10k requests (very cheap)
- Vercel hosting: FREE (up to 100GB bandwidth/month)

Total: **~$5/month**