# Security model

How accounts, sessions and permissions work, where each protection is enforced, and what is **not** covered. Every
claim below is backed by a test named in the last column; the browser journey in `e2e/check_auth_flows.py` exercises
the same behaviour through the real interface.

## Who can do what

| | Guest | Author | Admin / super admin |
|---|---|---|---|
| Browse the public site and catalogue | ✓ | ✓ | ✓ |
| Submit a manuscript | — | ✓ (email confirmed) | — |
| Read a submission | — | **own only** | all |
| Approve, reject, request changes, publish | — | **never** | ✓ |
| Manage books, authors, accounts, messages, testimonials | — | — | ✓ (acting on other admins: super admin only) |
| Read the activity log | — | — | ✓ |

Admin accounts are created only by `npm run seed:admin` (a command-line step run by whoever operates the deployment).
There is no sign-up path, and no request field, that can produce or grant the admin role.

## Where each rule is enforced

The browser is never trusted. The interface hides what a role cannot use, but **every rule below is enforced by the API on
every request**; the Next.js layouts for `/author`, `/account` and `/admin/dashboard` additionally ask the API who the cookie
belongs to before rendering (the cookie-presence check in `middleware.ts` is only a convenience redirect).

| Protection | How | Verified by |
|---|---|---|
| Passwords | bcrypt, cost 12, per-hash salt; 10–72 bytes (bcrypt truncates beyond 72, so longer is refused, not silently cut), a letter and a number (any script), not a common password | `password.test.ts`, `tokens.test.ts`, `auth.int.test.ts` (registration) |
| No account enumeration | Sign-in gives one message for wrong password / unknown email / wrong kind of account and spends a password check in each case; password recovery answers identically and sends the email after responding | `auth.int.test.ts` (sign-in, recovery) |
| Sessions | 256-bit random token in an `httpOnly` cookie (`Secure` in production); the database stores only its SHA-256, so a database leak does not yield usable sessions; absolute and idle expiry; revocable server-side | `auth.int.test.ts` (sessions) |
| Session fixation | A sign-in never adopts a client-supplied session; it issues a new token and retires the one it arrived with | `auth.int.test.ts` |
| Revocation | Logout, logout-all, ending a device, password change (other devices), password reset (all), suspension (all, immediately), role change, at most 10 live sessions per account | `auth.int.test.ts`, `admin.int.test.ts` |
| Admin separation | Separate sign-in endpoint, stricter limits, `SameSite=Strict`, 8 h / 1 h idle, never remembered; an admin session only exists for an admin account and stops working if the role changes; every admin route checks the role | `auth.int.test.ts` (RBAC, admin sign-in) |
| Ownership | An author's query includes their own id, so someone else's submission is "not found" (404, not 403) on every route; files are reached only through 5-minute signed links, and private storage keys never leave the API | `manuscripts.int.test.ts` |
| One-time links | Email confirmation (24 h) and reset (30 min) tokens are random, stored as hashes, single-use (consumed atomically), and replaced when a newer one is requested; a weak new password does not spend the link | `auth.int.test.ts` |
| CSRF | `SameSite` cookies **plus** an allow-list check of the `Origin` header and a required custom header on any write that carries the session cookie | `csrf.test.ts`, `auth.int.test.ts` |
| Brute force | Per-IP and per-account limits on sign-in (failures only), registration, recovery, resend, token endpoints and password change; stricter for admins | `auth.int.test.ts` |
| Uploads | Declared type **and** real file signature checked for manuscripts and images; size limits; object keys sanitised; nothing stored if any file in the request fails | `manuscripts.int.test.ts` |
| Audit trail | Admin sign-in/out and failed sign-ins, decisions, publication, private-file access, suspensions, content changes — append-only (no update or delete route), never containing passwords | `admin.int.test.ts` |
| Injection | Zod validation on every input (strings only where strings are expected, so `{"$gt": ""}` is refused), `express-mongo-sanitize`, escaped regex search | `auth.int.test.ts`, `admin.int.test.ts` |
| Email content | Every user-supplied value is HTML-escaped in templates; links are built from `CLIENT_URL`, never from request headers | `emailTemplates.test.ts`, `config.test.ts` |
| Transport and headers | Helmet defaults; `Cache-Control: private, no-store` on private pages; `Referrer-Policy: no-referrer` on the pages whose URL carries a one-time token | `next.config.js` |

## Not covered, and trade-offs

- **No multi-factor authentication.** Admin sign-in is a password only (the spec lists MFA as optional). Because an admin
  can reset their password by email, control of that mailbox is control of the account; use a mailbox with MFA.
- **Rate limits are per process.** Exact with one API instance; several instances need a shared store.
- **A per-account sign-in limit can be used to lock someone out for 15 minutes** (the cost of limiting guessing from many
  addresses at once). It never reveals whether the account exists.
- **Registering reveals that an email is already registered** (a 409), the usual trade-off for a usable sign-up form; it is
  rate-limited. Sign-in and recovery do not reveal it.
- **Email changes are not supported** in the interface; an author who needs a new address contacts the publisher.
- **Atomicity of concurrent decisions** rests on MongoDB's single-document guarantee. The code uses a compare-and-set
  write and a test proves the guard by interleaving deterministically; a true race could not be demonstrated on the
  development database stand-in.
- **No malware scanning** of uploaded manuscripts: files are signature-checked and stored privately, never executed or
  rendered inline by the site; administrators download them.
- **Dependency vulnerabilities** are not scanned here. Run `npm audit` in both packages as part of the release.
- **Penetration testing and a third-party review have not been done.**
