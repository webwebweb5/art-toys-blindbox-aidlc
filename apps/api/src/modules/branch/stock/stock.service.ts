import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Allocate stock of a figure to a branch.
   * Creates or increments available count.
   */
  async allocate(figureId: string, branchId: string, quantity: number) {
    const record = await this.prisma.stockRecord.upsert({
      where: { branchId_figureId: { branchId, figureId } },
      create: {
        branchId,
        figureId,
        available: quantity,
        reserved: 0,
        pickedUp: 0,
      },
      update: {
        available: { increment: quantity },
      },
    });

    return record;
  }

  /**
   * Reserve stock for a figure at a branch.
   * Atomically decrements available and increments reserved.
   */
  async reserve(figureId: string, branchId: string) {
    // Check availability first
    const record = await this.prisma.stockRecord.findUnique({
      where: { branchId_figureId: { branchId, figureId } },
    });

    if (!record || record.available <= 0) {
      throw new ConflictException({
        code: 'INSUFFICIENT_STOCK',
        message: 'No available stock at this branch',
      });
    }

    // Atomic update
    return this.prisma.stockRecord.update({
      where: { branchId_figureId: { branchId, figureId } },
      data: {
        available: { decrement: 1 },
        reserved: { increment: 1 },
      },
    });
  }

  /**
   * Release a reservation (e.g., on voucher expiry).
   * Decrements reserved, increments available.
   */
  async release(figureId: string, branchId: string) {
    const record = await this.prisma.stockRecord.findUnique({
      where: { branchId_figureId: { branchId, figureId } },
    });

    if (!record || record.reserved <= 0) {
      throw new ConflictException({
        code: 'NO_RESERVATION',
        message: 'No reserved stock to release',
      });
    }

    return this.prisma.stockRecord.update({
      where: { branchId_figureId: { branchId, figureId } },
      data: {
        reserved: { decrement: 1 },
        available: { increment: 1 },
      },
    });
  }

  /**
   * Mark a reservation as picked up.
   * Decrements reserved, increments pickedUp.
   */
  async pickup(figureId: string, branchId: string) {
    const record = await this.prisma.stockRecord.findUnique({
      where: { branchId_figureId: { branchId, figureId } },
    });

    if (!record || record.reserved <= 0) {
      throw new ConflictException({
        code: 'NO_RESERVATION',
        message: 'No reserved stock to pick up',
      });
    }

    return this.prisma.stockRecord.update({
      where: { branchId_figureId: { branchId, figureId } },
      data: {
        reserved: { decrement: 1 },
        pickedUp: { increment: 1 },
      },
    });
  }

  /**
   * Transfer stock between branches.
   * Creates a StockTransfer record and adjusts stock levels.
   */
  async transfer(
    figureId: string,
    fromBranchId: string,
    toBranchId: string,
    quantity: number,
    initiatedBy: string,
  ) {
    // Verify source has enough stock
    const sourceRecord = await this.prisma.stockRecord.findUnique({
      where: { branchId_figureId: { branchId: fromBranchId, figureId } },
    });

    if (!sourceRecord || sourceRecord.available < quantity) {
      throw new ConflictException({
        code: 'INSUFFICIENT_STOCK',
        message: 'Insufficient stock at source branch for transfer',
      });
    }

    // Perform transfer in a transaction
    const [transfer] = await this.prisma.$transaction([
      this.prisma.stockTransfer.create({
        data: {
          figureId,
          fromBranchId,
          toBranchId,
          quantity,
          initiatedBy,
          status: 'IN_TRANSIT',
        },
      }),
      this.prisma.stockRecord.update({
        where: { branchId_figureId: { branchId: fromBranchId, figureId } },
        data: { available: { decrement: quantity } },
      }),
      this.prisma.stockRecord.upsert({
        where: { branchId_figureId: { branchId: toBranchId, figureId } },
        create: {
          branchId: toBranchId,
          figureId,
          available: quantity,
          reserved: 0,
          pickedUp: 0,
        },
        update: { available: { increment: quantity } },
      }),
    ]);

    return transfer;
  }

  /**
   * Get stock levels for a branch.
   */
  async getLevel(branchId: string) {
    const records = await this.prisma.stockRecord.findMany({
      where: { branchId },
      include: {
        figure: {
          select: { name: true, rarity: true, series: { select: { name: true } } },
        },
      },
    });

    return records.map((r) => ({
      figureId: r.figureId,
      figureName: r.figure.name,
      series: r.figure.series.name,
      rarity: r.figure.rarity,
      available: r.available,
      reserved: r.reserved,
      pickedUp: r.pickedUp,
    }));
  }
}
