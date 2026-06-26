import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReferralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async generateLink(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const baseUrl = this.configService.get<string>(
      'APP_URL',
      'http://localhost:3000',
    );

    return {
      referralCode: user.referralCode,
      referralLink: `${baseUrl}/register?ref=${user.referralCode}`,
    };
  }

  async getStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const referrals = await this.prisma.user.findMany({
      where: { referredBy: userId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        tier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      totalReferrals: referrals.length,
      referrals,
      referralCode: user.referralCode,
    };
  }

  async trackReferral(referralCode: string, newUserId: string) {
    const referrer = await this.prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });

    if (!referrer) return null;

    // Update new user's referredBy
    await this.prisma.user.update({
      where: { id: newUserId },
      data: { referredBy: referrer.id },
    });

    return referrer.id;
  }

  async creditReward(referrerId: string) {
    // Increment the referrer's tier progress as a reward
    await this.prisma.user.update({
      where: { id: referrerId },
      data: { tierProgress: { increment: 1 } },
    });
  }
}
