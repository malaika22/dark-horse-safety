import { Module } from '@nestjs/common';
import { SafetyFormsController } from './safety-forms.controller';
import { SafetyFormsService } from './safety-forms.service';

@Module({
  controllers: [SafetyFormsController],
  providers: [SafetyFormsService],
  exports: [SafetyFormsService],
})
export class SafetyFormsModule {}
