import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import crypto from 'node:crypto';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const PRESIGN_EXPIRES_SECONDS = 300; // 5 minutes

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    this.s3 = new S3Client({
      region: this.config.getOrThrow('S3_REGION'),
      credentials: {
        accessKeyId: this.config.getOrThrow('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow('S3_SECRET_ACCESS_KEY'),
      },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
    this.bucket = this.config.getOrThrow('S3_BUCKET');
  }

  async presignAvatar(userId: string, contentType: string): Promise<{ url: string; fields: Record<string, string>; key: string }> {
    const ext = MIME_TO_EXT[contentType];
    const key = `avatars/${userId}/${crypto.randomUUID()}.${ext}`;

    const { url, fields } = await createPresignedPost(this.s3, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 1, MAX_SIZE_BYTES],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: { 'Content-Type': contentType },
      Expires: PRESIGN_EXPIRES_SECONDS,
    });

    return { url, fields, key };
  }
}
