# Backend tests

Everything runs against the **real Express app** (real routers, validators, auth
middleware, upload middleware, controllers) via supertest. No MongoDB is
involved: `src/testing/fakeDb.ts` swaps the Mongoose data layer for an in-memory
one, and S3/Cloudinary are stubbed where a test submits files.

## What that does and doesn't prove

- Proven: routing and middleware order, Zod validation, JWT/cookie handling
  (forged / expired / unsigned / unknown-user tokens), role checks, rate
  limiting, security headers, file-upload checks (declared type vs. real
  signature, size limit, cover handling), controller logic (public listing
  can't expose drafts, pagination, filters, slug uniqueness, mass-assignment,
  author-delete conflict), and Mongoose schema validation (`validateSync`).
- NOT proven: anything MongoDB itself does — real queries, the text index,
  unique-index errors, `populate` against real documents, connection handling —
  or real Cloudinary/S3 uploads. Those need a real `MONGODB_URI` and
  credentials; run the app against them before trusting production.

`npm run dev:fake` starts the same real API on :5055 with seeded in-memory data
(no MongoDB needed) — handy for UI work and demos. Data resets on restart.
