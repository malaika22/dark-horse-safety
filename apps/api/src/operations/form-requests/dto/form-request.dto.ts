import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class FormRequestActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string;

  @ApiPropertyOptional({ description: 'Deny / reject reason' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ApiPropertyOptional({ description: 'More-info message to technician' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  message?: string;

  @ApiPropertyOptional({ description: 'Correction form label' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  form?: string;

  @ApiPropertyOptional({ description: 'Issue flagged for correction' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  issue?: string;

  @ApiPropertyOptional({ description: 'Correction instructions for tech' })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Simulate notification / attach failure for UI',
  })
  @IsOptional()
  @IsBoolean()
  forceFail?: boolean;
}
