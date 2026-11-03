import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'alex@ploty.app',
    description: 'Registered user email',
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'User account password',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;
}
