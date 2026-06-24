import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-z0-9-]+$/, { message: 'username must contain only lowercase letters, numbers, and hyphens' })
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
