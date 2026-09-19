import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class PayrollReviewQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ description: 'Pay cycle id (defaults to current open)' })
  @IsOptional()
  @IsString()
  cycleId?: string;

  @ApiPropertyOptional({
    enum: ['ANY', 'READY', 'REVIEW', 'BLOCK'],
    default: 'ANY',
  })
  @IsOptional()
  @IsIn(['ANY', 'READY', 'REVIEW', 'BLOCK'])
  status?: string = 'ANY';

  @ApiPropertyOptional({
    description: 'Filter to rows that have exceptions',
    enum: ['ANY', 'YES', 'NO'],
    default: 'ANY',
  })
  @IsOptional()
  @IsIn(['ANY', 'YES', 'NO'])
  hasExceptions?: string = 'ANY';
}

export class ResolveClockOutDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  clockOut?: string;
}

export class AskEmployeeDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}

export class ResolveGpsDto {
  @IsIn(['confirm', 'error'])
  action!: 'confirm' | 'error';
}

export class UnlockCycleDto {
  @IsString()
  @MaxLength(2000)
  reason!: string;
}
