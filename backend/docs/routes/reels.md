# Reel Routes

Base path: `/api/v1/reels`

Business rules behind these routes are in `DATABASE_DESIGN.md` section 4. In short: changes apply immediately, the entry waits for confirmation, and declining reverts it.

## The reel object

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9c01",
  "sr_no": 2,
  "reel_no": "1002",
  "quality": "SPECTRA",
  "bf": 20,
  "purchase_date": "2026-08-10T00:00:00.000Z",
  "supplier_name": "Beta Board",
  "size": 120,
  "gsm": 250,
  "max_weight": 1200,
  "previous_weight": 800,
  "consumed_weight": 400,
  "status": "CUT",
  "approval_status": "PENDING",
  "custom_fields": { "batch_code": "B-2" },
  "stations_used": ["Station 1"],
  "record_status": "ACTIVE",
  "last_activity_at": "2026-08-15T14:00:00.000Z",
  "created_at": "2026-08-10T09:00:00.000Z"
}
```

- `previous_weight` is the running balance.
- `consumed_weight` = `max_weight - previous_weight` (computed).
- `approval_status` is `PENDING` when the reel has at least one entry waiting, otherwise `CONFIRMED`.

---

## GET `/reels`: list with filters

**Access:** All roles.

Query:

| Param | Meaning |
|---|---|
| `q` | Reel number contains |
| `status` | `REEL`, `CUT`, `NILL` (comma-separated for several) |
| `quality` | One or more qualities |
| `supplier` | One or more supplier names (exact), or `supplier_q` for contains |
| `gsm_min`, `gsm_max` | GSM range |
| `size_min`, `size_max` | Size range |
| `weight_min`, `weight_max` | Balance range |
| `purchase_date_from`, `purchase_date_to` | Date range (inclusive) |
| `station` | One or more stations used |
| `approval_status` | `PENDING` or `CONFIRMED` |
| `cf.<key>` | Custom parameter filter, e.g. `cf.batch_code=B-2`, `cf.thickness_micron_min=60`, `cf.batch_code_exists=true` (any non-empty value recorded) |
| `include_voided` | `true` to include voided reels (Admin only) |
| `page`, `limit`, `sort` | Sortable: `sr_no`, `reel_no`, `status`, `quality`, `supplier_name`, `purchase_date`, `gsm`, `size`, `previous_weight`, `last_activity_at`, and `cf.<key>` |

Filters combine with AND. Voided reels are hidden by default. Response `200`: array of reel objects plus pagination `meta`.

---

## GET `/reels/search`: quick lookup by reel number

**Access:** All roles. Used by the Operator's "Record usage" screen.

Query: `q` (min 1 character). Returns up to 10 active reels whose `reel_no` starts with, or contains, `q` (exact matches first).

Response `200`: array of short reel objects: `id, reel_no, quality, previous_weight, max_weight, status, approval_status`.

---

## GET `/reels/:id`

**Access:** All roles. Response `200`: one reel object. `404 NOT_FOUND`.

---

## GET `/reels/:id/journey`: timeline for one reel

**Access:** All roles (view-only).

Returns the reel summary and every entry on it, newest first. Confirm and decline decisions are folded into the entry they decided, so each timeline card carries its own status.

Response `200`:

```json
{
  "success": true,
  "data": {
    "reel": { "id": "665f...", "reel_no": "1002", "quality": "SPECTRA", "supplier_name": "Beta Board", "gsm": 250, "size": 120, "status": "CUT" },
    "events": [
      {
        "id": "665f...d05",
        "event_type": "USAGE_LOGGED",
        "approval_status": "PENDING",
        "performed_by_name": "Ramesh Yadav",
        "performed_at": "2026-08-15T14:00:00.000Z",
        "payload": { "station": "Station 1", "previous_weight": 1200, "current_weight_entered": 800, "used_this_time": 400 },
        "decision": null
      },
      {
        "id": "665f...d01",
        "event_type": "CREATED",
        "approval_status": "CONFIRMED",
        "performed_by_name": "Ramesh Yadav",
        "performed_at": "2026-08-10T09:00:00.000Z",
        "payload": { "max_weight": 1200 },
        "decision": { "by_name": "Suresh Chandra", "at": "2026-08-10T10:00:00.000Z", "reason": null }
      }
    ]
  }
}
```

`decision` is `null` while pending. For a declined entry it holds `by_name`, `at`, `reason`, and `reverted_from` / `reverted_to`. Admin corrections appear as `ADMIN_CORRECTED` entries with their `changes`.

---

## POST `/reels`: create a reel

**Access:** Operator, Admin.

Body:

```json
{
  "reel_no": "1004",
  "quality": "VK",
  "bf": 18,
  "purchase_date": "2026-09-28",
  "supplier_name": "Alpha Papers",
  "size": 100,
  "gsm": 150,
  "max_weight": 1000,
  "custom_fields": { "thickness_micron": 80, "batch_code": "B-1" }
}
```

| Field | Required | Rules |
|---|---|---|
| `reel_no` | yes | Trimmed, unique among active reels |
| `quality` | yes | One of the eight allowed values |
| `bf`, `size`, `gsm` | yes | Numbers greater than 0 |
| `supplier_name` | yes | Non-empty |
| `max_weight` | yes | Greater than 0 |
| `purchase_date` | no | Defaults to today; not in the future |
| `custom_fields` | depends | Validated against active field definitions; required ones must be present |

Behaviour (one transaction): assign `sr_no`, set `previous_weight = max_weight`, `status = REEL`, write a `CREATED` event.

- By an Operator: the event is `PENDING` and `pending_count` becomes 1.
- By an Admin: the event is `CONFIRMED` straight away.

Response `201`: `{ "reel": { ... }, "event": { ... } }`

Errors: `409 DUPLICATE_REEL_NO`, `422 VALIDATION_ERROR`.

---

## POST `/reels/:id/usage`: record usage

**Access:** Operator, Admin.

Body:

```json
{ "station": "Station 1", "current_weight_entered": 500, "expected_previous_weight": 800 }
```

| Field | Required | Rules |
|---|---|---|
| `station` | yes | `Station 1`, `Station 2` or `Station 3` |
| `current_weight_entered` | yes | `0 <= value < previous_weight` (what the reel weighs now) |
| `expected_previous_weight` | no | The balance the screen showed. If the reel has changed since, the request fails with `STALE_WEIGHT` |

Behaviour (one transaction): `used_this_time = previous_weight - current_weight_entered`; `previous_weight` becomes `current_weight_entered` immediately; `status` recalculated; a `USAGE_LOGGED` event is written (`PENDING` for an Operator, auto-`CONFIRMED` for an Admin); the station is added to `stations_used`; `last_activity_at` updated.

Response `201`: `{ "reel": { ... }, "event": { ... } }`

Errors: `404 NOT_FOUND`, `409 STALE_WEIGHT`, `409 REEL_HAS_PENDING_EVENTS` (Admin only), `422 REEL_NOT_ACTIVE`, `422 REEL_ALREADY_EMPTY`, `422 VALIDATION_ERROR`.

---

## PATCH `/reels/:id`: Admin edit

**Access:** Admin.

Body: any of `reel_no, quality, bf, purchase_date, supplier_name, size, gsm, max_weight, previous_weight, custom_fields`, plus an optional `reason`.

```json
{ "gsm": 160, "supplier_name": "Alpha Papers Ltd", "reason": "Typo at entry" }
```

Rules:

- Changing `max_weight` or `previous_weight` needs the reel to have no pending entries (`409 REEL_HAS_PENDING_EVENTS`). After the change `previous_weight` must not exceed `max_weight`, and `status` is recalculated.
- `reel_no` stays unique among active reels.
- `sr_no`, `status`, `pending_count` and the other server-set fields cannot be sent.
- Writes an `ADMIN_CORRECTED` event (already `CONFIRMED`) listing each `{ field, from, to }`.

Response `200`: `{ "reel": { ... }, "event": { ... } }`. Errors: `404`, `409`, `422`.

---

## POST `/reels/:id/void`: Admin removes a reel from stock

**Access:** Admin. Reels are never hard-deleted.

Body: `{ "reason": "Entered by mistake" }`

Behaviour: `record_status = VOIDED`; any pending entries on the reel are declined without a revert; an `ADMIN_CORRECTED` event with `action: "VOID"` is written. The reel number can then be used again.

Response `200`: `{ "reel": { ... } }`
