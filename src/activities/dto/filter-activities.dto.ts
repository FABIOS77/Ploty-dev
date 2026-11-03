import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ActivityPriority,
  ActivityStatus,
  ActivityType,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class FilterActivitiesDto {
  @ApiPropertyOptional({ description: 'Filter by Project UUID' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ enum: ActivityStatus, description: 'Filter by Status' })
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @ApiPropertyOptional({ enum: ActivityType, description: 'Filter by Type (SINGLE or RECURRING)' })
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  @ApiPropertyOptional({ enum: ActivityPriority, description: 'Filter by Priority' })
  @IsOptional()
  @IsEnum(ActivityPriority)
  priority?: ActivityPriority;

  @ApiPropertyOptional({
    description: 'Filter only activities assigned to or created by current user',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  assignedToMe?: boolean;
}
