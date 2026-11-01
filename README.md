# LearnCorp Publication — book publishing platform

A full-stack website for a publishing company: a public site (catalogue, authors, services, manuscript submission,
contact, About, FAQ) and a protected admin dashboard for managing books, authors, manuscripts, messages and
testimonials. Built to the project specification (`docs/REQUIREMENTS.md` checks it line by line).

## Status

Code-complete against the spec, with the gaps listed in [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md).

- **Verified** (sandbox): 135 backend and 32 frontend automated tests, typecheck, lint, production build, and browser
  checks in headless Chromium against the production build ([`e2e/`](e2e/README.md)).
- **Not verified**: anything involving a real MongoDB, Cloudinary, S3/R2, Vercel or Render; Firefox, Safari and real
  phones; Lighthouse. Nothing here has been deployed by the author.
- **Before launch:** fill in `frontend/lib/site-config.ts` (contact details and About text are placeholders), deploy with
  [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), then run the verification table in that guide.

## Features

**Public site** — home with hero, featured books, services, strengths, authors, live statistics, testimonials · book
catalogue with search (title, author, ISBN, category, keyword) and filters (category, author, year, format, price) · book
pages with reviews, table of contents, related books, JSON-LD · author directory and profiles · services · an
eight-step publishing process and manuscript submission with file uploads · contact form · About · FAQ · responsive,
accessible (axe-core finds no WCAG A/AA violations on 11 pages at two widths; automated rules only), SEO basics
(metadata, Open Graph, sitemap, robots).

**Admin dashboard** (`/admin`) — email/password login · books (add, edit, delete, cover upload, publish/unpublish) ·
authors (with photo) · manuscripts (status workflow, signed download links) · contact messages · testimonials · review
moderation · every list paginated.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15.5 (App Router), React 19, TypeScript, Tailwind CSS 3.4, react-hook-form + zod |
| API | Node 22, Express 4, TypeScript, Zod validation |
| Database | MongoDB (Atlas) via Mongoose 8 |
| Auth | bcrypt-hashed passwords, JWT in an `httpOnly`, `Secure`, `SameSite=Strict` cookie |
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
frontend/    Next.js app: app/ (routes), components/, lib/ (API client, config, helpers), assets/brand/
brand/       Logo kit, usage notes, and the script that regenerates it
docs/        API.md · DEPLOYMENT.md · REQUIREMENTS.md
e2e/         Browser checks (Playwright, Python)
render.yaml  Render Blueprint for the API
.github/workflows/ci.yml   Typecheck, lint, tests and build for both packages
```

## Run it locally

Requires Node 22 and a MongoDB connection string (a free Atlas cluster is fine).

```bash
# API  -> http://localhost:5000
cd backend
cp .env.example .env          # set MONGODB_URI, JWT_SECRET, CLIENT_URL=http://localhost:3000
npm ci
npm run seed:admin            # creates the first admin from SEED_ADMIN_* in .env
npm run dev

# Frontend  -> http://localhost:3000
cd frontend
cp .env.example .env.local    # API_ORIGIN=http://localhost:5000
npm ci
npm run dev
```

Image and manuscript uploads need Cloudinary and S3/R2 credentials in `backend/.env`; everything else works without them.

**Without any external service:** `cd backend && npm run dev:fake` starts the same API on port 5055 with seeded sample
data in memory (resets on restart; admin `admin@example.com` / `correct-horse-battery`; storage stubbed). Point the
frontend at it with `API_ORIGIN=http://localhost:5055`.

## Commands

| | Backend (`backend/`) | Frontend (`frontend/`) |
|---|---|---|
| Develop | `npm run dev` · `npm run dev:fake` | `npm run dev` |
| Check | `npm run typecheck` · `npm test` | `npm run typecheck` · `npm run lint` · `npm test` |
| Build / run | `npm run build` · `npm start` | `npm run build` · `npm start` |

The frontend's production build needs `API_ORIGIN` and fails without it, by design.

## Configuration

Every variable is documented in `backend/.env.example` and `frontend/.env.example`, and tabulated in
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md#environment-variables). Secrets live only in environment variables; `.env`
files are git-ignored.

## Documentation

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — architecture, step-by-step setup, verification, troubleshooting
- [`docs/API.md`](docs/API.md) — endpoint reference
- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — the spec, checked item by item, with open items
- [`backend/tests/README.md`](backend/tests/README.md) — what the API tests do and do not prove
- [`brand/README.md`](brand/README.md) — logo kit and its limits
- [`e2e/README.md`](e2e/README.md) — browser checks
