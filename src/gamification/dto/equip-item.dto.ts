import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class EquipItemDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the unlocked theme to equip',
  })
  @IsOptional()
  @IsUUID()
  themeId?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'UUID of the unlocked medal to equip',
  })
  @IsOptional()
  @IsUUID()
  medalId?: string;
}
