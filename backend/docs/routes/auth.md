# Auth Routes

Base path: `/api/v1/auth`

There is no sign-up route. Accounts are created by an Admin (`routes/users.md`). The very first Admin is created by `scripts/seedAdmin.js`.

---

## POST `/auth/login`

**Access:** Public. Rate limited (10 per 15 min per IP).

Body:

```json
{ "username": "operator", "password": "operator123" }
```

Behaviour:

- Username is case-insensitive.
- Wrong username or password gives the same message (`UNAUTHENTICATED`, "Incorrect username or password.") so accounts cannot be guessed.
- Deactivated user gives `403 ACCOUNT_DISABLED`.
- 5 consecutive failures lock the account for 15 minutes (`423 ACCOUNT_LOCKED`).
- On success: reset `failed_login_attempts`, set `last_login_at`, create a refresh token, set the `rp_refresh` cookie.

Response `200`:

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "expires_in": 900,
    "user": {
      "id": "665f...",
      "name": "Ramesh Yadav",
      "username": "operator",
      "role": "OPERATOR",
      "must_change_password": true
    }
  }
}
```

If `must_change_password` is `true`, the frontend sends the person straight to the change-password screen.

---

## POST `/auth/refresh`

**Access:** Needs the `rp_refresh` cookie.

Behaviour: validates the token hash, rotates it (old one revoked, new one set in the cookie), returns a new access token. Re-using a revoked token revokes every session for that user.

Response `200`: `{ "access_token": "eyJ...", "expires_in": 900 }`

Errors: `401 UNAUTHENTICATED` (missing, expired or revoked token), `403 ACCOUNT_DISABLED`.

---

## POST `/auth/logout`

**Access:** Any signed-in user.

Revokes the current refresh token and clears the cookie. Response `200`: `{ "message": "Signed out." }`

---

## POST `/auth/logout-all`

**Access:** Any signed-in user.

Revokes every refresh token for the user. Response `200`: `{ "message": "Signed out everywhere." }`

---

## GET `/auth/me`

**Access:** Any signed-in user (works even when a password change is required).

Response `200`:

```json
{
  "success": true,
  "data": {
    "id": "665f...",
    "name": "Suresh Chandra",
    "username": "supervisor",
    "email": null,
    "phone": "9876543210",
    "role": "SUPERVISOR",
    "must_change_password": false,
    "last_login_at": "2026-09-28T04:10:00.000Z"
  }
}
```

---

## POST `/auth/change-password`

**Access:** Any signed-in user.

Body:

```json
{ "current_password": "Temp#4821", "new_password": "MyNewPass@2026" }
```

Rules:

- `new_password`: minimum 8 characters, must differ from the current one.
- Sets `must_change_password = false` and `password_changed_at`.
- Revokes all other refresh tokens and issues a fresh session for this device.

Response `200`: `{ "message": "Password changed." }`

Errors: `401 UNAUTHENTICATED` (wrong current password), `422 VALIDATION_ERROR`.
