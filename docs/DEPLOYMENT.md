# Deployment guide

```
Browser ──▶ Vercel  (Next.js, frontend/)  ── /api/* rewrite ──▶  Render (Express, backend/) ──▶ MongoDB Atlas
                                                                          ├──▶ Cloudinary           cover images, author photos
                                                                          └──▶ Cloudflare R2 / S3   manuscripts (private)
```

## Why it is laid out this way

- **The browser only talks to the site's own origin.** `frontend/next.config.js` proxies `/api/*` to the API, so the
  session cookie (`httpOnly`, `Secure`; `SameSite=Strict` for administrators, `Lax` for authors so a link in one of our
  emails still arrives signed in) is first-party. With the API on a different site that cookie would never be sent, and
  the route guards in `frontend/middleware.ts` and the author/admin layouts could never see it.
- **The API is a normal long-running Node server, not a Vercel Function.** Vercel Functions reject request bodies over
  4.5 MB; manuscripts may be up to 25 MB each. An earlier revision of this repo had a root `vercel.json` that deployed the
  API as a Vercel "service"; it was removed for that reason. A single process also keeps the in-memory rate limiter
  accurate and the MongoDB connection pooled.
- It is the stack the project spec recommends (Vercel + Render + MongoDB Atlas).

Do the steps in this order — each one produces a value the next needs.

## 1. MongoDB Atlas

1. Create a free **M0** cluster in a region near your API (Mumbai or Singapore for India).
2. **Database Access** → add a user with a long generated password and the `readWrite` role (on `book-publication`, or
   "read and write to any database").
3. **Network Access** → Render's free tier has no fixed outbound IP, so allow `0.0.0.0/0`. The strong password plus TLS
   is then what protects the database. (On a paid Render plan you can restrict this to its static IPs.)
4. **Connect → Drivers** → copy the `mongodb+srv://…` string and put the database name before the `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/book-publication?retryWrites=true&w=majority`
   (URL-encode special characters in the password). This is `MONGODB_URI`.

Collections and indexes are created automatically on first use; there is nothing to import. The free tier has no
automated backups — export with `mongodump` before anything important.

## 2. Cloudinary (cover images, author photos)

Create a free account and copy **Cloud name**, **API Key**, **API Secret** from the dashboard. No presets are needed:
the API uploads under `book-publication/…`, and the site asks Cloudinary for resized, auto-format variants through URL
transformations (`frontend/lib/image-loader.ts`), so Vercel's image optimiser is not involved.

## 3. Private file storage (manuscripts and submitted covers)

**Cloudflare R2 (recommended)**

1. R2 → **Create bucket** (e.g. `learncorp-manuscripts`). Leave it private: no public access, no custom domain.
2. R2 → **Manage API tokens** → create a token with *Object Read & Write* on that bucket; copy the Access Key ID and Secret.
3. Values:
   `STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, `STORAGE_REGION=auto`,
   `STORAGE_BUCKET=<bucket>`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`,
   `STORAGE_PUBLIC_BASE_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<bucket>`.

`STORAGE_PUBLIC_BASE_URL` is only used to build the reference string saved with each file; the bucket stays private and
admins download through signed links that expire after 5 minutes.

**AWS S3 instead:** leave `STORAGE_ENDPOINT` empty, set `STORAGE_REGION` to the bucket's region (e.g. `ap-south-1`), keep
"Block all public access" on, and use an IAM user allowed only `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on that bucket.

## 4. API on Render

**Blueprint (recommended):** Render → **New → Blueprint** → pick this repository. It reads `render.yaml`
(service `learncorp-api`, root directory `backend`). Fill in the prompted secrets (there is no signing secret to generate:
sessions are random tokens kept in the database). `CLIENT_URL` can be a placeholder `https://` address for now — you set
the real value in step 7. In production the API **refuses to start** without a valid `https://` `CLIENT_URL`, so a mistake
shows up immediately in the logs rather than as a site where sign-in quietly fails.

**Manual:** New → Web Service → Root Directory `backend` · Build Command `npm ci --include=dev && npm run build` ·
Start Command `npm start` · Health Check Path `/health` · Node 22 · the variables from the table at the end.
(`--include=dev` matters: `tsc` is a devDependency and `NODE_ENV=production` would otherwise skip it.)

When it is live, `https://<service>.onrender.com/health` returns `{"success":true,"status":"ok",…}`.

The free plan sleeps after ~15 minutes without traffic; the first request afterwards takes 30–60 s. Use the *Starter*
plan (or an uptime pinger on `/health`) for a site people will actually visit.

## 4a. Email (needed for author accounts)

Author accounts confirm their address and recover passwords by email, so the API needs a way to send it. Without one,
authors can register but cannot confirm their email, and therefore cannot submit manuscripts; the API logs a warning at
start-up when `EMAIL_PROVIDER` is unset.

- **Resend (recommended on Render's free tier, which blocks outbound SMTP):** create an account at resend.com, verify a
  sending domain (or use their test address while developing), create an API key. Set `EMAIL_PROVIDER=resend`,
  `RESEND_API_KEY`, and `EMAIL_FROM` (for example `LearnCorp Publication <no-reply@your-domain.com>`, an address on the
  domain you verified).
- **SMTP** (paid Render instance, or any host that allows it): `EMAIL_PROVIDER=smtp`, `EMAIL_FROM`, `SMTP_HOST`,
  `SMTP_PORT` (587), `SMTP_SECURE` (`false` for 587, `true` for 465), `SMTP_USER`, `SMTP_PASS`.
- `console` prints messages to the log and is **refused in production**: a reset link in a log is not a delivered email.

Check it from the site: register a test author and look for the confirmation email.

## 5. Create the first admin

Run once from your own computer (Render's shell is not available on the free plan):

```bash
cd backend
cp .env.example .env     # set MONGODB_URI (same Atlas URI) and SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm ci
npm run seed:admin
```

The password must meet the same policy as every account (10+ characters, a letter and a number, not a common password):
the script refuses anything weaker and never prints it. It will not overwrite an existing administrator and will never
promote an existing author account. `SEED_ADMIN_ROLE=superadmin` (default) lets that account manage other administrators;
use `admin` for a role that can't. Remove the `SEED_ADMIN_*` lines afterwards. There is no public admin sign-up: this
script is the only way an administrator account is created.

Afterwards the administrator changes their password and reviews their active sessions under **Account & security**. A
forgotten admin password can be reset from `/forgot-password` (once email is configured); if email isn't set up yet,
delete the user document in Atlas (Data Explorer → `users`) and run the seed again.

## 6. Frontend on Vercel

1. **Add New → Project** → import the GitHub repository.
2. **Framework Preset: Next.js · Root Directory: `frontend`** · Node.js Version 22.x.
   If this Vercel project was created earlier with the *Services* preset, change both under Settings → Build and
   Deployment. There must be **no `vercel.json` at the repository root** (this repo no longer has one).
3. **Environment Variables** — add to **Production and Preview**:
   - `API_ORIGIN` = `https://<service>.onrender.com` (no trailing slash, no `/api`).
     **Required at build time: the build deliberately fails without it**, so you never ship a site whose login and forms
     404. It is baked into the build; if you change it, redeploy.
   - `NEXT_PUBLIC_SITE_URL` — optional. Without it the site uses its production `*.vercel.app` hostname for canonical
     URLs, the sitemap and link previews. Set it when you attach a custom domain.
4. Deploy.

## 7. Connect the two

Render → service → **Environment** → set `CLIENT_URL` to the site's exact origin (for example
`https://learncorp-publication-blond.vercel.app`, no trailing slash). Saving redeploys the API. It is used for three
things: CORS, the CSRF origin check (a write from any other origin is refused with 403), and the links in emails. If the
site answers on more than one address (the `*.vercel.app` URL and a custom domain), list them comma-separated; the first
is the one used in emails.

## 8. Verify

| # | Check | How |
|---|---|---|
| 1 | API is up | `https://<service>.onrender.com/health` |
| 2 | Site loads, logo and hero show | Open the site; View source: logo URLs look like `/_next/static/media/logo-mark.<hash>.webp`, and there is no `/_next/image` |
| 3 | Proxy works | `https://<site>/api/books` returns JSON |
| 4 | Admin login | `/admin/login`; DevTools → Application → Cookies: `bp_session` is **HttpOnly, Secure, SameSite=Strict** on the *site's* domain (an author's is SameSite=Lax); the dashboard opens, and an author opening `/admin/dashboard` is sent back to their own |
| 4a | Author account | Register at `/register`, open the confirmation email, then submit a PDF on `/publish`; review it as the admin (request changes, accept, publish) and check the author sees each step on their dashboard |
| 4b | Password recovery | `/forgot-password` → the email arrives → the link works once; afterwards the old password and old sessions no longer work |
| 5 | Content + images | In the dashboard add an author and a book with a cover. The cover URL starts with `https://res.cloudinary.com/`; the public pages refresh within 2–5 minutes (they are cached) |
| 6 | Manuscript upload | Submit a small PDF on `/publish`, then a PDF **over 5 MB**, then one close to 25 MB. The admin sees each and can download it through the signed link |
| 7 | Rate-limit IPs | See below — do this once |
| 8 | Forms | Contact form → appears under *Messages* |
| 9 | SEO | `/sitemap.xml` lists books and authors; `/robots.txt`; paste the URL into a link-preview tool |

**Not verified by the author of this repo (no real Vercel/Render/Atlas/R2/email-provider access):** items 2, 3, 4, 4a, 4b, 6
and 7 against the real services. Item 6 matters most — see *413 on large uploads* below. Item 4a depends on a working
email provider and on Vercel's rewrite proxy forwarding the browser's `Origin` header unchanged (the CSRF check allows
requests with no `Origin`, so a proxy that dropped it would not break sign-in, only weaken one layer).

### `TRUST_PROXY_HOPS` and the rate limiters

The API limits requests per client IP (login 5 per 15 min, forms 8 per hour, everything else 300 per 15 min). It decides
which `X-Forwarded-For` entry is the client by counting trusted proxies:

- `TRUST_PROXY_HOPS` too **low** → every visitor appears to have the same IP and **shares one limit**: after 5 logins, nobody can log in.
- Too **high** → a client can send a fake `X-Forwarded-For` and dodge the limit.

`render.yaml` sets `2` for Vercel's proxy plus Render's load balancer. **Check it once** (production logging is off, so
use the response headers): from your laptop run
`curl -s -D - -o /dev/null https://<site>/api/books | grep -i ratelimit-remaining`, note the number, then load the site on
your phone over mobile data and run the command again. If the count dropped by far more than your own requests, the
two devices share a bucket — set `TRUST_PROXY_HOPS=1` on Render and test again.

### Environment variables

**API (Render)**

| Variable | Value / notes |
|---|---|
| `NODE_ENV` | `production` (also enables the `Secure` cookie flag and refuses the `console` email provider) |
| `PORT` | Provided by Render |
| `TRUST_PROXY_HOPS` | `2` behind Vercel's proxy + Render; `1` if the API is reached directly |
| `CLIENT_URL` | The site's exact `https://` origin (comma-separate several; first is used in emails). Required |
| `MONGODB_URI` | Atlas connection string (step 1) |
| `COOKIE_NAME` | `bp_session` (sessions are database-backed random tokens, so there is no JWT secret; a leftover `JWT_SECRET` from an earlier deployment is simply ignored) |
| `EMAIL_PROVIDER`, `EMAIL_FROM`, `RESEND_API_KEY` or `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS` | Step 4a |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Step 2 |
| `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_BASE_URL` | Step 3 |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_ROLE` | Local `.env` only, used once by `npm run seed:admin` — don't put them on Render |

**Frontend (Vercel)**

| Variable | Value / notes |
|---|---|
| `API_ORIGIN` | API origin, build-time, **required** |
| `NEXT_PUBLIC_SITE_URL` | Optional; custom domain |
| `COOKIE_NAME` | Only if you changed it on the API |

## Custom domain

Add it in Vercel (Settings → Domains), set `NEXT_PUBLIC_SITE_URL` to it, update `CLIENT_URL` on Render, redeploy both.

## Troubleshooting

**The live site does not change after a push.** Vercel keeps serving the last *successful* deployment. Open Vercel →
Deployments: if the newest ones are red, read the build log. The usual causes are `API_ORIGIN is not set` (step 6.3), or
a *Services*/framework-preset error (step 6.2).

**Logo or images missing.** DevTools → Network, filter *Img*. Brand images should be 200 from `/_next/static/media/…`;
book covers and author photos should be `res.cloudinary.com/…/f_auto,q_auto,c_limit,w_…/…`. A 404 on the latter means the
stored URL is not a valid Cloudinary URL (check the upload in the dashboard); non-Cloudinary URLs are served as-is.

**`/api/*` returns 502/504.** The API is asleep or crashed: open `/health`, then Render → Logs. On the free plan allow a minute.

**Login works but the dashboard bounces back to the login page.** The cookie is not reaching the site. Confirm
`NODE_ENV=production` on the API, that you are on HTTPS, and that `COOKIE_NAME` is the same on both sides.

**Everyone was signed out after upgrading to accounts.** Expected once: the old stateless login cookies are not sessions in
the new system. Administrators sign in again; their passwords are unchanged.

**`403 Cross-site request blocked` on every form or sign-in.** The browser's `Origin` is not listed in `CLIENT_URL`
(common after attaching a custom domain, or when using a Vercel preview URL). Add that origin, comma-separated.

**The API will not start: `Invalid production configuration`.** `CLIENT_URL` is missing or not `https://`.

**Authors register but never get the confirmation email.** Check the start-up log for the `EMAIL_PROVIDER` warning, then
Render → Logs for `[email] … not delivered`. With Resend, the `EMAIL_FROM` address must be on a domain you have verified.
Meanwhile an author can use *Send a new confirmation link* from their dashboard once the provider works.

**Running more than one API instance.** The rate limiters count per process, so with N instances each address gets N times
the limit. One instance (the default here) is exact; for more, back them with a shared store such as Redis.

**Everyone gets 429.** `TRUST_PROXY_HOPS` is too low — see above.

**413 on large uploads.** The API accepts 25 MB per file. A 413 whose response body is not the API's JSON means a layer in
front of the API rejected the body. Vercel Functions cap request bodies at 4.5 MB; whether the *rewrite proxy* applies a
cap is not something this repo has been able to verify. If it does, manuscripts must move to direct-to-storage
(pre-signed) uploads — tell the maintainers rather than raising limits that cannot help.

**Atlas connection times out.** Network Access doesn't include the API's IP (step 1.3).

**Render build fails with `tsc: not found`.** The build command is missing `--include=dev`.
