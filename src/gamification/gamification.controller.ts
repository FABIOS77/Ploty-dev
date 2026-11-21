import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { EquipItemDto } from './dto/equip-item.dto';
import { GamificationService } from './gamification.service';

@ApiTags('Gamification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('catalog')
  @ApiOperation({
    summary: 'Get rewards and themes catalog with player ownership status',
    description:
      'Retrieves the 10+ items catalog dynamically enriched with isUnlocked, isEquipped, and canAfford flags.',
  })
  @ApiResponse({ status: 200, description: 'Catalog items retrieved' })
  async getCatalog(@CurrentUser('id') userId: string) {
    return this.gamificationService.getCatalog(userId);
  }

  @Post('shop/buy/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Purchase a theme, medal or cosmetic from shop',
    description:
      'Spends earned coins to unlock items, validating level requirements and coin balance using pure Either logic.',
  })
  @ApiParam({ name: 'itemId', description: 'Item UUID to purchase' })
  @ApiResponse({ status: 200, description: 'Item purchased and unlocked' })
  @ApiResponse({ status: 400, description: 'Insufficient funds or level too low' })
  async buyItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.gamificationService.buyItem(itemId, userId);
  }

  @Patch('equip')
  @ApiOperation({
    summary: 'Equip an unlocked theme, medal, frame or title',
    description:
      'Equips a visual theme, medal, avatar frame or title to customize the user UI and public player badge.',
  })
  @ApiResponse({ status: 200, description: 'Cosmetics equipped successfully' })
  @ApiResponse({ status: 400, description: 'Item type does not match target slot' })
  @ApiResponse({ status: 403, description: 'Item not yet unlocked' })
  async equipItem(
    @CurrentUser('id') userId: string,
    @Body() dto: EquipItemDto,
  ) {
    return this.gamificationService.equipItem(userId, dto);
  }

  @Get('leaderboard')
  @ApiOperation({
    summary: 'Get player leaderboard ranking',
    description:
      'Returns top players ordered by XP and active streak, optionally filtered by projectId (requires project membership).',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Optional Project UUID to filter project-specific rankings',
  })
  @ApiResponse({ status: 200, description: 'Leaderboard ranked users' })
  @ApiResponse({ status: 403, description: 'Not a member of the requested project' })
  async getLeaderboard(
    @CurrentUser('id') userId: string,
    @Query('projectId', new ParseUUIDPipe({ optional: true }))
    projectId?: string,
  ) {
    return this.gamificationService.getLeaderboard(projectId, userId);
  }
}
