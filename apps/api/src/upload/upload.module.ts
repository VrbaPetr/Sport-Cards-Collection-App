import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';

@Module({
  imports: [AuthModule],
  providers: [UploadService],
  controllers: [UploadController],
})
export class UploadModule {}
