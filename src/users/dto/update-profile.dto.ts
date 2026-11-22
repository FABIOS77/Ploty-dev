import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  ValidateIf,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: 'fabio_pro',
    description:
      'New unique username (3-30 alphanumeric characters or underscores, no spaces)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,30}$/, {
    message:
      'El nombre de usuario debe tener entre 3 y 30 caracteres (solo letras, números y guión bajo)',
  })
  username?: string;

  @ApiPropertyOptional({
    example: 'https://images.unsplash.com/photo-avatar.png',
    description:
      'Optional HTTPS avatar URL. Pass empty string "" or null to remove avatar.',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf(
    (o) =>
      o.avatarUrl !== null &&
      o.avatarUrl !== undefined &&
      o.avatarUrl !== '',
  )
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'La URL del avatar debe ser válida y usar protocolo https://' },
  )
  avatarUrl?: string | null;
}
