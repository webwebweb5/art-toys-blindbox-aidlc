import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../account/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../account/auth/guards/roles.guard';
import { CurrentUser } from '../account/auth/decorators/current-user.decorator';
import { PurchaseService } from './purchase.service';
import { HistoryService } from './history/history.service';
import { PityService } from './pity/pity.service';

@Controller('purchase')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseController {
  constructor(
    private readonly purchaseService: PurchaseService,
    private readonly historyService: HistoryService,
    private readonly pityService: PityService,
  ) {}

  @Post('single')
  async buySingle(
    @CurrentUser('id') userId: string,
    @Body() body: { seriesId: string },
  ) {
    return this.purchaseService.buyBlindBox(userId, body.seriesId);
  }

  @Post('multi')
  async buyMulti(
    @CurrentUser('id') userId: string,
    @Body() body: { seriesId: string; quantity: number },
  ) {
    return this.purchaseService.buyMultiPull(
      userId,
      body.seriesId,
      body.quantity,
    );
  }

  @Get(':orderId/reveal')
  async getReveal(
    @CurrentUser('id') userId: string,
    @Param('orderId') orderId: string,
  ) {
    const pullRecords = await this.historyService.getHistory(userId, {
      page: 1,
      limit: 100,
    });

    // Filter pulls for this specific order
    const order = await this.purchaseService['prisma'].order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.userId !== userId) {
      return { pulls: [] };
    }

    const pulls = await this.purchaseService['prisma'].pullRecord.findMany({
      where: { orderId },
      include: {
        figure: { select: { name: true, image: true, rarity: true } },
      },
    });

    return {
      pulls: pulls.map((p: any) => ({
        pullRecordId: p.id,
        figure: {
          name: p.figure.name,
          image: p.figure.image,
          rarity: p.figure.rarity,
        },
        animationTier: p.figure.rarity.toLowerCase(),
        isNew: true,
      })),
    };
  }

  @Get('history')
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('seriesId') seriesId?: string,
    @Query('rarity') rarity?: string,
  ) {
    return this.historyService.getHistory(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      seriesId,
      rarity,
    });
  }

  @Get('pity/:seriesId')
  async getPityInfo(
    @CurrentUser('id') userId: string,
    @Param('seriesId') seriesId: string,
  ) {
    const counter = await this.pityService.getPityCount(userId, seriesId);

    const series = await this.purchaseService['prisma'].series.findUnique({
      where: { id: seriesId },
      select: { pityThreshold: true, pityMultiplier: true },
    });

    const threshold = series?.pityThreshold ?? 50;
    const currentMultiplier =
      counter >= threshold ? Number(series?.pityMultiplier ?? 2.0) : 1.0;

    return {
      counter,
      threshold,
      currentMultiplier,
    };
  }
}
