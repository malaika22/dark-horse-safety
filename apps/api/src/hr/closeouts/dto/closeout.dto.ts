import { IsIn, IsOptional, IsString } from 'class-validator';

export class CloseoutDecisionDto {
  @IsIn(['ACCEPT', 'RETURN', 'HOLD'])
  decision!: 'ACCEPT' | 'RETURN' | 'HOLD';

  @IsOptional()
  @IsString()
  note?: string;
}
