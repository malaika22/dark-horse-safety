import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreatePaymentCardDto {
  @ApiProperty({ example: 'AMEX' })
  @IsString()
  brand!: string;

  @ApiProperty({ example: '4021' })
  @IsString()
  @Length(4, 4)
  last4!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isCompanyCard?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string;
}

export class UpdatePaymentCardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(4, 4)
  last4?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isCompanyCard?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ownerId?: string | null;
}

export function formatCardLabel(brand: string, last4: string) {
  const b = brand.trim().toUpperCase() || 'CARD';
  const digits = last4.replace(/\D/g, '').slice(-4).padStart(4, '0');
  return `${b} ····${digits}`;
}
