import { Injectable, Inject, ConflictException } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../redis/redis.module';

const QUEUE_PREFIX = 'drop:queue:';
const WINDOW_PREFIX = 'drop:window:';
const PURCHASE_WINDOW_SECONDS = 300; // 5 minutes

@Injectable()
export class QueueService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private getQueueKey(dropId: string): string {
    return `${QUEUE_PREFIX}${dropId}`;
  }

  private getWindowKey(userId: string, dropId: string): string {
    return `${WINDOW_PREFIX}${dropId}:${userId}`;
  }

  /**
   * Add a user to the drop queue.
   * Uses a Redis sorted set with timestamp as score.
   */
  async enter(userId: string, dropId: string): Promise<number> {
    const queueKey = this.getQueueKey(dropId);

    // Check if already in queue
    const existing = await this.redis.zscore(queueKey, userId);
    if (existing !== null) {
      throw new ConflictException({
        code: 'ALREADY_IN_QUEUE',
        message: 'You are already in the queue',
      });
    }

    // Add to sorted set with current timestamp as score
    const score = Date.now();
    await this.redis.zadd(queueKey, score, userId);

    // Return position (1-indexed)
    const rank = await this.redis.zrank(queueKey, userId);
    return (rank ?? 0) + 1;
  }

  /**
   * Get user's current position in the queue.
   * Returns 0 if not in queue or if they have an active window.
   */
  async getPosition(userId: string, dropId: string): Promise<number> {
    // Check if user has an active purchase window
    const windowKey = this.getWindowKey(userId, dropId);
    const hasWindow = await this.redis.exists(windowKey);
    if (hasWindow) {
      return 0; // Position 0 means they have a window
    }

    const queueKey = this.getQueueKey(dropId);
    const rank = await this.redis.zrank(queueKey, userId);

    if (rank === null) {
      return -1; // Not in queue
    }

    return rank + 1;
  }

  /**
   * Grant a purchase window to a user (5 minutes to complete purchase).
   */
  async grantWindow(userId: string, dropId: string): Promise<void> {
    const windowKey = this.getWindowKey(userId, dropId);
    await this.redis.set(windowKey, '1', 'EX', PURCHASE_WINDOW_SECONDS);

    // Remove from queue
    await this.removeFromQueue(userId, dropId);
  }

  /**
   * Remove a user from the queue (after purchase or timeout).
   */
  async removeFromQueue(userId: string, dropId: string): Promise<void> {
    const queueKey = this.getQueueKey(dropId);
    await this.redis.zrem(queueKey, userId);
  }

  /**
   * Check if a user has an active purchase window.
   */
  async hasActiveWindow(userId: string, dropId: string): Promise<boolean> {
    const windowKey = this.getWindowKey(userId, dropId);
    const exists = await this.redis.exists(windowKey);
    return exists === 1;
  }

  /**
   * Get the total number of people in queue.
   */
  async getQueueSize(dropId: string): Promise<number> {
    const queueKey = this.getQueueKey(dropId);
    return this.redis.zcard(queueKey);
  }

  /**
   * Get the next batch of users to grant windows to.
   */
  async getNextBatch(dropId: string, batchSize: number): Promise<string[]> {
    const queueKey = this.getQueueKey(dropId);
    return this.redis.zrange(queueKey, 0, batchSize - 1);
  }
}
