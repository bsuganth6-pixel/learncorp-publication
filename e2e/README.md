# Browser checks

Three Playwright (Python) scripts that drive the **production build** of the frontend in headless Chromium against the
real Express API running on an in-memory data layer (`npm run dev:fake`, seeded sample data, no MongoDB needed).

| Script | Checks |
|---|---|
| `check_images_and_layout.py` | Header, hero and admin logos load and come from `/_next/static/media`; nothing is requested from `/_next/image`; no failed requests; 9 pages × 390/768/1440 px have no horizontal overflow and no broken images; admin login through the `/api` proxy; Cloudinary covers are requested as width-specific `f_auto,q_auto,c_limit,w_N` URLs |
| `check_accessibility.py` | axe-core (WCAG 2.0/2.1 A and AA) on the public pages, a book page, an author page and the admin login, at 1280 and 390 px. Automated rules only — they catch roughly a third of real accessibility problems; they do not replace keyboard and screen-reader testing. Read-only |
| `check_admin_and_seo.py` | Sitemap, robots, Open Graph image and icons; hostile query strings return 200/400, never 500; the five admin lists load; admin pagination, including stepping back when the last item on the last page is deleted |

## Run

```bash
pip install playwright pillow && playwright install chromium

# 1. API with fresh sample data (port 5055). Data resets on restart.
cd backend && npm ci && npm run dev:fake

# 2. Frontend production build pointed at it, in another terminal (port 3055)
cd frontend && npm ci
API_ORIGIN=http://localhost:5055 NEXT_PUBLIC_SITE_URL=http://localhost:3055 npm run build
API_ORIGIN=http://localhost:5055 NEXT_PUBLIC_SITE_URL=http://localhost:3055 npx next start -p 3055

# 3. Checks, in a third terminal
python e2e/check_images_and_layout.py
python e2e/check_admin_and_seo.py
python e2e/check_accessibility.py      # needs `npm ci` in frontend/ (uses its axe-core)
```

Both scripts exit non-zero on any failure and write screenshots to `e2e/.shots/` (override with `SHOTS_DIR`; the site
URL with `BASE_URL`).

The first two scripts **create data** (one book, then fourteen authors). Restart the API — and rebuild the frontend, whose pages
cache API data — before running them again, or later runs will see the leftovers and fail for reasons unrelated to the code.

## What this does not prove

Real MongoDB, Cloudinary, S3/R2, Vercel and Render are not involved (the Cloudinary check only inspects the URLs the
page asks for); the browser is Chromium only; the sample covers are inline SVGs, not hosted images.
