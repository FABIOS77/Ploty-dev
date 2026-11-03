import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    example: 'Cyberpunk Quest App',
    description: 'Name of the project',
  })
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  @MinLength(2, { message: 'Project name must be at least 2 characters' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Build gamified activity tracker with XP system',
    description: 'Detailed description of the project',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '#8B5CF6',
    description: 'Hexadecimal color code for the project badge/card',
    default: '#6366F1',
  })
  @IsOptional()
  @IsString()
  colorHex?: string;

  @ApiPropertyOptional({
    example: 'gamepad',
    description: 'Icon identifier for the project',
    default: 'folder',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indicates whether the project is collaborative or individual',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTeamProject?: boolean;
}
