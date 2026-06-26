import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../account/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../account/auth/guards/roles.guard';
import { Roles } from '../../account/auth/decorators/roles.decorator';
import { CurrentUser } from '../../account/auth/decorators/current-user.decorator';
import { VoucherService } from './voucher.service';

@Controller('vouchers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Post()
  async generate(
    @CurrentUser('id') userId: string,
    @Body() body: { pullRecordId: string; branchId: string; figureId: string },
  ) {
    return this.voucherService.generate(
      userId,
      body.pullRecordId,
      body.branchId,
      body.figureId,
    );
  }

  @Post(':id/validate')
  @Roles('STAFF', 'ADMIN')
  async validate(
    @Param('id') id: string,
    @Body() body: { qrToken: string },
  ) {
    return this.voucherService.validate(body.qrToken);
  }

  @Post(':id/redeem')
  @Roles('STAFF', 'ADMIN')
  async redeem(
    @CurrentUser('id') staffId: string,
    @Param('id') id: string,
  ) {
    return this.voucherService.redeem(id, staffId);
  }

  @Post(':id/extend')
  async extend(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.voucherService.extend(id);
  }
}
