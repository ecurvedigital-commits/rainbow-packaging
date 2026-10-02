# Audit and Daily Digest Routes

**Access for every route in this file: Admin only.**

---

## Audit log

Base path: `/api/v1/audit`

A read-only view over `reel_events`: who did what, on which reel, and when, including confirmations, declines and Admin corrections.

### GET `/audit/events`

Query:

| Param | Meaning |
|---|---|
| `date` | One day, `YYYY-MM-DD`, read in the app timezone. This is what the digest email links to |
| `from`, `to` | Date range, used instead of `date` |
| `event_type` | `CREATED`, `USAGE_LOGGED`, `CONFIRMED`, `DECLINED_REVERTED`, `ADMIN_CORRECTED` (comma-separated allowed) |
| `approval_status` | `PENDING`, `CONFIRMED`, `DECLINED` |
| `performed_by` | User id |
| `reel_no` | Reel number contains |
| `page`, `limit` | Standard. Newest first |

Response `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": "665f...d05",
      "event_type": "USAGE_LOGGED",
      "approval_status": "CONFIRMED",
      "reel_id": "665f...c01",
      "reel_no": "1002",
      "performed_by_name": "Ramesh Yadav",
      "performed_by_role": "OPERATOR",
      "performed_at": "2026-09-28T09:40:00.000Z",
      "approved_by_name": "Suresh Chandra",
      "approved_at": "2026-09-28T11:05:00.000Z",
      "payload": { "station": "Station 1", "previous_weight": 1200, "current_weight_entered": 800, "used_this_time": 400 }
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 37, "total_pages": 2 }
}
```

---

## Daily digest

Base path: `/api/v1/digest`

A scheduled job (`jobs/dailyDigest.job.js`) runs at the configured time (default 20:00 in `Asia/Kolkata`, from `settings.digest`). It:

1. Reads that day's events from `reel_events`.
2. Counts creations, usage entries, confirmations, declines and admin corrections.
3. Counts entries still pending, and how long the oldest has waited.
4. Emails every active Admin who has an email address.
5. Records the attempt in `digest_logs`.

The email is short: the counts, the pending line, and a button linking to `{FRONTEND_URL}/admin/audit?date=YYYY-MM-DD`, which opens the audit view for that day.

Safety: the job first inserts a `digest_logs` row for `(date, type)` with status `SENDING`. If a `SENT` or `SENDING` row already exists, it skips. That prevents duplicates when the server restarts or runs more than one instance. Failures are recorded as `FAILED` with the error text.

### GET `/digest/preview`

Query: `date` (default today). Returns the digest content without sending.

Response `200`:

```json
{
  "success": true,
  "data": {
    "date": "2026-09-28",
    "counts": { "created": 3, "usage": 12, "confirmed": 10, "declined": 1, "admin_corrected": 0, "still_pending": 4 },
    "oldest_pending_hours": 26,
    "deep_link": "https://app.example.com/admin/audit?date=2026-09-28",
    "recipients": ["owner@example.com"]
  }
}
```

### POST `/digest/send`

Sends the digest now (for testing or a missed run).

Body (optional): `{ "date": "2026-09-28" }`

Response `200`: the `digest_logs` row. Errors: `409 DIGEST_ALREADY_SENT` if that date's digest was already sent (send again with `"force": true`), `422 VALIDATION_ERROR`.

### GET `/digest/logs`

Query: `page`, `limit`. Newest first. Response `200`: array of digest log rows (`date, status, recipients, counts, sent_at, error`).
