import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailVerifiedGuard } from './guards/email-verified.guard';
import { GlobalExceptionFilter } from '../common/filters/http-exception.filter';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';
import { ThrottlerModule } from '@nestjs/throttler';

const mockAuthService = {
  register: jest.fn(),
  verifyEmail: jest.fn(),
  resendVerification: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
};

describe('AuthController (integration)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 100 }] })],
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
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

  describe('POST /auth/register', () => {
    it('returns 201 with message on success', async () => {
      mockAuthService.register.mockResolvedValue({ message: 'Registration successful.' });

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', username: 'testuser', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toBeDefined();
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', username: 'testuser', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('returns 400 for username with uppercase letters', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', username: 'TestUser', password: 'password123' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for password shorter than 8 characters', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com', username: 'testuser', password: 'short' });

      expect(res.status).toBe(400);
    });

    it('returns 409 with EMAIL_TAKEN when email is already registered', async () => {
      const { ConflictException } = await import('@nestjs/common');
      mockAuthService.register.mockRejectedValue(
        new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' }),
      );

      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'taken@example.com', username: 'newuser', password: 'password123' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });
  });

  describe('POST /auth/verify-email', () => {
    it('returns 200 on valid token', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({ message: 'Email verified.' });

      const res = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'valid-token' });

      expect(res.status).toBe(200);
    });

    it('returns 400 when token field is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 200 with accessToken on valid credentials', async () => {
      mockAuthService.login.mockResolvedValue({ accessToken: 'jwt.token.here' });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
    });

    it('returns 401 with INVALID_CREDENTIALS on wrong password', async () => {
      const { UnauthorizedException } = await import('@nestjs/common');
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }),
      );

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('EmailVerifiedGuard (unit)', () => {
    it('throws ForbiddenException with EMAIL_NOT_VERIFIED for unverified user', async () => {
      const { ForbiddenException } = await import('@nestjs/common');
      const mockPrismaService = {
        user: { findUnique: jest.fn().mockResolvedValue({ isEmailVerified: false }) },
      } as unknown as import('../prisma/prisma.service').PrismaService;

      const guard = new EmailVerifiedGuard(mockPrismaService);
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { sub: 'user-id', tokenVersion: 0, role: 'USER' } }),
        }),
      } as unknown as import('@nestjs/common').ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(ForbiddenException);
    });

    it('allows request when user is verified', async () => {
      const mockPrismaService = {
        user: { findUnique: jest.fn().mockResolvedValue({ isEmailVerified: true }) },
      } as unknown as import('../prisma/prisma.service').PrismaService;

      const guard = new EmailVerifiedGuard(mockPrismaService);
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { sub: 'user-id', tokenVersion: 0, role: 'USER' } }),
        }),
      } as unknown as import('@nestjs/common').ExecutionContext;

      await expect(guard.canActivate(mockContext)).resolves.toBe(true);
    });
  });
});
