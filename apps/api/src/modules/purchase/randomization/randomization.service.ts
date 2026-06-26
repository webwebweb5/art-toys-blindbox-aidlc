import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  normalizeProbabilities,
  selectByWeightedRandom,
} from './probability.util';

export interface FigureForSelection {
  id: string;
  name: string;
  rarity: string;
  probability: number;
}

@Injectable()
export class RandomizationService {
  /**
   * Determine which figure is selected using CSPRNG (crypto.randomBytes).
   * Optionally accepts pity-adjusted probabilities.
   */
  determineFigure(
    figures: FigureForSelection[],
    pityAdjustedProbabilities?: Map<string, number>,
  ): FigureForSelection {
    const probabilities = figures.map((f) => {
      if (pityAdjustedProbabilities?.has(f.id)) {
        return pityAdjustedProbabilities.get(f.id)!;
      }
      return f.probability;
    });

    const selectedIndex = this.normalizeAndSelect(probabilities);
    return figures[selectedIndex];
  }

  /**
   * Multi-pull with guaranteed no duplicates within the batch.
   * If count exceeds available figures, returns all unique figures.
   */
  multiPullNoDuplicates(
    figures: FigureForSelection[],
    count: number,
  ): FigureForSelection[] {
    const results: FigureForSelection[] = [];
    const remainingFigures = [...figures];
    const pullCount = Math.min(count, figures.length);

    for (let i = 0; i < pullCount; i++) {
      if (remainingFigures.length === 0) break;

      const probabilities = remainingFigures.map((f) => f.probability);
      const selectedIndex = this.normalizeAndSelect(probabilities);
      const selected = remainingFigures[selectedIndex];

      results.push(selected);
      remainingFigures.splice(selectedIndex, 1);
    }

    return results;
  }

  /**
   * Normalize probabilities and select an index using cryptographically secure randomness.
   * Uses crypto.randomBytes() for CSPRNG - suitable for fair probability-based selection.
   */
  normalizeAndSelect(probabilities: number[]): number {
    if (probabilities.length === 0) {
      throw new Error('Cannot select from empty probability array');
    }

    if (probabilities.length === 1) {
      return 0;
    }

    const normalized = normalizeProbabilities(probabilities);
    const randomValue = this.generateSecureRandom();

    return selectByWeightedRandom(normalized, randomValue);
  }

  /**
   * Generate a cryptographically secure random number in [0, 1).
   * Uses 8 bytes (64 bits) from crypto.randomBytes for high precision.
   */
  private generateSecureRandom(): number {
    const bytes = crypto.randomBytes(8);
    // Use all 8 bytes to get a high-precision number in [0, 1)
    const value = bytes.readBigUInt64BE();
    // Max value for 8 bytes is 2^64 - 1
    const max = BigInt('18446744073709551616'); // 2^64
    return Number(value) / Number(max);
  }
}
