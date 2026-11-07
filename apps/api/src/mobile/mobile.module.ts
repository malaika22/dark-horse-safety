import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailService } from '../auth/mail.service';
import { MobileAuthController } from './mobile-auth.controller';
import { MobileAuthService } from './mobile-auth.service';
import { MobileClockService } from './mobile-clock.service';
import { MobileContext } from './mobile-context.service';
import { MobileFormsService } from './mobile-forms.service';
import { MobileJobsService } from './mobile-jobs.service';
import { MobileNotificationsService } from './mobile-notifications.service';
import { MobileProfileService } from './mobile-profile.service';
import { MobileTimeService } from './mobile-time.service';
import {
  MobileClockController, MobileFormsController, MobileJobsController,
  MobileNotificationsController, MobileProfileController, MobileTimeController,
} from './mobile.controllers';

/** Mobile app API. Additive: only reads/writes through Prisma, no existing module is modified. */
@Module({
  imports: [AuthModule],
  controllers: [
    MobileAuthController, MobileProfileController, MobileClockController,
    MobileJobsController, MobileFormsController, MobileTimeController, MobileNotificationsController,
  ],
  providers: [
    MailService, MobileContext, MobileAuthService, MobileProfileService, MobileClockService,
    MobileJobsService, MobileFormsService, MobileTimeService, MobileNotificationsService,
  ],
})
export class MobileModule {}
