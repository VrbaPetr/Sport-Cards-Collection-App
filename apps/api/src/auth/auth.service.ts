import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './guards/jwt-auth.guard';

const BCRYPT_ROUNDS = 10;
const REFRESH_TOKEN_BYTES = 32;
const VERIFICATION_TOKEN_BYTES = 32;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const [existingEmail, existingUsername] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { username: dto.username }, select: { id: true } }),
    ]);

    if (existingEmail) throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' });
    if (existingUsername) throw new ConflictException({ code: 'USERNAME_TAKEN', message: 'Username is already taken' });

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const rawToken = crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          passwordHash,
          emailVerificationToken: tokenHash,
          emailVerificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
        },
        select: { id: true },
      });

      await tx.collection.create({
        data: {
          userId: user.id,
          name: 'All',
          slug: 'all',
          isDefault: true,
        },
      });
    });

    await this.email.sendVerificationEmail(dto.email, rawToken);

    return { message: 'Registration successful. Please check your email to verify your account.' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = this.hashToken(token);

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: tokenHash,
        emailVerificationTokenExpiresAt: { gt: new Date() },
        isEmailVerified: false,
      },
      select: { id: true },
    });

    if (!user) throw new NotFoundException({ code: 'INVALID_TOKEN', message: 'Verification token is invalid or has expired' });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      },
    });

    return { message: 'Email verified successfully.' };
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const genericResponse = { message: 'If that email is registered and unverified, a new verification link has been sent.' };

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, isEmailVerified: true },
    });

    if (!user || user.isEmailVerified) return genericResponse;

    const rawToken = crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: tokenHash,
        emailVerificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      },
    });

    await this.email.sendVerificationEmail(email, rawToken);

    return genericResponse;
  }

  async login(dto: LoginDto, res: import('express').Response): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, passwordHash: true, role: true, tokenVersion: true, isActive: true },
    });

    const invalidCredentials = new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });

    if (!user || !user.isActive) throw invalidCredentials;

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw invalidCredentials;

    const accessToken = this.jwt.sign(
      { sub: user.id, tokenVersion: user.tokenVersion, role: user.role } satisfies JwtPayload,
    );

    const rawRefreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshTokenHash = this.hashToken(rawRefreshToken);
    const refreshExpiresInMs = this.parseExpiry(this.config.getOrThrow('JWT_REFRESH_EXPIRES_IN'));

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + refreshExpiresInMs),
      },
    });

    res.cookie('refresh_token', rawRefreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') !== 'development',
      sameSite: 'lax',
      maxAge: refreshExpiresInMs,
      path: '/api/auth',
    });

    return { accessToken };
  }

  async logout(req: import('express').Request, res: import('express').Response): Promise<{ message: string }> {
    const rawToken: string | undefined = req.cookies?.['refresh_token'];

    if (rawToken) {
      const tokenHash = this.hashToken(rawToken);
      await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    }

    res.clearCookie('refresh_token', { path: '/api/auth' });

    return { message: 'Logged out successfully.' };
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private parseExpiry(expiry: string): number {
    const match = /^(\d+)([smhd])$/.exec(expiry);
    if (!match) throw new Error(`Invalid expiry format: ${expiry}`);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return value * multipliers[unit];
  }
}
