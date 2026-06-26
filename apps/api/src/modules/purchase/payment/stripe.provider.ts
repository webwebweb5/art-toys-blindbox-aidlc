import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export const STRIPE_CLIENT = 'STRIPE_CLIENT';

export const StripeProvider: Provider = {
  provide: STRIPE_CLIENT,
  useFactory: (configService: ConfigService): Stripe => {
    const secretKey = configService.get<string>('STRIPE_SECRET_KEY', '');
    return new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  },
  inject: [ConfigService],
};
