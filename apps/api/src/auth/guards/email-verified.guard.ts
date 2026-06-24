import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from './jwt-auth.guard';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const payload = request.user;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isEmailVerified: true },
    });

    if (!user?.isEmailVerified) {
      throw new ForbiddenException({ code: 'EMAIL_NOT_VERIFIED', message: 'Email address is not verified' });
    }

    return true;
  }
}
