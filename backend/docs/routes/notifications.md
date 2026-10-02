# Notification Routes

Base path: `/api/v1/notifications`  
**Access:** any signed-in user. Everyone sees only their own notifications.

Right now the only notification is `ENTRY_DECLINED`, created when a Supervisor or Admin declines an entry. The Operator sees a popup the next time they open the app. The frontend calls `GET /notifications?unread=true` after login and on app load.

## The notification object

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9e01",
  "type": "ENTRY_DECLINED",
  "title": "Usage entry declined",
  "message": "Your usage entry for reel #1002 (Station 1, 1200 to 800 kg) was declined by Suresh Chandra. The weight was set back to 1200 kg.",
  "reel_id": "665f...c01",
  "reel_no": "1002",
  "event_id": "665f...d05",
  "data": {
    "reverted_from": 800,
    "reverted_to": 1200,
    "reason": "Weight looks wrong, please re-weigh",
    "declined_by_name": "Suresh Chandra"
  },
  "is_read": false,
  "created_at": "2026-08-16T09:20:00.000Z"
}
```

The `message` is written in plain language so it can be shown as it is.

---

## GET `/notifications`

Query: `unread` (`true` for unread only), `page`, `limit`. Newest first.

Response `200`: array of notifications with pagination `meta`.

---

## GET `/notifications/unread-count`

Response `200`: `{ "success": true, "data": { "unread": 2 } }`. Drives the "2 declined" badge in the top bar.

---

## PATCH `/notifications/:id/read`

Marks one notification as read (sets `is_read` and `read_at`). Response `200`: the updated notification. `404 NOT_FOUND` if it is not the caller's.

---

## PATCH `/notifications/read-all`

Marks all of the caller's unread notifications as read. Response `200`: `{ "updated": 3 }`.
