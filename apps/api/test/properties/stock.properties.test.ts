import { describe, it } from 'vitest';
import fc from 'fast-check';

/**
 * Property-based tests for stock conservation.
 *
 * Property 5: available + reserved + pickedUp = initial allocation
 * through any valid operation sequence.
 */

// ========================
// Pure function implementations for testing
// ========================

interface StockState {
  available: number;
  reserved: number;
  pickedUp: number;
}

type StockOperation =
  | { type: 'reserve' }
  | { type: 'release' }
  | { type: 'pickup' };

/**
 * Applies a stock operation to the current state.
 * Operations that would result in invalid state are no-ops.
 */
function applyStockOperation(
  state: StockState,
  operation: StockOperation,
): StockState {
  switch (operation.type) {
    case 'reserve':
      // Can only reserve if stock is available
      if (state.available > 0) {
        return {
          available: state.available - 1,
          reserved: state.reserved + 1,
          pickedUp: state.pickedUp,
        };
      }
      return state;

    case 'release':
      // Can only release if something is reserved
      if (state.reserved > 0) {
        return {
          available: state.available + 1,
          reserved: state.reserved - 1,
          pickedUp: state.pickedUp,
        };
      }
      return state;

    case 'pickup':
      // Can only pickup if something is reserved
      if (state.reserved > 0) {
        return {
          available: state.available,
          reserved: state.reserved - 1,
          pickedUp: state.pickedUp + 1,
        };
      }
      return state;

    default:
      return state;
  }
}

// ========================
// PROPERTY TESTS
// ========================

describe('Property 5: Stock Conservation', () => {
  it('total stock (available + reserved + pickedUp) equals initial allocation through any operation sequence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.array(
          fc.oneof(
            fc.constant({ type: 'reserve' as const }),
            fc.constant({ type: 'release' as const }),
            fc.constant({ type: 'pickup' as const }),
          ),
          { maxLength: 100 },
        ),
        (initialStock, operations) => {
          let state: StockState = {
            available: initialStock,
            reserved: 0,
            pickedUp: 0,
          };

          for (const op of operations) {
            state = applyStockOperation(state, op);
          }

          // Conservation invariant
          return state.available + state.reserved + state.pickedUp === initialStock;
        },
      ),
      { numRuns: 500 },
    );
  });

  it('available stock never goes negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.array(
          fc.oneof(
            fc.constant({ type: 'reserve' as const }),
            fc.constant({ type: 'release' as const }),
            fc.constant({ type: 'pickup' as const }),
          ),
          { maxLength: 200 },
        ),
        (initialStock, operations) => {
          let state: StockState = {
            available: initialStock,
            reserved: 0,
            pickedUp: 0,
          };

          for (const op of operations) {
            state = applyStockOperation(state, op);
            if (state.available < 0 || state.reserved < 0 || state.pickedUp < 0) {
              return false;
            }
          }

          return true;
        },
      ),
      { numRuns: 500 },
    );
  });

  it('pickedUp count never decreases', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(
          fc.oneof(
            fc.constant({ type: 'reserve' as const }),
            fc.constant({ type: 'release' as const }),
            fc.constant({ type: 'pickup' as const }),
          ),
          { maxLength: 100 },
        ),
        (initialStock, operations) => {
          let state: StockState = {
            available: initialStock,
            reserved: 0,
            pickedUp: 0,
          };
          let prevPickedUp = 0;

          for (const op of operations) {
            state = applyStockOperation(state, op);
            if (state.pickedUp < prevPickedUp) return false;
            prevPickedUp = state.pickedUp;
          }

          return true;
        },
      ),
      { numRuns: 500 },
    );
  });
});
