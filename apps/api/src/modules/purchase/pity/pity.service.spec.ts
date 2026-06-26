import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PityService } from './pity.service';

describe('PityService', () => {
  let service: PityService;
  let redis: any;
  let prisma: any;

  beforeEach(() => {
    redis = {
      get: vi.fn(),
      set: vi.fn(),
    };

    prisma = {
      pityTracker: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
      series: {
        findUnique: vi.fn(),
      },
    };

    service = new PityService(redis, prisma);
  });

  describe('getPityCount', () => {
    it('should return count from Redis if cached', async () => {
      redis.get.mockResolvedValue('15');

      const result = await service.getPityCount('user-1', 'series-1');
      expect(result).toBe(15);
      expect(prisma.pityTracker.findUnique).not.toHaveBeenCalled();
    });

    it('should fallback to DB when Redis cache miss', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pityTracker.findUnique.mockResolvedValue({
        userId: 'user-1',
        seriesId: 'series-1',
        counter: 23,
      });

      const result = await service.getPityCount('user-1', 'series-1');
      expect(result).toBe(23);
      expect(redis.set).toHaveBeenCalled();
    });

    it('should return 0 when no tracker exists', async () => {
      redis.get.mockResolvedValue(null);
      prisma.pityTracker.findUnique.mockResolvedValue(null);

      const result = await service.getPityCount('user-1', 'series-1');
      expect(result).toBe(0);
    });
  });

  describe('getAdjustedProbabilities', () => {
    const figures = [
      { id: 'fig-1', rarity: 'COMMON', probability: 40 },
      { id: 'fig-2', rarity: 'UNCOMMON', probability: 30 },
      { id: 'fig-3', rarity: 'RARE', probability: 20 },
      { id: 'fig-4', rarity: 'SECRET', probability: 10 },
    ];

    it('should not adjust when counter < threshold', async () => {
      redis.get.mockResolvedValue('10');
      prisma.series.findUnique.mockResolvedValue({
        pityThreshold: 50,
        pityMultiplier: 2.0,
      });

      const result = await service.getAdjustedProbabilities(
        'user-1',
        'series-1',
        figures,
      );

      expect(result.get('fig-1')).toBe(40);
      expect(result.get('fig-4')).toBe(10);
    });

    it('should apply multiplier when counter >= threshold', async () => {
      redis.get.mockResolvedValue('50');
      prisma.series.findUnique.mockResolvedValue({
        pityThreshold: 50,
        pityMultiplier: 2.0,
      });

      const result = await service.getAdjustedProbabilities(
        'user-1',
        'series-1',
        figures,
      );

      // After pity: RARE=40, SECRET=20, COMMON=40, UNCOMMON=30 → total=130
      // Normalized: COMMON=40/130≈0.308, UNCOMMON=30/130≈0.231, RARE=40/130≈0.308, SECRET=20/130≈0.154
      const rareProb = result.get('fig-3')!;
      const secretProb = result.get('fig-4')!;
      const commonProb = result.get('fig-1')!;

      // Rare and secret should have higher relative probability
      expect(rareProb).toBeGreaterThan(commonProb * 0.5);
      expect(secretProb).toBeGreaterThan(figures[3].probability / 130);
      // Total should sum to ~1
      let total = 0;
      for (const [, v] of result) total += v;
      expect(total).toBeCloseTo(1.0, 5);
    });

    it('should use default threshold when series not found', async () => {
      redis.get.mockResolvedValue('49');
      prisma.series.findUnique.mockResolvedValue(null);

      const result = await service.getAdjustedProbabilities(
        'user-1',
        'series-1',
        figures,
      );

      // No adjustment (counter 49 < default threshold 50)
      expect(result.get('fig-1')).toBe(40);
    });
  });

  describe('incrementCounter', () => {
    it('should increment in DB and update Redis', async () => {
      prisma.pityTracker.upsert.mockResolvedValue({
        userId: 'user-1',
        seriesId: 'series-1',
        counter: 6,
      });

      const result = await service.incrementCounter('user-1', 'series-1');

      expect(result).toBe(6);
      expect(prisma.pityTracker.upsert).toHaveBeenCalledWith({
        where: { userId_seriesId: { userId: 'user-1', seriesId: 'series-1' } },
        create: { userId: 'user-1', seriesId: 'series-1', counter: 1 },
        update: { counter: { increment: 1 } },
      });
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('user-1:series-1'),
        '6',
        'EX',
        expect.any(Number),
      );
    });
  });

  describe('resetCounter', () => {
    it('should reset in DB and Redis', async () => {
      prisma.pityTracker.upsert.mockResolvedValue({
        userId: 'user-1',
        seriesId: 'series-1',
        counter: 0,
      });

      await service.resetCounter('user-1', 'series-1');

      expect(prisma.pityTracker.upsert).toHaveBeenCalledWith({
        where: { userId_seriesId: { userId: 'user-1', seriesId: 'series-1' } },
        create: { userId: 'user-1', seriesId: 'series-1', counter: 0 },
        update: { counter: 0 },
      });
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('user-1:series-1'),
        '0',
        'EX',
        expect.any(Number),
      );
    });
  });
});
