import { S3Client, PutObjectCommand, HeadBucketCommand, GetObjectCommand, DeleteObjectCommand, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import 'dotenv/config';

// Expect environment variables set in .env:
// AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
// AWS_S3_BUCKET or AWS_S3_BUCKET_NAME (both supported)
// Optional: AWS_S3_BASE_URL or S3_BASE_URL (alias) if using CloudFront / custom domain

let s3; // lazily initialized
function getClient() {
  if (!s3) {
    const region = process.env.AWS_REGION;
    if (!region) throw new Error('AWS_REGION not set');
    s3 = new S3Client({
      region,
      credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      } : undefined,
    });
  }
  return s3;
}

export async function uploadBuffer({ buffer, mimeType, folder = 'threads', ext, userId }) {
  const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) throw new Error('Bucket not configured');
  const random = crypto.randomBytes(16).toString('hex');
  const safeExt = ext || mimeType?.split('/')?.[1] || 'bin';
  const key = `${folder}/${userId || 'anon'}/${Date.now()}-${random}.${safeExt}`;

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType
  });
  await getClient().send(cmd);
  const base = process.env.AWS_S3_BASE_URL || process.env.S3_BASE_URL || `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com`;
  const url = `${base}/${key}`;
  return { key, url };
}

export async function verifyS3Connection() {
  const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) {
    console.warn('[s3] Cannot verify: bucket env var missing');
    return { ok: false, error: 'NO_BUCKET' };
  }
  const start = Date.now();
  try {
    await getClient().send(new HeadBucketCommand({ Bucket: bucket }));
    const ms = Date.now() - start;
    console.log(`✅ S3 connected. Bucket '${bucket}' reachable in ${ms}ms (region=${process.env.AWS_REGION}).`);
    return { ok: true, bucket };
  } catch (err) {
    console.error('❌ S3 connection failed:', err.Code || err.name, err.message);
    return { ok: false, error: err.message };
  }
}

export async function getSignedMediaUrl(key, expiresIn = 3600) {
  const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) throw new Error('Bucket not configured');
  if (!key) throw new Error('Key required');
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return await getSignedUrl(getClient(), command, { expiresIn });
}

export async function deleteMediaKey(key) {
  if (!key) return;
  const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) throw new Error('Bucket not configured');
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function deleteMediaKeys(keys = []) {
  const bucket = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME;
  if (!bucket || !keys.length) return;
  if (keys.length === 1) return deleteMediaKey(keys[0]);
  const objects = keys.filter(Boolean).map(k => ({ Key: k }));
  await getClient().send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects } }));
}
