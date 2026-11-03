import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SearchUsersDto {
  @ApiPropertyOptional({
    example: 'alex',
    description: 'Query string to search by username or email',
  })
  @IsOptional()
  @IsString()
  q?: string;
}
