# API Reference

Base URL: `{API_ORIGIN}/api` (local dev: `http://localhost:5000/api`). In the browser
the frontend calls the same path on its own origin and Next.js proxies it here
(see `docs/DEPLOYMENT.md`).

All responses are JSON: `{ success, data?, message?, code?, details? }`, plus
`pagination: { page, limit, total, pages }` on list endpoints. Sessions are carried by the
`bp_session` **httpOnly** cookie; there is no bearer-token option.

## Accounts, roles and sessions

| Role | Can |
|---|---|
| Guest | Browse public pages and the catalogue, register, sign in, reset a password |
| `author` | Everything a guest can, plus: manage their profile, submit manuscripts (after confirming their email), see **only their own** submissions and the editors' feedback, resubmit when changes are requested, read their notifications |
| `admin` / `superadmin` | The admin dashboard: books, authors, manuscripts (review, decide, publish), accounts, messages, testimonials, activity log. Only a `superadmin` can act on other administrator accounts. Admin accounts are created only by `npm run seed:admin` |

**Sessions.** Signing in creates a server-side session; the cookie holds a random 256-bit token and the database holds
only its SHA-256, so sessions can be ended server-side. Author sessions last 12 h (2 h idle), or 30 days (14 days idle)
with "remember me"; admin sessions 8 h (1 h idle), `SameSite=Strict`, never remembered. A new sign-in always gets a new
token and retires the one it arrived with. Changing the password, resetting it, suspending the account or changing its
role ends the affected sessions at once.

**CSRF.** Every state-changing request that carries the session cookie must also send `X-Requested-With: LearnCorp`, and
any `Origin` header must be one of the origins listed in `CLIENT_URL`. Otherwise: `403 Cross-site request blocked`. The
frontend's API client does this for you.

**Rate limits** (per client IP unless noted; failures only where stated): author sign-in 10 failures / 15 min and 8 per
account; admin sign-in 6 / 15 min and 5 per account; registration 10 / h; password recovery 10 / h and 3 per address;
confirmation resend 5 / h per user; token endpoints 30 / 15 min; password change 8 failures / 15 min per user.

## Auth
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | — | `{ name, email, phone?, password, confirmPassword, acceptTerms: true }`. Always creates an unconfirmed **author** (any role in the body is ignored), signs them in, and emails a confirmation link: `201 { data, emailSent }`. 409 if the email exists. Password policy: 10–72 bytes, a letter and a number, not a common password |
| POST | `/auth/login` | — | Authors only. Wrong password, unknown email and an admin account all return the same 401. `{ email, password, rememberMe? }`. Suspended: 403 `ACCOUNT_SUSPENDED` (after the password is proven) |
| POST | `/auth/admin/login` | — | Administrators only; stricter limits; audited (success and failure) |
| POST | `/auth/logout` | — | Ends the session if there is one and always clears the cookies. Idempotent |
| POST | `/auth/logout-all` | Any | Ends every session of the account, including this one |
| GET | `/auth/me` | Any | `{ data: user + unreadNotifications, session: { scope, expiresAt } }` |
| POST | `/auth/verify-email` | — | `{ token }` from the emailed link. Single use, 24 h |
| POST | `/auth/resend-verification` | Any | Invalidates earlier links. 5 / h per user |
| POST | `/auth/forgot-password` | — | `{ email }`. **Always** answers 200 with the same text; the email is sent after the response |
| POST | `/auth/reset-password/validate` | — | `{ token }` → 200 or 400, without spending it |
| POST | `/auth/reset-password` | — | `{ token, password, confirmPassword }`. Single use, 30 min. Ends all sessions; does not sign in |
| PATCH | `/auth/profile` | Any | `name, phone, bio, website` only (email and role cannot be changed here) |
| POST | `/auth/change-password` | Any | `{ currentPassword, password, confirmPassword }`. A wrong current password is a 400 field error, not a 401. Ends the account's other sessions |
| GET | `/auth/sessions` | Any | Active sessions of the caller: device, IP, last active, `current` |
| DELETE | `/auth/sessions/:id` | Any | Ends one of the caller's own sessions (404 for anyone else's) |

## Notifications
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/notifications` | Any | The caller's own. Query: `page, limit(≤50), unread=true`. Returns `unreadCount` |
| PATCH | `/notifications/:id/read` | Any | 404 for someone else's |
| POST | `/notifications/read-all` | Any | |

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

Status flow: **Submitted → Under Review → Accepted → Published**, with **Changes Requested** (the author edits and
resubmits, returning it to *Submitted*) and **Rejected** as the other exits. Rejecting or requesting changes requires a
note (10+ characters) that the author can read. *Published* can only be reached through `POST /:id/publish`.

**Author** (own submissions only; someone else's id returns **404**, never 403):

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/manuscripts` | Author, email confirmed | `multipart/form-data`: details per `submitManuscriptSchema` (name and email come from the account) + file `manuscript` (required; PDF/DOC/DOCX, ≤25 MB) and `cover` (optional; PNG/JPEG). Declared type **and** real file signature are checked. 403 `EMAIL_NOT_VERIFIED` otherwise. 8 / hour |
| GET | `/manuscripts/mine` | Author | Query: `page, limit, status`. Storage keys and file URLs are never included |
| GET | `/manuscripts/mine/:id` | Author | Includes the timeline, the editors' latest note, `canResubmit`, and `bookSlug` once published |
| GET | `/manuscripts/mine/:id/file-url?file=manuscript\|cover` | Author | Signed URL valid 5 minutes |
| PUT | `/manuscripts/mine/:id` | Author | Only while *Changes Requested*, otherwise 409. Multipart; every detail optional (only what changed is sent), optional new files (the replaced ones are kept), and a required `note` saying what changed. Status becomes *Submitted*, version +1 |

**Admin**:

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/manuscripts` | Admin | Query: `page, limit, status` |
| GET | `/manuscripts/:id` | Admin | With the owning account and the full history |
| PATCH | `/manuscripts/:id/status` | Admin | `{ status: Under Review \| Changes Requested \| Accepted \| Rejected, note? }`. Invalid transitions are 409; a concurrent decision is refused rather than overwritten. Notifies the author (in-app + email) and is audited |
| POST | `/manuscripts/:id/publish` | Admin | `{ isbn, price, publicationDate?, coverImageUrl?, keywords? }`. Only from *Accepted*. Creates the catalogue book and (first time) the author's public profile; the author's private cover is copied to the image CDN unless `coverImageUrl` is given. Safe to retry. Audited |
| GET | `/manuscripts/:id/file-url?file=manuscript\|cover` | Admin | Signed URL valid 5 minutes; every access is audited |
| POST | `/manuscripts/uploads/image` | Admin | Cover/author-photo upload → Cloudinary URL (PNG/JPEG, ≤8 MB) |

## Accounts (admin)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users` | Admin | Query: `page, limit, role, status, search`. Includes each author's submission count; never any password data |
| GET | `/users/:id` | Admin | |
| PATCH | `/users/:id/status` | Admin | `{ status: active \| suspended, reason? }`. Suspending ends the account's sessions immediately. You cannot change yourself; only a `superadmin` can change an administrator |
| POST | `/users/:id/revoke-sessions` | Admin | Signs the account out everywhere |

## Activity log (admin)
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/audit-logs` | Admin | Newest first. Query: `page, limit, action, search`. Read-only: there is no write or delete route. Records admin sign-in/out and failed sign-ins, manuscript decisions/publication/file access, account suspension and session revocation, and book/author/testimonial/message changes |

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
| GET | `/dashboard/stats` | Admin | Admin overview counts, including registered authors and manuscripts per status. |

## Errors
`{ success: false, message, code?, details? }` with 400 validation (`details` = per-field
messages), 401 no/ended session, 403 wrong role / blocked cross-site request / unconfirmed email (`code`:
`EMAIL_NOT_VERIFIED`, `ACCOUNT_SUSPENDED`), 404, 409 conflict, 429 rate-limited, 500 unexpected (no stack traces in
production).

Stored URLs (author links/photos, testimonial photos, book covers) must be
`http(s)` — `javascript:` / `data:` URLs are rejected with 400.
