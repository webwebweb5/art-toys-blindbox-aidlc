import { Module } from '@nestjs/common';
import { PaymentModule } from './payment/payment.module';
import { RandomizationModule } from './randomization/randomization.module';
import { PityModule } from './pity/pity.module';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { HistoryService } from './history/history.service';

@Module({
  imports: [PaymentModule, RandomizationModule, PityModule],
  controllers: [PurchaseController],
  providers: [PurchaseService, HistoryService],
  exports: [PurchaseService, PaymentModule, RandomizationModule, PityModule],
})
export class PurchaseModule {}
