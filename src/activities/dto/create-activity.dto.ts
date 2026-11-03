import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ActivityPriority,
  ActivityType,
  RecurrencePattern,
} from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({
    example: 'Deploy Kubernetes cluster',
    description: 'Title of the activity or habit',
  })
  @IsString()
  @IsNotEmpty({ message: 'Activity title is required' })
  title!: string;

  @ApiPropertyOptional({
    example: 'Configure Helm charts and ingress controllers',
    description: 'Detailed description of the action',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ActivityType,
    example: ActivityType.SINGLE,
    default: ActivityType.SINGLE,
  })
  @IsEnum(ActivityType)
  @IsOptional()
  type?: ActivityType;

  @ApiPropertyOptional({
    enum: RecurrencePattern,
    example: RecurrencePattern.NONE,
    default: RecurrencePattern.NONE,
  })
  @IsEnum(RecurrencePattern)
  @IsOptional()
  recurrence?: RecurrencePattern;

  @ApiPropertyOptional({
    example: 1,
    description: 'Interval for recurrence (e.g. every 1 day, every 2 weeks)',
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  recurrenceInterval?: number;

  @ApiPropertyOptional({
    enum: ActivityPriority,
    example: ActivityPriority.MEDIUM,
    default: ActivityPriority.MEDIUM,
  })
  @IsEnum(ActivityPriority)
  @IsOptional()
  priority?: ActivityPriority;

  @ApiPropertyOptional({
    example: 50,
    description: 'XP earned upon completion. Auto-calculated by priority if omitted.',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  xpReward?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Coins earned upon completion. Auto-calculated by priority if omitted.',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  coinReward?: number;

  @ApiPropertyOptional({
    example: '2026-11-10T18:00:00.000Z',
    description: 'Target due date for the activity',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Project UUID if this activity is tied to a collaborative/individual project',
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'User UUID assigned to this activity',
  })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;
}
