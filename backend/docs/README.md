# Rainbow Packages: Backend Docs

Backend for the Reel Inventory web app. Node.js + Express + MongoDB Atlas (Mongoose).

## Reading order

1. `DATABASE_DESIGN.md`: collections, fields, indexes, business rules, Atlas setup
2. `API_OVERVIEW.md`: conventions, roles matrix, response format, error codes, env variables, full route index
3. `routes/*.md`: one file per feature, with request/response details

| Route doc | Covers |
|---|---|
| `routes/auth.md` | Login, refresh, logout, change password, current user |
| `routes/users.md` | **Admin creates and manages Supervisors and Operators** |
| `routes/reels.md` | Create, list, search, view, admin edit/void, record usage, reel journey |
| `routes/approvals.md` | Pending queue, confirm, decline (with revert), operator's own entries |
| `routes/notifications.md` | Operator popups for declined entries |
| `routes/dashboard.md` | Summary tiles, status board, breakdowns, aging list |
| `routes/field-definitions.md` | Admin-defined custom parameters |
| `routes/audit-and-digest.md` | Audit log, daily email digest |
| `routes/settings.md` | Aging threshold and digest schedule |

## Decisions log

| Decision | Detail |
|---|---|
| Database | MongoDB Atlas, accessed through Mongoose. Chosen by the company head. |
| Accounts | No public sign-up. Admin creates Supervisor and Operator accounts. Admin accounts are created only by `scripts/seedAdmin.js`. |
| Workflow | Apply immediately, confirm later. Declining reverts the change. |
| Event log | Append-only history of everything that happens to a reel. Current state is stored on the reel for speed and can always be rebuilt from events. |
| Naming | `snake_case` for database fields and API JSON. |
| Custom parameters | Definitions live in `field_definitions`; values live in `reels.custom_fields`. |
| Supplier | Mandatory free-text field for now. |
| Aging threshold | 30 days by default, editable in settings. |

## Glossary

| Code | Plain-language label in the UI | Meaning |
|---|---|---|
| `REEL` | Unused | Full reel, balance equals max weight |
| `CUT` | In use | Partly used, 0 < balance < max weight |
| `NILL` | Fully used | Balance is 0 |
| `PENDING` | Pending confirmation | Applied, waiting for Supervisor/Admin sign-off |
| `CONFIRMED` | Confirmed | Signed off |
| `DECLINED` | Declined | Rejected and reverted |

## Suggested implementation order

1. Config, `app.js`/`server.js`, error handling utilities, health route
2. Constants and models, then `scripts/createIndexes.js`
3. Auth (login, refresh, me, change password) and `scripts/seedAdmin.js`
4. Users (Admin creates Supervisors and Operators)
5. Field definitions and settings
6. Reels: create, list, search, view (counter service and event log service first)
7. Record usage
8. Approvals (confirm, decline, cascade) and notifications
9. Reel journey and dashboard
10. Audit log and daily digest job
11. Excel import script, tests, hardening

## Not in this scaffold (later)

- Bulk confirm for Supervisors
- Calendar heatmap of activity
- Managed supplier list
- Excel export of the inventory table

## Open questions (non-blocking)

- Supplier as free text or a managed list?
- What does the `CONSUMER STOCK` column in `REELS.xlsx` mean? The design assumes it is `max_weight - balance` and computes it.
- Should the list of qualities (VK, SPECTRA, ULTRA, SK, IMPORTANT, SBS, FBB, DCB) be editable by Admin? Currently it is a constant.
- Names of the three usage stations (currently `Station 1` to `Station 3`).
- Daily digest send time (default 8:00 PM India time).
