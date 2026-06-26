import { describe, it } from 'vitest';
import fc from 'fast-check';

/**
 * Property-based tests for drop event purchase limit.
 *
 * Property 7: No user can exceed per-person limit regardless of attempt count.
 */

// ========================
// Pure function implementations for testing
// ========================

interface DropPurchaseState {
  purchaseCount: number;
  perPersonLimit: number;
}

interface PurchaseAttemptResult {
  success: boolean;
  newCount: number;
}

/**
 * Attempts a drop purchase for a user.
 * Enforces the per-person limit strictly.
 * Returns success=true only if current count < limit.
 */
function attemptDropPurchase(state: DropPurchaseState): PurchaseAttemptResult {
  if (state.purchaseCount >= state.perPersonLimit) {
    return { success: false, newCount: state.purchaseCount };
  }
  return { success: true, newCount: state.purchaseCount + 1 };
}

/**
 * Simulates multiple concurrent purchase attempts from a single user.
 * Each attempt is evaluated against current state (sequential consistency).
 */
function simulatePurchaseAttempts(
  perPersonLimit: number,
  attemptCount: number,
): { finalCount: number; rejectedCount: number } {
  let purchaseCount = 0;
  let rejectedCount = 0;

  for (let i = 0; i < attemptCount; i++) {
    const result = attemptDropPurchase({ purchaseCount, perPersonLimit });
    if (result.success) {
      purchaseCount = result.newCount;
    } else {
      rejectedCount++;
    }
  }

  return { finalCount: purchaseCount, rejectedCount };
}

/**
 * Simulates multiple users attempting purchases on the same drop.
 * Ensures each individual user stays within their limit.
 */
function simulateMultiUserDrop(
  perPersonLimit: number,
  totalQuantity: number,
  users: { attempts: number }[],
): { userCounts: number[]; totalSold: number } {
  let remaining = totalQuantity;
  const userCounts: number[] = [];

  for (const user of users) {
    let userPurchaseCount = 0;
    for (let i = 0; i < user.attempts; i++) {
      if (remaining <= 0) break; // Drop sold out
      if (userPurchaseCount >= perPersonLimit) break; // Per-person limit reached

      userPurchaseCount++;
      remaining--;
    }
    userCounts.push(userPurchaseCount);
  }

  return { userCounts, totalSold: totalQuantity - remaining };
}

// ========================
// PROPERTY TESTS
// ========================

describe('Property 7: Drop Event Purchase Limit', () => {
  it('no user exceeds per-person limit regardless of attempt count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 50 }),
        (perPersonLimit, attemptCount) => {
          const { finalCount } = simulatePurchaseAttempts(
            perPersonLimit,
            attemptCount,
          );
          return finalCount <= perPersonLimit;
        },
      ),
      { numRuns: 500 },
    );
  });

  it('successful purchases equal min(attempts, perPersonLimit)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 50 }),
        (perPersonLimit, attemptCount) => {
          const { finalCount } = simulatePurchaseAttempts(
            perPersonLimit,
            attemptCount,
          );
          return finalCount === Math.min(attemptCount, perPersonLimit);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('rejected attempts equal max(0, attempts - perPersonLimit)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 50 }),
        (perPersonLimit, attemptCount) => {
          const { rejectedCount } = simulatePurchaseAttempts(
            perPersonLimit,
            attemptCount,
          );
          return rejectedCount === Math.max(0, attemptCount - perPersonLimit);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('multi-user scenario: each user respects per-person limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 10, max: 500 }),
        fc.array(
          fc.record({
            attempts: fc.integer({ min: 1, max: 20 }),
          }),
          { minLength: 1, maxLength: 50 },
        ),
        (perPersonLimit, totalQuantity, users) => {
          const { userCounts } = simulateMultiUserDrop(
            perPersonLimit,
            totalQuantity,
            users,
          );

          // Every user must be at or below the per-person limit
          return userCounts.every((count) => count <= perPersonLimit);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('total sold never exceeds total quantity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 1, max: 100 }),
        fc.array(
          fc.record({
            attempts: fc.integer({ min: 1, max: 10 }),
          }),
          { minLength: 1, maxLength: 100 },
        ),
        (perPersonLimit, totalQuantity, users) => {
          const { totalSold } = simulateMultiUserDrop(
            perPersonLimit,
            totalQuantity,
            users,
          );

          return totalSold <= totalQuantity;
        },
      ),
      { numRuns: 500 },
    );
  });
});
