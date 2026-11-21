import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module';
import { MailService } from '../auth/mail.service';
import { FleetModule } from '../fleet/fleet.module';
import { TimeOffModule } from '../hr/time-off/time-off.module';
import { MobileAuthController } from './mobile-auth.controller';
import { MobileAuthService } from './mobile-auth.service';
import { MobileClockService } from './mobile-clock.service';
import { MobileContext } from './mobile-context.service';
import { MobileSettingsLink } from './mobile-settings-link.service';
import { MobileFleetController } from './mobile-fleet.controller';
import { MobileFleetService } from './mobile-fleet.service';
import { MobileFormsService } from './mobile-forms.service';
import { MobileJobsService } from './mobile-jobs.service';
import { MobileNotificationsService } from './mobile-notifications.service';
import { MobileProfileService } from './mobile-profile.service';
import { MobileRoleGuard } from './mobile-role.guard';
import { MobileTimeService } from './mobile-time.service';
import {
  MobileClockController, MobileFormsController, MobileJobsController,
  MobileNotificationsController, MobileProfileController, MobileTimeController,
} from './mobile.controllers';

/** Mobile app API. Fleet, time off, and time-edit flags go through the admin portal services. */
@Module({
  imports: [
    AuthModule, FleetModule, TimeOffModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ secret: config.get<string>('JWT_SECRET', 'dev-secret') }),
    }),
  ],
  controllers: [
    MobileAuthController, MobileProfileController, MobileClockController,
    MobileJobsController, MobileFormsController, MobileTimeController, MobileNotificationsController,
    MobileFleetController,
  ],
  providers: [
    MailService, MobileSettingsLink, MobileContext, MobileAuthService, MobileProfileService, MobileClockService,
    MobileJobsService, MobileFormsService, MobileTimeService, MobileNotificationsService,
    MobileFleetService,
    // Technician tokens may only call /mobile/v1 (and sign-in, health, docs, uploads).
    { provide: APP_GUARD, useClass: MobileRoleGuard },
  ],
  exports: [MobileSettingsLink, MobileContext],
})
export class MobileModule {}
