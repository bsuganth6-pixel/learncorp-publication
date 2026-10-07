# LearnCorp Publication — Book Publication Platform

Full-stack publishing platform: public catalogue + author directory + manuscript
submission + admin dashboard. Built per the project spec as a Next.js frontend and
a separate Express/MongoDB API.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS |
| Backend | Node.js · Express · TypeScript |
| Database | MongoDB (Mongoose) |
| Auth | JWT in an httpOnly cookie · bcrypt |
| Images | Cloudinary |
| Manuscript files | S3-compatible storage (AWS S3 or Cloudflare R2), private + signed URLs |

## Project structure

```
backend/    Express API — models, controllers, routes, middleware, services
frontend/   Next.js app — public site + /admin dashboard
```

## Local setup

### 1. Backend

```bash
cd backend
cp .env.example .env      # fill in MONGODB_URI, JWT_SECRET, Cloudinary + storage keys
npm install
npm run seed:admin        # creates your first admin user from SEED_ADMIN_* in .env
npm run dev                # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm install
npm run dev                   # http://localhost:3000
```

Admin dashboard: `http://localhost:3000/admin/login`, using the email/password
you set in the backend's `SEED_ADMIN_*` variables.

## Environment variables

See `backend/.env.example` and `frontend/.env.example` for the full list. At minimum
to run locally: `MONGODB_URI`, `JWT_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.
Cloudinary and S3/R2 variables are required before cover-image or manuscript uploads
will work — routes that need them return a clear error if they're unset rather than
failing silently.

## Deployment

- **Frontend** → Vercel. Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` to your
  deployed API and site URLs.
- **Backend** → Render (or similar). Set every variable from `.env.example`, plus
  `CLIENT_URL` to your deployed frontend origin (used for CORS) and `NODE_ENV=production`.
- **Database** → MongoDB Atlas. Whitelist Render's IPs (or `0.0.0.0/0` with a strong,
  unique DB user password) and use that connection string as `MONGODB_URI`.

## What's implemented

- Public site: Home, Books (catalogue with search/filter/sort + detail pages),
  Authors (directory + profiles), Services, Publish Your Book (8-step process +
  manuscript submission form with file upload), Contact (+ form), About, FAQ.
- Admin: login, dashboard overview (stats), full CRUD for Books, Authors, and
  Testimonials; Manuscript review with status workflow and secure file downloads;
  Contact message inbox (read/delete).
- Cross-cutting: SEO (per-page metadata, sitemap.xml, robots.txt), rate limiting,
  input validation (Zod) on every mutating endpoint, role-gated admin routes,
  secure file upload handling (real file-signature checks, not just declared
  mimetype), responsive layout throughout.

## Verified in this environment

- Backend: `npm install`, `npm run typecheck`, `npm run build` all pass clean.
  `npm audit`: 0 vulnerabilities.
- Frontend: `npm install`, `npm run typecheck`, `npm run build`, `npm run lint` all
  pass clean (23/23 routes build, including SSG for book/author detail pages).

## Not verified here (no live services in this sandbox)

- No live MongoDB connection was available to test — models and queries are
  correct against the Mongoose API by inspection, but no data has actually been
  written or read against a real database yet. First real test is your own
  `MONGODB_URI` + `npm run seed:admin`.
- No live Cloudinary / S3 / R2 credentials — upload code paths are implemented
  and guarded (they return a clear config error rather than crashing if unset),
  but haven't uploaded a real file yet.
- Not deployed. Not tested end-to-end in a browser against a running backend.

## Known issue to flag

`npm audit` reports high/critical advisories in `postcss`, nested **inside**
Next.js 14.2.35's own bundled copy (not this project's direct `postcss`
dependency). The only fix `npm` offers is a forced major upgrade to Next 16,
which I didn't apply unprompted since it's a breaking change I haven't verified
against everything built here — flagging it as a deliberate next-step decision
rather than silently leaving it or silently forcing it.

## Not yet built (next pass)

- Author-management page for manuscript → author/book conversion is manual
  (accepting a manuscript doesn't yet auto-create a Book/Author record).
- No automated tests (unit/integration) yet.
- No CI/CD config.
