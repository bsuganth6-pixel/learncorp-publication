# Requirements audit

Checked against `BOOK PUBLICATION - Website.pdf` (sections 1–25), 1 November 2026.

| Mark | Meaning |
|---|---|
| ✅ | Implemented **and exercised in the sandbox**: automated tests and/or a headless-Chromium run against the production build. |
| 🔶 | Implemented, but it depends on a real service that has never been available here (MongoDB, Cloudinary, S3/R2, Vercel, Render). **Not verified.** |
| ⚠️ | Partly done, or deliberately different from the spec — the note says how. |
| ❌ | Not done. |

**What "exercised" covers.** Backend: 135 Jest tests against the real Express app on an in-memory data layer. Frontend:
32 unit tests, typecheck, lint, production build. Browser: Playwright/Chromium against `next start` + that same API
(`e2e/`): 9 public/admin pages at 390, 768 and 1440 px (no horizontal overflow, no broken images), logo/hero/admin images,
admin login through the `/api` proxy, all five admin lists, pagination, sitemap/robots/icons, hostile query strings,
Cloudinary URL generation; axe-core (WCAG 2.0/2.1 A + AA) on 11 pages at 1280 and 390 px — 0 violations. **Not covered:** a real MongoDB, Cloudinary, S3/R2, Vercel or Render; Firefox, Safari, real
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
| Form fields: name, email, phone, title, category, language, pages, description, bio, format, previous experience, manuscript upload, optional cover upload, additional info, terms checkbox | ✅ | All present. Terms must be accepted (server-side too). |
| Confirmation message | ✅ | |
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
| Manuscripts: applicant, title, email, date, file, status (5 states) | ✅ | Files download through 5-minute signed links. 🔶 against real S3/R2. |
| Contact messages | ✅ | View, mark read, delete. |
| Testimonials: add, edit, delete, publish/unpublish | ✅ | |
| Review moderation | ✅ | Extra, beyond the spec. |
| Every list reachable past page 1 | ✅ | Fixed in this revision: the lists previously showed only their first 12–50 records. |
| Change admin password | ❌ | No screen. Reset by deleting the user in Atlas and re-running `npm run seed:admin`. |

## 13 · Authentication

| Requirement | | Note |
|---|---|---|
| Email + password login, logout, protected dashboard | ✅ | bcrypt (cost 12); JWT in an `httpOnly`, `Secure`, `SameSite=Strict` cookie; route guard in middleware **and** per-route auth/role checks on the API; login limited to 5 attempts / 15 min / IP. |
| Admin pages not exposed publicly | ✅ | Redirect to login; `/admin/` is disallowed in `robots.txt`. |

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
protection on login · stored URLs must be `http(s)`.

Fixed in this revision: the public author search passed raw input into a MongoDB regex (a malformed value returned a 500
and could be abused); `page=-3` and similar returned 500s.

| Open | |
|---|---|
| ⚠️ | No `Content-Security-Policy` on the frontend. |
| ⚠️ | `npm audit` (production dependencies): backend **0**; frontend **1** — `zod` 3.x (high, memory use on oversized collections). It runs only in two browser-side forms, so the vulnerable path is not exposed on a server; fixing it means moving to zod 4 and `@hookform/resolvers` 5. |
| ❌ | No penetration test. |

## 20 · Technology stack

✅ Next.js 15.5 / React 19 / Tailwind 3.4 · Node 22 + Express 4 · MongoDB via Mongoose 8 · JWT in a secure cookie ·
Cloudinary + S3/R2 storage · Vercel (frontend) + Render (API) + Atlas. No deviation needing approval.

## 21 · GitHub

✅ Repository with a readable commit history. The full history of the repository was scanned with pattern searches for
connection strings with credentials, AWS keys, private keys and secrets: nothing matched, and `.env` files are ignored (a
pattern scan, not an audit). CI runs typecheck, lint, tests and build for both packages.

## 22 · Testing

| | | |
|---|---|---|
| Functional (navigation, search, filters, details, forms, login, admin CRUD, uploads) | ✅ | Automated, on the in-memory data layer. |
| Responsive | ✅ | Chromium, 3 widths. |
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

## Open items, in priority order

1. **Redeploy** following `docs/DEPLOYMENT.md` (Vercel Root Directory `frontend`, `API_ORIGIN`, Render API, Atlas, Cloudinary, R2).
2. **Run the verification table** in that guide against the real services — especially check 6 (large upload through the
   proxy) and check 7 (`TRUST_PROXY_HOPS`).
3. **Fill in `frontend/lib/site-config.ts`**: contact email, phone, address, hours, WhatsApp, social links, About story, team, achievements.
4. Decide on the featured-book card fields (§2).
5. Test on Firefox, Safari and real phones; run Lighthouse.
6. Commission a vector master of the logo (§1).
7. Add a change-password screen; add a Content-Security-Policy; move the frontend to zod 4.
