import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { StockService } from './stock.service';

describe('StockService', () => {
  let service: StockService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      stockRecord: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
      stockTransfer: {
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    service = new StockService(prisma as any);
  });

  describe('allocate', () => {
    it('should upsert stock record with quantity', async () => {
      prisma.stockRecord.upsert.mockResolvedValue({
        branchId: 'branch-1',
        figureId: 'fig-1',
        available: 50,
        reserved: 0,
        pickedUp: 0,
      });

      const result = await service.allocate('fig-1', 'branch-1', 50);

      expect(result.available).toBe(50);
      expect(prisma.stockRecord.upsert).toHaveBeenCalledWith({
        where: { branchId_figureId: { branchId: 'branch-1', figureId: 'fig-1' } },
        create: {
          branchId: 'branch-1',
          figureId: 'fig-1',
          available: 50,
          reserved: 0,
          pickedUp: 0,
        },
        update: { available: { increment: 50 } },
      });
    });
  });

  describe('reserve', () => {
    it('should decrement available and increment reserved', async () => {
      prisma.stockRecord.findUnique.mockResolvedValue({
        available: 5,
        reserved: 2,
      });
      prisma.stockRecord.update.mockResolvedValue({
        available: 4,
        reserved: 3,
      });

      const result = await service.reserve('fig-1', 'branch-1');

      expect(result.available).toBe(4);
      expect(result.reserved).toBe(3);
    });

    it('should throw ConflictException when no stock available', async () => {
      prisma.stockRecord.findUnique.mockResolvedValue({
        available: 0,
        reserved: 2,
      });

      await expect(
        service.reserve('fig-1', 'branch-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw when stock record does not exist', async () => {
      prisma.stockRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.reserve('fig-1', 'branch-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('release', () => {
    it('should decrement reserved and increment available', async () => {
      prisma.stockRecord.findUnique.mockResolvedValue({
        available: 4,
        reserved: 3,
      });
      prisma.stockRecord.update.mockResolvedValue({
        available: 5,
        reserved: 2,
      });

      const result = await service.release('fig-1', 'branch-1');

      expect(result.available).toBe(5);
      expect(result.reserved).toBe(2);
    });

    it('should throw when no reserved stock exists', async () => {
      prisma.stockRecord.findUnique.mockResolvedValue({
        available: 5,
        reserved: 0,
      });

      await expect(
        service.release('fig-1', 'branch-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('pickup', () => {
    it('should decrement reserved and increment pickedUp', async () => {
      prisma.stockRecord.findUnique.mockResolvedValue({
        reserved: 3,
        pickedUp: 1,
      });
      prisma.stockRecord.update.mockResolvedValue({
        reserved: 2,
        pickedUp: 2,
      });

      const result = await service.pickup('fig-1', 'branch-1');

      expect(result.reserved).toBe(2);
      expect(result.pickedUp).toBe(2);
    });

    it('should throw when no reserved stock to pick up', async () => {
      prisma.stockRecord.findUnique.mockResolvedValue({
        reserved: 0,
        pickedUp: 5,
      });

      await expect(
        service.pickup('fig-1', 'branch-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('transfer', () => {
    it('should create transfer and adjust stock levels', async () => {
      prisma.stockRecord.findUnique.mockResolvedValue({
        available: 20,
        reserved: 5,
      });
      prisma.$transaction.mockResolvedValue([
        {
          id: 'transfer-1',
          figureId: 'fig-1',
          fromBranchId: 'branch-1',
          toBranchId: 'branch-2',
          quantity: 10,
          status: 'IN_TRANSIT',
        },
      ]);

      const result = await service.transfer(
        'fig-1',
        'branch-1',
        'branch-2',
        10,
        'admin-1',
      );

      expect(result.status).toBe('IN_TRANSIT');
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw when insufficient source stock', async () => {
      prisma.stockRecord.findUnique.mockResolvedValue({
        available: 5,
        reserved: 2,
      });

      await expect(
        service.transfer('fig-1', 'branch-1', 'branch-2', 10, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getLevel', () => {
    it('should return stock levels for a branch', async () => {
      prisma.stockRecord.findMany.mockResolvedValue([
        {
          figureId: 'fig-1',
          available: 5,
          reserved: 2,
          pickedUp: 3,
          figure: {
            name: 'Knight',
            rarity: 'COMMON',
            series: { name: 'Urban Warriors' },
          },
        },
      ]);

      const result = await service.getLevel('branch-1');

      expect(result).toHaveLength(1);
      expect(result[0].figureName).toBe('Knight');
      expect(result[0].available).toBe(5);
    });
  });
});
