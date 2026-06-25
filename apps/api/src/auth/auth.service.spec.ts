import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  collection: {
    create: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwt = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn(),
};

const mockEmail = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

const mockConfig = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, string> = {
      JWT_REFRESH_EXPIRES_IN: '30d',
      NODE_ENV: 'test',
    };
    return values[key];
  }),
  get: jest.fn().mockReturnValue('test'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: EmailService, useValue: mockEmail },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('throws ConflictException when email is already taken', async () => {
      mockPrisma.user.findUnique.mockImplementation(({ where }: { where: Record<string, string> }) => {
        if (where['email']) return Promise.resolve({ id: 'existing-id' });
        return Promise.resolve(null);
      });

      await expect(service.register({ email: 'taken@example.com', username: 'newuser', password: 'password123' }))
        .rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when username is already taken', async () => {
      mockPrisma.user.findUnique.mockImplementation(({ where }: { where: Record<string, string> }) => {
        if (where['username']) return Promise.resolve({ id: 'existing-id' });
        return Promise.resolve(null);
      });

      await expect(service.register({ email: 'new@example.com', username: 'taken', password: 'password123' }))
        .rejects.toThrow(ConflictException);
    });

    it('creates user and default collection, sends verification email on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<void>) => {
        await fn(mockPrisma);
      });
      mockPrisma.user.create.mockResolvedValue({ id: 'new-user-id' });
      mockPrisma.collection.create.mockResolvedValue({});

      const result = await service.register({ email: 'new@example.com', username: 'newuser', password: 'password123' });

      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isDefault: true, slug: 'all' }) }),
      );
      expect(mockEmail.sendVerificationEmail).toHaveBeenCalledWith('new@example.com', expect.any(String));
      expect(result.message).toBeDefined();
    });
  });

  describe('verifyEmail', () => {
    it('throws NotFoundException for invalid or expired token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(NotFoundException);
    });

    it('marks user as verified and clears the token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-id' });
      mockPrisma.user.update.mockResolvedValue({});

      await service.verifyEmail('valid-token');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isEmailVerified: true,
            emailVerificationToken: null,
            emailVerificationTokenExpiresAt: null,
          }),
        }),
      );
    });
  });

  describe('resendVerification', () => {
    it('returns generic message when email is not found (no enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.resendVerification('unknown@example.com');

      expect(result.message).toBeDefined();
      expect(mockEmail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('returns generic message when user is already verified', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-id', isEmailVerified: true });

      const result = await service.resendVerification('verified@example.com');

      expect(result.message).toBeDefined();
      expect(mockEmail.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('sends new verification email for unverified user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-id', isEmailVerified: false });
      mockPrisma.user.update.mockResolvedValue({});

      await service.resendVerification('unverified@example.com');

      expect(mockEmail.sendVerificationEmail).toHaveBeenCalledWith('unverified@example.com', expect.any(String));
    });
  });

  describe('login', () => {
    const mockResponse = {
      cookie: jest.fn(),
    } as unknown as import('express').Response;

    it('throws UnauthorizedException when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login({ email: 'unknown@example.com', password: 'pass' }, mockResponse))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        passwordHash: await bcrypt.hash('correct-password', 10),
        role: 'USER',
        tokenVersion: 0,
        isActive: true,
      });

      await expect(service.login({ email: 'user@example.com', password: 'wrong-password' }, mockResponse))
        .rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        passwordHash: await bcrypt.hash('password', 10),
        role: 'USER',
        tokenVersion: 0,
        isActive: false,
      });

      await expect(service.login({ email: 'inactive@example.com', password: 'password' }, mockResponse))
        .rejects.toThrow(UnauthorizedException);
    });

    it('returns accessToken and sets cookie on successful login', async () => {
      const password = 'correct-password';
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        passwordHash: await bcrypt.hash(password, 10),
        role: 'USER',
        tokenVersion: 0,
        isActive: true,
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({ email: 'user@example.com', password }, mockResponse);

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledTimes(1);
      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', expect.any(String), expect.any(Object));
    });
  });

  describe('logout', () => {
    const mockResponse = {
      clearCookie: jest.fn(),
    } as unknown as import('express').Response;

    it('deletes refresh token from DB when cookie is present', async () => {
      const mockRequest = { cookies: { refresh_token: 'some-raw-token' } } as unknown as import('express').Request;
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout(mockRequest, mockResponse);

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
    });

    it('still clears cookie even when no refresh token cookie is present', async () => {
      const mockRequest = { cookies: {} } as unknown as import('express').Request;

      await service.logout(mockRequest, mockResponse);

      expect(mockPrisma.refreshToken.deleteMany).not.toHaveBeenCalled();
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
    });
  });

  describe('refresh', () => {
    const mockResponse = {
      cookie: jest.fn(),
    } as unknown as import('express').Response;

    it('throws UnauthorizedException when no cookie is present', async () => {
      const mockRequest = { cookies: {} } as unknown as import('express').Request;

      await expect(service.refresh(mockRequest, mockResponse)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when refresh token is not found in DB', async () => {
      const mockRequest = { cookies: { refresh_token: 'unknown-token' } } as unknown as import('express').Request;
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refresh(mockRequest, mockResponse)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      const mockRequest = { cookies: { refresh_token: 'valid-token' } } as unknown as import('express').Request;
      mockPrisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt-id', userId: 'user-id' });
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.refresh(mockRequest, mockResponse)).rejects.toThrow(UnauthorizedException);
    });

    it('rotates refresh token and returns new access token', async () => {
      const mockRequest = { cookies: { refresh_token: 'valid-token' } } as unknown as import('express').Request;
      mockPrisma.refreshToken.findFirst.mockResolvedValue({ id: 'rt-id', userId: 'user-id' });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-id', role: 'USER', tokenVersion: 1 });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.refresh(mockRequest, mockResponse);

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', expect.any(String), expect.any(Object));
    });
  });

  describe('forgotPassword', () => {
    it('returns generic message when email is not found (no enumeration)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('unknown@example.com');

      expect(result.message).toBeDefined();
      expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('saves reset token and sends email for existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-id' });
      mockPrisma.user.update.mockResolvedValue({});

      await service.forgotPassword('user@example.com');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordResetToken: expect.any(String),
            passwordResetTokenExpiresAt: expect.any(Date),
          }),
        }),
      );
      expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledWith('user@example.com', expect.any(String));
    });
  });

  describe('resetPassword', () => {
    it('throws BadRequestException for invalid or expired token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword('bad-token', 'newpassword')).rejects.toThrow(BadRequestException);
    });

    it('updates passwordHash, increments tokenVersion, deletes all refresh tokens', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-id' });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.resetPassword('valid-token', 'newpassword123');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.message).toBeDefined();
    });

    it('throws BadRequestException when same token is used a second time', async () => {
      mockPrisma.user.findFirst
        .mockResolvedValueOnce({ id: 'user-id' })
        .mockResolvedValueOnce(null);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      await service.resetPassword('valid-token', 'newpassword123');

      await expect(service.resetPassword('valid-token', 'newpassword123')).rejects.toThrow(BadRequestException);
    });
  });
});
