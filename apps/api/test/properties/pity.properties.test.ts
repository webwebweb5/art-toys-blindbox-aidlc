import { describe, it } from 'vitest';
import fc from 'fast-check';

/**
 * Property-based tests for the pity system.
 *
 * Property 2: Pity monotonic non-decreasing probability
 * Property 3: Pity reset on rare/secret pull
 */

// ========================
// Pure function implementations for testing
// ========================

/**
 * Calculates the adjusted probability for a rare/secret figure
 * based on the pity counter, threshold, and multiplier.
 *
 * Once counter >= threshold, probability increases linearly:
 *   adjustedProb = baseProbability * (1 + multiplier * (counter - threshold) / threshold)
 */
function getAdjustedProbability(
  counter: number,
  threshold: number,
  multiplier: number,
  baseProbability: number,
): number {
  if (counter < threshold) {
    return baseProbability;
  }

  const overshoot = counter - threshold;
  const boost = 1 + multiplier * (overshoot / threshold);
  const adjusted = baseProbability * boost;

  // Cap at 100% (guaranteed pull)
  return Math.min(adjusted, 100);
}

/**
 * Processes a pull and returns the new pity counter.
 * Resets to 0 if the pulled figure is RARE or SECRET.
 */
function processPull(
  currentCounter: number,
  pulledRarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'SECRET',
): { newCounter: number } {
  if (pulledRarity === 'RARE' || pulledRarity === 'SECRET') {
    return { newCounter: 0 };
  }
  return { newCounter: currentCounter + 1 };
}

// ========================
// PROPERTY TESTS
// ========================

describe('Property 2: Pity Monotonic Non-Decreasing Probability', () => {
  it('adjusted probability never decreases as counter increases', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }),
        fc.integer({ min: 1, max: 100 }),
        fc.float({ min: 1.5, max: 5.0, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0.5, max: 10.0, noNaN: true, noDefaultInfinity: true }),
        (counter, threshold, multiplier, baseProbability) => {
          const prob1 = getAdjustedProbability(
            counter,
            threshold,
            multiplier,
            baseProbability,
          );
          const prob2 = getAdjustedProbability(
            counter + 1,
            threshold,
            multiplier,
            baseProbability,
          );
          return prob2 >= prob1;
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('probability equals baseProbability when counter < threshold', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.float({ min: 1.5, max: 5.0, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0.5, max: 10.0, noNaN: true, noDefaultInfinity: true }),
        (threshold, multiplier, baseProbability) => {
          // counter is always less than threshold here
          const counter = Math.max(0, threshold - 1);
          const prob = getAdjustedProbability(
            counter,
            threshold,
            multiplier,
            baseProbability,
          );
          return Math.abs(prob - baseProbability) < 0.001;
        },
      ),
      { numRuns: 500 },
    );
  });

  it('probability is capped at 100%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 100 }),
        fc.float({ min: 1.5, max: 5.0, noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: 0.5, max: 50.0, noNaN: true, noDefaultInfinity: true }),
        (counter, threshold, multiplier, baseProbability) => {
          const prob = getAdjustedProbability(
            counter,
            threshold,
            multiplier,
            baseProbability,
          );
          return prob <= 100;
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('Property 3: Pity Reset on Rare/Secret Pull', () => {
  it('counter resets to 0 after pulling RARE figure', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 200 }), (counterBefore) => {
        const { newCounter } = processPull(counterBefore, 'RARE');
        return newCounter === 0;
      }),
      { numRuns: 500 },
    );
  });

  it('counter resets to 0 after pulling SECRET figure', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 200 }), (counterBefore) => {
        const { newCounter } = processPull(counterBefore, 'SECRET');
        return newCounter === 0;
      }),
      { numRuns: 500 },
    );
  });

  it('counter increments after pulling COMMON or UNCOMMON figure', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }),
        fc.constantFrom('COMMON' as const, 'UNCOMMON' as const),
        (counterBefore, rarity) => {
          const { newCounter } = processPull(counterBefore, rarity);
          return newCounter === counterBefore + 1;
        },
      ),
      { numRuns: 500 },
    );
  });
});
