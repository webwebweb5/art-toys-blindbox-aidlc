import { Module } from '@nestjs/common';
import { MembershipService } from './membership.service';
import { MembershipListener } from './membership.listener';

@Module({
  providers: [MembershipService, MembershipListener],
  exports: [MembershipService],
})
export class MembershipModule {}
