import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { StripeProvider } from './stripe.provider';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, StripeProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
