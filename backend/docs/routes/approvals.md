# Approval Routes

Base path: `/api/v1/approvals`

The `:eventId` in these routes is the id of the **entry** being decided (a `CREATED` or `USAGE_LOGGED` event), not the reel id.

## Rules

1. Entries apply to the reel immediately and wait as `PENDING`. Confirming only signs off. It never re-applies the change.
2. **Nobody decides their own entry** (`403 SELF_APPROVAL_NOT_ALLOWED`).
3. **Confirm in order:** an entry can be confirmed only if no older `PENDING` entry exists on the same reel (`409 OUT_OF_ORDER_APPROVAL`). The queue tells the UI which items can be confirmed (`can_confirm`).
4. **Decline reverts and cascades.** Declining an entry also declines every later pending entry on the same reel, because those were built on top of it. The reel goes back to the state before the earliest declined entry.
5. Both actions run in one transaction: entry status, decision event, reel state, `pending_count`, and notifications succeed or fail together.
6. An entry that is no longer pending returns `409 ALREADY_DECIDED`.

---

## GET `/approvals/pending`: the approval queue

**Access:** Supervisor, Admin.

Query: `event_type` (`CREATED` or `USAGE_LOGGED`), `performed_by` (user id), `q` (reel number contains), `page`, `limit`. Sorted oldest first (longest waiting at the top).

Response `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": "665f...d05",
      "event_type": "USAGE_LOGGED",
      "reel": { "id": "665f...c01", "reel_no": "1002", "quality": "SPECTRA", "previous_weight": 800 },
      "performed_by_name": "Ramesh Yadav",
      "performed_at": "2026-08-15T14:00:00.000Z",
      "waiting_hours": 52,
      "can_confirm": true,
      "payload": { "station": "Station 1", "previous_weight": 1200, "current_weight_entered": 800, "used_this_time": 400 }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "total_pages": 1, "oldest_waiting_hours": 52 }
}
```

For a `CREATED` entry, `payload` holds `max_weight` and the reel fields.

---

## GET `/approvals/mine`: an operator's own entries

**Access:** Operator, Admin. Lets operators check their work for mistakes.

Query: `status` (`PENDING`, `CONFIRMED`, `DECLINED`), `page`, `limit`. Newest first.

Response `200`: entries in the same shape as above, plus `approval_status`, `decision` (`by_name`, `at`, `reason`) and, when declined, `reverted_from` / `reverted_to`.

`meta.counts`: `{ "pending": 2, "confirmed": 40, "declined": 1 }`.

---

## POST `/approvals/:eventId/confirm`

**Access:** Supervisor, Admin.

Body: none.

Behaviour: set `approval_status = CONFIRMED`, `approved_by`, `approved_by_name`, `approved_at`; decrement the reel's `pending_count`; append a `CONFIRMED` decision event.

Response `200`:

```json
{ "success": true, "data": { "event": { "id": "665f...d05", "approval_status": "CONFIRMED", "approved_by_name": "Suresh Chandra", "approved_at": "2026-08-16T09:15:00.000Z" } } }
```

Errors: `403 SELF_APPROVAL_NOT_ALLOWED`, `404 NOT_FOUND`, `409 ALREADY_DECIDED`, `409 OUT_OF_ORDER_APPROVAL`.

---

## POST `/approvals/:eventId/decline`

**Access:** Supervisor, Admin.

Body (optional): `{ "reason": "Weight looks wrong, please re-weigh" }` (max 300 characters)

Behaviour (one transaction):

1. Find this entry and every later `PENDING` entry on the same reel.
2. Mark each `DECLINED` (later ones get `cascaded_from_event_id`), set `approved_by`, `approved_at`, `decline_reason`.
3. Revert the reel:
   - Usage entries: `previous_weight` returns to the earliest declined entry's `payload.previous_weight`.
   - A declined `CREATED` entry: the reel becomes `VOIDED`.
4. Recalculate `status`, `stations_used`, `last_activity_at`, `pending_count`.
5. Append a `DECLINED_REVERTED` decision event for each declined entry.
6. Create one notification per declined entry for the operator who submitted it (see `notifications.md`).

Response `200`:

```json
{
  "success": true,
  "data": {
    "declined_event_ids": ["665f...d05", "665f...d08"],
    "cascaded_event_ids": ["665f...d08"],
    "reverted": { "from": 500, "to": 1200 },
    "reel": { "id": "665f...c01", "reel_no": "1002", "previous_weight": 1200, "status": "REEL", "approval_status": "CONFIRMED" }
  }
}
```

Errors: `403 SELF_APPROVAL_NOT_ALLOWED`, `404 NOT_FOUND`, `409 ALREADY_DECIDED`.

Tell the UI when a decline cascades ("2 entries were declined because they came after this one") so the Supervisor is not surprised.
