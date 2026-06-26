import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockService } from '../stock/stock.service';

@Injectable()
export class VoucherExpiryCron {
  private readonly logger = new Logger(VoucherExpiryCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockService: StockService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredVouchers() {
    this.logger.log('Checking for expired vouchers...');

    const expiredVouchers = await this.prisma.voucher.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: { lte: new Date() },
      },
    });

    this.logger.log(`Found ${expiredVouchers.length} expired vouchers`);

    for (const voucher of expiredVouchers) {
      try {
        // Release reserved stock
        await this.stockService.release(voucher.figureId, voucher.branchId);

        // Mark voucher as expired
        await this.prisma.voucher.update({
          where: { id: voucher.id },
          data: { status: 'EXPIRED' },
        });

        // Emit event
        this.eventEmitter.emit('voucher.expired', {
          voucherId: voucher.id,
          userId: voucher.userId,
          branchId: voucher.branchId,
          figureId: voucher.figureId,
        });

        this.logger.log(`Expired voucher ${voucher.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to expire voucher ${voucher.id}: ${error.message}`,
        );
      }
    }
  }
}
