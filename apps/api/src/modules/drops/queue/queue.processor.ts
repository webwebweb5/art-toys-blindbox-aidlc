import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService } from './queue.service';
import { DropsService } from '../drops.service';
import { PrismaService } from '../../../prisma/prisma.service';

const BATCH_SIZE = 10; // Grant windows to 10 users at a time

@Injectable()
export class QueueProcessor {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly dropsService: DropsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Process the queue every 10 seconds.
   * Grants purchase windows to the next batch of users in line.
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async processQueue() {
    // Get all active drops
    const activeDrops = await this.prisma.dropEvent.findMany({
      where: { status: 'ACTIVE' },
    });

    for (const drop of activeDrops) {
      try {
        await this.processDropQueue(drop.id);
      } catch (error) {
        this.logger.error(
          `Error processing queue for drop ${drop.id}: ${error.message}`,
        );
      }
    }
  }

  private async processDropQueue(dropId: string): Promise<void> {
    const nextUsers = await this.queueService.getNextBatch(dropId, BATCH_SIZE);

    if (nextUsers.length === 0) return;

    for (const userId of nextUsers) {
      try {
        await this.queueService.grantWindow(userId, dropId);
        this.logger.log(
          `Granted purchase window to user ${userId} for drop ${dropId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to grant window to ${userId}: ${error.message}`,
        );
      }
    }
  }
}
