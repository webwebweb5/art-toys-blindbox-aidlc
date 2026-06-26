import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BranchService } from './branch/branch.service';
import { BranchController } from './branch/branch.controller';
import { StockService } from './stock/stock.service';
import { StockController } from './stock/stock.controller';
import { VoucherService } from './voucher/voucher.service';
import { VoucherController } from './voucher/voucher.controller';
import { QrGeneratorService } from './voucher/qr-generator.service';
import { VoucherExpiryCron } from './voucher/voucher-expiry.cron';

@Module({
  imports: [
    JwtModule.register({}),
  ],
  controllers: [BranchController, StockController, VoucherController],
  providers: [
    BranchService,
    StockService,
    VoucherService,
    QrGeneratorService,
    VoucherExpiryCron,
  ],
  exports: [BranchService, StockService, VoucherService],
})
export class BranchModule {}
