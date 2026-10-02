# Rainbow Packages — Reel Inventory Web App: Project Context

## What this is
A web app for Rainbow Packages to track paper/board **reels** from purchase through use, with a
three-role approval workflow. Replaces a manual Excel sheet (sample: REELS.xlsx, 79 rows).

## Roles

| Role | Can do |
|---|---|
| **Operator** | Create a new reel (entry). Record usage (update a reel's weight after it's used at a station). View dashboard/filters/journey — **view-only**, to self-check for mistakes. |
| **Supervisor** | Confirm or decline pending creations and usage entries. View dashboard/filters/journey — **view-only**. |
| **Admin** | Everything: create, edit any field at any time, confirm/decline (fallback), full dashboard with filters and edit rights, receives daily email digest. |

## Reel fields (from sample data)
`SR NO, QUALITY, BF, PURCHASE DATE, SUPPLIER NAME, REEL NO. (unique), REEL WEIGHT, SIZE, GSM
(Grams per Square Metre), STATUS, CONSUMER STOCK, BALANCE`

- QUALITY is a fixed list seen in sample: VK, SPECTRA, ULTRA, SK, IMPORTANT, SBS, FBB, DCB
- BF = Bursting Factor, a paper-strength spec number
- REEL NO. is the unique physical ID given to each reel — critical, used for all search/lookup
- 3 usage stations exist in the company where reels get consumed

## STATUS meaning (corrected — derived, not typed by anyone)
- **REEL** = unused, full reel
- **CUT** = partially used (a section used)
- **NILL** = fully used, nothing left

Computed from balance: balance = max → REEL; 0 < balance < max → CUT; balance = 0 → NILL.

## The three weight fields
| Field | Set | Behaviour |
|---|---|---|
| **max_weight** | Once, at creation | Immutable forever (admin-only correction). Permanent "as purchased" record. |
| **previous_weight** | Starts = max_weight at creation | Running baseline — overwritten with the newly entered current_weight each time a usage entry is confirmed. |
| **current_weight** | Entered fresh by operator each usage event | Pure input: "what does it weigh now." |

Each usage event: `used_this_time = previous_weight − current_weight_entered`, then on
confirmation `previous_weight = current_weight_entered`. max_weight never changes.

## Approval workflow (important — revised design)
**Apply immediately, confirm later** — so operations are never blocked by a slow approver.
- Operator submits (create or usage entry) → change applies immediately (previous_weight updates
  right away) → entry tagged **"Pending confirmation"** (amber) everywhere.
- Supervisor/Admin **confirms** → tag flips to **"Confirmed"** (green), `approved_by` /
  `approved_at` stamped. Confirmation only signs off, it doesn't re-apply the change.
- Supervisor/Admin **declines** → system auto-reverts `previous_weight` to its value before that
  entry, tag becomes **"Declined"** (red), and the **operator gets a popup notification**
  next time they open the app explaining what was declined and that the value was reverted.

## Event log (core architecture — build this first)
Don't store "current state only." Store every event; current state = latest confirmed state,
computed by replaying events. Each event stores: reel_id, event_type (CREATED / USAGE_LOGGED /
CONFIRMED / DECLINED_REVERTED / ADMIN_CORRECTED), performed_by, performed_at, approved_by,
approved_at, and the payload (station, previous_weight, current_weight_entered, used_this_time,
etc). This single design gives you: the audit trail, the "reel journey" view, operator/supervisor
pending-notifications, and admin's daily digest — all as queries over one table.

## Admin dashboard — audience-specific design notes
Admin is ~50–60 years old, Indian business owner. Design must be:
- Large fonts, big numbers on summary tiles, minimal text
- Traffic-light colour coding (green/amber/red) as the primary language, text secondary
- Plain-language labels, no technical jargon ("Fully used" not "NILL", "Pending confirmation"
  not "awaiting approval workflow state")
- Flat, high-contrast, low-clutter layout — not a dense SaaS-style multi-panel dashboard
- Large touch targets — likely used on a phone as much as desktop

### Views to build (in order of priority)
1. Summary tiles — total reels, weight in stock, pending confirmations, unused 30+ days
2. Status board (3 columns: REEL / CUT / NILL) — shape of inventory at a glance
3. Filterable table — chip-based filters (see below), sortable
4. Reel journey / timeline — drill-down per reel, click any row
5. Supplier/quality breakdown (bar chart)
6. Aging list — sorted by days since last activity (dead stock finder)
7. Approval queue view — pending items + how long they've waited
8. Calendar heatmap of activity (optional, later)

### Chip-based filters (as specified by user)
- Row of field chips (Quality, Status, Supplier, GSM, Purchase Date, Station, Confirmation status)
- Tap a chip → opens the right picker for that field type (multi-select list, range slider, date
  range, toggle buttons)
- Selecting a value turns it into an **active filter chip** with two controls: an **✕** to remove
  it, and tap-to-edit to reopen the picker and change the value
- Multiple active chips = AND logic across fields
- "Clear all" once 2+ chips active

## Extra feature: daily email digest to admin
Scheduled job (end of day), reads the day's events from the event log, sends a short summary
(counts of creations/usages/confirmations, any still pending) with a link that deep-links into
the admin dashboard's audit view, pre-filtered to that day.

## Prototype built so far
An HTML dashboard prototype was built showing: summary tiles, the 3-column status board, a chip
filter bar, a filterable table, and a click-through reel journey/timeline panel — using sample
data derived from REELS.xlsx. Artifact link: (see chat history — "Rainbow Packages — Reel
Inventory Dashboard").

## Decisions (resolved)
- **Supervisor** sees the **full dashboard, read-only**, plus can confirm/decline pending items.
- **Supplier Name will be mandatory** in the real app (it was empty in the sample data only
  because that sheet was temp/sample data for showing field structure, not real records).
- **Custom parameters:** Admin can define new parameters at any time (label + type); once added,
  they appear automatically in the reel creation form and in the dashboard table/filters. Modeled
  as a `fieldDefinitions` list driving dynamic form/table rendering, with values stored per-reel
  in a nested custom-fields object.
- **"Unused" threshold: 30 days** since last activity.
- **Tech stack:** React + Tailwind CSS (frontend), Node.js/Express (backend, later).
  **Database:** leaning **Postgres via Supabase** (JSONB column + field-definitions table handles
  the custom-parameter need, relational integrity suits the approval/event-log workflow, built-in
  auth maps to the 3 roles) — MongoDB remains an acceptable alternative if preferred. Current
  **demo phase uses in-memory mock data only**, no real backend/database yet; data layer is kept
  separate so it can be swapped in later.

## Still open (non-blocking, use placeholders for now)
- Exact wording for operator's "record usage" button/screen
- Whether supplier name is free-text or a managed supplier list
