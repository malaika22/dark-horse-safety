import { Module } from '@nestjs/common';
import { SafetyFormsModule } from './forms/safety-forms.module';

@Module({
  imports: [SafetyFormsModule],
  exports: [SafetyFormsModule],
})
export class SafetyModule {}
