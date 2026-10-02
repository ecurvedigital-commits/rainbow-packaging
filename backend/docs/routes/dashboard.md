# Dashboard Routes

Base path: `/api/v1/dashboard`  
**Access:** all signed-in roles. Operators and Supervisors see the same numbers, read-only.

All figures count `ACTIVE` reels only (voided reels are excluded) and include entries still pending confirmation, since those changes are already applied.

Use MongoDB aggregation pipelines. Run the four counts in `summary` as a single `$facet` so it is one round trip.

---

## GET `/dashboard/summary`: the tiles

Response `200`:

```json
{
  "success": true,
  "data": {
    "total_reels": 79,
    "weight_in_stock": 48210.5,
    "pending_confirmations": 4,
    "unused_reels": 6,
    "aging_threshold_days": 30,
    "by_status": { "REEL": 40, "CUT": 25, "NILL": 14 }
  }
}
```

| Field | Definition |
|---|---|
| `total_reels` | Count of active reels |
| `weight_in_stock` | Sum of `previous_weight` (kg) |
| `pending_confirmations` | Number of `PENDING` entries across all reels |
| `unused_reels` | Reels with status not `NILL` and `last_activity_at` older than the aging threshold |
| `by_status` | Counts for the Unused / In use / Fully used columns |

---

## GET `/dashboard/status-board`: three columns

Query: `limit_per_column` (default 50, max 200), plus the same filters as `GET /reels` (`quality`, `supplier`, and so on).

Response `200`:

```json
{
  "success": true,
  "data": {
    "REEL": { "count": 40, "items": [ { "id": "665f...", "reel_no": "1001", "quality": "VK", "supplier_name": "Alpha Papers", "previous_weight": 1000, "gsm": 150, "size": 100, "approval_status": "CONFIRMED" } ] },
    "CUT":  { "count": 25, "items": [ ] },
    "NILL": { "count": 14, "items": [ ] }
  }
}
```

Items are short reel objects. Clicking one opens `GET /reels/:id/journey`. For a full list of one column, use `GET /reels?status=CUT`.

---

## GET `/dashboard/breakdown`: bar charts

Query: `by` = `quality` or `supplier` (required).

Response `200`:

```json
{
  "success": true,
  "data": [
    { "label": "VK", "reel_count": 22, "total_weight": 15400 },
    { "label": "SPECTRA", "reel_count": 18, "total_weight": 12100 }
  ]
}
```

Sorted by `total_weight` descending. `total_weight` is the sum of `previous_weight`.

---

## GET `/dashboard/aging`: dead stock finder

Query: `min_days` (defaults to the aging threshold from settings), `page`, `limit`.

Includes reels with status not `NILL` whose last activity is at least `min_days` ago. Sorted by days since last activity, longest first.

Response `200`:

```json
{
  "success": true,
  "data": [
    {
      "id": "665f...",
      "reel_no": "1003",
      "quality": "ULTRA",
      "supplier_name": "Gamma Mills",
      "previous_weight": 800,
      "status": "REEL",
      "last_activity_at": "2026-07-15T00:00:00.000Z",
      "days_since_activity": 75
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 6, "total_pages": 1, "min_days": 30 }
}
```

---

## Later (optional): activity heatmap

`GET /dashboard/activity-heatmap?from=&to=` returning `[{ "date": "2026-09-01", "count": 7 }]`, counts of `CREATED` + `USAGE_LOGGED` events per day. Not part of the first build.
