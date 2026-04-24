import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';

// ─── Configuration ────────────────────────────────────────────────────────────────

const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL; // Public CDN URL (e.g. Cloudflare R2 public dev URL)

if (!S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
  logger.error('S3 configuration is missing. Please check S3_BUCKET, S3_ACCESS_KEY, and S3_SECRET_KEY environment variables.');
}

const s3Client = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY!,
    secretAccessKey: S3_SECRET_KEY!,
  },
});

// ─── Service ──────────────────────────────────────────────────────────────────────

export async function uploadFile(
  path: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: path,
        Body: buffer,
        ContentType: contentType,
        // Make the object public if the bucket doesn't have a public-read policy
        // ACL: 'public-read',
      }),
    );

    const baseUrl = S3_PUBLIC_URL || S3_ENDPOINT || `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;
    return `${baseUrl}/${path}`;
  } catch (error) {
    logger.error('S3 upload failed', { path, error });
    throw new AppError(500, 'Failed to upload file to storage');
  }
}

export async function deleteFile(url: string): Promise<void> {
  try {
    // Extract key from URL
    const baseUrl = S3_ENDPOINT || `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com`;
    const key = url.replace(`${baseUrl}/`, '');

    if (!key || key === url) {
      // If it's not our S3 URL, it might be an old Vercel Blob URL or a placeholder
      if (url.includes('vercel-storage.com')) {
        logger.warn('Attempted to delete a Vercel Blob file via S3 service. Skipping.');
        return;
      }
      logger.warn('Invalid S3 URL provided for deletion', { url });
      return;
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }),
    );
  } catch (error) {
    logger.error('S3 deletion failed', { url, error });
    // We don't necessarily throw here to avoid blocking the database deletion
  }
}
