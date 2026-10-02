import { Counter } from '../models/counter.model.js';
import { Reel } from '../models/reel.model.js';

/**
 * Gets next atomic sequence number for a given sequence ID (default: 'reel_sr_no').
 * @param {string} [seqName='reel_sr_no']
 * @param {import('mongoose').ClientSession} [session=null]
 * @returns {Promise<number>}
 */
export async function getNextSequence(seqName = 'reel_sr_no', session = null) {
  const options = { returnDocument: 'after', upsert: true };
  if (session) {
    options.session = session;
  }

  // Auto-sync sequence with actual maximum sr_no in database if out of sync
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
