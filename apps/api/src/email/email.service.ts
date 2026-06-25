import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    this.resend = new Resend(config.getOrThrow('RESEND_API_KEY'));
    this.from = config.getOrThrow('EMAIL_FROM');
    this.frontendUrl = config.getOrThrow('FRONTEND_URL');
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Verify your email',
      html: `<p>Click <a href="${link}">here</a> to verify your email address. This link expires in 24 hours.</p>`,
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;
    await this.resend.emails.send({
      from: this.from,
      to,
      subject: 'Reset your password',
      html: `<p>Click <a href="${link}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    });
  }
}
