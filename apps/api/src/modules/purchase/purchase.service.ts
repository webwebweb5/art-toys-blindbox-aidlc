import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from './payment/payment.service';
import { RandomizationService } from './randomization/randomization.service';
import { PityService } from './pity/pity.service';

@Injectable()
export class PurchaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly randomizationService: RandomizationService,
    private readonly pityService: PityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Initiate a single blind box purchase.
   * Creates an order and a Stripe payment intent.
   */
  async buyBlindBox(userId: string, seriesId: string) {
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: { figures: true },
    });

    if (!series || series.status !== 'PUBLISHED') {
      throw new NotFoundException({
        code: 'SERIES_NOT_FOUND',
        message: 'Series not found or not available',
      });
    }

    // Create order
    const order = await this.prisma.order.create({
      data: {
        userId,
        seriesId,
        type: 'SINGLE',
        quantity: 1,
        totalAmount: series.pricePerBox,
        stripePaymentIntentId: '', // placeholder, updated below
        status: 'PENDING',
      },
    });

    // Dev/mock mode: complete the purchase immediately without Stripe.
    if (this.paymentService.isMockMode()) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', stripePaymentIntentId: `mock_${order.id}` },
      });
      const result = await this.completePurchase(order.id);
      return { orderId: order.id, mock: true, pulls: result.pulls };
    }

    // Create payment intent
    const { clientSecret, paymentIntentId } =
      await this.paymentService.createPaymentIntent(
        order.id,
        Number(series.pricePerBox),
      );

    // Update order with the payment intent ID
    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: paymentIntentId },
    });

    return {
      orderId: order.id,
      paymentIntentClientSecret: clientSecret,
    };
  }

  /**
   * Initiate a multi-pull purchase.
   */
  async buyMultiPull(userId: string, seriesId: string, count: number) {
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: { figures: true },
    });

    if (!series || series.status !== 'PUBLISHED') {
      throw new NotFoundException({
        code: 'SERIES_NOT_FOUND',
        message: 'Series not found or not available',
      });
    }

    if (count > series.figureCount) {
      throw new ConflictException({
        code: 'INVALID_QUANTITY',
        message: `Multi-pull quantity cannot exceed ${series.figureCount}`,
      });
    }

    const totalAmount = Number(series.pricePerBox) * count;

    const order = await this.prisma.order.create({
      data: {
        userId,
        seriesId,
        type: 'MULTI_PULL',
        quantity: count,
        totalAmount,
        stripePaymentIntentId: '',
        status: 'PENDING',
      },
    });

    // Dev/mock mode: complete the purchase immediately without Stripe.
    if (this.paymentService.isMockMode()) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAID', stripePaymentIntentId: `mock_${order.id}` },
      });
      const result = await this.completePurchase(order.id);
      return { orderId: order.id, mock: true, pulls: result.pulls };
    }

    const { clientSecret, paymentIntentId } =
      await this.paymentService.createPaymentIntent(order.id, totalAmount);

    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentIntentId: paymentIntentId },
    });

    return {
      orderId: order.id,
      paymentIntentClientSecret: clientSecret,
    };
  }

  /**
   * Complete a purchase after payment succeeds.
   * Called by the payment webhook handler.
   * Determines figure(s) using randomization + pity, creates pull records.
   */
  async completePurchase(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { series: { include: { figures: true } } },
    });

    if (!order) {
      throw new NotFoundException({
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      });
    }

    const figures = order.series.figures.map((f) => ({
      id: f.id,
      name: f.name,
      rarity: f.rarity,
      probability: Number(f.probability),
    }));

    let selectedFigures;

    if (order.type === 'MULTI_PULL') {
      selectedFigures = this.randomizationService.multiPullNoDuplicates(
        figures,
        order.quantity,
      );
    } else {
      // Single pull with pity adjustment
      const adjustedProbabilities =
        await this.pityService.getAdjustedProbabilities(
          order.userId,
          order.seriesId,
          figures,
        );
      const selected = this.randomizationService.determineFigure(
        figures,
        adjustedProbabilities,
      );
      selectedFigures = [selected];
    }

    // Create pull records and update pity
    const pullRecords = [];
    for (const selected of selectedFigures) {
      const pityCount = await this.pityService.getPityCount(
        order.userId,
        order.seriesId,
      );

      const pullRecord = await this.prisma.pullRecord.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          seriesId: order.seriesId,
          figureId: selected.id,
          rarity: selected.rarity as any,
          pityCountAtPull: pityCount,
        },
      });

      // Update pity counter based on rarity
      if (selected.rarity === 'RARE' || selected.rarity === 'SECRET') {
        await this.pityService.resetCounter(order.userId, order.seriesId);
      } else {
        await this.pityService.incrementCounter(order.userId, order.seriesId);
      }

      pullRecords.push(pullRecord);
    }

    // Emit purchase completed event
    this.eventEmitter.emit('purchase.completed', {
      orderId: order.id,
      userId: order.userId,
      seriesId: order.seriesId,
      pullRecords: pullRecords.map((pr) => ({
        pullRecordId: pr.id,
        figureId: pr.figureId,
        rarity: pr.rarity,
      })),
    });

    return {
      orderId: order.id,
      pulls: pullRecords,
    };
  }
}
