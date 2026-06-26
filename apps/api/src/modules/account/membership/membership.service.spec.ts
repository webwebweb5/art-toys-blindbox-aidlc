import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MembershipService, MembershipTier, TIER_THRESHOLDS } from './membership.service';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

describe('MembershipService', () => {
  let service: MembershipService;

  beforeEach(() => {
    service = new MembershipService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('calculateTier', () => {
    it('should return BRONZE for 0 progress', () => {
      expect(service.calculateTier(0)).toBe(MembershipTier.BRONZE);
    });

    it('should return BRONZE for 19 purchases', () => {
      expect(service.calculateTier(19)).toBe(MembershipTier.BRONZE);
    });

    it('should return SILVER for 20 purchases', () => {
      expect(service.calculateTier(20)).toBe(MembershipTier.SILVER);
    });

    it('should return SILVER for 49 purchases', () => {
      expect(service.calculateTier(49)).toBe(MembershipTier.SILVER);
    });

    it('should return GOLD for 50 purchases', () => {
      expect(service.calculateTier(50)).toBe(MembershipTier.GOLD);
    });

    it('should return GOLD for 99 purchases', () => {
      expect(service.calculateTier(99)).toBe(MembershipTier.GOLD);
    });

    it('should return PLATINUM for 100 purchases', () => {
      expect(service.calculateTier(100)).toBe(MembershipTier.PLATINUM);
    });

    it('should return PLATINUM for 200 purchases', () => {
      expect(service.calculateTier(200)).toBe(MembershipTier.PLATINUM);
    });
  });

  describe('checkUpgrade', () => {
    it('should return null when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.checkUpgrade('non-existent');
      expect(result).toBeNull();
    });

    it('should return null when no upgrade is needed', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        tier: 'BRONZE',
        tierProgress: 5,
      });

      const result = await service.checkUpgrade('user-id');
      expect(result).toBeNull();
    });

    it('should upgrade from BRONZE to SILVER at 20 purchases', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        tier: 'BRONZE',
        tierProgress: 20,
      });
      mockPrisma.user.update.mockResolvedValue({
        tier: 'SILVER',
        tierProgress: 20,
      });

      const result = await service.checkUpgrade('user-id');
      expect(result).toEqual({
        previousTier: MembershipTier.BRONZE,
        newTier: MembershipTier.SILVER,
        progress: 20,
      });
    });

    it('should upgrade from GOLD to PLATINUM at 100 purchases', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        tier: 'GOLD',
        tierProgress: 100,
      });
      mockPrisma.user.update.mockResolvedValue({
        tier: 'PLATINUM',
        tierProgress: 100,
      });

      const result = await service.checkUpgrade('user-id');
      expect(result).toEqual({
        previousTier: MembershipTier.GOLD,
        newTier: MembershipTier.PLATINUM,
        progress: 100,
      });
    });
  });

  describe('incrementProgress', () => {
    it('should increment progress and not upgrade when below threshold', async () => {
      mockPrisma.user.update.mockResolvedValue({
        tier: 'BRONZE',
        tierProgress: 10,
      });

      const result = await service.incrementProgress('user-id');
      expect(result).toBeNull();
    });

    it('should increment progress and upgrade when threshold reached', async () => {
      mockPrisma.user.update
        .mockResolvedValueOnce({ tier: 'BRONZE', tierProgress: 20 })
        .mockResolvedValueOnce({ tier: 'SILVER', tierProgress: 20 });

      const result = await service.incrementProgress('user-id');
      expect(result).toEqual({
        previousTier: MembershipTier.BRONZE,
        newTier: MembershipTier.SILVER,
        progress: 20,
      });
    });
  });

  describe('TIER_THRESHOLDS', () => {
    it('should have correct threshold values', () => {
      expect(TIER_THRESHOLDS[MembershipTier.BRONZE]).toBe(0);
      expect(TIER_THRESHOLDS[MembershipTier.SILVER]).toBe(20);
      expect(TIER_THRESHOLDS[MembershipTier.GOLD]).toBe(50);
      expect(TIER_THRESHOLDS[MembershipTier.PLATINUM]).toBe(100);
    });
  });
});
