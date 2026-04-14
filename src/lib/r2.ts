import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export async function uploadToR2(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME || 'cefr-ready-audio';

  await r2.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const baseUrl = process.env.R2_PUBLIC_URL || 'https://pub-e915c92ac05f48ccabfe327469bf4599.r2.dev';
  // Standardize the URL (remove trailing slash if any, then append file)
  return `${baseUrl.replace(/\/$/, '')}/${fileName}`;
}
