const express = require('express');
const cors = require('cors');
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Client } = require('@microsoft/microsoft-graph-client');
const axios = require('axios');
const { getAccessToken, exchangeCodeForTokens, getAuthCodeUrl } = require('./auth-config.js');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static('public'));

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const S3_BUCKET = process.env.S3_BUCKET_NAME;
const S3_FOLDER = process.env.S3_FOLDER_PATH || 'gamingclips';

// OneDrive Configuration
const ONEDRIVE_REDIRECT_URI = process.env.ONEDRIVE_REDIRECT_URI;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Helper function to get Microsoft Graph client with automatic token refresh
async function getGraphClient() {
  const token = await getAccessToken();
  return Client.init({
    authProvider: (done) => {
      done(null, token);
    }
  });
}

// Helper function to download file from OneDrive
async function downloadFromOneDrive(itemId) {
  try {
    const client = await getGraphClient();
    const downloadUrl = await client.api(`/me/drive/items/${itemId}`).get();

    const response = await axios.get(downloadUrl['@microsoft.graph.downloadUrl'], {
      responseType: 'arraybuffer'
    });

    return {
      buffer: response.data,
      filename: downloadUrl.name,
      contentType: response.headers['content-type']
    };
  } catch (error) {
    console.error('Error downloading from OneDrive:', error.message);
    throw error;
  }
}

// Helper function to upload file to S3
async function uploadToS3(buffer, filename, contentType) {
  try {
    const key = S3_FOLDER ? `${S3_FOLDER}/${filename}` : filename;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType
    });

    await s3Client.send(command);
    console.log(`File uploaded to S3: ${key}`);
    return key;
  } catch (error) {
    console.error('Error uploading to S3:', error.message);
    throw error;
  }
}

// Helper function to delete file from OneDrive
async function deleteFromOneDrive(itemId) {
  try {
    const client = await getGraphClient();
    await client.api(`/me/drive/items/${itemId}`).delete();
    console.log(`File deleted from OneDrive: ${itemId}`);
  } catch (error) {
    console.error('Error deleting from OneDrive:', error.message);
    throw error;
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Generate OAuth Authorization URL
app.get('/api/oauth/authorize-url', async (_req, res) => {
  try {
    const authUrl = await getAuthCodeUrl(ONEDRIVE_REDIRECT_URI);
    res.json({
      authUrl: authUrl,
      message: 'Visit this URL to authorize OneDrive access',
      note: 'This URL includes PKCE for enhanced security'
    });
  } catch (error) {
    console.error('Error generating auth URL:', error.message);
    res.status(500).json({
      error: 'Failed to generate authorization URL',
      details: error.message
    });
  }
});

// OAuth Callback Endpoint
app.get('/api/oauth/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code not provided' });
    }

    // Exchange authorization code for tokens using MSAL
    const tokens = await exchangeCodeForTokens(code, ONEDRIVE_REDIRECT_URI);

    console.log('OAuth successful! Tokens obtained via MSAL.');

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>OneDrive Authorization Successful</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { color: #28a745; }
            code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; word-break: break-all; display: block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1 class="success">✓ Authorization Successful!</h1>
          <p>Your OneDrive has been successfully connected to Gaming CMS using MSAL (Microsoft Authentication Library).</p>
          <h3>Next Steps:</h3>
          <ol>
            <li>Add these tokens to your Vercel environment variables:</li>
          </ol>
          <p><strong>ONEDRIVE_ACCESS_TOKEN:</strong></p>
          <code>${tokens.accessToken.substring(0, 50)}...</code>
          <p><strong>ONEDRIVE_REFRESH_TOKEN:</strong></p>
          <code>${tokens.refreshToken ? tokens.refreshToken.substring(0, 50) + '...' : 'Not available'}</code>
          <p>Token expires at: ${tokens.expiresOn ? new Date(tokens.expiresOn).toLocaleString() : 'Unknown'}</p>
          <p><a href="/">Return to Gaming CMS</a></p>
        </body>
      </html>
    `);

  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to exchange authorization code for tokens',
      details: error.response?.data || error.message
    });
  }
});

// OneDrive Webhook Endpoint
app.post('/api/webhook/onedrive', async (req, res) => {
  try {
    const { validationToken } = req.query;

    // Handle webhook validation
    if (validationToken) {
      console.log('Webhook validation requested');
      return res.status(200).send(validationToken);
    }

    // Handle notification
    const notifications = req.body.value;

    if (!notifications || notifications.length === 0) {
      return res.status(200).json({ message: 'No notifications' });
    }

    console.log(`Received ${notifications.length} notification(s)`);

    // Process each notification
    for (const notification of notifications) {
      // Verify webhook secret
      if (notification.clientState !== WEBHOOK_SECRET) {
        console.error('Invalid clientState - possible security issue');
        continue;
      }

      const resourceData = notification.resourceData;
      const itemId = resourceData.id;

      console.log(`Processing file change: ${itemId}`);

      try {
        // Download from OneDrive (getGraphClient will auto-refresh token if needed)
        const { buffer, filename, contentType } = await downloadFromOneDrive(itemId);

        // Upload to S3
        const s3Key = await uploadToS3(buffer, filename, contentType);

        // Delete from OneDrive (optional - comment out if you want to keep files)
        await deleteFromOneDrive(itemId);

        console.log(`Successfully synced: ${filename} -> ${s3Key}`);

      } catch (error) {
        console.error(`Error processing notification for ${itemId}:`, error.message);
        // MSAL handles token refresh automatically, so we just log the error
      }
    }

    res.status(202).json({ message: 'Notifications processed' });

  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Setup OneDrive Webhook Subscription
app.post('/api/webhook/setup-onedrive', async (req, res) => {
  try {
    // Get the OneDrive folder to monitor (Xbox Game DVR folder)
    // getGraphClient will throw error if no token available
    const client = await getGraphClient();

    // Find or create the "Videos/Xbox Game DVR" folder
    let folderId;
    try {
      const folder = await client.api('/me/drive/root:/Videos/Xbox Game DVR').get();
      folderId = folder.id;
      console.log('Found Xbox Game DVR folder:', folderId);
    } catch (error) {
      return res.status(404).json({
        error: 'Xbox Game DVR folder not found',
        message: 'Please ensure the folder "Videos/Xbox Game DVR" exists in your OneDrive'
      });
    }

    // Create webhook subscription
    const expirationDateTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
    const notificationUrl = req.body.notificationUrl || 'https://gaming-cms.vercel.app/api/webhook/onedrive';

    const subscription = {
      changeType: 'created,updated',
      notificationUrl: notificationUrl,
      resource: `/me/drive/items/${folderId}`,
      expirationDateTime: expirationDateTime,
      clientState: WEBHOOK_SECRET
    };

    const result = await client.api('/subscriptions').post(subscription);

    console.log('Webhook subscription created:', result.id);

    res.json({
      success: true,
      message: 'Webhook subscription created successfully',
      subscription: {
        id: result.id,
        resource: result.resource,
        changeType: result.changeType,
        expirationDateTime: result.expirationDateTime,
        notificationUrl: result.notificationUrl
      },
      note: 'Subscription will expire in 24 hours. You may need to renew it periodically.'
    });

  } catch (error) {
    console.error('Error setting up webhook:', error.response?.data || error.message);

    // Check if authentication error
    if (error.message?.includes('No valid token available')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please complete OAuth flow first by visiting the authorization URL'
      });
    }

    res.status(500).json({
      error: 'Failed to setup webhook subscription',
      details: error.response?.data || error.message
    });
  }
});

// List active OneDrive subscriptions
app.get('/api/webhook/list-subscriptions', async (req, res) => {
  try {
    const client = await getGraphClient();
    const subscriptions = await client.api('/subscriptions').get();

    res.json({
      count: subscriptions.value.length,
      subscriptions: subscriptions.value
    });

  } catch (error) {
    console.error('Error listing subscriptions:', error.message);
    res.status(500).json({
      error: 'Failed to list subscriptions',
      details: error.message
    });
  }
});

// Delete OneDrive subscription
app.delete('/api/webhook/subscription/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const client = await getGraphClient();
    await client.api(`/subscriptions/${id}`).delete();

    res.json({
      success: true,
      message: `Subscription ${id} deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting subscription:', error.message);
    res.status(500).json({
      error: 'Failed to delete subscription',
      details: error.message
    });
  }
});

app.get('/api/test-video/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const fullKey = S3_FOLDER ? `${S3_FOLDER}/${key}` : key;

    // First, get object metadata using HeadObject
    const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
    const headCommand = new HeadObjectCommand({
      Bucket: S3_BUCKET,
      Key: fullKey
    });

    const metadata = await s3Client.send(headCommand);

    // Generate presigned URL
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: fullKey
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    res.json({
      message: 'Test URL generated',
      key: fullKey,
      url: url,
      metadata: {
        contentType: metadata.ContentType,
        contentLength: metadata.ContentLength,
        acceptRanges: metadata.AcceptRanges,
        lastModified: metadata.LastModified
      },
      instructions: 'Copy this URL and paste it directly in your browser to test if it works'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

app.get('/api/video-url', async (req, res) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({ error: 'key parameter required' });
    }

    if (!S3_BUCKET) {
      return res.status(500).json({ error: 'S3_BUCKET_NAME not configured' });
    }

    if (S3_FOLDER && !key.startsWith(S3_FOLDER + '/')) {
      return res.status(403).json({ error: 'Access denied to this file' });
    }

    // Generate presigned URL without ResponseContentType
    // This allows the browser to make range requests
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });

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

module.exports = app;