# Browser checks

Playwright (Python) scripts that drive the **production build** of the frontend in headless Chromium against the real
Express API on a **real MongoDB database** (`npm run dev:e2e` resets it and loads sample data; outgoing email is captured
so the scripts can follow confirmation and reset links).

| Script | Checks |
|---|---|
| `check_auth_flows.py` | The whole account journey: guest navigation and route guards; registration (live password rules, duplicate email); email confirmation; submitting a manuscript with files; another author cannot reach it; an author cannot approve anything; admin sign-in is separate; editorial review (changes requested), the author's resubmission, accept and publish, the book appearing in the catalogue; account page (profile, password, sessions, ending another device); password recovery; sign-out; suspension takes effect at once |
| `check_auth_layout_a11y.py` | The new guest, author and admin screens at 390 / 768 / 1440 px have no horizontal overflow; the signed-in mobile menu; axe-core (WCAG 2.0/2.1 A and AA) on every one of them at 1280 and 390 px |
| `check_images_and_layout.py` | Header, hero and admin logos load and come from `/_next/static/media`; nothing is requested from `/_next/image`; no failed requests; 9 pages × 390/768/1440 px have no horizontal overflow and no broken images; admin login through the `/api` proxy; Cloudinary covers are requested as width-specific URLs |
| `check_accessibility.py` | axe-core on the public pages, a book page, an author page and the admin login, at 1280 and 390 px. Automated rules only — they catch roughly a third of real accessibility problems; they do not replace keyboard and screen-reader testing |
| `check_admin_and_seo.py` | Sitemap, robots, Open Graph image and icons; hostile query strings return 200/400, never 500; the five admin lists load; admin pagination |

## Run

```bash
pip install playwright pillow && playwright install chromium

# 0. A MongoDB to use (any: local docker, Atlas, ...). The API wipes and reseeds the database it is pointed at.
docker run -d -p 27017:27017 mongo:7

# 1. API on a fresh database with sample data (port 5055). Data resets on restart.
cd backend && npm ci && MONGODB_URI=mongodb://127.0.0.1:27017/learncorp_e2e npm run dev:e2e

# 2. Frontend production build pointed at it, in another terminal (port 3055)
cd frontend && npm ci
API_ORIGIN=http://localhost:5055 NEXT_PUBLIC_SITE_URL=http://localhost:3055 npm run build
API_ORIGIN=http://localhost:5055 NEXT_PUBLIC_SITE_URL=http://localhost:3055 npx next start -p 3055

# 3. Checks, in a third terminal (restart step 1 between runs of the scripts that create data)
python e2e/check_auth_flows.py
python e2e/check_auth_layout_a11y.py
python e2e/check_images_and_layout.py
python e2e/check_admin_and_seo.py
python e2e/check_accessibility.py      # needs `npm ci` in frontend/ (uses its axe-core)
```

The scripts exit non-zero on any failure and write screenshots to `e2e/.shots/` (override with `SHOTS_DIR`; the site URL
with `BASE_URL`, the API with `API_URL`). `check_auth_flows.py` takes a few minutes; run it in the background if your
shell has a time limit.

The scripts **create data**: restart the API — and rebuild the frontend, whose pages cache API data — before running a
script again.

## What this does not prove

Real Cloudinary, S3/R2, email delivery, Vercel and Render are not involved (storage is stubbed, email is captured, the
Cloudinary check only inspects URLs); the browser is Chromium only; the sample covers are inline SVGs.
