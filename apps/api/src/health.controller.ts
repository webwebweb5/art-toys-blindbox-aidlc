import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { REDIS_CLIENT } from './redis/redis.module';
import Redis from 'ioredis';

interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'down';
  checks: {
    db: { status: 'ok' | 'down'; latencyMs?: number };
    redis: { status: 'ok' | 'down'; latencyMs?: number };
  };
  timestamp: string;
  service: string;
  version: string;
}

@Controller('api/health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get()
  async check(): Promise<HealthCheckResult> {
    const [dbCheck, redisCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const allUp = dbCheck.status === 'ok' && redisCheck.status === 'ok';
    const allDown = dbCheck.status === 'down' && redisCheck.status === 'down';

    let status: 'ok' | 'degraded' | 'down';
    if (allUp) {
      status = 'ok';
    } else if (allDown) {
      status = 'down';
    } else {
      status = 'degraded';
    }

    return {
      status,
      checks: {
        db: dbCheck,
        redis: redisCheck,
      },
      timestamp: new Date().toISOString(),
      service: 'art-toys-api',
      version: '0.1.0',
    };
  }

  private async checkDatabase(): Promise<{ status: 'ok' | 'down'; latencyMs?: number }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      return { status: 'ok', latencyMs };
    } catch {
      return { status: 'down' };
    }
  }

  private async checkRedis(): Promise<{ status: 'ok' | 'down'; latencyMs?: number }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latencyMs = Date.now() - start;
      return { status: 'ok', latencyMs };
    } catch {
      return { status: 'down' };
    }
  }
}
