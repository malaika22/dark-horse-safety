import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UploadsModule } from './common/uploads.module';
import { CrmModule } from './crm/crm.module';
import { HrModule } from './hr/hr.module';
import { OperationsModule } from './operations/operations.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { SafetyModule } from './safety/safety.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    UploadsModule,
    AuthModule,
    CrmModule,
    HrModule,
    OperationsModule,
    ReportsModule,
    SafetyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
