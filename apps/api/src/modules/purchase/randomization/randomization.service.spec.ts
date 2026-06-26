import { describe, it, expect, beforeEach } from 'vitest';
import { RandomizationService, FigureForSelection } from './randomization.service';

describe('RandomizationService', () => {
  let service: RandomizationService;

  const testFigures: FigureForSelection[] = [
    { id: '1', name: 'Common Figure', rarity: 'COMMON', probability: 60 },
    { id: '2', name: 'Uncommon Figure', rarity: 'UNCOMMON', probability: 25 },
    { id: '3', name: 'Rare Figure', rarity: 'RARE', probability: 10 },
    { id: '4', name: 'Secret Figure', rarity: 'SECRET', probability: 5 },
  ];

  beforeEach(() => {
    service = new RandomizationService();
  });

  describe('determineFigure', () => {
    it('should return a figure from the provided list', () => {
      const result = service.determineFigure(testFigures);
      expect(testFigures).toContainEqual(result);
    });

    it('should return the only figure when there is just one', () => {
      const singleFigure = [testFigures[0]];
      const result = service.determineFigure(singleFigure);
      expect(result).toEqual(singleFigure[0]);
    });

    it('should use pity-adjusted probabilities when provided', () => {
      const pityMap = new Map<string, number>();
      // Set secret to very high probability
      pityMap.set('4', 99);
      pityMap.set('1', 0.5);
      pityMap.set('2', 0.25);
      pityMap.set('3', 0.25);

      // Run many iterations to check distribution leans heavily towards figure 4
      let secretCount = 0;
      const iterations = 100;
      for (let i = 0; i < iterations; i++) {
        const result = service.determineFigure(testFigures, pityMap);
        if (result.id === '4') secretCount++;
      }

      // With 99% probability, secret should be selected most of the time
      expect(secretCount).toBeGreaterThan(80);
    });

    it('should produce varied results across multiple runs (randomness)', () => {
      const results = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const result = service.determineFigure(testFigures);
        results.add(result.id);
      }
      // With 100 attempts and 4 figures with reasonable probabilities,
      // we should see more than 1 unique figure
      expect(results.size).toBeGreaterThan(1);
    });
  });

  describe('multiPullNoDuplicates', () => {
    it('should return the requested number of figures', () => {
      const results = service.multiPullNoDuplicates(testFigures, 3);
      expect(results).toHaveLength(3);
    });

    it('should return all unique figures (no duplicates)', () => {
      const results = service.multiPullNoDuplicates(testFigures, 4);
      const ids = results.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should not exceed available figures count', () => {
      const results = service.multiPullNoDuplicates(testFigures, 10);
      expect(results.length).toBeLessThanOrEqual(testFigures.length);
    });

    it('should return unique results when pulling all figures', () => {
      const results = service.multiPullNoDuplicates(testFigures, 4);
      const ids = results.map((r) => r.id);
      expect(new Set(ids).size).toBe(4);
    });

    it('should handle single pull correctly', () => {
      const results = service.multiPullNoDuplicates(testFigures, 1);
      expect(results).toHaveLength(1);
      expect(testFigures).toContainEqual(results[0]);
    });
  });

  describe('normalizeAndSelect', () => {
    it('should throw for empty probability array', () => {
      expect(() => service.normalizeAndSelect([])).toThrow(
        'Cannot select from empty probability array',
      );
    });

    it('should return 0 for single probability', () => {
      const result = service.normalizeAndSelect([100]);
      expect(result).toBe(0);
    });

    it('should return a valid index within bounds', () => {
      const probabilities = [30, 40, 20, 10];
      const result = service.normalizeAndSelect(probabilities);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(probabilities.length);
    });

    it('should respect probability weighting over many trials', () => {
      const probabilities = [90, 5, 3, 2];
      const counts = [0, 0, 0, 0];
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const index = service.normalizeAndSelect(probabilities);
        counts[index]++;
      }

      // First item (90%) should be selected most often
      expect(counts[0]).toBeGreaterThan(counts[1]);
      expect(counts[0]).toBeGreaterThan(counts[2]);
      expect(counts[0]).toBeGreaterThan(counts[3]);
      // First item should be > 70% of all selections (90% target with some variance)
      expect(counts[0] / iterations).toBeGreaterThan(0.7);
    });
  });
});
