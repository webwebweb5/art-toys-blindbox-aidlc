import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DropSchedulerService } from './drop-scheduler.service';

@Injectable()
export class DropActivationCron {
  constructor(private readonly scheduler: DropSchedulerService) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleDropActivation() {
    await this.scheduler.activateDueDrops();
  }
}
