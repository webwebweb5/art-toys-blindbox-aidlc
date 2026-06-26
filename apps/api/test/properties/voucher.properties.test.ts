import { describe, it } from 'vitest';
import fc from 'fast-check';

/**
 * Property-based tests for voucher state machine.
 *
 * Property 6: Voucher state transitions follow valid paths only.
 * Valid transitions:
 *   ACTIVE → REDEEMED
 *   ACTIVE → EXPIRED
 *   ACTIVE → CANCELLED
 * Terminal states: REDEEMED, EXPIRED, CANCELLED (no transitions out)
 */

// ========================
// Pure function implementations for testing
// ========================

type VoucherStatus = 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';
type VoucherAction = 'redeem' | 'expire' | 'cancel' | 'extend';

interface TransitionResult {
  newStatus: VoucherStatus;
  valid: boolean;
}

/**
 * Applies a voucher transition and returns the new state.
 * Returns { valid: false } if the transition is not allowed.
 */
function applyVoucherTransition(
  currentStatus: VoucherStatus,
  action: VoucherAction,
): TransitionResult {
  // Terminal states — no transitions allowed
  if (currentStatus === 'REDEEMED' || currentStatus === 'EXPIRED' || currentStatus === 'CANCELLED') {
    return { newStatus: currentStatus, valid: false };
  }

  // From ACTIVE state
  switch (action) {
    case 'redeem':
      return { newStatus: 'REDEEMED', valid: true };
    case 'expire':
      return { newStatus: 'EXPIRED', valid: true };
    case 'cancel':
      return { newStatus: 'CANCELLED', valid: true };
    case 'extend':
      // Extend keeps the voucher ACTIVE (extends expiry date)
      return { newStatus: 'ACTIVE', valid: true };
    default:
      return { newStatus: currentStatus, valid: false };
  }
}

/**
 * Validates that a sequence of transitions is legal.
 * Returns false if any invalid transition is attempted after a terminal state.
 */
function validateTransitionSequence(
  actions: VoucherAction[],
): boolean {
  let state: VoucherStatus = 'ACTIVE';

  for (const action of actions) {
    const result = applyVoucherTransition(state, action);
    if (!result.valid) {
      // Action attempted from terminal state — this is the constraint violation
      return false;
    }
    state = result.newStatus;
  }

  return true;
}

// ========================
// PROPERTY TESTS
// ========================

describe('Property 6: Voucher State Machine', () => {
  it('terminal states reject all subsequent transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('REDEEMED' as VoucherStatus, 'EXPIRED' as VoucherStatus, 'CANCELLED' as VoucherStatus),
        fc.constantFrom('redeem' as VoucherAction, 'expire' as VoucherAction, 'cancel' as VoucherAction, 'extend' as VoucherAction),
        (terminalState, action) => {
          const result = applyVoucherTransition(terminalState, action);
          return result.valid === false && result.newStatus === terminalState;
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('ACTIVE state accepts all valid actions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('redeem' as VoucherAction, 'expire' as VoucherAction, 'cancel' as VoucherAction, 'extend' as VoucherAction),
        (action) => {
          const result = applyVoucherTransition('ACTIVE', action);
          return result.valid === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('redeem/expire/cancel from ACTIVE leads to terminal state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('redeem' as VoucherAction, 'expire' as VoucherAction, 'cancel' as VoucherAction),
        (action) => {
          const result = applyVoucherTransition('ACTIVE', action);
          const terminalStates: VoucherStatus[] = ['REDEEMED', 'EXPIRED', 'CANCELLED'];
          return result.valid && terminalStates.includes(result.newStatus);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('only one terminal transition is possible per voucher lifecycle', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('redeem' as VoucherAction, 'expire' as VoucherAction, 'cancel' as VoucherAction, 'extend' as VoucherAction),
          { minLength: 1, maxLength: 10 },
        ),
        (actions) => {
          let state: VoucherStatus = 'ACTIVE';
          let terminalTransitions = 0;

          for (const action of actions) {
            const result = applyVoucherTransition(state, action);
            if (!result.valid) break; // Stop at first invalid transition

            if (result.newStatus !== 'ACTIVE' && state === 'ACTIVE') {
              terminalTransitions++;
            }
            state = result.newStatus;
          }

          // At most one terminal transition
          return terminalTransitions <= 1;
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('extend does not change status from ACTIVE', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (extendCount) => {
          let state: VoucherStatus = 'ACTIVE';
          for (let i = 0; i < extendCount; i++) {
            const result = applyVoucherTransition(state, 'extend');
            state = result.newStatus;
          }
          return state === 'ACTIVE';
        },
      ),
      { numRuns: 200 },
    );
  });
});
