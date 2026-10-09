# API Reference

Base URL: `{API_ORIGIN}/api` (local dev: `http://localhost:5000/api`). In the browser
the frontend calls the same path on its own origin and Next.js proxies it here
(see `docs/DEPLOYMENT.md`).

All responses are JSON: `{ success, data?, message?, details? }`, plus
`pagination: { page, limit, total, pages }` on list endpoints. Admin endpoints
require the `bp_session` httpOnly cookie set by `/auth/login` — there is no
bearer-token option.

## Auth
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/login` | — | Rate-limited (5/15 min). Sets the session cookie. Wrong password and unknown email return the same 401. |
| POST | `/auth/logout` | Admin | Clears the cookie. |
| GET | `/auth/me` | Admin | Current admin's profile. |

## Books
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/books` | — | **Published only, always** (a `status` param is ignored). Query: `page, limit(≤50), category, author, format, language, minPrice, maxPrice, year, search, sort`. |
| GET | `/books/:slug` | — | 404 for drafts and unknown slugs. Includes up to 4 related books. |
| GET | `/books/admin/all` | Admin | Same filters plus `status` (omit for all). |
| GET | `/books/admin/:id` | Admin | By Mongo `_id`, any status — used by the edit form. |
| POST | `/books` | Admin | Body per `createBookSchema`; unknown fields are stripped, slug is generated. |
| PATCH | `/books/:id` | Admin | Partial update. |
| DELETE | `/books/:id` | Admin | |
| POST | `/books/:id/reviews` | Admin | `{ name, rating 1–5, comment }` — reviews are admin-curated (no public accounts). |
| DELETE | `/books/:id/reviews/:reviewIndex` | Admin | |

## Authors
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/authors` | — | Query: `page, limit, search`. |
| GET | `/authors/:slug` | — | Includes that author's published books. |
| POST / PATCH / DELETE | `/authors[/:id]` | Admin | DELETE returns 409 while the author is credited on any book. |

## Manuscripts
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/manuscripts` | — | `multipart/form-data`: fields per `submitManuscriptSchema` + file `manuscript` (required; PDF/DOC/DOCX, ≤25 MB) and `cover` (optional; PNG/JPEG). Declared type **and** real file signature are checked. Rate-limited (8/hour). |
| GET | `/manuscripts` | Admin | Query: `page, status`. |
| GET | `/manuscripts/:id` | Admin | |
| PATCH | `/manuscripts/:id/status` | Admin | `{ status }`: Submitted / Under Review / Accepted / Rejected / Published. |
| GET | `/manuscripts/:id/file-url?file=manuscript\|cover` | Admin | Signed URL valid 5 minutes; files are never public. |
| POST | `/manuscripts/uploads/image` | Admin | Cover/author-photo upload → Cloudinary URL (PNG/JPEG, ≤8 MB). |

## Contact
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/contact` | — | Rate-limited (8/hour, shared with manuscripts). |
| GET | `/contact` | Admin | Query: `page, unread`. |
| PATCH | `/contact/:id/read` | Admin | |
| DELETE | `/contact/:id` | Admin | |

## Testimonials
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/testimonials` | — | Published only. |
| GET | `/testimonials/admin/all` | Admin | Every status. |
| POST / PATCH / DELETE | `/testimonials[/:id]` | Admin | |

## Stats
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/stats` | — | Real counts for the homepage: `{ publishedBooks, authors, categories }`. |
| GET | `/dashboard/stats` | Admin | Admin overview counts. |

## Errors
`{ success: false, message, details? }` with 400 validation (`details` = per-field
messages), 401 no/invalid session, 403 wrong role, 404, 409 conflict, 429
rate-limited, 500 unexpected (no stack traces in production).

Stored URLs (author links/photos, testimonial photos, book covers) must be
`http(s)` — `javascript:` / `data:` URLs are rejected with 400.
