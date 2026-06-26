import { describe, it } from 'vitest';
import fc from 'fast-check';

/**
 * Property-based tests for randomization correctness.
 *
 * Property 1: Probability distribution fairness (chi-squared test over 10K pulls)
 * Property 4: Multi-pull no duplicates (6-box pull always unique)
 */

// ========================
// Pure function implementations for testing
// ========================

interface FigureSlot {
  id: string;
  probability: number;
}

/**
 * Determines which figure is pulled based on weighted probabilities.
 * Uses a random number in [0, 100) to select from cumulative distribution.
 */
function determineFigure(figures: FigureSlot[], randomValue: number): string {
  let cumulative = 0;
  for (const figure of figures) {
    cumulative += figure.probability;
    if (randomValue < cumulative) {
      return figure.id;
    }
  }
  // Fallback to last figure (handles floating-point edge cases)
  return figures[figures.length - 1].id;
}

/**
 * Multi-pull: draws N unique figures using weighted random without replacement.
 */
function multiPull(figures: FigureSlot[], count: number): string[] {
  const result: string[] = [];
  let remaining = [...figures];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    // Normalize remaining probabilities
    const total = remaining.reduce((sum, f) => sum + f.probability, 0);
    const normalized = remaining.map((f) => ({
      ...f,
      probability: (f.probability / total) * 100,
    }));

    const randomValue = Math.random() * 100;
    const selectedId = determineFigure(normalized, randomValue);

    result.push(selectedId);
    remaining = remaining.filter((f) => f.id !== selectedId);
  }

  return result;
}

/**
 * Chi-squared test statistic calculation.
 */
function calculateChiSquared(
  observed: Map<string, number>,
  expected: Map<string, number>,
  totalSamples: number,
): number {
  let chiSquared = 0;
  for (const [id, expectedProb] of expected) {
    const observedCount = observed.get(id) || 0;
    const expectedCount = (expectedProb / 100) * totalSamples;
    if (expectedCount > 0) {
      chiSquared +=
        Math.pow(observedCount - expectedCount, 2) / expectedCount;
    }
  }
  return chiSquared;
}

/**
 * Approximate chi-squared critical value for df degrees of freedom at p=0.01.
 * Uses Wilson-Hilferty approximation for large df.
 */
function chiSquaredCriticalValue(df: number): number {
  // For common small df, use lookup table
  const table: Record<number, number> = {
    1: 6.635,
    2: 9.210,
    3: 11.345,
    4: 13.277,
    5: 15.086,
    6: 16.812,
    7: 18.475,
    8: 20.090,
    9: 21.666,
    10: 23.209,
    11: 24.725,
    12: 26.217,
    13: 27.688,
    14: 29.141,
    15: 30.578,
    19: 36.191,
  };
  if (table[df]) return table[df];
  // Approximation for larger df
  const z = 2.326; // z-value for p=0.01
  const term = 1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df));
  return df * Math.pow(term, 3);
}

// ========================
// PROPERTY TESTS
// ========================

describe('Property 1: Probability Distribution Fairness', () => {
  it('actual distribution matches published probabilities within statistical tolerance', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.float({ min: Math.fround(0.01), max: Math.fround(100), noNaN: true, noDefaultInfinity: true }),
          { minLength: 2, maxLength: 12 },
        ),
        (rawProbabilities) => {
          // Normalize to sum to 100
          const total = rawProbabilities.reduce((a, b) => a + b, 0);
          if (total === 0) return true; // skip degenerate case

          const figures: FigureSlot[] = rawProbabilities.map((p, i) => ({
            id: `figure-${i}`,
            probability: (p / total) * 100,
          }));

          // Skip distributions where any expected count < 50 (chi-squared needs sufficient samples)
          const NUM_PULLS = 10000;
          const minExpected = Math.min(...figures.map((f) => (f.probability / 100) * NUM_PULLS));
          if (minExpected < 50) return true; // precondition: each bucket needs >=50 expected
          const counts = new Map<string, number>();
          figures.forEach((f) => counts.set(f.id, 0));

          for (let i = 0; i < NUM_PULLS; i++) {
            const randomValue = Math.random() * 100;
            const selected = determineFigure(figures, randomValue);
            counts.set(selected, (counts.get(selected) || 0) + 1);
          }

          // Expected distribution
          const expected = new Map<string, number>();
          figures.forEach((f) => expected.set(f.id, f.probability));

          // Chi-squared test
          const chiSq = calculateChiSquared(counts, expected, NUM_PULLS);
          const df = figures.length - 1;
          const critical = chiSquaredCriticalValue(df);

          // p-value > 0.01 means observed matches expected (chi-sq < critical)
          return chiSq < critical;
        },
      ),
      { numRuns: 50 },
    );
  });
});

describe('Property 4: Multi-Pull No Duplicates', () => {
  it('6-box pull always produces unique figures', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            probability: fc.float({ min: Math.fround(0.01), max: Math.fround(50), noNaN: true, noDefaultInfinity: true }),
          }),
          { minLength: 6, maxLength: 20 },
        ),
        (figures) => {
          // Normalize probabilities
          const total = figures.reduce((sum, f) => sum + f.probability, 0);
          if (total === 0) return true;

          const normalized: FigureSlot[] = figures.map((f) => ({
            id: f.id,
            probability: (f.probability / total) * 100,
          }));

          // Pull 6 figures
          const result = multiPull(normalized, 6);

          // All must be unique
          return new Set(result).size === result.length;
        },
      ),
      { numRuns: 500 },
    );
  });

  it('multi-pull with exactly 6 figures returns all 6', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            probability: fc.float({ min: Math.fround(0.01), max: Math.fround(50), noNaN: true, noDefaultInfinity: true }),
          }),
          { minLength: 6, maxLength: 6 },
        ),
        (figures) => {
          const total = figures.reduce((sum, f) => sum + f.probability, 0);
          if (total === 0) return true;

          const normalized: FigureSlot[] = figures.map((f) => ({
            id: f.id,
            probability: (f.probability / total) * 100,
          }));

          const result = multiPull(normalized, 6);

          // Must return exactly all 6 unique figures
          const allIds = new Set(normalized.map((f) => f.id));
          const resultIds = new Set(result);
          return resultIds.size === 6 && [...resultIds].every((id) => allIds.has(id));
        },
      ),
      { numRuns: 200 },
    );
  });
});
