# LearnCorp Publication — book publishing platform

A full-stack website for a publishing company: a public site (catalogue, authors, services, contact, About, FAQ),
**author accounts** (register, confirm email, submit a manuscript, follow it through editorial review, resubmit when
changes are requested) and a protected admin dashboard for reviewing and publishing manuscripts and managing books,
authors, accounts, messages and testimonials. Built to the project specification (`docs/REQUIREMENTS.md` checks it line by line).

## Status

Code-complete against the spec, with the gaps listed in [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

- **Verified** (sandbox): 198 backend unit tests, **118 backend integration tests that run the real app against a real
  MongoDB-compatible database** (authentication, sessions, RBAC, ownership, the manuscript workflow), 104 frontend tests,
  typecheck, lint, production build, and browser checks in headless Chromium against the production build — including
  the whole account journey against that database ([`e2e/`](e2e/README.md)).
- **Not verified**: real email delivery, Cloudinary, S3/R2, Atlas, Vercel or Render (the development database was a
  MongoDB-compatible server, not MongoDB itself); true concurrent writes (see [`backend/tests/README.md`](backend/tests/README.md));
  Firefox, Safari and real phones; Lighthouse. Nothing here has been deployed by the author.
- **Before launch:** fill in `frontend/lib/site-config.ts` (contact details and About text are placeholders), deploy with
  [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), then run the verification table in that guide.

## Features

**Public site** — home with hero, featured books, services, strengths, authors, live statistics, testimonials · book
catalogue with search (title, author, ISBN, category, keyword) and filters (category, author, year, format, price) · book
pages with reviews, table of contents, related books, JSON-LD · author directory and profiles · services · an
eight-step publishing process and manuscript submission with file uploads · contact form · About · FAQ · responsive,
accessible (axe-core finds no WCAG A/AA violations on 11 pages at two widths; automated rules only), SEO basics
(metadata, Open Graph, sitemap, robots).

**Accounts and roles** — guests browse; **authors** register, confirm their email, sign in, edit their profile, manage
their sessions and change their password; **administrators** have a separate sign-in and session. Forgot/reset password,
email confirmation, per-IP and per-account rate limits, CSRF protection, revocable server-side sessions. Roles are
enforced on the server for every request, never only in the interface ([`docs/SECURITY.md`](docs/SECURITY.md)).

**Author area** (`/author`, `/account`) — dashboard · submit a manuscript and cover · follow each submission through
*Submitted → Under Review → Accepted → Published* (or *Changes Requested* / *Rejected*) with the editors' notes ·
update and resubmit when asked · notifications in the app and by email · only ever your own submissions.

**Admin dashboard** (`/admin`) — books (add, edit, delete, cover upload, publish/unpublish) · authors (with photo) ·
**manuscripts: review, request changes, accept or reject with a message to the author, then publish to the catalogue
(creates the book and the author's public profile)** · **accounts: suspend, reactivate, sign out everywhere** ·
**read-only activity log of sensitive actions** · contact messages · testimonials · review moderation · every list
paginated.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15.5 (App Router), React 19, TypeScript, Tailwind CSS 3.4, react-hook-form + zod |
| API | Node 22, Express 4, TypeScript, Zod validation |
| Database | MongoDB (Atlas) via Mongoose 8 |
| Auth | bcrypt (cost 12) passwords · server-side sessions: an opaque random token in an `httpOnly`, `Secure` cookie (admin `SameSite=Strict`, author `Lax`), only its SHA-256 stored, revocable · email via Resend or SMTP |
| Files | Cloudinary (images), Cloudflare R2 or AWS S3 (manuscripts, private, signed downloads) |
| Hosting | Vercel (frontend) · Render (API) · MongoDB Atlas |

```
Browser ──▶ Vercel (Next.js) ── /api/* rewrite ──▶ Render (Express) ──▶ MongoDB Atlas
                                                         ├──▶ Cloudinary
                                                         └──▶ R2 / S3
```

The browser only ever talks to the site's own origin; Next.js proxies `/api/*` to the API, which keeps the session
cookie first-party. Why the API is not a Vercel Function: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Repository layout

```
backend/     Express + Mongoose API (TypeScript) and its Jest tests
frontend/    Next.js app: app/ (routes), components/, lib/ (API client, config, helpers), assets/brand/, vercel.json (Vercel build, region and response headers)
brand/       Logo kit, usage notes, and the script that regenerates it
docs/        API.md · DEPLOYMENT.md · REQUIREMENTS.md · SECURITY.md
e2e/         Browser checks (Playwright, Python)
render.yaml  Render Blueprint for the API
.github/workflows/ci.yml   Typecheck, lint, tests and build for both packages
```

## Run it locally

Requires Node 22 and a MongoDB connection string (a free Atlas cluster is fine).

```bash
# API  -> http://localhost:5000
cd backend
cp .env.example .env          # set MONGODB_URI and CLIENT_URL=http://localhost:3000
npm ci
npm run seed:admin            # creates the first admin from SEED_ADMIN_* in .env (needs a strong password)
npm run dev

# Frontend  -> http://localhost:3000
cd frontend
cp .env.example .env.local    # API_ORIGIN=http://localhost:5000
npm ci
npm run dev
```

Image and manuscript uploads need Cloudinary and S3/R2 credentials in `backend/.env`; everything else works without them.
Email defaults to `EMAIL_PROVIDER=console`, which prints confirmation and reset links in the API's terminal — enough to
try the whole author flow locally. (It is refused in production: see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).)

**Without Cloudinary or S3:** `cd backend && MONGODB_URI=mongodb://127.0.0.1:27017/learncorp_e2e npm run dev:e2e` starts
the same real API on port 5055 against a database it **resets and fills with sample data on every start** (admin
`admin@example.com` / `correct-horse-battery`; storage stubbed; email captured at `/__dev/outbox`). Point the frontend at
it with `API_ORIGIN=http://localhost:5055`. This is what the browser checks use.

## Commands

| | Backend (`backend/`) | Frontend (`frontend/`) |
|---|---|---|
| Develop | `npm run dev` · `npm run dev:e2e` | `npm run dev` |
| Check | `npm run typecheck` · `npm test` · `npm run test:integration` (needs MongoDB) | `npm run typecheck` · `npm run lint` · `npm test` |
| Build / run | `npm run build` · `npm start` | `npm run build` · `npm start` |

The frontend's production build needs `API_ORIGIN` and fails without it, by design.

## Configuration

Every variable is documented in `backend/.env.example` and `frontend/.env.example`, and tabulated in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md#environment-variables). Secrets live only in environment variables; `.env`
files are git-ignored.

## Documentation

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — architecture, step-by-step setup, verification, troubleshooting
- [`docs/API.md`](docs/API.md) — endpoint reference, roles, sessions, rate limits
- [`docs/SECURITY.md`](docs/SECURITY.md) — the account and session security model: what is enforced where, and what is not covered
- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — the spec, checked item by item, with open items
- [`backend/tests/README.md`](backend/tests/README.md) — what the API tests do and do not prove
- [`brand/README.md`](brand/README.md) — logo kit and its limits
- [`e2e/README.md`](e2e/README.md) — browser checks
