import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailService } from '../auth/mail.service';
import { FleetModule } from '../fleet/fleet.module';
import { TimeOffModule } from '../hr/time-off/time-off.module';
import { MobileAuthController } from './mobile-auth.controller';
import { MobileAuthService } from './mobile-auth.service';
import { MobileClockService } from './mobile-clock.service';
import { MobileContext } from './mobile-context.service';
import { MobileFleetController } from './mobile-fleet.controller';
import { MobileFleetService } from './mobile-fleet.service';
import { MobileFormsService } from './mobile-forms.service';
import { MobileJobsService } from './mobile-jobs.service';
import { MobileNotificationsService } from './mobile-notifications.service';
import { MobileProfileService } from './mobile-profile.service';
import { MobileTimeService } from './mobile-time.service';
import {
  MobileClockController, MobileFormsController, MobileJobsController,
  MobileNotificationsController, MobileProfileController, MobileTimeController,
} from './mobile.controllers';

/** Mobile app API. Fleet, time off, and time-edit flags go through the admin portal services. */
@Module({
  imports: [AuthModule, FleetModule, TimeOffModule],
  controllers: [
    MobileAuthController, MobileProfileController, MobileClockController,
    MobileJobsController, MobileFormsController, MobileTimeController, MobileNotificationsController,
    MobileFleetController,
  ],
  providers: [
    MailService, MobileContext, MobileAuthService, MobileProfileService, MobileClockService,
    MobileJobsService, MobileFormsService, MobileTimeService, MobileNotificationsService,
    MobileFleetService,
  ],
})
export class MobileModule {}
