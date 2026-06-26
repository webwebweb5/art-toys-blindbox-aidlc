import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';

@Injectable()
export class SeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, status?: string) {
    const where = status ? { status: status as any } : { status: 'PUBLISHED' as const };
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.series.findMany({
        where,
        skip,
        take: limit,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          name: true,
          artist: true,
          pricePerBox: true,
          figureCount: true,
          coverImage: true,
          status: true,
          publishedAt: true,
        },
      }),
      this.prisma.series.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const series = await this.prisma.series.findUnique({
      where: { id },
      include: {
        figures: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            image: true,
            rarity: true,
            probability: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!series) {
      throw new NotFoundException({
        code: 'SERIES_NOT_FOUND',
        message: `Series with id ${id} not found`,
      });
    }

    return series;
  }

  async create(dto: CreateSeriesDto) {
    // Validate probability sum equals 100%
    const probSum = dto.figures.reduce((sum, f) => sum + f.probability, 0);
    if (Math.abs(probSum - 100) > 0.01) {
      throw new ConflictException({
        code: 'PROBABILITY_SUM_INVALID',
        message: `Figure probabilities must sum to 100%. Current sum: ${probSum}%`,
        details: { currentSum: probSum, expected: 100 },
      });
    }

    const series = await this.prisma.series.create({
      data: {
        name: dto.name,
        artist: dto.artist,
        description: dto.description,
        pricePerBox: dto.pricePerBox,
        figureCount: dto.figures.length,
        coverImage: dto.coverImage ?? '',
        pityThreshold: dto.pityThreshold,
        pityMultiplier: dto.pityMultiplier,
        figures: {
          create: dto.figures.map((f) => ({
            name: f.name,
            image: f.image ?? '',
            rarity: f.rarity,
            probability: f.probability,
            sortOrder: f.sortOrder,
          })),
        },
      },
      include: {
        figures: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return series;
  }

  /**
   * Admin listing — returns ALL statuses (DRAFT/PUBLISHED/ARCHIVED).
   */
  async findAllAdmin(page = 1, limit = 50, status?: string) {
    const where = status ? { status: status as any } : {};
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.series.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          artist: true,
          pricePerBox: true,
          figureCount: true,
          coverImage: true,
          status: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.series.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Update series details. Figures can only be replaced while the series
   * is DRAFT (replacing figures on a live series would break existing
   * pulls/vouchers). Series-level fields can be edited in any status.
   */
  async update(id: string, dto: UpdateSeriesDto) {
    const series = await this.prisma.series.findUnique({
      where: { id },
      include: { figures: true },
    });

    if (!series) {
      throw new NotFoundException({
        code: 'SERIES_NOT_FOUND',
        message: `Series with id ${id} not found`,
      });
    }

    if (dto.figures && series.status !== 'DRAFT') {
      throw new BadRequestException({
        code: 'FIGURES_LOCKED',
        message: 'Figures can only be edited while the series is in DRAFT status',
      });
    }

    if (dto.figures) {
      const probSum = dto.figures.reduce((sum, f) => sum + f.probability, 0);
      if (Math.abs(probSum - 100) > 0.01) {
        throw new ConflictException({
          code: 'PROBABILITY_SUM_INVALID',
          message: `Figure probabilities must sum to 100%. Current sum: ${probSum}%`,
          details: { currentSum: probSum, expected: 100 },
        });
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.series.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.artist !== undefined ? { artist: dto.artist } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.pricePerBox !== undefined ? { pricePerBox: dto.pricePerBox } : {}),
          ...(dto.coverImage !== undefined ? { coverImage: dto.coverImage } : {}),
          ...(dto.pityThreshold !== undefined ? { pityThreshold: dto.pityThreshold } : {}),
          ...(dto.pityMultiplier !== undefined ? { pityMultiplier: dto.pityMultiplier } : {}),
        },
      });

      if (dto.figures) {
        await tx.figure.deleteMany({ where: { seriesId: id } });
        await tx.figure.createMany({
          data: dto.figures.map((f) => ({
            seriesId: id,
            name: f.name,
            image: f.image ?? '',
            rarity: f.rarity,
            probability: f.probability,
            sortOrder: f.sortOrder,
          })),
        });
        await tx.series.update({
          where: { id },
          data: { figureCount: dto.figures.length },
        });
      }

      return tx.series.findUnique({
        where: { id },
        include: { figures: { orderBy: { sortOrder: 'asc' } } },
      });
    });

    return updated;
  }

  /**
   * Archive a series — hides it from the catalog without deleting data.
   */
  async archive(id: string) {
    const series = await this.prisma.series.findUnique({ where: { id } });
    if (!series) {
      throw new NotFoundException({
        code: 'SERIES_NOT_FOUND',
        message: `Series with id ${id} not found`,
      });
    }
    return this.prisma.series.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  /**
   * Delete a series. Only series with no orders/pulls can be deleted.
   */
  async remove(id: string) {
    const series = await this.prisma.series.findUnique({
      where: { id },
      include: { _count: { select: { pullRecords: true, orders: true } } },
    });

    if (!series) {
      throw new NotFoundException({
        code: 'SERIES_NOT_FOUND',
        message: `Series with id ${id} not found`,
      });
    }

    if (series._count.pullRecords > 0 || series._count.orders > 0) {
      throw new BadRequestException({
        code: 'SERIES_HAS_ACTIVITY',
        message: 'Cannot delete a series that has orders or pulls. Archive it instead.',
      });
    }

    await this.prisma.$transaction([
      this.prisma.figure.deleteMany({ where: { seriesId: id } }),
      this.prisma.series.delete({ where: { id } }),
    ]);

    return { id, deleted: true };
  }

  async publish(id: string) {
    const series = await this.prisma.series.findUnique({
      where: { id },
      include: { figures: true },
    });

    if (!series) {
      throw new NotFoundException({
        code: 'SERIES_NOT_FOUND',
        message: `Series with id ${id} not found`,
      });
    }

    if (series.status === 'PUBLISHED') {
      throw new BadRequestException({
        code: 'SERIES_ALREADY_PUBLISHED',
        message: 'Series is already published',
      });
    }

    if (series.figures.length === 0) {
      throw new BadRequestException({
        code: 'SERIES_NO_FIGURES',
        message: 'Cannot publish a series without figures',
      });
    }

    // Validate probabilities sum to 100
    const probSum = series.figures.reduce(
      (sum, f) => sum + Number(f.probability),
      0,
    );
    if (Math.abs(probSum - 100) > 0.01) {
      throw new ConflictException({
        code: 'PROBABILITY_SUM_INVALID',
        message: `Figure probabilities must sum to 100% before publishing. Current sum: ${probSum}%`,
      });
    }

    const updated = await this.prisma.series.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    return updated;
  }
}
