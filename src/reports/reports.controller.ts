import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get consolidated visual analytics dashboard',
    description:
      'Provides aggregated metrics processed purely via FP pipelines: status distribution (Donut), priority breakdown (Stacked bars), daily trends (Area/Line), and action progress.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    example: 14,
    description: 'Number of past days for trend analysis (default: 14)',
  })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved' })
  async getDashboard(
    @CurrentUser('id') userId: string,
    @Query('days') days?: number,
  ) {
    const daysCount = days ? Number(days) : 14;
    return this.reportsService.getDashboardReport(userId, daysCount);
  }

  @Get('projects/:projectId')
  @ApiOperation({
    summary: 'Get project-specific analytics & team contributions',
    description:
      'Detailed visual report for a project, including task distributions, action completion rates, and individual team member contributions.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project report retrieved' })
  @ApiResponse({ status: 403, description: 'Not a member of the project' })
  async getProjectReport(
    @Param('projectId') projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reportsService.getProjectReport(projectId, userId);
  }
}
