import { IsOptional, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
