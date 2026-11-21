import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
    example: 30,
    description: 'Number of past days for trend analysis (integer 1-365, default: 30)',
  })
  @ApiResponse({ status: 200, description: 'Dashboard metrics retrieved' })
  @ApiResponse({ status: 400, description: 'Invalid days parameter (must be integer 1-365)' })
  async getDashboard(
    @CurrentUser('id') userId: string,
    @Query('days') days?: string,
  ) {
    let daysCount = 30;
    if (days !== undefined && days !== '') {
      const parsed = Number(days);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
        throw new BadRequestException(
          'Query parameter "days" must be an integer between 1 and 365',
        );
      }
      daysCount = parsed;
    }
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
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reportsService.getProjectReport(projectId, userId);
  }
}
