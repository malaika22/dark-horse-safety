import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { SavedViewScope } from '@prisma/client';

export class SavedViewListQueryDto {
  @ApiPropertyOptional({ enum: SavedViewScope })
  @IsOptional()
  @IsEnum(SavedViewScope)
  scope?: SavedViewScope;
}

export class CreateSavedViewDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: SavedViewScope })
  @IsEnum(SavedViewScope)
  scope!: SavedViewScope;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  payload!: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateSavedViewDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: SavedViewScope })
  @IsOptional()
  @IsEnum(SavedViewScope)
  scope?: SavedViewScope;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
