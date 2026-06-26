import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PaymentService } from './payment.service';

const mockStripe = {
  paymentIntents: {
    create: vi.fn(),
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

const mockPrisma = {
  order: {
    update: vi.fn(),
  },
};

const mockEventEmitter = {
  emit: vi.fn(),
};

const mockConfigService = {
  get: vi.fn((key: string, defaultVal?: string) => {
    const config: Record<string, string> = {
      STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
    };
    return config[key] ?? defaultVal ?? '';
  }),
};

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    service = new PaymentService(
      mockStripe as any,
      mockConfigService as any,
      mockPrisma as any,
      mockEventEmitter as any,
    );
    vi.clearAllMocks();
  });

  describe('createPaymentIntent', () => {
    it('should create a payment intent and return client secret', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_abc',
      });

      const result = await service.createPaymentIntent('order-123', 9.99);

      expect(result).toEqual({
        clientSecret: 'pi_test_123_secret_abc',
        paymentIntentId: 'pi_test_123',
      });
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 999,
        currency: 'usd',
        metadata: { orderId: 'order-123' },
      });
    });

    it('should convert amount to cents correctly', async () => {
      mockStripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_test',
        client_secret: 'secret',
      });

      await service.createPaymentIntent('order-1', 12.5);

      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1250 }),
      );
    });

    it('should throw InternalServerErrorException on Stripe error', async () => {
      mockStripe.paymentIntents.create.mockRejectedValue(new Error('Stripe error'));

      await expect(service.createPaymentIntent('order-1', 9.99)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('handleWebhook', () => {
    it('should throw BadRequestException for invalid signature', async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleWebhook(Buffer.from('{}'), 'invalid-sig'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle payment_intent.succeeded event', async () => {
      const paymentIntent = {
        id: 'pi_123',
        metadata: { orderId: 'order-123' },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: paymentIntent },
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-123',
        userId: 'user-123',
        seriesId: 'series-123',
        totalAmount: 9.99,
        status: 'PAID',
      });

      await service.handleWebhook(Buffer.from('{}'), 'valid-sig');

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { stripePaymentIntentId: 'pi_123' },
        data: { status: 'PAID' },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('payment.succeeded', {
        orderId: 'order-123',
        userId: 'user-123',
        seriesId: 'series-123',
        amount: 9.99,
      });
    });

    it('should handle payment_intent.payment_failed event', async () => {
      const paymentIntent = {
        id: 'pi_456',
        metadata: { orderId: 'order-456' },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        data: { object: paymentIntent },
      });

      mockPrisma.order.update.mockResolvedValue({
        id: 'order-456',
        status: 'FAILED',
      });

      await service.handleWebhook(Buffer.from('{}'), 'valid-sig');

      expect(mockPrisma.order.update).toHaveBeenCalledWith({
        where: { stripePaymentIntentId: 'pi_456' },
        data: { status: 'FAILED' },
      });
    });
  });
});
