# Database Design (MongoDB Atlas + Mongoose)

## 1. Principles

- **Database:** MongoDB Atlas. ODM: Mongoose 8.
- **Naming:** collections are plural `snake_case`; fields are `snake_case`. Mongoose timestamps use `created_at` / `updated_at`.
- **Dates:** stored in UTC. Day-based queries (audit view, digest) convert using the app timezone (`APP_TIMEZONE`, default `Asia/Kolkata`).
- **References:** `ObjectId` refs. Names and roles that must stay readable in history are also copied into events as snapshots (`performed_by_name`, etc.).
- **Event log:** every creation, usage, decision and admin correction is a row in `reel_events`. Events are never deleted.
- **Stored current state:** the reel keeps its current weight, status and counters so the dashboard is fast. These are always written by the server, never accepted from the client.
- **No hard deletes** for users, reels or field definitions. Deactivate or void instead, because history points at them.
- **Transactions:** every action that changes a reel and its events together runs in a MongoDB transaction (`session.withTransaction`). Atlas clusters are replica sets, so transactions work on every tier including the free M0.

## 2. Collections at a glance

| Collection | Model | Purpose |
|---|---|---|
| `users` | `User` | Admin, Supervisor, Operator accounts |
| `refresh_tokens` | `RefreshToken` | Login sessions (hashed refresh tokens, auto-expire) |
| `reels` | `Reel` | One document per physical reel, with current state |
| `reel_events` | `ReelEvent` | Append-only history: created, usage, confirm, decline, admin correction |
| `field_definitions` | `FieldDefinition` | Admin-defined custom parameters |
| `notifications` | `Notification` | Popups for operators when an entry is declined |
| `counters` | `Counter` | Auto-increment sequence for `reels.sr_no` |
| `digest_logs` | `DigestLog` | One row per daily digest attempt |
| `settings` | `Setting` | Single-document app settings |

Relationships:

```
users 1 ──< reels.created_by
users 1 ──< reel_events.performed_by / approved_by
users 1 ──< notifications.user_id
users 1 ──< refresh_tokens.user_id
reels 1 ──< reel_events.reel_id
reel_events 1 ──< reel_events.ref_event_id        (decision event -> the entry it decided)
reel_events 1 ──< notifications.event_id
field_definitions.key  ──  reels.custom_fields.<key>   (by key, not by id)
```

## 3. Collections

### 3.1 `users`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `name` | String | yes | Display name, shown in history |
| `username` | String | yes | Login id. Lowercase, 3-30 chars, `[a-z0-9._-]` |
| `email` | String | Admin: yes; others: optional | Lowercase. Admin email receives the daily digest |
| `phone` | String | no | |
| `password_hash` | String | yes | bcrypt. `select: false`. Never returned by the API |
| `role` | String | yes | `ADMIN` \| `SUPERVISOR` \| `OPERATOR` |
| `is_active` | Boolean | yes, default `true` | Deactivate instead of delete |
| `must_change_password` | Boolean | yes | `true` for every account an Admin creates or resets |
| `failed_login_attempts` | Number | default 0 | Reset on successful login |
| `locked_until` | Date | no | Set after 5 consecutive failures (15 minutes) |
| `last_login_at` | Date | no | |
| `password_changed_at` | Date | no | |
| `created_by` | ObjectId -> users | no | Empty for the seeded Admin |
| `created_at`, `updated_at` | Date | auto | |

Indexes:

- unique `{ username: 1 }`
- unique partial `{ email: 1 }` where `email` is a string
- `{ role: 1, is_active: 1 }`

Rules:

- Accounts are created only by an Admin (`POST /users`) or by `scripts/seedAdmin.js`.
- The users API manages only `SUPERVISOR` and `OPERATOR`. It cannot create, demote, or deactivate an `ADMIN`.
- There must always be at least one active Admin.

### 3.2 `refresh_tokens`

| Field | Type | Notes |
|---|---|---|
| `user_id` | ObjectId -> users | |
| `token_hash` | String | SHA-256 of the refresh token. The raw token is never stored |
| `expires_at` | Date | |
| `revoked_at` | Date | Set on logout, rotation, password reset, deactivation |
| `user_agent`, `ip` | String | For the "where am I signed in" view |
| `created_at` | Date | |

Indexes: unique `{ token_hash: 1 }`, `{ user_id: 1 }`, TTL `{ expires_at: 1 }` with `expireAfterSeconds: 0`.

### 3.3 `reels`

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `sr_no` | Number | auto | Sequential serial from `counters`. Gaps are fine (voided reels) |
| `reel_no` | String | yes | Unique physical ID. String, so leading zeros and letters are safe |
| `quality` | String | yes | One of `VK, SPECTRA, ULTRA, SK, IMPORTANT, SBS, FBB, DCB` |
| `bf` | Number | yes | Bursting factor |
| `purchase_date` | Date | yes | Defaults to today when not sent |
| `supplier_name` | String | yes | Mandatory, free text |
| `size` | Number | yes | Width |
| `gsm` | Number | yes | |
| `max_weight` | Number | yes | kg. Set once. Only an Admin correction can change it |
| `previous_weight` | Number | yes | kg. Running balance. Starts equal to `max_weight` |
| `status` | String | server-set | `REEL` \| `CUT` \| `NILL`, derived from weights (see 4.2) |
| `custom_fields` | Object | no | Values keyed by `field_definitions.key` |
| `stations_used` | [String] | server-set | Stations with a live (not declined) usage entry |
| `pending_count` | Number | server-set | Number of entries on this reel waiting for confirmation |
| `record_status` | String | server-set | `ACTIVE` \| `VOIDED` |
| `last_activity_at` | Date | server-set | Time of the newest live event. Drives the aging list |
| `created_by` | ObjectId -> users | yes | |
| `created_at`, `updated_at` | Date | auto | |

`current_weight` is not stored on the reel. It exists only as an input on usage events (`current_weight_entered`).

Weights are kg, stored as Number and rounded to 2 decimals on write.

Indexes:

- unique partial `{ reel_no: 1 }` where `record_status = "ACTIVE"` (a declined or voided reel number can be entered again)
- unique `{ sr_no: 1 }`
- `{ status: 1, quality: 1 }`
- `{ supplier_name: 1 }`
- `{ purchase_date: -1 }`
- `{ gsm: 1 }`
- `{ last_activity_at: 1 }`
- `{ pending_count: 1 }`
- `{ stations_used: 1 }`
- `{ record_status: 1 }`
- optional wildcard `{ "custom_fields.$**": 1 }` for filtering on custom parameters

Reel-number search: anchored prefix regex (`^100`) uses the `reel_no` index. "Contains" search scans, which is fine for a few thousand reels.

### 3.4 `reel_events`

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `reel_id` | ObjectId -> reels | |
| `reel_no` | String | Snapshot, so audit and digest read well |
| `event_type` | String | `CREATED` \| `USAGE_LOGGED` \| `CONFIRMED` \| `DECLINED_REVERTED` \| `ADMIN_CORRECTED` |
| `approval_status` | String | `PENDING` \| `CONFIRMED` \| `DECLINED` on `CREATED` and `USAGE_LOGGED`. `ADMIN_CORRECTED` is always `CONFIRMED`. Decision events (`CONFIRMED`, `DECLINED_REVERTED`) use `null` |
| `performed_by` | ObjectId -> users | |
| `performed_by_name` | String | Snapshot |
| `performed_by_role` | String | Snapshot |
| `performed_at` | Date | Server clock. Never taken from the client |
| `approved_by` | ObjectId -> users | Set when decided (or auto-set for Admin actions) |
| `approved_by_name` | String | Snapshot |
| `approved_at` | Date | |
| `decline_reason` | String | Optional text from the decider |
| `ref_event_id` | ObjectId -> reel_events | On decision events: the entry that was decided |
| `cascaded_from_event_id` | ObjectId -> reel_events | On an entry declined because an earlier entry on the same reel was declined |
| `payload` | Object | Depends on `event_type` (below) |

Payload by type:

| `event_type` | `payload` |
|---|---|
| `CREATED` | `{ max_weight, fields: { reel_no, quality, bf, gsm, size, supplier_name, purchase_date, custom_fields } }` |
| `USAGE_LOGGED` | `{ station, previous_weight, current_weight_entered, used_this_time }` |
| `CONFIRMED` | `{}` |
| `DECLINED_REVERTED` | `{ reverted_from, reverted_to, reel_voided }` |
| `ADMIN_CORRECTED` | `{ action: "EDIT" \| "VOID", changes: [{ field, from, to }], reason }` |

Only these fields on `CREATED` / `USAGE_LOGGED` events may change after insert: `approval_status`, `approved_by`, `approved_by_name`, `approved_at`, `decline_reason`. Nothing else is ever updated, and there is no delete.

Indexes:

- `{ reel_id: 1, performed_at: 1 }` (reel journey; FIFO checks)
- `{ approval_status: 1, performed_at: 1 }` (pending queue, oldest first)
- `{ performed_at: -1 }` (audit by day)
- `{ event_type: 1, performed_at: -1 }` (digest counts)
- `{ performed_by: 1, performed_at: -1 }` (operator's own entries)
- `{ ref_event_id: 1 }`

### 3.5 `field_definitions`

| Field | Type | Notes |
|---|---|---|
| `key` | String | Unique. `snake_case`. Immutable. Generated from the label if not sent |
| `label` | String | Shown in forms, table, filters |
| `type` | String | `text` \| `number`. Immutable |
| `required` | Boolean | Default `false` |
| `options` | [String] | Reserved for a later `select` type |
| `order` | Number | Display order |
| `is_active` | Boolean | Deactivate to hide. Existing values are kept |
| `created_by` | ObjectId -> users | |
| `created_at`, `updated_at` | Date | |

Indexes: unique `{ key: 1 }`, `{ is_active: 1, order: 1 }`.

### 3.6 `notifications`

| Field | Type | Notes |
|---|---|---|
| `user_id` | ObjectId -> users | Recipient (the operator who submitted the entry) |
| `type` | String | `ENTRY_DECLINED` (more types later) |
| `title` | String | Short heading |
| `message` | String | Plain sentence: what was declined and that the value was reverted |
| `event_id` | ObjectId -> reel_events | The declined entry |
| `reel_id` | ObjectId -> reels | |
| `reel_no` | String | Snapshot |
| `data` | Object | `{ reverted_from, reverted_to, reason, declined_by_name }` |
| `is_read` | Boolean | Default `false` |
| `read_at` | Date | |
| `created_at` | Date | |

Indexes: `{ user_id: 1, is_read: 1, created_at: -1 }`.

### 3.7 `counters`

`{ _id: "reel_sr_no", seq: Number }`. Incremented atomically with `findOneAndUpdate({ $inc: { seq: 1 } }, { upsert: true, new: true })` when a reel is created. Because the reel insert and the counter increment share a transaction, a failed creation does not burn a number.

### 3.7a `digest_logs`

| Field | Type | Notes |
|---|---|---|
| `date` | String | `YYYY-MM-DD` in app timezone |
| `type` | String | `DAILY` |
| `status` | String | `SENDING` \| `SENT` \| `FAILED` \| `SKIPPED` |
| `recipients` | [String] | Email addresses |
| `counts` | Object | `{ created, usage, confirmed, declined, admin_corrected, still_pending }` |
| `deep_link` | String | Link into the audit view for that day |
| `triggered_by` | String | `CRON` or a user id |
| `error` | String | |
| `created_at`, `sent_at` | Date | |

Index: unique `{ date: 1, type: 1 }`. Inserting the `SENDING` row first acts as a lock so two server instances cannot send the same digest.

### 3.8 `settings`

Single document, `_id: "app"`.

| Field | Default |
|---|---|
| `aging_threshold_days` | `30` |
| `digest.enabled` | `true` |
| `digest.time` | `"20:00"` (HH:mm) |
| `digest.timezone` | `"Asia/Kolkata"` |
| `updated_by` | user id |
| `updated_at` | |

Environment variables give the first-run defaults. Once the document exists, the database value wins.

## 4. Business rules the database must respect

### 4.1 Weights

- `max_weight` is set at creation and never changes, except through an Admin correction (which writes an `ADMIN_CORRECTED` event).
- `previous_weight` starts equal to `max_weight`.
- A usage entry carries `current_weight_entered`. Valid range: `0 <= current_weight_entered < previous_weight`.
- `used_this_time = previous_weight - current_weight_entered`.
- The reel's `previous_weight` becomes `current_weight_entered` **immediately** when the entry is submitted.

### 4.2 Status is derived

```
previous_weight == max_weight  ->  REEL
previous_weight == 0           ->  NILL
otherwise                      ->  CUT
```

Recalculated on every weight change, by one function (`utils/reelStatus.js`), on the server only.

### 4.3 Apply immediately, confirm later

1. Operator submits a creation or usage. The reel changes right away, a `PENDING` event is written, and `reels.pending_count` goes up by 1.
2. **Confirm:** the event becomes `CONFIRMED` with `approved_by` / `approved_at`. `pending_count` goes down by 1. A `CONFIRMED` decision event is appended. The reel's weight is not touched.
3. **Decline:** see 4.4.
4. Admin actions (create, usage, edit, void) are confirmed automatically because the Admin is the top approver.

### 4.4 Decline reverts the change

Declining an entry, all in one transaction:

- **`USAGE_LOGGED`:** `previous_weight` goes back to that entry's `payload.previous_weight`.
- **`CREATED`:** the reel becomes `record_status = "VOIDED"`.
- The entry becomes `DECLINED` and a `DECLINED_REVERTED` decision event is appended.
- **Cascade:** any *later* `PENDING` entries on the same reel are also declined (`cascaded_from_event_id` set), because they were built on top of the declined one. The reel reverts to the baseline before the *earliest* declined entry.
- `pending_count`, `status`, `stations_used` and `last_activity_at` are recalculated from the remaining live events.
- One `notifications` row is created for each declined entry, for the operator who submitted it.

### 4.5 Confirm in order (FIFO per reel)

An entry cannot be confirmed while an older `PENDING` entry exists on the same reel (`409 OUT_OF_ORDER_APPROVAL`). Together with the cascade rule, this guarantees a confirmed entry never sits on top of a pending one, so a decline can always be reverted cleanly.

For the same reason, an Admin cannot change weight fields or record usage on a reel that has pending entries (`409 REEL_HAS_PENDING_EVENTS`). Non-weight fields (quality, supplier, custom fields) can be edited any time.

### 4.6 Concurrent usage

Two operators may work on the same reel. A usage entry is written with a conditional update: `previous_weight` must still equal the value the server read (or the client's `expected_previous_weight`). If not, the request fails with `409 STALE_WEIGHT` and the client refreshes.

### 4.7 Aging

A reel is "unused for N days" when `status != NILL` and `last_activity_at < now - aging_threshold_days`. Fully used reels are not dead stock, so they are excluded.

### 4.8 Custom fields

- Values are validated against **active** `field_definitions` (type, required).
- Unknown keys are rejected.
- Deactivating a definition hides it but keeps stored values.

### 4.9 Users and history

Users are never deleted. Events keep `performed_by_name` and `performed_by_role` snapshots, so history stays readable after a rename, role change, or deactivation.

## 5. Sample documents

Reel:

```json
{
  "_id": "665f1a2b3c4d5e6f7a8b9c01",
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
  "status": "CUT",
  "custom_fields": { "batch_code": "B-2" },
  "stations_used": ["Station 1"],
  "pending_count": 1,
  "record_status": "ACTIVE",
  "last_activity_at": "2026-08-15T14:00:00.000Z",
  "created_by": "665f1a2b3c4d5e6f7a8b9a11",
  "created_at": "2026-08-10T09:00:00.000Z",
  "updated_at": "2026-08-15T14:00:00.000Z"
}
```

Usage entry waiting for confirmation:

```json
{
  "reel_id": "665f1a2b3c4d5e6f7a8b9c01",
  "reel_no": "1002",
  "event_type": "USAGE_LOGGED",
  "approval_status": "PENDING",
  "performed_by": "665f1a2b3c4d5e6f7a8b9a12",
  "performed_by_name": "Ramesh Yadav",
  "performed_by_role": "OPERATOR",
  "performed_at": "2026-08-15T14:00:00.000Z",
  "approved_by": null,
  "approved_at": null,
  "payload": {
    "station": "Station 1",
    "previous_weight": 1200,
    "current_weight_entered": 800,
    "used_this_time": 400
  }
}
```

Decision event written when a Supervisor confirms it:

```json
{
  "reel_id": "665f1a2b3c4d5e6f7a8b9c01",
  "reel_no": "1002",
  "event_type": "CONFIRMED",
  "approval_status": null,
  "performed_by": "665f1a2b3c4d5e6f7a8b9a13",
  "performed_by_name": "Suresh Chandra",
  "performed_by_role": "SUPERVISOR",
  "performed_at": "2026-08-15T16:30:00.000Z",
  "ref_event_id": "665f1a2b3c4d5e6f7a8b9d05",
  "payload": {}
}
```

## 6. MongoDB Atlas setup notes

- **Cluster:** M0 is fine for development. Use a paid tier (M10 or above) for production so Cloud Backup is available. Pick the region closest to the server (for example AWS Mumbai `ap-south-1` for an India-hosted server).
- **Database user:** create a dedicated user with `readWrite` on the application database only. Do not use the Atlas admin user in the app.
- **Network access:** allow the server's IP address. Avoid `0.0.0.0/0` in production.
- **Connection string:** `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`. Keep it in `.env` as `MONGODB_URI`. Never commit it. Passwords with special characters must be URL-encoded.
- **Databases per environment:** `rainbow_dev`, `rainbow_test`, `rainbow_prod`, selected with `MONGODB_DB_NAME`.
- **Indexes:** set Mongoose `autoIndex: false` in production and run `scripts/createIndexes.js` (which calls `syncIndexes()` on every model) at deploy time.
- **Tests:** transactions need a replica set, so use `MongoMemoryReplSet` (from `mongodb-memory-server`) rather than a single in-memory server.
- **Backups:** confirm Cloud Backup is enabled on the production cluster and note the restore procedure.

## 7. Importing `REELS.xlsx`

`scripts/importReelsFromExcel.js` is a one-off migration for the existing sheet (79 sample rows).

| Excel column | Goes to |
|---|---|
| SR NO | `sr_no` (or regenerated from the counter) |
| QUALITY | `quality` (must be one of the eight allowed values) |
| BF | `bf` |
| PURCHASE DATE | `purchase_date` |
| SUPPLIER NAME | `supplier_name` (rows without a supplier are reported, not silently skipped) |
| REEL NO. | `reel_no` |
| REEL WEIGHT | `max_weight` |
| BALANCE | `previous_weight` |
| SIZE, GSM | `size`, `gsm` |
| STATUS | Not imported. Recalculated, and any mismatch is reported |
| CONSUMER STOCK | Not imported. Treated as `max_weight - previous_weight` (to be confirmed) |

Each imported reel gets one auto-confirmed `CREATED` event performed by the Admin who runs the import, with `payload.fields.imported = true`.
