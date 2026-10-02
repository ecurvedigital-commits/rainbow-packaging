# Field Definition Routes (Custom Parameters)

Base path: `/api/v1/field-definitions`

Admin can add new reel parameters at any time (for example "Thickness (micron)"). Once added, the parameter shows up in the reel creation form and in the dashboard table and filters, with no code change. Definitions live in `field_definitions`; each reel stores its values in `custom_fields`, keyed by the definition's `key`.

## The definition object

```json
{
  "id": "665f1a2b3c4d5e6f7a8b9f01",
  "key": "thickness_micron",
  "label": "Thickness (micron)",
  "type": "number",
  "required": false,
  "options": [],
  "order": 1,
  "is_active": true,
  "created_at": "2026-09-01T06:00:00.000Z"
}
```

## Rules

- `key` is `snake_case`, unique, and **cannot change** after creation. If omitted, it is generated from the label.
- `type` is `text` or `number` and **cannot change** after creation. (`select`, `date` and `boolean` can be added later.)
- Definitions are never deleted. Setting `is_active = false` hides the parameter from forms, table and filters, and keeps existing values on reels.
- A new **required** parameter does not block existing reels. It applies to reels created after that.

---

## GET `/field-definitions`

**Access:** all roles (the reel form and table need them).

Query: `active` (default `true`; use `all` to include inactive, Admin only). Sorted by `order`, then `created_at`.

Response `200`: array of definitions. The frontend calls this once after login and builds the form, table columns and filter chips from it.

---

## POST `/field-definitions`

**Access:** Admin.

Body:

```json
{ "label": "Thickness (micron)", "type": "number", "key": "thickness_micron", "required": false }
```

| Field | Required | Rules |
|---|---|---|
| `label` | yes | 2-60 characters |
| `type` | yes | `text` or `number` |
| `key` | no | `[a-z][a-z0-9_]{1,39}`. Must not clash with a built-in reel field (`reel_no`, `quality`, `gsm`, and so on) |
| `required` | no | Default `false` |

`order` is set to the next free number.

Response `201`: the definition. Errors: `409 DUPLICATE_FIELD_KEY`, `422 VALIDATION_ERROR`.

---

## PATCH `/field-definitions/:id`

**Access:** Admin.

Body (all optional): `label`, `required`, `order`, `is_active`, `options`. `key` and `type` are rejected.

Response `200`: the updated definition. `404 NOT_FOUND`.
