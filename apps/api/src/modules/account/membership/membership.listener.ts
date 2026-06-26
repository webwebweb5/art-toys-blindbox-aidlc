import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MembershipService } from './membership.service';

export interface PurchaseCompletedEvent {
  userId: string;
  orderId: string;
  figureId: string;
  seriesId: string;
}

@Injectable()
export class MembershipListener {
  constructor(private readonly membershipService: MembershipService) {}

  @OnEvent('purchase.completed')
  async handlePurchaseCompleted(event: PurchaseCompletedEvent) {
    await this.membershipService.incrementProgress(event.userId);
  }
}
