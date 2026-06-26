/**
 * Normalize an array of probabilities so they sum to 1.0.
 * Handles edge cases where probabilities might not perfectly sum due to floating point.
 */
export function normalizeProbabilities(probabilities: number[]): number[] {
  const sum = probabilities.reduce((acc, p) => acc + p, 0);
  if (sum === 0) {
    // Equal distribution if all are zero
    return probabilities.map(() => 1 / probabilities.length);
  }
  return probabilities.map((p) => p / sum);
}

/**
 * Convert a random value in [0, 1) to an index based on cumulative probabilities.
 * Uses binary search for efficient selection.
 */
export function selectByWeightedRandom(
  normalizedProbabilities: number[],
  randomValue: number,
): number {
  const cumulative: number[] = [];
  let sum = 0;

  for (const prob of normalizedProbabilities) {
    sum += prob;
    cumulative.push(sum);
  }

  // Binary search for the index
  let low = 0;
  let high = cumulative.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (randomValue < cumulative[mid]) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return low;
}

/**
 * Apply pity adjustment to probabilities.
 * Increases rare/secret probabilities by a multiplier and redistributes.
 */
export function applyPityAdjustment(
  probabilities: number[],
  rarities: string[],
  multiplier: number,
): number[] {
  const adjusted = probabilities.map((prob, i) => {
    if (rarities[i] === 'RARE' || rarities[i] === 'SECRET') {
      return prob * multiplier;
    }
    return prob;
  });

  // Normalize to maintain 100% total
  return normalizeProbabilities(adjusted);
}
