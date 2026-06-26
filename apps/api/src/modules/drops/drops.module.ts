import { Module } from '@nestjs/common';
import { DropsService } from './drops.service';
import { DropsController } from './drops.controller';
import { QueueService } from './queue/queue.service';
import { QueueProcessor } from './queue/queue.processor';
import { QueueGateway } from './queue/queue.gateway';
import { DropSchedulerService } from './scheduler/drop-scheduler.service';
import { DropActivationCron } from './scheduler/drop-activation.cron';

@Module({
  controllers: [DropsController],
  providers: [
    DropsService,
    QueueService,
    QueueProcessor,
    QueueGateway,
    DropSchedulerService,
    DropActivationCron,
  ],
  exports: [DropsService, QueueService],
})
export class DropsModule {}
