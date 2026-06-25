import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GlobalExceptionFilter } from '../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';

const mockUsersService = {
  getPublicProfile: jest.fn(),
  getMyProfile: jest.fn(),
  updateMyProfile: jest.fn(),
};

describe('UsersController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
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

  describe('GET /users/:username', () => {
    it('returns 200 with public profile for active user', async () => {
      mockUsersService.getPublicProfile.mockResolvedValue({ username: 'alice', avatarUrl: null, registeredAt: new Date() });

      const res = await request(app.getHttpServer()).get('/users/alice');

      expect(res.status).toBe(200);
      expect(res.body.data.username).toBe('alice');
    });

    it('returns 404 for deactivated or non-existent user', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      mockUsersService.getPublicProfile.mockRejectedValue(
        new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' }),
      );

      const res = await request(app.getHttpServer()).get('/users/nobody');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('GET /users/me', () => {
    it('returns 200 with full profile when authenticated', async () => {
      mockUsersService.getMyProfile.mockResolvedValue({
        id: 'user-id',
        email: 'alice@example.com',
        username: 'alice',
        avatarUrl: null,
        role: 'USER',
        isEmailVerified: true,
        isActive: true,
        registeredAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer mock.token');

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe('alice@example.com');
    });
  });

  describe('PATCH /users/me', () => {
    it('returns 200 with updated profile on valid avatarUrl', async () => {
      mockUsersService.updateMyProfile.mockResolvedValue({
        id: 'user-id',
        username: 'alice',
        avatarUrl: 'https://example.com/avatar.jpg',
      });

      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer mock.token')
        .send({ avatarUrl: 'https://example.com/avatar.jpg' });

      expect(res.status).toBe(200);
      expect(res.body.data.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('returns 400 for invalid avatarUrl', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer mock.token')
        .send({ avatarUrl: 'not-a-url' });

      expect(res.status).toBe(400);
    });

    it('returns 200 when avatarUrl is omitted (no-op update)', async () => {
      mockUsersService.updateMyProfile.mockResolvedValue({ id: 'user-id', username: 'alice', avatarUrl: null });

      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .set('Authorization', 'Bearer mock.token')
        .send({});

      expect(res.status).toBe(200);
    });
  });
});
