# IDE Prompt: Scaffold the Rainbow Packages Backend (files only, no code)

## How to use

1. Create an empty folder called `rainbow-packages-backend` and open it in your IDE (Cursor, Claude Code, VS Code with Copilot, and so on).
2. Copy the `docs/` folder from this pack into it.
3. Paste **everything below the line** into the IDE's AI chat.

---

## Task

Create the complete folder and file structure for the **Rainbow Packages Reel Inventory** backend, exactly as listed in "Folder structure" below.

**Create files and folders only. Do not write any implementation code.**

## About the project (short)

A web app that tracks paper and board reels from purchase to use. There are three roles: **Admin**, **Supervisor**, **Operator**. Admin creates the Supervisor and Operator accounts. Operators create reels and record usage; the change applies immediately and waits for a Supervisor or Admin to confirm or decline it. Declining reverts the change. Every action is kept in an append-only event log. Admin can define custom reel parameters and receives a daily email digest.

Stack: Node.js 20+, Express 5, MongoDB Atlas with Mongoose, JWT auth, Zod validation, Nodemailer, node-cron, Jest + Supertest. JavaScript with ES modules.

## Read first (do not modify)

The `docs/` folder is the specification. Read `docs/README.md`, `docs/DATABASE_DESIGN.md`, `docs/API_OVERVIEW.md` and `docs/routes/*.md` so you understand what each file is for. Do not edit anything inside `docs/`.

## Hard rules

1. **No code.** No imports, exports, functions, classes, schemas, or stubs.
2. Every `.js` file contains exactly **one line**: a comment giving its path and one sentence on its job, with a pointer to the doc that specifies it. Example:
   `// src/models/reel.model.js: Mongoose schema for the reels collection (docs/DATABASE_DESIGN.md, section 3.3)`
3. These four files are configuration, not code, so give them real minimal content:
   - `package.json`: only `name` (`rainbow-packages-backend`), `version` (`0.1.0`), `private` (`true`), `type` (`module`), `main` (`src/server.js`), `engines` (`node >=20`), and an empty `scripts` object. No dependencies.
   - `.gitignore`: `node_modules`, `.env`, `logs`, `coverage`, `.DS_Store`.
   - `.env.example`: every variable from the table in `docs/API_OVERVIEW.md` section 7, grouped with `#` comment headings, with empty values or the example values shown there. Never put a real secret in it.
   - `README.md`: a short intro, the folder map, and a pointer to `docs/README.md`.
4. Do **not** run `npm install`, `git`, or any command other than creating files and folders.
5. Do **not** create any file or folder that is not in the structure below (no Dockerfile, no extra config). If you think something is missing, list it in your final message instead of creating it.
6. Use the exact file names below. Names are `camelCase` with a layer suffix (`.model.js`, `.controller.js`, and so on).

## Folder structure

```
rainbow-packages-backend/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── jest.config.js
├── docs/                                   (already provided, leave untouched)
├── scripts/
│   ├── seedAdmin.js
│   ├── createIndexes.js
│   └── importReelsFromExcel.js
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   │   ├── env.js
│   │   ├── db.js
│   │   ├── logger.js
│   │   ├── cors.js
│   │   └── mailer.js
│   ├── constants/
│   │   ├── roles.js
│   │   ├── eventTypes.js
│   │   ├── approvalStatus.js
│   │   ├── reelStatus.js
│   │   ├── qualities.js
│   │   ├── stations.js
│   │   ├── fieldTypes.js
│   │   ├── notificationTypes.js
│   │   └── errorCodes.js
│   ├── models/
│   │   ├── user.model.js
│   │   ├── refreshToken.model.js
│   │   ├── reel.model.js
│   │   ├── reelEvent.model.js
│   │   ├── fieldDefinition.model.js
│   │   ├── notification.model.js
│   │   ├── counter.model.js
│   │   ├── digestLog.model.js
│   │   └── setting.model.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── health.routes.js
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── reel.routes.js
│   │   ├── approval.routes.js
│   │   ├── notification.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── fieldDefinition.routes.js
│   │   ├── audit.routes.js
│   │   ├── digest.routes.js
│   │   └── setting.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   ├── reel.controller.js
│   │   ├── approval.controller.js
│   │   ├── notification.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── fieldDefinition.controller.js
│   │   ├── audit.controller.js
│   │   ├── digest.controller.js
│   │   └── setting.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── token.service.js
│   │   ├── user.service.js
│   │   ├── reel.service.js
│   │   ├── usage.service.js
│   │   ├── approval.service.js
│   │   ├── eventLog.service.js
│   │   ├── notification.service.js
│   │   ├── dashboard.service.js
│   │   ├── fieldDefinition.service.js
│   │   ├── audit.service.js
│   │   ├── digest.service.js
│   │   ├── email.service.js
│   │   ├── counter.service.js
│   │   └── setting.service.js
│   ├── validators/
│   │   ├── common.validator.js
│   │   ├── auth.validator.js
│   │   ├── user.validator.js
│   │   ├── reel.validator.js
│   │   ├── approval.validator.js
│   │   ├── notification.validator.js
│   │   ├── dashboard.validator.js
│   │   ├── fieldDefinition.validator.js
│   │   ├── audit.validator.js
│   │   ├── digest.validator.js
│   │   └── setting.validator.js
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── authorizeRoles.js
│   │   ├── requirePasswordChange.js
│   │   ├── validate.js
│   │   ├── rateLimiter.js
│   │   ├── requestLogger.js
│   │   ├── notFound.js
│   │   └── errorHandler.js
│   ├── jobs/
│   │   ├── index.js
│   │   └── dailyDigest.job.js
│   ├── templates/
│   │   └── dailyDigest.template.js
│   └── utils/
│       ├── ApiError.js
│       ├── apiResponse.js
│       ├── pagination.js
│       ├── password.js
│       ├── reelStatus.js
│       ├── dates.js
│       └── buildReelFilter.js
└── tests/
    ├── setup.js
    ├── helpers/
    │   ├── testDb.js
    │   └── factories.js
    ├── auth.test.js
    ├── users.test.js
    ├── reels.test.js
    ├── usage.test.js
    ├── approvals.test.js
    ├── dashboard.test.js
    └── digest.test.js
```

## What each layer is for (use this to write the one-line comments)

| Folder | Job | Spec |
|---|---|---|
| `config/` | Environment loading, Atlas connection, logger, CORS, mail transport | `docs/API_OVERVIEW.md` sections 7 and 8; `docs/DATABASE_DESIGN.md` section 6 |
| `constants/` | Fixed lists: roles, event types, approval statuses, reel statuses, qualities, stations, custom-field types, notification types, error codes | `docs/DATABASE_DESIGN.md`; `docs/API_OVERVIEW.md` section 4 |
| `models/` | One Mongoose schema per collection | `docs/DATABASE_DESIGN.md` section 3 (each file names its subsection) |
| `routes/` | URL paths, role checks and validation wiring for one feature | `docs/routes/<feature>.md` and the route index in `docs/API_OVERVIEW.md` |
| `controllers/` | Read the request, call a service, send the response envelope | `docs/routes/<feature>.md` |
| `services/` | Business logic and database work, including transactions | `docs/DATABASE_DESIGN.md` section 4 |
| `validators/` | Zod schemas for body, query and params | `docs/routes/<feature>.md` |
| `middleware/` | Auth, role guard, forced password change, validation, rate limit, request log, 404, error handler | `docs/API_OVERVIEW.md` sections 1 to 4 |
| `jobs/`, `templates/` | Daily digest schedule and email body | `docs/routes/audit-and-digest.md` |
| `utils/` | Small helpers: error class, response envelope, pagination, passwords, reel status rule, date-range helper, reel filter builder | `docs/DATABASE_DESIGN.md` section 4 |
| `scripts/` | Seed the first Admin, sync indexes, import `REELS.xlsx` | `docs/routes/users.md` (seeding); `docs/DATABASE_DESIGN.md` sections 6 and 7 |
| `tests/` | Jest + Supertest test files and helpers | Each file covers the matching route doc |

Route file to doc mapping: `auth` -> `auth.md`, `user` -> `users.md`, `reel` -> `reels.md`, `approval` -> `approvals.md`, `notification` -> `notifications.md`, `dashboard` -> `dashboard.md`, `fieldDefinition` -> `field-definitions.md`, `audit` and `digest` -> `audit-and-digest.md`, `setting` -> `settings.md`. `health.routes.js` is specified at the end of `docs/API_OVERVIEW.md`.

## Packages to install later (do NOT install now)

Note them in the final message only.

- Runtime: `express`, `mongoose`, `zod`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `cors`, `helmet`, `express-rate-limit`, `dotenv`, `pino`, `pino-http`, `nodemailer`, `node-cron`, `dayjs`, `exceljs`
- Development: `nodemon`, `jest`, `supertest`, `mongodb-memory-server`, `cross-env`

## When you are done

Reply with:

1. The final folder tree as created.
2. The total number of files created (the structure above should give **109**).
3. Anything you were unsure about or think is missing. Do not act on it.

Then **stop and wait**. The next prompts will implement one layer at a time, following the order in `docs/README.md`.

---

## Optional: template for the follow-up prompts

```
Implement <files> for the Rainbow Packages backend.
Follow docs/<spec file> exactly (routes, field names, rules, error codes).
Only touch the files named here. Keep the response envelope from docs/API_OVERVIEW.md.
When finished, list what you built and anything in the docs that was unclear.
```
