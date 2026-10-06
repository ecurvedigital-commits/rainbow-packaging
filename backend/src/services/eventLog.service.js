import { ReelEvent } from '../models/reelEvent.model.js';

/**
 * Appends a new event entry to the reel_events collection.
 * @param {{
 *   reel_id: import('mongoose').Types.ObjectId | string,
 *   reel_no: string,
 *   event_type: string,
 *   approval_status?: string | null,
 *   performed_by: { id: string, name: string, role: string },
 *   approved_by?: { id: string, name: string } | null,
 *   decline_reason?: string | null,
 *   ref_event_id?: import('mongoose').Types.ObjectId | string | null,
 *   cascaded_from_event_id?: import('mongoose').Types.ObjectId | string | null,
 *   payload?: object,
 *   session?: import('mongoose').ClientSession | null
 * }} params
 * @returns {Promise<import('../models/reelEvent.model.js').ReelEvent>}
 */
export async function appendEvent({
  reel_id,
  reel_no,
  event_type,
  approval_status = null,
  performed_by,
  approved_by = null,
  performed_at = null,
  decline_reason = null,
  ref_event_id = null,
  cascaded_from_event_id = null,
  payload = {},
  session = null,
}) {
  const options = session ? { session } : {};

  const doc = {
    reel_id,
    reel_no,
    event_type,
    approval_status,
    performed_by: performed_by.id,
    performed_by_name: performed_by.name,
    performed_by_role: performed_by.role,
    performed_at: performed_at ? new Date(performed_at) : new Date(),
    approved_by: approved_by ? approved_by.id : null,
    approved_by_name: approved_by ? approved_by.name : null,
    approved_at: approved_by ? (performed_at ? new Date(performed_at) : new Date()) : null,
    decline_reason: decline_reason || null,
    ref_event_id: ref_event_id || null,
    cascaded_from_event_id: cascaded_from_event_id || null,
    payload,
  };

  const [event] = await ReelEvent.create([doc], options);
  return event;
}
