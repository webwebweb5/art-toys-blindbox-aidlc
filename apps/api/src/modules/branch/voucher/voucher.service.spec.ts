import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  GoneException,
} from '@nestjs/common';
import { VoucherService } from './voucher.service';

describe('VoucherService', () => {
  let service: VoucherService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let stockService: any;
  let qrGenerator: any;
  let eventEmitter: any;

  beforeEach(() => {
    prisma = {
      pullRecord: { findUnique: vi.fn() },
      voucher: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    };

    jwtService = {
      sign: vi.fn().mockReturnValue('signed-jwt-token'),
      verify: vi.fn(),
    };

    configService = {
      get: vi.fn().mockReturnValue('voucher-secret'),
    };

    stockService = {
      reserve: vi.fn(),
      pickup: vi.fn(),
    };

    qrGenerator = {
      generateDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
    };

    eventEmitter = {
      emit: vi.fn(),
    };

    service = new VoucherService(
      prisma as any,
      jwtService as any,
      configService as any,
      stockService as any,
      qrGenerator as any,
      eventEmitter as any,
    );
  });

  describe('generate', () => {
    it('should create a voucher with QR code and reserve stock', async () => {
      prisma.pullRecord.findUnique.mockResolvedValue({
        id: 'pull-1',
        userId: 'user-1',
        figureId: 'fig-1',
      });
      prisma.voucher.findUnique.mockResolvedValue(null);
      prisma.voucher.create.mockResolvedValue({
        id: 'voucher-1',
        expiresAt: new Date('2026-07-01'),
        branch: { name: 'Central', address: '123 St' },
        figure: { name: 'Knight', image: 'url' },
      });

      const result = await service.generate(
        'user-1',
        'pull-1',
        'branch-1',
        'fig-1',
      );

      expect(result.id).toBe('voucher-1');
      expect(result.qrCode).toBe('data:image/png;base64,abc');
      expect(stockService.reserve).toHaveBeenCalledWith('fig-1', 'branch-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'voucher.issued',
        expect.objectContaining({ voucherId: 'voucher-1' }),
      );
    });

    it('should throw if voucher already exists for pull', async () => {
      prisma.pullRecord.findUnique.mockResolvedValue({
        id: 'pull-1',
        userId: 'user-1',
      });
      prisma.voucher.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.generate('user-1', 'pull-1', 'branch-1', 'fig-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validate', () => {
    it('should return valid for active voucher', async () => {
      jwtService.verify.mockReturnValue({ voucherId: 'v1' });
      prisma.voucher.findUnique.mockResolvedValue({
        id: 'v1',
        status: 'ACTIVE',
        figure: { name: 'Knight', image: 'url' },
        user: { name: 'Mia' },
      });

      const result = await service.validate('signed-jwt');

      expect(result.valid).toBe(true);
      expect(result.voucher.customer).toBe('Mia');
    });

    it('should throw GoneException for expired token', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('expired');
      });

      await expect(service.validate('bad-token')).rejects.toThrow(
        GoneException,
      );
    });

    it('should throw ConflictException for already redeemed voucher', async () => {
      jwtService.verify.mockReturnValue({});
      prisma.voucher.findUnique.mockResolvedValue({
        id: 'v1',
        status: 'REDEEMED',
        figure: { name: 'Knight', image: 'url' },
        user: { name: 'Mia' },
      });

      await expect(service.validate('token')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('redeem', () => {
    it('should mark voucher as redeemed and call pickup', async () => {
      prisma.voucher.findUnique.mockResolvedValue({
        id: 'v1',
        status: 'ACTIVE',
        figureId: 'fig-1',
        branchId: 'branch-1',
        userId: 'user-1',
      });
      prisma.voucher.update.mockResolvedValue({
        id: 'v1',
        status: 'REDEEMED',
        redeemedAt: new Date(),
      });

      const result = await service.redeem('v1', 'staff-1');

      expect(result.status).toBe('REDEEMED');
      expect(stockService.pickup).toHaveBeenCalledWith('fig-1', 'branch-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'voucher.redeemed',
        expect.objectContaining({ voucherId: 'v1', staffId: 'staff-1' }),
      );
    });

    it('should throw for already redeemed voucher', async () => {
      prisma.voucher.findUnique.mockResolvedValue({
        id: 'v1',
        status: 'REDEEMED',
      });

      await expect(service.redeem('v1', 'staff-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('extend', () => {
    it('should extend expiry by 3 days', async () => {
      const originalExpiry = new Date('2026-07-01T00:00:00Z');
      prisma.voucher.findUnique.mockResolvedValue({
        id: 'v1',
        expiresAt: originalExpiry,
        extendedOnce: false,
      });
      prisma.voucher.update.mockResolvedValue({
        id: 'v1',
        expiresAt: new Date('2026-07-04T00:00:00Z'),
        extendedOnce: true,
      });

      const result = await service.extend('v1');

      expect(result.extendedOnce).toBe(true);
    });

    it('should throw if already extended once', async () => {
      prisma.voucher.findUnique.mockResolvedValue({
        id: 'v1',
        extendedOnce: true,
      });

      await expect(service.extend('v1')).rejects.toThrow(ConflictException);
    });
  });
});
