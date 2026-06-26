import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      totalSales,
      totalOrders,
      totalUsers,
      recentOrders,
      voucherStats,
      topSeries,
    ] = await Promise.all([
      this.getTotalSales(),
      this.prisma.order.count({ where: { status: 'PAID' } }),
      this.prisma.user.count(),
      this.prisma.order.findMany({
        where: { status: 'PAID' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          totalAmount: true,
          quantity: true,
          createdAt: true,
          series: { select: { name: true } },
        },
      }),
      this.getVoucherStats(),
      this.getTopSeries(),
    ]);

    return {
      totalSales,
      totalOrders,
      totalUsers,
      pickupRate: voucherStats.pickupRate,
      expiryRate: voucherStats.expiryRate,
      topSeries,
      recentOrders,
    };
  }

  async getBranchMetrics(branchId: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException({
        code: 'BRANCH_NOT_FOUND',
        message: `Branch with id ${branchId} not found`,
      });
    }

    const [stockSummary, voucherStats, recentRedemptions] = await Promise.all([
      this.prisma.stockRecord.aggregate({
        where: { branchId },
        _sum: {
          available: true,
          reserved: true,
          pickedUp: true,
        },
      }),
      this.getBranchVoucherStats(branchId),
      this.prisma.voucher.findMany({
        where: { branchId, status: 'REDEEMED' },
        orderBy: { redeemedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          redeemedAt: true,
          figure: { select: { name: true, rarity: true } },
        },
      }),
    ]);

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        address: branch.address,
        status: branch.status,
      },
      stock: {
        available: stockSummary._sum.available ?? 0,
        reserved: stockSummary._sum.reserved ?? 0,
        pickedUp: stockSummary._sum.pickedUp ?? 0,
      },
      voucherStats,
      recentRedemptions,
    };
  }

  private async getTotalSales(): Promise<number> {
    const result = await this.prisma.order.aggregate({
      where: { status: 'PAID' },
      _sum: { totalAmount: true },
    });
    return Number(result._sum.totalAmount ?? 0);
  }

  private async getVoucherStats() {
    const [total, redeemed, expired] = await Promise.all([
      this.prisma.voucher.count(),
      this.prisma.voucher.count({ where: { status: 'REDEEMED' } }),
      this.prisma.voucher.count({ where: { status: 'EXPIRED' } }),
    ]);

    return {
      total,
      redeemed,
      expired,
      pickupRate: total > 0 ? Math.round((redeemed / total) * 100) : 0,
      expiryRate: total > 0 ? Math.round((expired / total) * 100) : 0,
    };
  }

  private async getTopSeries() {
    const topSeries = await this.prisma.order.groupBy({
      by: ['seriesId'],
      where: { status: 'PAID' },
      _count: { id: true },
      _sum: { totalAmount: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const seriesIds = topSeries.map((s) => s.seriesId);
    const series = await this.prisma.series.findMany({
      where: { id: { in: seriesIds } },
      select: { id: true, name: true, artist: true },
    });

    const seriesMap = new Map(series.map((s) => [s.id, s]));

    return topSeries.map((s) => ({
      ...seriesMap.get(s.seriesId),
      orderCount: s._count.id,
      totalRevenue: Number(s._sum.totalAmount ?? 0),
    }));
  }

  private async getBranchVoucherStats(branchId: string) {
    const [total, redeemed, expired, active] = await Promise.all([
      this.prisma.voucher.count({ where: { branchId } }),
      this.prisma.voucher.count({ where: { branchId, status: 'REDEEMED' } }),
      this.prisma.voucher.count({ where: { branchId, status: 'EXPIRED' } }),
      this.prisma.voucher.count({ where: { branchId, status: 'ACTIVE' } }),
    ]);

    return {
      total,
      redeemed,
      expired,
      active,
      pickupRate: total > 0 ? Math.round((redeemed / total) * 100) : 0,
      expiryRate: total > 0 ? Math.round((expired / total) * 100) : 0,
    };
  }
}
