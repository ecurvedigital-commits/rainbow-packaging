# User Routes: Admin Manages Supervisors and Operators

Base path: `/api/v1/users`  
**Access for every route in this file: `ADMIN` only.**

This is the only way to create Supervisor and Operator accounts. There is no sign-up page.

## Ground rules

- These routes manage `SUPERVISOR` and `OPERATOR` accounts only. They cannot create, promote to, demote from, or deactivate an `ADMIN`. Admin accounts come from `scripts/seedAdmin.js`.
- The Admin either types a starting password or lets the server generate one. Either way the new user must change it at first login (`must_change_password: true`).
- A generated password (10 characters, easy to read aloud, no look-alike letters) is returned **once** in the response and never stored in plain text or logged.
- Users are never deleted. They are deactivated, so history in the reel journey still shows who did what.

## The user object

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9a12",
  "name": "Ramesh Yadav",
  "username": "ramesh.y",
  "email": null,
  "phone": "9876543210",
  "role": "OPERATOR",
  "is_active": true,
  "must_change_password": true,
  "last_login_at": null,
  "created_by": "665f1a2b3c4d5e6f7a8b9a01",
  "created_at": "2026-09-28T05:00:00.000Z",
  "updated_at": "2026-09-28T05:00:00.000Z"
}
```

---

## POST `/users`: create a Supervisor or Operator

Body:

```json
{
  "name": "Suresh Chandra",
  "username": "suresh.c",
  "role": "SUPERVISOR",
  "email": "suresh@example.com",
  "phone": "9876543210",
  "password": "Optional@123"
}
```

| Field | Required | Rules |
|---|---|---|
| `name` | yes | 2-80 characters |
| `username` | yes | 3-30 characters, `[a-z0-9._-]`, stored lowercase, unique |
| `role` | yes | `SUPERVISOR` or `OPERATOR` only |
| `email` | no | Valid email, unique when present |
| `phone` | no | 10-15 digits |
| `password` | no | Minimum 8 characters. Leave out to auto-generate |

Response `201`:

```json
{
  "success": true,
  "data": {
    "user": { "id": "665f...", "name": "Suresh Chandra", "username": "suresh.c", "role": "SUPERVISOR", "is_active": true, "must_change_password": true },
    "temporary_password": "Km7xRt4Pq2"
  }
}
```

`temporary_password` appears only when the server generated it. Tell the Admin to hand it to the person; it cannot be shown again.

Errors: `409 DUPLICATE_USERNAME`, `409 DUPLICATE_EMAIL`, `422 VALIDATION_ERROR` (including `role` set to `ADMIN`).

---

## GET `/users`: list users

Query:

| Param | Meaning |
|---|---|
| `role` | `SUPERVISOR`, `OPERATOR`, `ADMIN`, or comma-separated |
| `is_active` | `true` or `false` |
| `q` | Matches name or username (contains, case-insensitive) |
| `page`, `limit`, `sort` | Standard. Sortable: `name`, `username`, `role`, `created_at`, `last_login_at` |

Response `200`: array of user objects with pagination `meta`. Admin accounts are listed but read-only.

---

## GET `/users/:id`

Response `200`: one user object. `404 NOT_FOUND` if the id does not exist.

---

## PATCH `/users/:id`: edit details

Body (all optional):

```json
{ "name": "Suresh K. Chandra", "email": "new@example.com", "phone": "9000000000", "role": "OPERATOR" }
```

Rules:

- `username` cannot be changed.
- `role` can switch between `SUPERVISOR` and `OPERATOR` only. A role change revokes the user's sessions so the new role applies at next login.
- Cannot be used on an `ADMIN` account (`403 FORBIDDEN`).

Response `200`: updated user. Errors: `409 DUPLICATE_EMAIL`, `422 VALIDATION_ERROR`.

---

## PATCH `/users/:id/status`: activate or deactivate

Body:

```json
{ "is_active": false }
```

Behaviour:

- Deactivating revokes all of the user's refresh tokens. They cannot sign in, and any access token they hold stops working on its next request.
- Their past entries stay in history. Entries they left pending can still be confirmed or declined by a Supervisor.
- Reactivating restores sign-in.
- Cannot target an `ADMIN` account.

Response `200`: updated user.

---

## POST `/users/:id/reset-password`

Used when someone forgot their password (there is no self-service reset).

Body (optional):

```json
{ "password": "NewTemp@2026" }
```

Behaviour: sets a new password (given, or generated), sets `must_change_password = true`, clears any lock, revokes all sessions.

Response `200`: `{ "user": { ... }, "temporary_password": "Qw8nZk3Vb5" }` (`temporary_password` only when generated).

---

## POST `/users/:id/unlock`

Clears `locked_until` and `failed_login_attempts` for a locked account. Response `200`: updated user.

---

## Seeding the first Admin

`scripts/seedAdmin.js` reads `SEED_ADMIN_NAME`, `SEED_ADMIN_USERNAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` from `.env`. It creates the Admin only if no active Admin exists, with `must_change_password = true`. Running it again does nothing.
