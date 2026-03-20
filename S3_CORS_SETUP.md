# S3 CORS Configuration Guide

Your videos are showing but not playing because your S3 bucket needs CORS (Cross-Origin Resource Sharing) configuration to allow browsers to load video files.

## How to Configure S3 CORS

### Option 1: Using AWS Console

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click on your bucket name
3. Go to the **Permissions** tab
4. Scroll down to **Cross-origin resource sharing (CORS)**
5. Click **Edit**
6. Paste the following CORS configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": [
            "ETag",
            "Content-Length",
            "Content-Type",
            "Content-Range",
            "Accept-Ranges"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

**IMPORTANT**: The `Content-Range` and `Accept-Ranges` headers are **required** for video playback to support seeking and range requests. Without these, you'll get 416 errors.

7. Click **Save changes**

### Option 2: Using AWS CLI

```bash
aws s3api put-bucket-cors --bucket YOUR_BUCKET_NAME --cors-configuration file://cors.json
```

Create a file named `cors.json` with the content above.

### Option 3: More Restrictive (Recommended for Production)

If you want to allow only your domain:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "GET",
            "HEAD"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://yourdomain.com"
        ],
        "ExposeHeaders": [
            "ETag",
            "Content-Length",
            "Content-Type",
            "Content-Range",
            "Accept-Ranges"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

## Testing

After configuring CORS:

1. Restart your server
2. Refresh your browser
3. Try playing a video
4. Check browser console (F12) for any remaining errors

## Additional Notes

- The `AllowedOrigins: ["*"]` allows all domains (good for testing, but restrict in production)
- `AllowedMethods` includes GET and HEAD which are needed for video streaming
- `ExposeHeaders` allows the browser to read important response headers
- `MaxAgeSeconds` caches the CORS preflight request for better performance

## Still Not Working?

If videos still don't play after CORS configuration, check:

1. **Video codec**: Run `ffmpeg -i yourfile.mp4` to check codec (should be H.264)
2. **File permissions**: Ensure files are accessible (not blocked by bucket policy)
3. **Browser console**: Check for specific error messages
4. **Direct URL test**: Use the `/api/test-video/:filename` endpoint to get a direct URL and test in browser
