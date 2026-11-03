import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { FilterActivitiesDto } from './dto/filter-activities.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@ApiTags('Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new activity (single or recurring)',
    description:
      'Creates a task or recurring habit. Calculates XP and Coin rewards automatically based on priority if omitted.',
  })
  @ApiResponse({ status: 201, description: 'Activity created successfully' })
  @ApiResponse({ status: 403, description: 'Not a member of the project' })
  async createActivity(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activitiesService.createActivity(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List user activities with filters',
    description:
      'Returns activities filtered by project, status, type, priority or assignment. Evaluates overdue states purely.',
  })
  @ApiResponse({ status: 200, description: 'Activities retrieved' })
  async listActivities(
    @CurrentUser('id') userId: string,
    @Query() filterDto: FilterActivitiesDto,
  ) {
    return this.activitiesService.listActivities(userId, filterDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get activity detail with logs',
    description: 'Retrieves activity details and chronological execution logs.',
  })
  @ApiParam({ name: 'id', description: 'Activity UUID' })
  @ApiResponse({ status: 200, description: 'Activity detail' })
  @ApiResponse({ status: 404, description: 'Activity not found' })
  async getActivityById(
    @Param('id') activityId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.activitiesService.getActivityById(activityId, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an existing activity',
    description: 'Updates activity properties or status.',
  })
  @ApiParam({ name: 'id', description: 'Activity UUID' })
  @ApiResponse({ status: 200, description: 'Activity updated' })
  async updateActivity(
    @Param('id') activityId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activitiesService.updateActivity(activityId, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an activity',
    description: 'Removes an activity. Only creator or project manager allowed.',
  })
  @ApiParam({ name: 'id', description: 'Activity UUID' })
  @ApiResponse({ status: 200, description: 'Activity deleted' })
  async deleteActivity(
    @Param('id') activityId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.activitiesService.deleteActivity(activityId, userId);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete activity (Gamification Star Endpoint)',
    description:
      'Executes gamified completion: awards XP, coins, evaluates streaks, updates recurring cycles or sets single to completed, and auto-unlocks medals.',
  })
  @ApiParam({ name: 'id', description: 'Activity UUID' })
  @ApiResponse({
    status: 200,
    description: 'Activity completed and rewards awarded',
  })
  @ApiResponse({
    status: 400,
    description: 'Single activity already completed',
  })
  async completeActivity(
    @Param('id') activityId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.activitiesService.completeActivity(activityId, userId);
  }
}
