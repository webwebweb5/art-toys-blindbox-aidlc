import {
  Injectable,
  NotFoundException,
  ConflictException,
  GoneException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { StockService } from '../stock/stock.service';
import { QrGeneratorService } from './qr-generator.service';

const VOUCHER_EXPIRY_DAYS = 7;
const EXTENSION_DAYS = 3;

@Injectable()
export class VoucherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly stockService: StockService,
    private readonly qrGenerator: QrGeneratorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Generate a voucher for a pull record at a selected branch.
   * Signs a JWT for QR code and reserves stock.
   */
  async generate(
    userId: string,
    pullRecordId: string,
    branchId: string,
    figureId: string,
  ) {
    // Verify pull record belongs to user
    const pullRecord = await this.prisma.pullRecord.findUnique({
      where: { id: pullRecordId },
    });

    if (!pullRecord || pullRecord.userId !== userId) {
      throw new NotFoundException({
        code: 'PULL_RECORD_NOT_FOUND',
        message: 'Pull record not found',
      });
    }

    // Check if voucher already exists for this pull
    const existing = await this.prisma.voucher.findUnique({
      where: { pullRecordId },
    });

    if (existing) {
      throw new ConflictException({
        code: 'VOUCHER_ALREADY_EXISTS',
        message: 'Voucher already generated for this pull',
      });
    }

    // Reserve stock at branch
    await this.stockService.reserve(figureId, branchId);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + VOUCHER_EXPIRY_DAYS);

    // Sign JWT token for QR
    const qrToken = this.jwtService.sign(
      {
        voucherId: '', // will be updated after creation
        userId,
        pullRecordId,
        branchId,
        figureId,
      },
      {
        secret: this.configService.get<string>('VOUCHER_JWT_SECRET', 'voucher-secret'),
        expiresIn: `${VOUCHER_EXPIRY_DAYS}d`,
      },
    );

    // Create voucher
    const voucher = await this.prisma.voucher.create({
      data: {
        userId,
        pullRecordId,
        branchId,
        figureId,
        qrToken,
        expiresAt,
        status: 'ACTIVE',
      },
      include: {
        branch: { select: { name: true, address: true } },
        figure: { select: { name: true, image: true } },
      },
    });

    // Generate QR code image
    const qrCode = await this.qrGenerator.generateDataUrl(qrToken);

    this.eventEmitter.emit('voucher.issued', {
      voucherId: voucher.id,
      userId,
      branchId,
      figureId,
    });

    return {
      id: voucher.id,
      qrCode,
      expiresAt: voucher.expiresAt,
      branch: voucher.branch,
      figure: voucher.figure,
    };
  }

  /**
   * Validate a voucher by its QR token.
   * Verifies JWT signature and checks voucher status.
   */
  async validate(qrToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(qrToken, {
        secret: this.configService.get<string>('VOUCHER_JWT_SECRET', 'voucher-secret'),
      });
    } catch {
      throw new GoneException({
        code: 'VOUCHER_INVALID_OR_EXPIRED',
        message: 'Voucher QR code is invalid or expired',
      });
    }

    const voucher = await this.prisma.voucher.findUnique({
      where: { qrToken },
      include: {
        figure: { select: { name: true, image: true } },
        user: { select: { name: true } },
      },
    });

    if (!voucher) {
      throw new NotFoundException({
        code: 'VOUCHER_NOT_FOUND',
        message: 'Voucher not found',
      });
    }

    if (voucher.status === 'REDEEMED') {
      throw new ConflictException({
        code: 'VOUCHER_ALREADY_REDEEMED',
        message: 'Voucher has already been redeemed',
      });
    }

    if (voucher.status === 'EXPIRED') {
      throw new GoneException({
        code: 'VOUCHER_EXPIRED',
        message: 'Voucher has expired',
      });
    }

    return {
      valid: true,
      voucher: {
        id: voucher.id,
        figure: voucher.figure,
        customer: voucher.user.name,
        status: voucher.status,
      },
    };
  }

  /**
   * Redeem a voucher (staff marks it as picked up).
   */
  async redeem(voucherId: string, staffId: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher) {
      throw new NotFoundException({
        code: 'VOUCHER_NOT_FOUND',
        message: 'Voucher not found',
      });
    }

    if (voucher.status === 'REDEEMED') {
      throw new ConflictException({
        code: 'VOUCHER_ALREADY_REDEEMED',
        message: 'Voucher has already been redeemed',
      });
    }

    if (voucher.status === 'EXPIRED') {
      throw new GoneException({
        code: 'VOUCHER_EXPIRED',
        message: 'Voucher has expired',
      });
    }

    // Mark as redeemed
    const updated = await this.prisma.voucher.update({
      where: { id: voucherId },
      data: {
        status: 'REDEEMED',
        redeemedAt: new Date(),
        redeemedBy: staffId,
      },
    });

    // Update stock: pickup
    await this.stockService.pickup(voucher.figureId, voucher.branchId);

    this.eventEmitter.emit('voucher.redeemed', {
      voucherId: voucher.id,
      userId: voucher.userId,
      branchId: voucher.branchId,
      figureId: voucher.figureId,
      staffId,
    });

    return {
      id: updated.id,
      status: updated.status,
      redeemedAt: updated.redeemedAt,
    };
  }

  /**
   * Extend voucher expiry by 3 days (one-time only).
   */
  async extend(voucherId: string) {
    const voucher = await this.prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher) {
      throw new NotFoundException({
        code: 'VOUCHER_NOT_FOUND',
        message: 'Voucher not found',
      });
    }

    if (voucher.extendedOnce) {
      throw new ConflictException({
        code: 'VOUCHER_ALREADY_EXTENDED',
        message: 'Voucher can only be extended once',
      });
    }

    const newExpiry = new Date(voucher.expiresAt);
    newExpiry.setDate(newExpiry.getDate() + EXTENSION_DAYS);

    return this.prisma.voucher.update({
      where: { id: voucherId },
      data: {
        expiresAt: newExpiry,
        extendedOnce: true,
      },
    });
  }
}
