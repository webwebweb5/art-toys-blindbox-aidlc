import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export enum MembershipTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

export const TIER_THRESHOLDS: Record<MembershipTier, number> = {
  [MembershipTier.BRONZE]: 0,
  [MembershipTier.SILVER]: 20,
  [MembershipTier.GOLD]: 50,
  [MembershipTier.PLATINUM]: 100,
};

export interface TierUpgrade {
  previousTier: MembershipTier;
  newTier: MembershipTier;
  progress: number;
}

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async getTier(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true, tierProgress: true },
    });

    return user;
  }

  async checkUpgrade(userId: string): Promise<TierUpgrade | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true, tierProgress: true },
    });

    if (!user) return null;

    const currentTier = user.tier as MembershipTier;
    const progress = user.tierProgress;
    const newTier = this.calculateTier(progress);

    if (newTier === currentTier) return null;

    // Upgrade user tier
    await this.prisma.user.update({
      where: { id: userId },
      data: { tier: newTier },
    });

    return {
      previousTier: currentTier,
      newTier,
      progress,
    };
  }

  async incrementProgress(userId: string): Promise<TierUpgrade | null> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { tierProgress: { increment: 1 } },
      select: { tier: true, tierProgress: true },
    });

    const currentTier = user.tier as MembershipTier;
    const newTier = this.calculateTier(user.tierProgress);

    if (newTier === currentTier) return null;

    await this.prisma.user.update({
      where: { id: userId },
      data: { tier: newTier },
    });

    return {
      previousTier: currentTier,
      newTier,
      progress: user.tierProgress,
    };
  }

  calculateTier(progress: number): MembershipTier {
    if (progress >= TIER_THRESHOLDS[MembershipTier.PLATINUM]) {
      return MembershipTier.PLATINUM;
    }
    if (progress >= TIER_THRESHOLDS[MembershipTier.GOLD]) {
      return MembershipTier.GOLD;
    }
    if (progress >= TIER_THRESHOLDS[MembershipTier.SILVER]) {
      return MembershipTier.SILVER;
    }
    return MembershipTier.BRONZE;
  }
}
