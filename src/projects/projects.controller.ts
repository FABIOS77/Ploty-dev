import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new project',
    description:
      'Creates an individual or collaborative team project, automatically assigning the creator as OWNER.',
  })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
  })
  async createProject(
    @CurrentUser('id') userId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.createProject(userId, createProjectDto);
  }

  @Get()
  @ApiOperation({
    summary: 'List user projects',
    description:
      'Returns all projects where the authenticated user is a member, including pure functional progress summaries and member counts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Projects listed successfully',
  })
  async listProjects(@CurrentUser('id') userId: string) {
    return this.projectsService.listUserProjects(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get project details',
    description:
      'Retrieves detailed project information with all team members, roles, activity statistics, and overall progress.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the project',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Project detail retrieved',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied: not a member',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async getProjectById(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.getProjectById(projectId, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update project details',
    description:
      'Allows OWNER or ADMIN to update project name, description, colorHex, icon, or isTeamProject.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the project' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 403, description: 'Only OWNER or ADMIN can update project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async updateProject(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.updateProject(projectId, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a project',
    description: 'Safely deletes a project and cascades memberships/activities. OWNER only.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the project' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only OWNER can delete project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async deleteProject(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.deleteProject(projectId, userId);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a member to a project',
    description:
      'Links a user to the project with an assigned role. Requires requester to be OWNER or ADMIN (validated via pure functional logic).',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the project',
  })
  @ApiResponse({
    status: 201,
    description: 'Member added successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Only OWNER or ADMIN can add members',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already a member',
  })
  async addMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') requesterUserId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projectsService.addMember(projectId, requesterUserId, dto);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({
    summary: 'Remove a member from a project',
    description:
      'Unlinks a member from the project. Allowed for OWNER or ADMIN, or self-removal. Cannot remove OWNER.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the project',
  })
  @ApiParam({
    name: 'userId',
    description: 'UUID of the member to remove',
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Unauthorized or attempt to remove OWNER',
  })
  @ApiResponse({
    status: 404,
    description: 'Member not found',
  })
  async removeMember(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @CurrentUser('id') requesterUserId: string,
  ) {
    return this.projectsService.removeMember(
      projectId,
      requesterUserId,
      targetUserId,
    );
  }
}
