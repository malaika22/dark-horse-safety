import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MobileContext } from '../mobile/mobile-context.service';
import { MobileSettingsLink } from '../mobile/mobile-settings-link.service';

/** Keeps the admin Mobile Sync list aligned with phones that actually checked in. */
@Injectable()
export class DataSyncService {
  private readonly log = new Logger(DataSyncService.name);
  private hourlyRunning = false;
  private dailyRunning = false;

  constructor(
    private readonly mobile: MobileContext,
    private readonly link: MobileSettingsLink,
  ) {}

  /** Phones active in the last hour. Quiet rows keep their last stamp until the daily pass. */
  @Cron(CronExpression.EVERY_HOUR)
  async hourly() {
    if (process.env.NODE_ENV === 'test' || this.hourlyRunning) return;
    this.hourlyRunning = true;
    try {
      const since = new Date(Date.now() - 3_600_000);
      const result = await this.link.mirrorMobileDevices(since);
      if (result.seen) this.log.log(`Hourly sync: ${result.mirrored} of ${result.seen} active devices updated`);
    } catch (error) {
      this.log.warn(`Hourly sync skipped: ${(error as Error).message}`);
    } finally {
      this.hourlyRunning = false;
    }
  }

  /** Full pass: link technician accounts, then refresh every registered phone, including ones quiet for 24 hours. */
  @Cron('0 2 * * *')
  async daily() {
    if (process.env.NODE_ENV === 'test' || this.dailyRunning) return;
    this.dailyRunning = true;
    try {
      const linked = await this.mobile.linkAllTechnicians();
      const result = await this.link.mirrorMobileDevices();
      this.log.log(`Daily sync: linked ${linked} technicians, updated ${result.mirrored} of ${result.seen} devices`);
    } catch (error) {
      this.log.warn(`Daily sync skipped: ${(error as Error).message}`);
    } finally {
      this.dailyRunning = false;
    }
  }
}
