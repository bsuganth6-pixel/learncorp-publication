# Requirements audit

Checked against `BOOK PUBLICATION - Website.pdf` (sections 1–25) and the Phase 4A account specification, 4 November 2026.

| Mark | Meaning |
|---|---|
| ✅ | Implemented **and exercised in the sandbox**: automated tests and/or a headless-Chromium run against the production build. |
| 🔶 | Implemented, but it depends on a real service that has never been available here (MongoDB, Cloudinary, S3/R2, Vercel, Render). **Not verified.** |
| ⚠️ | Partly done, or deliberately different from the spec — the note says how. |
| ❌ | Not done. |

**What "exercised" covers.** Backend: 198 Jest unit tests, plus **118 integration tests that run the real Express app
against a real MongoDB-compatible database** (accounts, sessions, RBAC, ownership, the manuscript workflow). Frontend:
104 unit tests, typecheck, lint, production build. Browser: Playwright/Chromium against `next start` + the real API on a
real database (`e2e/`): the **whole account journey in 72 checks** (register → confirm email → submit → admin review →
resubmit → accept → publish → the book in the catalogue; ownership and role separation; account page; password
recovery; suspension), a layout and accessibility sweep of 20 new screens (no horizontal overflow at 390, 768 and 1440 px; the signed-in mobile menu; axe-core WCAG 2.0/2.1 A + AA at 1280 and 390 px: 0 violations; 44 checks), and the earlier public/admin checks (9 pages at 3 widths, images, sitemap/robots,
hostile queries). **Not covered:** real email delivery, Cloudinary, S3/R2, Atlas, Vercel or Render (the development
database was a MongoDB-compatible server, not MongoDB, and is not atomic under concurrent writes); Firefox, Safari, real
phones; Lighthouse; a penetration test.

---

## 1 · Branding & logo

| Requirement | | Note |
|---|---|---|
| Primary logo | ✅ | Supplied by you (`brand/original/`). |
| Icon / symbol | ✅ | Cut out of the supplied lockup. |
| Horizontal logo | ✅ | Composed from the icon and wordmark. |
| Light- and dark-background versions | ✅ | Dark: wordmark lightened. Raster. |
| Favicon | ✅ | `.ico`, 16/32/48 px, 192/512 px, Apple touch icon. |
| PNG and transparent PNG | ✅ | `brand/png/`. |
| SVG | ⚠️ | The supplied `.svg` is an embedded PNG (no vector paths). `brand/svg/` holds auto-traced approximations: they scale but are visibly posterised and 1.3–1.6 MB. |
| Source / editable file | ❌ | None exists — the artwork is a single raster. `brand/tools/build_logo_kit.py` regenerates every variant. |
| "Completely original" identity | ⚠️ | The logo was supplied, not designed in this project. Originality was not assessed. |

A hand-drawn vector master is the one thing that would close this section. See `brand/README.md`.

## 2 · Home page

| Requirement | | Note |
|---|---|---|
| Hero: name, tagline, description, *Explore Books*, *Publish Your Book*, visual | ✅ | |
| Featured books | ⚠️ | Cards show cover, title, author, price and a **Buy Now** button that opens the book page. They do **not** show category or a short description, and the button is not labelled "View Details". A compact, commerce-style card was chosen (modelled on technicalpublications.in). Closing the gap is a ~10-line change in `components/ui/BookCard.tsx`. |
| Publishing services (9) | ✅ | |
| Why choose us (6) | ✅ | |
| Featured authors | ✅ | |
| Statistics | ⚠️ | Books, authors and categories are real counts from `/api/stats`. "Countries reached" is deliberately omitted: there is no real data behind it. |
| Testimonials | ✅ | Published testimonials from the database, managed in the admin. |
| Call to action | ✅ | |

## 3 · Books catalogue

| Requirement | | Note |
|---|---|---|
| Each book stores every listed field | ✅ | Cover, title, authors, ISBN, category, language, publication date, pages, format, price, description, keywords, publisher, status. |
| Fields shown in the list | ⚠️ | The grid card is a summary (see §2); the full set is on the detail page. |
| Filters: category, author, year, format, price | ✅ | URL-driven, so filtered views are shareable. |
| Search by title, author, ISBN, category, keyword | ✅ | Case-insensitive "contains" with regex escaping. It scans the collection — fine for thousands of books; use Atlas Search if the catalogue grows much larger. |
| Buy / Order button | ✅ | Opens a pre-filled inquiry. There is no cart or payment (out of scope by agreement). |

## 4 · Book details page

| Requirement | | Note |
|---|---|---|
| Large cover left; title, author, rating, price, ISBN, date, pages, format, language, publisher, buy button right | ✅ | Rating/reviews appear when reviews exist. |
| Description, about the author, table of contents, book details, reviews, related books | ✅ | Table of contents appears when the book has one. |
| SEO-friendly | ✅ | Own URL (`/books/<slug>`), page title and description, Open Graph (cover image), JSON-LD `Book`, in the sitemap. |

## 5 · Authors

| Requirement | | Note |
|---|---|---|
| Directory and individual profile pages | ✅ | `/authors`, `/authors/<slug>`. |
| Photo, name, bio, qualifications, books, social links, website | ✅ | |

## 6 · Publishing services · 7 · Publish your book · 8 · Manuscript form

| Requirement | | Note |
|---|---|---|
| Services page covering all listed services, incl. formatting for paperback / hardcover / Kindle / PDF | ✅ | |
| Eight-step process | ✅ | |
| Form fields: name, email, phone, title, category, language, pages, description, bio, format, previous experience, manuscript upload, optional cover upload, additional info, terms checkbox | ✅ | All present. Terms must be accepted (server-side too). **Changed in Phase 4:** submitting now requires a signed-in author with a confirmed email (spec 4A: "authenticated author or registration-required flow"), so *name* and *email* come from the account instead of being typed — they cannot be forged. Guests see a prompt to register. |
| Confirmation message | ✅ | Plus a tracking page and in-app/email updates for every later step. |
| Upload safety | ✅ | 25 MB per file; type allow-list; the file's real signature is checked, not just its declared type; stored privately. |
| Large uploads through the Vercel proxy | 🔶 | Unknown whether Vercel's `/api` rewrite proxy limits request bodies below 25 MB. Test it first — `docs/DEPLOYMENT.md`, check 6. |

## 9 · Contact · 10 · About · 11 · FAQ

| Requirement | | Note |
|---|---|---|
| Contact form (name, email, phone, subject, message) | ✅ | Stored, shown in the admin. |
| Company name, address, email, phone, WhatsApp, hours, map, social links | ⚠️ | **Placeholders.** Address, email, phone and hours show obvious placeholder text from `frontend/lib/site-config.ts`; WhatsApp, map and social links are hidden until you provide them. |
| About: who we are, vision, mission, values, philosophy | ✅ | |
| About: our story | ⚠️ | Placeholder text in `site-config.ts`. |
| About: team, achievements | ⚠️ | Hidden until provided. |
| About: photographs / graphics | ⚠️ | None — there is no photography to use. |
| FAQ: the ten listed questions, expandable | ✅ | |

## 12 · Admin dashboard

| Requirement | | Note |
|---|---|---|
| Books: add, edit, delete, upload cover, price, ISBN, category, publish/unpublish | ✅ | 🔶 for the cover upload (Cloudinary). |
| Authors: add, edit, delete, photo | ✅ | 🔶 for the photo upload. |
| Authors: "manage published books" | ⚠️ | Books are assigned to authors on the book form; there is no per-author screen. An author who still has books cannot be deleted. |
| Manuscripts: applicant, title, email, date, file, status | ✅ | Now 6 states (adds *Changes Requested*). Decisions follow a state machine, rejecting / requesting changes needs a message to the author, and *Published* is reachable only through the publish action. Files download through 5-minute signed links, and each access is logged. 🔶 against real S3/R2. |
| Accounts and activity log (spec 4A) | ✅ | List/search accounts, suspend/reactivate (sessions end at once), sign an account out everywhere; read-only log of sensitive actions. |
| Contact messages | ✅ | View, mark read, delete. |
| Testimonials: add, edit, delete, publish/unpublish | ✅ | |
| Review moderation | ✅ | Extra, beyond the spec. |
| Every list reachable past page 1 | ✅ | Fixed in this revision: the lists previously showed only their first 12–50 records. |
| Change admin password | ✅ | **Account & security** page, and `/forgot-password` once email is configured. |

## 13 · Authentication

| Requirement | | Note |
|---|---|---|
| Email + password login, logout, protected dashboard | ✅ | Replaced in Phase 4 by revocable server-side sessions — see the Phase 4A section below. |
| Admin pages not exposed publicly | ✅ | Redirect to login; the layout verifies the role with the API before rendering; `/admin/` is disallowed in `robots.txt`. |

## 14 · Database

| Requirement | | Note |
|---|---|---|
| Collections users, books, authors, manuscripts, contact messages, testimonials with the listed fields | ✅ | Plus slugs, status, reviews, file keys. 🔶 Never run on a real MongoDB. |
| Indexes | ⚠️ | Defined for slugs, ISBN, email, category, keywords and status. No compound indexes for author/price/date filters — add them if the catalogue grows. |

## 15 · Responsive design

| Requirement | | Note |
|---|---|---|
| No horizontal scroll, broken layouts, broken images | ✅ | Verified for 9 pages × 390 / 768 / 1440 px in Chromium. |
| Desktop, laptop, tablet, Android, iPhone | ⚠️ | Widths emulated in Chromium only. No real devices, Safari or Firefox. |

## 16 · UI / UX

Sticky header, mobile menu, self-hosted serif + sans pair, card system, hover states, clear calls to action: ✅. Whether it reads
as a commercial publisher rather than a student project is a judgement call — look at the live site.

Accessibility: ✅ axe-core reports no WCAG 2.0/2.1 A or AA violations on 11 pages at 1280 and 390 px (`e2e/check_accessibility.py`).
⚠️ Automated rules only — they catch a fraction of real problems; no manual keyboard or screen-reader pass has been done.

## 17 · SEO

| Requirement | | Note |
|---|---|---|
| Titles, meta descriptions, headings, readable URLs, alt text | ✅ | |
| Open Graph | ✅ | Site-wide 1200×630 card; book pages use the cover. |
| Sitemap, robots.txt | ✅ | The sitemap pages through the whole catalogue (it previously stopped at 50 books). |
| Structured data | ✅ | JSON-LD on book pages. |
| Lighthouse score | ❌ | Not run. |

## 18 · Performance

| Requirement | | Note |
|---|---|---|
| Image optimisation, lazy loading | ✅ | Cloudinary serves resized auto-format variants; below-the-fold images are lazy. |
| CSS / JS | ✅ | 103 kB shared first-load JS; 112 kB on the home page (build output). |
| API requests / DB queries | ⚠️ | Page data is cached 2–5 minutes. Indexes: see §14. |
| Cold start | ⚠️ | Render's free plan sleeps after ~15 minutes idle. |

## 19 · Security

✅ password hashing · input validation (Zod) on every body and the list queries · authentication and role authorization ·
protected admin routes · upload checks (type, size, real signature, private storage, signed downloads) · secrets only in
environment variables · rate limiting · `helmet`, CORS pinned to the site origin, NoSQL-operator stripping · open-redirect
protection on login · stored URLs must be `http(s)` · CSRF protection · server-side sessions · audit log. The full model
and its limits: [`SECURITY.md`](SECURITY.md).

Fixed in this revision: the public author search passed raw input into a MongoDB regex (a malformed value returned a 500
and could be abused); `page=-3` and similar returned 500s.

| Open | |
|---|---|
| ⚠️ | No `Content-Security-Policy` on the frontend. |
| ⚠️ | `npm audit` (production dependencies): backend **0**; frontend **1** — `zod` 3.x (high, memory use on oversized collections). It runs only in two browser-side forms, so the vulnerable path is not exposed on a server; fixing it means moving to zod 4 and `@hookform/resolvers` 5. |
| ❌ | No penetration test. |

## 20 · Technology stack

✅ Next.js 15.5 / React 19 / Tailwind 3.4 · Node 22 + Express 4 · MongoDB via Mongoose 8 · server-side sessions in a secure cookie ·
Cloudinary + S3/R2 storage · Vercel (frontend) + Render (API) + Atlas. No deviation needing approval.

## 21 · GitHub

✅ Repository with a readable commit history. The full history of the repository was scanned with pattern searches for
connection strings with credentials, AWS keys, private keys and secrets: nothing matched, and `.env` files are ignored (a
pattern scan, not an audit). CI runs typecheck, lint, tests and build for both packages.

## 22 · Testing

| | | |
|---|---|---|
| Functional (navigation, search, filters, details, forms, login, admin CRUD, uploads) | ✅ | Automated: unit and route tests, 115 integration tests on a real database, and a Chromium journey. |
| Responsive | ✅ | Chromium, 3 widths, including every new account screen. |
| Browsers: Chrome, Edge, Firefox | ⚠️ | Chromium only. |
| Against real services | 🔶 | Never done. |

## 23 · Final deployment

| Deliverable | | Note |
|---|---|---|
| Live website | ⚠️ | `learncorp-publication-blond.vercel.app` is up but is an **old build** with broken images; it needs a redeploy as described in `docs/DEPLOYMENT.md`. |
| GitHub repository | ✅ | |
| Admin panel on production | 🔶 | |
| Production database connected | 🔶 | |
| Logo files | ✅ | Limits in §1. |
| README | ✅ | `README.md`, `docs/DEPLOYMENT.md`, `docs/API.md`, this file. |

## 24 / 25 · Final output and checklist

Professional logo ✅\* · favicon ✅ · home ✅ · about ⚠️ (placeholder content) · books ✅ · book details ✅ · authors ✅ ·
author details ✅ · services ✅ · manuscript submission ✅ · contact ⚠️ (placeholder details) · FAQ ✅ · admin login ✅ ·
dashboard ✅ · book / author / manuscript / message management ✅ · database connected 🔶 · authentication ✅ ·
responsive ✅ (Chromium) · SEO ✅ · security checks ✅ (basic; see §19) · testing ⚠️ · GitHub ✅ · README ✅ ·
website deployed 🔶 · live URL 🔶. (\*raster only, see §1.)

---

## Phase 4A · Authentication & account management

Marks as above. The specification section is quoted by its lettered headings.

| Requirement | | Where it is, and how it was checked |
|---|---|---|
| **A. Roles**: guest, author, admin with RBAC | ✅ | Roles enforced by the API on every request (`middleware/auth.ts`); a test per admin-only route proves guests get 401 and authors 403, and that admins cannot use author-only routes. Browser: an author sent away from `/admin/dashboard`, an admin away from `/author`. |
| A. Author: register, profile, submit with files, own submissions, status tracking, feedback, resubmit, notifications | ✅ | `manuscripts.int.test.ts`, `auth.int.test.ts`; browser journey. |
| A. Admin: secure login, protected dashboard, manage books/authors, review, approve/reject, request changes, publish, manage users, messages, testimonials, activity logs | ✅ | `admin.int.test.ts`, `manuscripts.int.test.ts`; browser journey. |
| **B. Pages**: login, registration, forgot, reset, email verification, profile — navy/gold/white | ✅ | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/account`. No horizontal overflow at 390 / 768 / 1440 px; axe-core: 0 violations at 1280 and 390 px. |
| **C. Registration**: fields, email validation, duplicates, strength, Argon2id/bcrypt, verify before sensitive operations, default author, never self-assign admin | ✅ | bcrypt cost 12 (Argon2id would need a native module; the spec allows either, and bcrypt keeps every existing hash valid). Submitting is blocked until the email is confirmed. A request carrying `role: superadmin` creates an author (test). |
| **D. Login**: validation, errors, visibility toggle, remember-me, rate limiting, sessions, logout, expiry/revocation | ✅ | Remember-me = a longer server session (30 days / 14 idle) in a persistent cookie, authors only. Limits: 10 failures/15 min per IP and 8 per account (admin 6 and 5). |
| **E. Forgot/reset**: secure single-use token, emailed, hash stored, expiry, validate, invalidate, revoke sessions, never reveal registration | ✅ | 30-minute tokens, SHA-256 stored, consumed atomically; identical response and timing for any address; all sessions revoked; a "password changed" notice is emailed. Real email delivery 🔶. |
| **F. Admin authentication**: separate, no public registration, secure provisioning, server-side permissions, expiry/revocation, audit logging, optional MFA | ⚠️ | Everything except MFA, which the spec marks optional and which was not built. Provisioning: `npm run seed:admin` (refuses weak passwords; never promotes an author). |
| **G. Authorization**: route table; no ID tampering; authors never approve/reject/publish | ✅ | Ownership is part of the database query: someone else's id is a 404 on every route (test). Authors get 403 on every editorial route (test). |
| **H. Session & token security**: server sessions, HttpOnly, Secure, SameSite, CSRF, expiry, rotation, invalidation, fixation, CORS | ✅ | Server-side sessions; `HttpOnly` + `Secure` (production); admin `Strict`, author `Lax`; CSRF = Origin allow-list + custom header; a new token at every sign-in; CORS pinned to `CLIENT_URL`. No tokens in `localStorage` (none are readable by script). |
| **I. UI**: avatar/menu, login/register for guests, dashboards for each role, logout, status indicators, responsive menus | ✅ | Account menu, rebuilt mobile menu, verification/suspension badges. |
| **J. Testing** (all 15 listed scenarios) | ✅ | Every scenario has an automated test: registration, duplicate email, login, wrong password, email verification, recovery, expired reset token, logout, session expiry, unauthorized admin access, an author reading another's submission, an author attempting admin operations, invalid/expired tokens, direct API access without authorization, session revocation. |
| **K. Completion criteria** | ✅ / 🔶 | All met in the sandbox. "Email verification works when configured" is 🔶 until a real provider is set up (`docs/DEPLOYMENT.md` §4a). "Existing accounts … preserved": existing administrators keep their passwords and role (a test creates a pre-accounts user document and signs it in); they must sign in again once, because the old stateless cookies are not sessions. |
| No fake authentication, hardcoded admin credentials, frontend-only role checks, or simulated login | ✅ | The development server's sample admin exists only in its throw-away database. |

**Updated Phase 4 completion list.** 1 improved home and hamburger navigation ✅ (menus rebuilt; keyboard-operable
categories menu; signed-in account block on mobile) · 2 **homepage book previews ⚠️ — not changed in this pass**, the home
page already shows featured books and shelves, but the Phase 4 text that defines "previews" was not in the material for
this work · 3 author registration and login ✅ · 4 secure admin authentication ✅ · 5 forgot/reset password ✅ · 6 RBAC ✅ ·
7 author dashboard ✅ · 8 publishing submission workflow ✅ · 9 secure manuscript and cover uploads ✅ · 10 admin
publishing approval ✅ · 11 submission status tracking ✅ · 12 notifications ✅ (in-app + email; no push/SMS) · 13 database
integration ✅ 🔶 · 14 security and responsive testing ✅ (Chromium; no penetration test) · 15 production deployment 🔶 —
not deployed.

---

## Open items, in priority order

1. **Redeploy** following `docs/DEPLOYMENT.md` (Vercel Root Directory `frontend`, `API_ORIGIN`, Render API, Atlas, Cloudinary, R2, **and an email provider, §4a**). After deploying, run `npm run test:integration` against an Atlas cluster you can create throw-away databases on, to confirm the concurrency guard on MongoDB itself.
2. **Run the verification table** in that guide against the real services — especially check 6 (large upload through the
   proxy), check 7 (`TRUST_PROXY_HOPS`), and 4a/4b (a real confirmation and reset email).
3. **Fill in `frontend/lib/site-config.ts`**: contact email, phone, address, hours, WhatsApp, social links, About story, team, achievements.
4. Decide on the featured-book card fields (§2).
5. Test on Firefox, Safari and real phones; run Lighthouse.
6. Commission a vector master of the logo (§1).
7. Add a full Content-Security-Policy (`frontend/vercel.json` already sets the parts that cannot break the site: framing, `base-uri`, `form-action`, `object-src`; a strict `script-src` needs per-request nonces and has to allow the contact-page map); move the frontend to zod 4; consider MFA for administrators; decide what the homepage "book previews" should be (§ Phase 4A, item 2).
