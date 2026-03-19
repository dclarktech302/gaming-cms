// api/index.js - Main Express server for Vercel
import express from 'express';
import cors from 'cors';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from public directory
app.use(express.static('public'));

// Validate environment variables
const requiredEnvVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET_NAME',
  'S3_FOLDER_PATH'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`Warning: ${varName} environment variable is not set`);
  }
});

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const S3_BUCKET = process.env.S3_BUCKET_NAME;
const S3_FOLDER = process.env.S3_FOLDER_PATH || 'gamingclips';

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// List all videos in S3 bucket
app.get('/api/videos', async (req, res) => {
  try {
    if (!S3_BUCKET) {
      return res.status(500).json({ error: 'S3_BUCKET_NAME not configured' });
    }

    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: S3_FOLDER ? S3_FOLDER + '/' : ''
    });

    const response = await s3Client.send(command);

    if (!response.Contents) {
      return res.json([]);
    }

    // Filter out folders, extract metadata
    const videos = response.Contents
      .filter(item => !item.Key.endsWith('/'))
      .map(item => ({
        key: item.Key,
        filename: item.Key.split('/').pop(),
        size_bytes: item.Size,
        last_modified: item.LastModified,
        url: `/api/video-url?key=${encodeURIComponent(item.Key)}`
      }))
      .sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified));

    res.json(videos);

  } catch (error) {
    console.error('Error listing videos:', error);
    res.status(500).json({ 
      error: 'Failed to list videos',
      message: error.message 
    });
  }
});

// Get presigned URL for a specific video
app.get('/api/video-url', async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'key parameter required' });
    }

    if (!S3_BUCKET) {
      return res.status(500).json({ error: 'S3_BUCKET_NAME not configured' });
    }

    // Validate key is within allowed folder
    if (S3_FOLDER && !key.startsWith(S3_FOLDER + '/')) {
      return res.status(403).json({ error: 'Access denied to this file' });
    }

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });

    // Generate presigned URL valid for 1 hour
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({ url });

  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate video URL',
      message: error.message 
    });
  }
});

// Get single video metadata
app.get('/api/videos/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const key = S3_FOLDER ? `${S3_FOLDER}/${filename}` : filename;

    if (!S3_BUCKET) {
      return res.status(500).json({ error: 'S3_BUCKET_NAME not configured' });
    }

    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: key
    });

    const response = await s3Client.send(command);

    if (!response.Contents || response.Contents.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const item = response.Contents[0];
    const videoUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: item.Key
      }),
      { expiresIn: 3600 }
    );

    res.json({
      filename: item.Key.split('/').pop(),
      key: item.Key,
      size_bytes: item.Size,
      last_modified: item.LastModified,
      url: videoUrl
    });

  } catch (error) {
    console.error('Error fetching video metadata:', error);
    res.status(500).json({ 
      error: 'Failed to fetch video',
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// For Vercel serverless
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}