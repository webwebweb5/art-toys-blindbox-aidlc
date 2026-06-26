import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { SeriesModule } from './series/series.module';
import { ProfileModule } from './profile/profile.module';
import { MembershipModule } from './membership/membership.module';
import { ReferralModule } from './referral/referral.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    AuthModule,
    SeriesModule,
    ProfileModule,
    MembershipModule,
    ReferralModule,
    AnalyticsModule,
  ],
  exports: [
    AuthModule,
    SeriesModule,
    ProfileModule,
    MembershipModule,
    ReferralModule,
    AnalyticsModule,
  ],
})
export class AccountModule {}
