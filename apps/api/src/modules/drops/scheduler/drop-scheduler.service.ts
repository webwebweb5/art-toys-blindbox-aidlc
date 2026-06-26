import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { DropsService } from '../drops.service';

@Injectable()
export class DropSchedulerService {
  private readonly logger = new Logger(DropSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dropsService: DropsService,
  ) {}

  /**
   * Find and activate drops that are due to start.
   */
  async activateDueDrops(): Promise<void> {
    const now = new Date();

    const dueDrops = await this.prisma.dropEvent.findMany({
      where: {
        status: 'SCHEDULED',
        startsAt: { lte: now },
      },
    });

    for (const drop of dueDrops) {
      try {
        await this.dropsService.activate(drop.id);
        this.logger.log(`Activated drop: ${drop.name} (${drop.id})`);
      } catch (error) {
        this.logger.error(
          `Failed to activate drop ${drop.id}: ${error.message}`,
        );
      }
    }
  }
}
