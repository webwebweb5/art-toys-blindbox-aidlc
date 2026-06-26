import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PurchaseService } from './purchase.service';

describe('PurchaseService', () => {
  let service: PurchaseService;
  let prisma: any;
  let paymentService: any;
  let randomizationService: any;
  let pityService: any;
  let eventEmitter: any;

  const mockSeries = {
    id: 'series-1',
    name: 'Urban Warriors',
    status: 'PUBLISHED',
    pricePerBox: 10.0,
    figureCount: 12,
    figures: [
      { id: 'fig-1', name: 'Knight', rarity: 'COMMON', probability: 40 },
      { id: 'fig-2', name: 'Mage', rarity: 'UNCOMMON', probability: 30 },
      { id: 'fig-3', name: 'Dragon', rarity: 'RARE', probability: 20 },
      { id: 'fig-4', name: 'Secret', rarity: 'SECRET', probability: 10 },
    ],
  };

  beforeEach(() => {
    prisma = {
      series: { findUnique: vi.fn() },
      order: {
        create: vi.fn(),
        update: vi.fn(),
        findUnique: vi.fn(),
      },
      pullRecord: { create: vi.fn() },
    };

    paymentService = {
      createPaymentIntent: vi.fn().mockResolvedValue({
        clientSecret: 'pi_secret_xxx',
        paymentIntentId: 'pi_123',
      }),
    };

    randomizationService = {
      determineFigure: vi.fn(),
      multiPullNoDuplicates: vi.fn(),
    };

    pityService = {
      getAdjustedProbabilities: vi.fn(),
      getPityCount: vi.fn(),
      incrementCounter: vi.fn(),
      resetCounter: vi.fn(),
    };

    eventEmitter = {
      emit: vi.fn(),
    };

    service = new PurchaseService(
      prisma as any,
      paymentService as any,
      randomizationService as any,
      pityService as any,
      eventEmitter as any,
    );
  });

  describe('buyBlindBox', () => {
    it('should create order and return payment intent', async () => {
      prisma.series.findUnique.mockResolvedValue(mockSeries);
      prisma.order.create.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
        seriesId: 'series-1',
      });
      prisma.order.update.mockResolvedValue({});

      const result = await service.buyBlindBox('user-1', 'series-1');

      expect(result.orderId).toBe('order-1');
      expect(result.paymentIntentClientSecret).toBe('pi_secret_xxx');
      expect(paymentService.createPaymentIntent).toHaveBeenCalledWith(
        'order-1',
        10.0,
      );
    });

    it('should throw if series not found', async () => {
      prisma.series.findUnique.mockResolvedValue(null);

      await expect(
        service.buyBlindBox('user-1', 'nonexistent'),
      ).rejects.toThrow();
    });
  });

  describe('buyMultiPull', () => {
    it('should create multi-pull order with correct total', async () => {
      prisma.series.findUnique.mockResolvedValue(mockSeries);
      prisma.order.create.mockResolvedValue({
        id: 'order-2',
        userId: 'user-1',
        seriesId: 'series-1',
      });
      prisma.order.update.mockResolvedValue({});

      const result = await service.buyMultiPull('user-1', 'series-1', 6);

      expect(result.orderId).toBe('order-2');
      expect(paymentService.createPaymentIntent).toHaveBeenCalledWith(
        'order-2',
        60.0,
      );
    });

    it('should throw if quantity exceeds figure count', async () => {
      prisma.series.findUnique.mockResolvedValue(mockSeries);

      await expect(
        service.buyMultiPull('user-1', 'series-1', 20),
      ).rejects.toThrow();
    });
  });

  describe('completePurchase', () => {
    it('should determine figure, create pull record, and emit event', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-1',
        seriesId: 'series-1',
        type: 'SINGLE',
        quantity: 1,
        series: mockSeries,
      };

      prisma.order.findUnique.mockResolvedValue(order);
      pityService.getAdjustedProbabilities.mockResolvedValue(
        new Map([
          ['fig-1', 40],
          ['fig-2', 30],
          ['fig-3', 20],
          ['fig-4', 10],
        ]),
      );
      randomizationService.determineFigure.mockReturnValue({
        id: 'fig-3',
        name: 'Dragon',
        rarity: 'RARE',
        probability: 20,
      });
      pityService.getPityCount.mockResolvedValue(25);
      prisma.pullRecord.create.mockResolvedValue({
        id: 'pull-1',
        figureId: 'fig-3',
        rarity: 'RARE',
      });

      const result = await service.completePurchase('order-1');

      expect(result.pulls).toHaveLength(1);
      expect(pityService.resetCounter).toHaveBeenCalledWith(
        'user-1',
        'series-1',
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'purchase.completed',
        expect.objectContaining({ orderId: 'order-1' }),
      );
    });

    it('should increment pity on common pull', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-1',
        seriesId: 'series-1',
        type: 'SINGLE',
        quantity: 1,
        series: mockSeries,
      };

      prisma.order.findUnique.mockResolvedValue(order);
      pityService.getAdjustedProbabilities.mockResolvedValue(new Map());
      randomizationService.determineFigure.mockReturnValue({
        id: 'fig-1',
        name: 'Knight',
        rarity: 'COMMON',
        probability: 40,
      });
      pityService.getPityCount.mockResolvedValue(5);
      prisma.pullRecord.create.mockResolvedValue({
        id: 'pull-1',
        figureId: 'fig-1',
        rarity: 'COMMON',
      });

      await service.completePurchase('order-1');

      expect(pityService.incrementCounter).toHaveBeenCalledWith(
        'user-1',
        'series-1',
      );
    });

    it('should use multiPullNoDuplicates for multi-pull orders', async () => {
      const order = {
        id: 'order-1',
        userId: 'user-1',
        seriesId: 'series-1',
        type: 'MULTI_PULL',
        quantity: 3,
        series: mockSeries,
      };

      prisma.order.findUnique.mockResolvedValue(order);
      randomizationService.multiPullNoDuplicates.mockReturnValue([
        { id: 'fig-1', name: 'Knight', rarity: 'COMMON', probability: 40 },
        { id: 'fig-2', name: 'Mage', rarity: 'UNCOMMON', probability: 30 },
        { id: 'fig-3', name: 'Dragon', rarity: 'RARE', probability: 20 },
      ]);
      pityService.getPityCount.mockResolvedValue(0);
      prisma.pullRecord.create.mockResolvedValue({
        id: 'pull-x',
        figureId: 'fig-x',
        rarity: 'COMMON',
      });

      await service.completePurchase('order-1');

      expect(
        randomizationService.multiPullNoDuplicates,
      ).toHaveBeenCalledWith(expect.any(Array), 3);
    });
  });
});
