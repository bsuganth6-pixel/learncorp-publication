# Backend tests

Two suites, both driving the **real Express app** (real routers, validators, auth and CSRF middleware, upload
middleware, controllers) through supertest.

| Command | What it runs | Needs |
|---|---|---|
| `npm test` | Unit tests and the older route tests (books, authors, contact, admin guards). Mongoose is swapped for an in-memory data layer (`src/testing/fakeDb.ts`) | Nothing |
| `npm run test:integration` | `*.int.test.ts`: authentication, sessions, RBAC, ownership, the manuscript workflow, publishing, notifications, audit log. Each file gets its own throw-away database | A MongoDB server (default `mongodb://127.0.0.1:27017`, override with `MONGODB_TEST_URI`) |
| `npm run test:all` | Both | MongoDB |

Locally: `docker run -d -p 27017:27017 mongo:7`, or point `MONGODB_TEST_URI` at an Atlas cluster you don't mind creating
temporary `lc_test_*` databases on (they are dropped afterwards). CI starts a `mongo:7` service container.

## What the integration suites prove

Registration (role is fixed, duplicate rejected, weak passwords rejected, only hashes stored), sign-in (identical answer
for wrong password / unknown email / wrong kind of account, suspension, remember-me), sessions (idle and absolute expiry,
revocation, fixation, per-user cap, role change invalidates), email confirmation and password recovery (single-use,
expiry, superseded links, no account enumeration, sessions revoked), rate limits, the CSRF guard, admin/author separation
on every protected route, manuscript ownership (another author gets 404 for every route), file validation, the editorial
state machine, resubmission, publishing (catalogue book, one author profile per account, retry-safe), notifications
isolation, user suspension, and that sensitive actions land in the audit log.

## What they do not prove

- **True concurrency.** Two simultaneous decisions on one manuscript are guarded by a compare-and-set write, and a test
  proves the guard by interleaving the writes deterministically. The *atomicity* of that write is MongoDB's guarantee
  (it holds on Atlas). The development machine's database stand-in (FerretDB) is not atomic here, so a real race could
  not be demonstrated in that environment.
- Real **email delivery**, **Cloudinary** and **S3/R2** (replaced by an in-memory outbox and mocks), and **Atlas-specific**
  behaviour such as TTL index expiry (expiry is enforced in code regardless; the TTL index only removes old rows).
- The rate limiters are per process. One API instance enforces them exactly; several need a shared store.

`npm run dev:e2e` starts the same real API on :5055 against a real database that it resets and seeds on each start
(see `e2e/README.md`).
