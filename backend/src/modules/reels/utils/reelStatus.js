import { REEL_STATUS } from '../constants/reelStatus.js';

/**
 * Derives reel status from current balance and maximum weight.
 * @param {{ previous_weight: number, max_weight: number }} params
 * @returns {'REEL' | 'CUT' | 'NILL'}
 */
export function deriveReelStatus({ previous_weight, max_weight }) {
  if (previous_weight >= max_weight) {
    return REEL_STATUS.REEL;
  }
  if (previous_weight <= 0) {
    return REEL_STATUS.NILL;
  }
  return REEL_STATUS.CUT;
}
