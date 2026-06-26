import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { SeriesService } from './series.service';

const mockPrisma = {
  series: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

describe('SeriesService', () => {
  let service: SeriesService;

  beforeEach(() => {
    service = new SeriesService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should throw ConflictException when probabilities do not sum to 100', async () => {
      const dto = {
        name: 'Test Series',
        artist: 'Test Artist',
        pricePerBox: 9.99,
        coverImage: 'https://example.com/cover.jpg',
        pityThreshold: 50,
        pityMultiplier: 2.0,
        figures: [
          { name: 'Fig1', image: 'https://example.com/1.jpg', rarity: 'COMMON' as const, probability: 50, sortOrder: 0 },
          { name: 'Fig2', image: 'https://example.com/2.jpg', rarity: 'RARE' as const, probability: 30, sortOrder: 1 },
        ],
      };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('should create series when probabilities sum to 100', async () => {
      const dto = {
        name: 'Test Series',
        artist: 'Test Artist',
        pricePerBox: 9.99,
        coverImage: 'https://example.com/cover.jpg',
        pityThreshold: 50,
        pityMultiplier: 2.0,
        figures: [
          { name: 'Fig1', image: 'https://example.com/1.jpg', rarity: 'COMMON' as const, probability: 60, sortOrder: 0 },
          { name: 'Fig2', image: 'https://example.com/2.jpg', rarity: 'RARE' as const, probability: 40, sortOrder: 1 },
        ],
      };

      const mockResult = { id: 'uuid', ...dto, figureCount: 2, status: 'DRAFT', figures: dto.figures };
      mockPrisma.series.create.mockResolvedValue(mockResult);

      const result = await service.create(dto);
      expect(result).toEqual(mockResult);
      expect(mockPrisma.series.create).toHaveBeenCalledTimes(1);
    });

    it('should accept probabilities that sum to exactly 100 with decimals', async () => {
      const dto = {
        name: 'Decimal Series',
        artist: 'Artist',
        pricePerBox: 9.99,
        coverImage: 'https://example.com/cover.jpg',
        pityThreshold: 50,
        pityMultiplier: 2.0,
        figures: [
          { name: 'Fig1', image: 'https://example.com/1.jpg', rarity: 'COMMON' as const, probability: 33.33, sortOrder: 0 },
          { name: 'Fig2', image: 'https://example.com/2.jpg', rarity: 'UNCOMMON' as const, probability: 33.34, sortOrder: 1 },
          { name: 'Fig3', image: 'https://example.com/3.jpg', rarity: 'RARE' as const, probability: 33.33, sortOrder: 2 },
        ],
      };

      const mockResult = { id: 'uuid', ...dto, figureCount: 3, status: 'DRAFT', figures: dto.figures };
      mockPrisma.series.create.mockResolvedValue(mockResult);

      const result = await service.create(dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('publish', () => {
    it('should throw NotFoundException when series does not exist', async () => {
      mockPrisma.series.findUnique.mockResolvedValue(null);

      await expect(service.publish('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when series is already published', async () => {
      mockPrisma.series.findUnique.mockResolvedValue({
        id: 'uuid',
        status: 'PUBLISHED',
        figures: [{ probability: 100 }],
      });

      await expect(service.publish('uuid')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when series has no figures', async () => {
      mockPrisma.series.findUnique.mockResolvedValue({
        id: 'uuid',
        status: 'DRAFT',
        figures: [],
      });

      await expect(service.publish('uuid')).rejects.toThrow(BadRequestException);
    });

    it('should publish series when all validations pass', async () => {
      const series = {
        id: 'uuid',
        status: 'DRAFT',
        figures: [
          { probability: 60 },
          { probability: 40 },
        ],
      };
      mockPrisma.series.findUnique.mockResolvedValue(series);
      mockPrisma.series.update.mockResolvedValue({ ...series, status: 'PUBLISHED', publishedAt: new Date() });

      const result = await service.publish('uuid');
      expect(result.status).toBe('PUBLISHED');
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when series does not exist', async () => {
      mockPrisma.series.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should return series with figures', async () => {
      const series = {
        id: 'uuid',
        name: 'Test',
        figures: [{ id: 'fig1', name: 'Figure 1' }],
      };
      mockPrisma.series.findUnique.mockResolvedValue(series);

      const result = await service.findById('uuid');
      expect(result).toEqual(series);
    });
  });
});
