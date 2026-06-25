import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';

jest.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: jest.fn().mockResolvedValue({
    url: 'https://bucket.s3.amazonaws.com/',
    fields: { key: 'avatars/user-id/uuid.jpg', policy: 'mock-policy', 'Content-Type': 'image/jpeg' },
  }),
}));

const mockConfig = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, string> = {
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: 'test-key',
      S3_SECRET_ACCESS_KEY: 'test-secret',
      S3_BUCKET: 'test-bucket',
    };
    return values[key];
  }),
  get: jest.fn().mockReturnValue(undefined),
};

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadService, { provide: ConfigService, useValue: mockConfig }],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  describe('presignAvatar', () => {
    it('returns presigned post url, fields, and key for valid content type', async () => {
      const result = await service.presignAvatar('user-id', 'image/jpeg');

      expect(result.url).toBeDefined();
      expect(result.fields).toBeDefined();
      expect(result.key).toMatch(/^avatars\/user-id\/.+\.jpg$/);
    });

    it('uses correct extension for each supported mime type', async () => {
      const jpeg = await service.presignAvatar('user-id', 'image/jpeg');
      const png = await service.presignAvatar('user-id', 'image/png');
      const webp = await service.presignAvatar('user-id', 'image/webp');

      expect(jpeg.key).toMatch(/\.jpg$/);
      expect(png.key).toMatch(/\.png$/);
      expect(webp.key).toMatch(/\.webp$/);
    });
  });
});
