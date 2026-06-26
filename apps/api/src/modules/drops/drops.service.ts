import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDropDto } from './dto/create-drop.dto';

@Injectable()
export class DropsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateDropDto) {
    return this.prisma.dropEvent.create({
      data: {
        seriesId: dto.seriesId,
        name: dto.name,
        startsAt: new Date(dto.startsAt),
        totalQuantity: dto.totalQuantity,
        remainingQuantity: dto.totalQuantity,
        perPersonLimit: dto.perPersonLimit,
        earlyAccessMinutes: dto.earlyAccessMinutes,
        earlyAccessMinTier: dto.earlyAccessMinTier,
        status: 'SCHEDULED',
      },
    });
  }

  async getActive() {
    const now = new Date();
    return this.prisma.dropEvent.findMany({
      where: {
        status: { in: ['SCHEDULED', 'ACTIVE'] },
      },
      include: {
        series: {
          select: { name: true, coverImage: true, pricePerBox: true },
        },
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async getById(id: string) {
    const drop = await this.prisma.dropEvent.findUnique({
      where: { id },
      include: { series: true },
    });

    if (!drop) {
      throw new NotFoundException({
        code: 'DROP_NOT_FOUND',
        message: 'Drop event not found',
      });
    }

    return drop;
  }

  /**
   * Enforce per-person purchase limit for a drop.
   * Returns true if the user can still purchase.
   */
  async enforcePurchaseLimit(
    userId: string,
    dropId: string,
  ): Promise<boolean> {
    const drop = await this.prisma.dropEvent.findUnique({
      where: { id: dropId },
    });

    if (!drop) return false;

    const record = await this.prisma.dropPurchaseRecord.findUnique({
      where: { dropEventId_userId: { dropEventId: dropId, userId } },
    });

    const currentCount = record?.purchaseCount ?? 0;
    return currentCount < drop.perPersonLimit;
  }

  /**
   * Activate a scheduled drop event.
   */
  async activate(dropId: string) {
    const drop = await this.prisma.dropEvent.update({
      where: { id: dropId },
      data: { status: 'ACTIVE' },
    });

    this.eventEmitter.emit('drop.started', {
      dropId: drop.id,
      name: drop.name,
      seriesId: drop.seriesId,
    });

    return drop;
  }

  /**
   * End a drop event.
   */
  async end(dropId: string, reason: string = 'SOLD_OUT') {
    const drop = await this.prisma.dropEvent.update({
      where: { id: dropId },
      data: { status: 'ENDED', endsAt: new Date() },
    });

    this.eventEmitter.emit('drop.ended', {
      dropId: drop.id,
      reason,
    });

    return drop;
  }
}
