import {
  Body,
  Controller,
  Get,
  Patch,
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
import { UpdateProfileDto } from './dto/update-profile.dto';
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
      'Returns complete user profile, functionally calculated level, percentage to next level, streak, coins, unlocked items, and equipped cosmetics.',
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

  @Get('me')
  @ApiOperation({
    summary: 'Get authenticated user profile (alias of /users/profile)',
  })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update authenticated player profile (username & avatarUrl)',
    description:
      'Updates username and/or HTTPS avatarUrl (or removes avatar when empty string or null) and returns full normalized gamified profile.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Username is already in use by another player',
  })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('profile')
  @ApiOperation({
    summary: 'Update authenticated player profile (alias of PATCH /users/me)',
  })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 409, description: 'Username already in use' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
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
