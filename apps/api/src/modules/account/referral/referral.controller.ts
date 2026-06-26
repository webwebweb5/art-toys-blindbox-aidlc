import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('referral')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Get()
  async getReferralLink(@CurrentUser('sub') userId: string) {
    return this.referralService.generateLink(userId);
  }

  @Get('stats')
  async getReferralStats(@CurrentUser('sub') userId: string) {
    return this.referralService.getStats(userId);
  }
}
