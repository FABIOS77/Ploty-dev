import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProjectDto {
  @ApiPropertyOptional({
    example: 'Ploty Core v2',
    description: 'Updated name of the project (3-80 characters)',
  })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Project name must be at least 3 characters' })
  @MaxLength(80, { message: 'Project name cannot exceed 80 characters' })
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated roadmap and milestones',
    description: 'Updated description (max 500 characters)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  @ApiPropertyOptional({
    example: '#7477FF',
    description: 'Hexadecimal color code',
  })
  @IsOptional()
  @IsString()
  colorHex?: string;

  @ApiPropertyOptional({
    example: '🚀',
    description: 'Icon identifier for the project',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Toggle between collaborative team project and individual project',
  })
  @IsOptional()
  @IsBoolean()
  isTeamProject?: boolean;
}
