import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../account/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../account/auth/guards/roles.guard';
import { Roles } from '../../account/auth/decorators/roles.decorator';
import { CurrentUser } from '../../account/auth/decorators/current-user.decorator';
import { StockService } from './stock.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('admin/stock/allocate')
  @Roles('ADMIN')
  async allocate(
    @Body() body: { figureId: string; branchId: string; quantity: number },
  ) {
    return this.stockService.allocate(body.figureId, body.branchId, body.quantity);
  }

  @Post('admin/stock/transfer')
  @Roles('ADMIN')
  async transfer(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      figureId: string;
      fromBranchId: string;
      toBranchId: string;
      quantity: number;
    },
  ) {
    return this.stockService.transfer(
      body.figureId,
      body.fromBranchId,
      body.toBranchId,
      body.quantity,
      userId,
    );
  }

  @Get('staff/stock')
  @Roles('STAFF', 'ADMIN')
  async getStaffStock(@CurrentUser('branchId') branchId: string) {
    return this.stockService.getLevel(branchId);
  }
}
