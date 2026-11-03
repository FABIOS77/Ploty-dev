import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class AddProjectMemberDto {
  @ApiPropertyOptional({
    example: 'c1234567-89ab-cdef-0123-456789abcdef',
    description: 'Unique UUID of the user to add as member',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    example: 'alex_gamer',
    description: 'Username or email to search and add as member',
  })
  @IsOptional()
  @IsString()
  usernameOrEmail?: string;

  @ApiProperty({
    enum: ProjectRole,
    example: ProjectRole.MEMBER,
    description: 'Role assigned to the member in this project',
    default: ProjectRole.MEMBER,
  })
  @IsEnum(ProjectRole)
  @IsOptional()
  role?: ProjectRole;
}
