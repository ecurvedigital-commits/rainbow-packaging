# API Overview

Base URL: `/api/v1`. All requests and responses are JSON (UTF-8).

## 1. Authentication

- Login with **username + password** (`POST /auth/login`).
- The response returns a short-lived **access token** (JWT, 15 minutes). Send it as `Authorization: Bearer <token>`.
- A long-lived **refresh token** (7 days) is set as an `httpOnly` cookie named `rp_refresh`. It is rotated on every `POST /auth/refresh`. Refresh tokens are stored hashed in `refresh_tokens`.
- JWT claims: `sub` (user id), `role`, `username`.
- On every request the server loads the user and checks `is_active`, so deactivating an account takes effect immediately.
- **No public sign-up and no self-service "forgot password".** An Admin creates accounts and resets passwords (`routes/users.md`).
- When `must_change_password` is `true`, every route except `GET /auth/me`, `POST /auth/change-password` and `POST /auth/logout` returns `403 PASSWORD_CHANGE_REQUIRED`.

## 2. Roles and access

Roles are the strings `ADMIN`, `SUPERVISOR`, `OPERATOR`.

| Capability | Operator | Supervisor | Admin |
|---|:---:|:---:|:---:|
| Create Supervisor / Operator accounts, reset passwords, deactivate | | | yes |
| Create a reel | yes | | yes |
| Record usage | yes | | yes |
| Confirm / decline pending entries | | yes | yes |
| Edit any reel field, void a reel | | | yes |
| View dashboard, reels, reel journey | yes (read-only) | yes (read-only) | yes |
| See own submitted entries and declined popups | yes | | |
| Define custom parameters | | | yes |
| Audit log, daily digest, settings | | | yes |

Admin actions on reels are confirmed automatically. Nobody can confirm or decline their own entry.

## 3. Response format

Success:

```json
{ "success": true, "data": { }, "meta": { } }
```

`meta` is present on lists (pagination) and where noted.

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "details": [{ "field": "reel_no", "message": "Required" }]
  }
}
```

Documents are returned with `id` (not `_id`), without `__v`, and never with `password_hash`.

## 4. Error codes

| HTTP | Code | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | Missing, invalid, or wrong-type token |
| 401 | `TOKEN_EXPIRED` | Access token expired (client should call `/auth/refresh`) |
| 403 | `FORBIDDEN` | Role is not allowed |
| 403 | `ACCOUNT_DISABLED` | User is deactivated |
| 403 | `PASSWORD_CHANGE_REQUIRED` | `must_change_password` is true |
| 403 | `SELF_APPROVAL_NOT_ALLOWED` | Deciding your own entry |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `DUPLICATE_USERNAME`, `DUPLICATE_EMAIL`, `DUPLICATE_REEL_NO`, `DUPLICATE_FIELD_KEY` | Uniqueness clash |
| 409 | `OUT_OF_ORDER_APPROVAL` | An older pending entry exists on the same reel |
| 409 | `STALE_WEIGHT` | Reel balance changed since the client last read it |
| 409 | `REEL_HAS_PENDING_EVENTS` | Admin weight change while entries are pending |
| 409 | `ALREADY_DECIDED` | Entry is no longer pending |
| 409 | `DIGEST_ALREADY_SENT` | Digest for that date was already sent (use `force: true`) |
| 422 | `VALIDATION_ERROR` | Body or query failed validation |
| 422 | `REEL_NOT_ACTIVE`, `REEL_ALREADY_EMPTY` | Usage on a voided or fully used reel |
| 423 | `ACCOUNT_LOCKED` | Too many failed logins |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Anything unexpected (details are logged, not returned) |

## 5. Lists: pagination, sorting, filtering

- `?page=1&limit=20` (default 20, max 100).
- `?sort=-created_at` (prefix `-` for descending; only whitelisted fields).
- List responses carry `meta: { page, limit, total, total_pages }`.
- Filters combine with AND across fields. A comma-separated value (`status=REEL,CUT`) is OR within that field.
- Dates: ISO 8601 UTC in responses. Date-only inputs (`date=2026-09-28`, `purchase_date_from`) are read in `APP_TIMEZONE`.

## 6. Contract notes for the React frontend

| Prototype (mock data) | Backend |
|---|---|
| `customFields` | `custom_fields` |
| Roles `Operator`, `Supervisor`, `Admin` | `OPERATOR`, `SUPERVISOR`, `ADMIN` (map to display labels in the UI) |
| `performed_by: "Operator 1"` (a name) | `performed_by` is a user id; use `performed_by_name` for display |
| Declining flips `event_type` to `DECLINED_REVERTED` | `event_type` stays; `approval_status` becomes `DECLINED`. A separate decision event is appended |
| Balance shown from `previous_weight` | Same field name: `previous_weight` is the running balance |
| Status `REEL` / `CUT` / `NILL` | Same codes. Show as Unused / In use / Fully used |
| "Unused 30+ days" counted every reel | Excludes fully used (`NILL`) reels |

## 7. Environment variables

| Variable | Example / default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | |
| `PORT` | `5000` | |
| `MONGODB_URI` | `mongodb+srv://...` | Atlas connection string |
| `MONGODB_DB_NAME` | `rainbow_dev` | |
| `JWT_ACCESS_SECRET` | | Long random string |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | |
| `JWT_REFRESH_SECRET` | | Different from the access secret |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | |
| `BCRYPT_SALT_ROUNDS` | `12` | |
| `FRONTEND_URL` | `http://localhost:5173` | Used in digest deep links |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated |
| `COOKIE_SECURE` | `false` (dev), `true` (prod) | |
| `COOKIE_SAMESITE` | `lax` | Use `none` only if frontend and API are on different sites |
| `APP_TIMEZONE` | `Asia/Kolkata` | |
| `AGING_THRESHOLD_DAYS` | `30` | First-run default for settings |
| `DIGEST_ENABLED` | `true` | First-run default |
| `DIGEST_TIME` | `20:00` | First-run default (HH:mm, app timezone) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | | Email provider |
| `EMAIL_FROM` | `Rainbow Packages <no-reply@example.com>` | |
| `LOG_LEVEL` | `info` | |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | | Used only by `scripts/seedAdmin.js` |

## 8. Security checklist

- Passwords hashed with bcrypt (cost 12). Minimum length 8.
- Login rate limit: 10 attempts per 15 minutes per IP. Account lock after 5 consecutive failures (15 minutes).
- `helmet`, strict CORS from `CORS_ORIGINS`, JSON body size limit (100 kb).
- Every request body, query and param is validated with Zod. Unknown keys are stripped. Keys starting with `$` are rejected.
- Never return `password_hash`, refresh tokens, or stack traces.
- Temporary passwords are shown once, in the response that created or reset them, and are never logged.

## 9. Route index

| Method | Path | Access | Doc |
|---|---|---|---|
| GET | `/health` | Public | this file |
| POST | `/auth/login` | Public | auth |
| POST | `/auth/refresh` | Cookie | auth |
| POST | `/auth/logout` | Any signed-in | auth |
| POST | `/auth/logout-all` | Any signed-in | auth |
| GET | `/auth/me` | Any signed-in | auth |
| POST | `/auth/change-password` | Any signed-in | auth |
| POST | `/users` | Admin | users |
| GET | `/users` | Admin | users |
| GET | `/users/:id` | Admin | users |
| PATCH | `/users/:id` | Admin | users |
| PATCH | `/users/:id/status` | Admin | users |
| POST | `/users/:id/reset-password` | Admin | users |
| POST | `/users/:id/unlock` | Admin | users |
| GET | `/reels` | All roles | reels |
| GET | `/reels/search` | All roles | reels |
| GET | `/reels/:id` | All roles | reels |
| GET | `/reels/:id/journey` | All roles | reels |
| POST | `/reels` | Operator, Admin | reels |
| POST | `/reels/:id/usage` | Operator, Admin | reels |
| PATCH | `/reels/:id` | Admin | reels |
| POST | `/reels/:id/void` | Admin | reels |
| GET | `/approvals/pending` | Supervisor, Admin | approvals |
| GET | `/approvals/mine` | Operator, Admin | approvals |
| POST | `/approvals/:eventId/confirm` | Supervisor, Admin | approvals |
| POST | `/approvals/:eventId/decline` | Supervisor, Admin | approvals |
| GET | `/notifications` | Any signed-in | notifications |
| GET | `/notifications/unread-count` | Any signed-in | notifications |
| PATCH | `/notifications/read-all` | Any signed-in | notifications |
| PATCH | `/notifications/:id/read` | Any signed-in | notifications |
| GET | `/dashboard/summary` | All roles | dashboard |
| GET | `/dashboard/status-board` | All roles | dashboard |
| GET | `/dashboard/breakdown` | All roles | dashboard |
| GET | `/dashboard/aging` | All roles | dashboard |
| GET | `/field-definitions` | All roles | field-definitions |
| POST | `/field-definitions` | Admin | field-definitions |
| PATCH | `/field-definitions/:id` | Admin | field-definitions |
| GET | `/audit/events` | Admin | audit-and-digest |
| GET | `/digest/preview` | Admin | audit-and-digest |
| POST | `/digest/send` | Admin | audit-and-digest |
| GET | `/digest/logs` | Admin | audit-and-digest |
| GET | `/settings` | Admin | settings |
| PATCH | `/settings` | Admin | settings |

Route-order note: in `reels.routes`, register `/reels/search` before `/reels/:id`.

`GET /health` returns `{ "success": true, "data": { "status": "ok", "db": "connected", "uptime_seconds": 1234 } }`.
