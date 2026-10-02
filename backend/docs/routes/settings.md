# Settings Routes

Base path: `/api/v1/settings`  
**Access:** Admin only.

One settings document (`_id: "app"`) is created on first start from the environment defaults (`AGING_THRESHOLD_DAYS`, `DIGEST_ENABLED`, `DIGEST_TIME`, `APP_TIMEZONE`). After that, the database value wins.

---

## GET `/settings`

Response `200`:

```json
{
  "success": true,
  "data": {
    "aging_threshold_days": 30,
    "digest": { "enabled": true, "time": "20:00", "timezone": "Asia/Kolkata" },
    "updated_by": "665f...",
    "updated_at": "2026-09-01T06:00:00.000Z"
  }
}
```

---

## PATCH `/settings`

Body (all optional):

```json
{ "aging_threshold_days": 45, "digest": { "enabled": true, "time": "19:30" } }
```

| Field | Rules |
|---|---|
| `aging_threshold_days` | Whole number, 1-365 |
| `digest.enabled` | Boolean |
| `digest.time` | `HH:mm`, 24-hour |
| `digest.timezone` | A valid IANA timezone name |

When the digest time, timezone or enabled flag changes, the scheduler is re-registered without a server restart.

Response `200`: the updated settings. Errors: `422 VALIDATION_ERROR`.
