import { Counter } from './counter.model.js';
import { Reel } from '../../modules/reels/models/reel.model.js';

/**
 * Universal Atomic Sequence Generator
 *
 * Supports independent monotonic numbering sequences across modules:
 * - 'reel_sr_no'        -> Sequential ID for paper reels (1, 2, 3...)
 * - 'sheet_sr_no'       -> Sequential ID for sheet lots (1, 2, 3...)
 * - 'finished_box_sr_no'-> Sequential ID for box lots/orders (1, 2, 3...)
 *
 * @param {string} [seqName='reel_sr_no'] The unique sequence identifier
 * @param {import('mongoose').ClientSession} [session=null] Optional active MongoDB session
 * @returns {Promise<number>} Next atomic integer in sequence
 */
export async function getNextSequence(seqName = 'reel_sr_no', session = null) {
  const options = { returnDocument: 'after', upsert: true };
  if (session) {
    options.session = session;
  }

  // Auto-sync sequence with actual maximum sr_no in database for Reels
  if (seqName === 'reel_sr_no') {
    const maxReel = await Reel.findOne({}).sort({ sr_no: -1 }).select('sr_no').lean();
    if (maxReel && maxReel.sr_no) {
      const counterDoc = await Counter.findById('reel_sr_no');
      if (!counterDoc || counterDoc.seq < maxReel.sr_no) {
        await Counter.findByIdAndUpdate(
          'reel_sr_no',
          { $set: { seq: maxReel.sr_no } },
          { upsert: true, session }
        );
      }
    }
  }

  const counter = await Counter.findOneAndUpdate(
    { _id: seqName },
    { $inc: { seq: 1 } },
    options
  );
  return counter.seq;
}

/**
 * Reset a sequence counter (used primarily in test suites and administrative maintenance).
 * @param {string} seqName
 * @param {number} [val=0]
 * @returns {Promise<void>}
 */
export async function resetCounter(seqName, val = 0) {
  await Counter.findByIdAndUpdate(seqName, { $set: { seq: val } }, { upsert: true });
}
