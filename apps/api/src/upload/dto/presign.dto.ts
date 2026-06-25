import { IsIn } from 'class-validator';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export class PresignDto {
  @IsIn(ALLOWED_MIME_TYPES, { message: 'contentType must be one of: image/jpeg, image/png, image/webp' })
  contentType!: string;
}
