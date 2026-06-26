import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface HistoryFilters {
  seriesId?: string;
  rarity?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getHistory(userId: string, filters: HistoryFilters = {}) {
    const { seriesId, rarity, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (seriesId) where.seriesId = seriesId;
    if (rarity) where.rarity = rarity;

    const [records, total] = await Promise.all([
      this.prisma.pullRecord.findMany({
        where,
        include: {
          series: { select: { name: true } },
          figure: { select: { name: true, image: true, rarity: true } },
          voucher: { select: { status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pullRecord.count({ where }),
    ]);

    return {
      data: records.map((r) => ({
        id: r.id,
        series: r.series.name,
        figure: r.figure.name,
        image: r.figure.image,
        rarity: r.figure.rarity,
        date: r.createdAt,
        voucherStatus: r.voucher?.status ?? null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
