import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import { STRIPE_CLIENT } from './stripe.provider';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Returns true when Stripe is not configured with real keys.
   * In this mode the purchase flow is completed server-side without
   * calling Stripe (useful for local dev / demo). Configure a real
   * STRIPE_SECRET_KEY to enable the full Stripe payment flow.
   */
  isMockMode(): boolean {
    const key = this.configService.get<string>('STRIPE_SECRET_KEY', '');
    return !key || key.includes('xxx') || !key.startsWith('sk_');
  }

  async createPaymentIntent(orderId: string, amount: number) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        metadata: { orderId },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      throw new InternalServerErrorException({
        code: 'PAYMENT_INTENT_FAILED',
        message: 'Failed to create payment intent',
      });
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
      '',
    );

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      throw new BadRequestException({
        code: 'WEBHOOK_SIGNATURE_INVALID',
        message: 'Invalid webhook signature',
      });
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(
          event.data.object as Stripe.PaymentIntent,
        );
        break;
      default:
        // Unhandled event type
        break;
    }
  }

  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    const orderId = paymentIntent.metadata.orderId;
    if (!orderId) return;

    const order = await this.prisma.order.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: 'PAID' },
    });

    this.eventEmitter.emit('payment.succeeded', {
      orderId: order.id,
      userId: order.userId,
      seriesId: order.seriesId,
      amount: Number(order.totalAmount),
    });
  }

  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    await this.prisma.order.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: { status: 'FAILED' },
    });
  }
}
