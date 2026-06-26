import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.module';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DEFAULT_THRESHOLD,
  DEFAULT_MULTIPLIER,
  PITY_REDIS_PREFIX,
  PITY_REDIS_TTL,
} from './pity.constants';
import { applyPityAdjustment } from '../randomization/probability.util';

export interface FigureWithProbability {
  id: string;
  rarity: string;
  probability: number;
}

@Injectable()
export class PityService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  private getRedisKey(userId: string, seriesId: string): string {
    return `${PITY_REDIS_PREFIX}${userId}:${seriesId}`;
  }

  /**
   * Get the current pity counter for a user+series.
   * Reads from Redis first, falls back to DB.
   */
  async getPityCount(userId: string, seriesId: string): Promise<number> {
    const redisKey = this.getRedisKey(userId, seriesId);
    const cached = await this.redis.get(redisKey);

    if (cached !== null) {
      return parseInt(cached, 10);
    }

    // Fallback to DB
    const tracker = await this.prisma.pityTracker.findUnique({
      where: { userId_seriesId: { userId, seriesId } },
    });

    const count = tracker?.counter ?? 0;

    // Warm the cache
    await this.redis.set(redisKey, count.toString(), 'EX', PITY_REDIS_TTL);

    return count;
  }

  /**
   * Get adjusted probabilities based on pity counter.
   * If counter >= threshold, applies the pity multiplier to rare/secret figures.
   */
  async getAdjustedProbabilities(
    userId: string,
    seriesId: string,
    figures: FigureWithProbability[],
  ): Promise<Map<string, number>> {
    const counter = await this.getPityCount(userId, seriesId);

    // Look up series-specific threshold and multiplier
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      select: { pityThreshold: true, pityMultiplier: true },
    });

    const threshold = series?.pityThreshold ?? DEFAULT_THRESHOLD;
    const multiplier = series
      ? Number(series.pityMultiplier)
      : DEFAULT_MULTIPLIER;

    const result = new Map<string, number>();

    if (counter < threshold) {
      // No pity adjustment needed — return original probabilities
      for (const figure of figures) {
        result.set(figure.id, figure.probability);
      }
      return result;
    }

    // Apply pity adjustment
    const probabilities = figures.map((f) => f.probability);
    const rarities = figures.map((f) => f.rarity);
    const adjusted = applyPityAdjustment(probabilities, rarities, multiplier);

    figures.forEach((figure, index) => {
      result.set(figure.id, adjusted[index]);
    });

    return result;
  }

  /**
   * Increment pity counter (on common/uncommon pull).
   * Write-through: updates both Redis and DB simultaneously.
   */
  async incrementCounter(userId: string, seriesId: string): Promise<number> {
    const redisKey = this.getRedisKey(userId, seriesId);

    // Upsert in DB
    const tracker = await this.prisma.pityTracker.upsert({
      where: { userId_seriesId: { userId, seriesId } },
      create: { userId, seriesId, counter: 1 },
      update: { counter: { increment: 1 } },
    });

    // Update Redis
    await this.redis.set(
      redisKey,
      tracker.counter.toString(),
      'EX',
      PITY_REDIS_TTL,
    );

    return tracker.counter;
  }

  /**
   * Reset pity counter (on rare/secret pull).
   * Write-through: updates both Redis and DB simultaneously.
   */
  async resetCounter(userId: string, seriesId: string): Promise<void> {
    const redisKey = this.getRedisKey(userId, seriesId);

    // Reset in DB
    await this.prisma.pityTracker.upsert({
      where: { userId_seriesId: { userId, seriesId } },
      create: { userId, seriesId, counter: 0 },
      update: { counter: 0 },
    });

    // Reset in Redis
    await this.redis.set(redisKey, '0', 'EX', PITY_REDIS_TTL);
  }
}
