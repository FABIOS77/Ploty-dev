import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get authenticated user gamification profile',
    description:
      'Returns complete user profile, functionally calculated level, percentage to next level, streak, coins, unlocked items, and equipped theme.',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access',
  })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search users to invite to projects',
    description:
      'Search users by username or email. Uses pure functional sanitization and projection.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search keyword (minimum 2 characters)',
    example: 'alex',
  })
  @ApiResponse({
    status: 200,
    description: 'List of matching users',
  })
  async searchUsers(
    @Query('q') query: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.usersService.searchUsers(query, currentUserId);
  }
}
