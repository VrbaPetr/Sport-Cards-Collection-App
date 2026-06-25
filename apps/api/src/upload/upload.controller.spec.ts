import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from '../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';

const mockUploadService = {
  presignAvatar: jest.fn(),
};

describe('UploadController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [{ provide: UploadService, useValue: mockUploadService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: import('@nestjs/common').ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = { sub: 'user-id', tokenVersion: 0, role: 'USER' };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /upload/presign', () => {
    it('returns 200 with presigned post data for valid content type', async () => {
      mockUploadService.presignAvatar.mockResolvedValue({
        url: 'https://bucket.s3.amazonaws.com/',
        fields: { key: 'avatars/user-id/uuid.jpg', policy: 'mock-policy' },
        key: 'avatars/user-id/uuid.jpg',
      });

      const res = await request(app.getHttpServer())
        .post('/upload/presign')
        .set('Authorization', 'Bearer mock.token')
        .send({ contentType: 'image/jpeg' });

      expect(res.status).toBe(200);
      expect(res.body.data.url).toBeDefined();
      expect(res.body.data.fields).toBeDefined();
      expect(res.body.data.key).toBeDefined();
    });

    it('returns 400 for unsupported content type', async () => {
      const res = await request(app.getHttpServer())
        .post('/upload/presign')
        .set('Authorization', 'Bearer mock.token')
        .send({ contentType: 'image/gif' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when contentType is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/upload/presign')
        .set('Authorization', 'Bearer mock.token')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
