import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, JwtPayload } from '../auth/guards/jwt-auth.guard';
import { UploadService } from './upload.service';
import { PresignDto } from './dto/presign.dto';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @UseGuards(JwtAuthGuard)
  @Post('presign')
  @HttpCode(200)
  presignAvatar(@Req() req: AuthRequest, @Body() dto: PresignDto) {
    return this.uploadService.presignAvatar(req.user.sub, dto.contentType);
  }
}
