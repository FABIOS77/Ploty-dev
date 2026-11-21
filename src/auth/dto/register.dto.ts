import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'alex@ploty.app',
    description: 'Unique email address of the user',
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    example: 'alex_gamer',
    description: 'Unique username for the player profile (3-30 alphanumeric or underscores)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username cannot exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_]{3,30}$/, {
    message:
      'Username must contain only letters, numbers, and underscores (3-30 characters, no spaces)',
  })
  username!: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User password (minimum 8 characters)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-avatar.png',
    description: 'Optional avatar URL (HTTPS required)',
  })
  @IsOptional()
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'Avatar URL must be a valid HTTPS URL' },
  )
  avatarUrl?: string;
}
