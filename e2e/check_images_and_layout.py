"""Browser check: logos/images load, nothing goes through /_next/image, no horizontal overflow, admin login, Cloudinary loader.

Run against a production build (see e2e/README.md). Creates one book in the API it talks to, so use a freshly started API each run.
"""
import base64, io, json, os, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE_URL', 'http://localhost:3055').rstrip('/')
from PIL import Image
_b = io.BytesIO(); Image.new('RGB', (8, 8), (120, 90, 40)).save(_b, 'PNG'); PNG = _b.getvalue()
SHOTS = os.environ.get('SHOTS_DIR', str(Path(__file__).resolve().parent / '.shots'))
Path(SHOTS).mkdir(parents=True, exist_ok=True)
results, failures = [], []

def go(page, url):
    page.goto(url, wait_until='load', timeout=45000)
    try: page.wait_for_load_state('networkidle', timeout=8000)
    except Exception: page.wait_for_timeout(500)


def check(name, ok, detail=''):
    results.append((name, ok, detail))
    if not ok: failures.append(name)
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''))

def imgs(page):
    return page.evaluate("""() => [...document.images].map(i => ({
        src: i.currentSrc || i.src, alt: i.alt, complete: i.complete, w: i.naturalWidth, h: i.naturalHeight,
        box: (r => [Math.round(r.width), Math.round(r.height)])(i.getBoundingClientRect())}))""")

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 800})
    page = ctx.new_page()
    reqs, bad = [], []
    page.on('response', lambda r: reqs.append((r.request.resource_type, r.status, r.url)))
    page.on('requestfailed', lambda r: bad.append(r.url) if not ('_rsc=' in r.url and 'ERR_ABORTED' in (r.failure or '')) else None)
    page.on('console', lambda m: print('  console.' + m.type, m.text[:160]) if m.type in ('error', 'warning') else None)

    # 1 ── home, desktop
    go(page, BASE + '/')
    im = imgs(page)
    header_logo = next((i for i in im if 'logo-mark' in i['src']), None)
    hero_logo = next((i for i in im if 'logo-lockup-dark' in i['src']), None)
    check('header logo loaded', bool(header_logo and header_logo['complete'] and header_logo['w'] > 0), json.dumps(header_logo))
    check('hero logo loaded', bool(hero_logo and hero_logo['complete'] and hero_logo['w'] > 0), json.dumps(hero_logo))
    broken = [i for i in im if not (i['complete'] and i['w'] > 0)]
    check('no broken <img> on home', not broken, str(broken)[:200])
    check('no /_next/image requests', not any('/_next/image' in u for _, _, u in reqs))
    check('brand images served 200 from /_next/static/media',
          all(s == 200 for t, s, u in reqs if t == 'image' and 'logo-' in u) and any('logo-' in u for t, s, u in reqs if t == 'image'))
    check('no failed requests', not bad, str(bad)[:200])
    page.screenshot(path=f'{SHOTS}/home-desktop.png')

    # 2 ── responsive: no horizontal overflow, logos intact
    for w, h in [(390, 844), (768, 1024), (1440, 900)]:
        page.set_viewport_size({'width': w, 'height': h})
        for path in ['/', '/books', '/authors', '/publish', '/contact', '/about', '/faq', '/services', '/admin/login']:
            go(page, BASE + path)
            sw = page.evaluate('document.documentElement.scrollWidth'); iw = page.evaluate('window.innerWidth')
            broken = [i['src'][-40:] for i in imgs(page) if not (i['complete'] and i['w'] > 0)]
            check(f'{w}px {path}: no overflow, no broken images', sw <= iw and not broken, f'scrollWidth={sw} innerWidth={iw} broken={broken}')
        if w == 390:
            go(page, BASE + '/'); page.screenshot(path=f'{SHOTS}/home-mobile.png')

    # 3 ── admin login through the UI (same-origin proxy + cookie) -> sidebar logo
    page.set_viewport_size({'width': 1280, 'height': 800})
    go(page, BASE + '/admin/login')
    page.screenshot(path=f'{SHOTS}/admin-login.png')
    page.fill('#email', 'admin@example.com'); page.fill('#password', 'correct-horse-battery')
    page.click('button[type=submit]')
    page.wait_for_url('**/admin/dashboard**', timeout=15000)
    try: page.wait_for_selector('text=Loading', state='detached', timeout=15000); loaded = True
    except Exception: loaded = False
    check('dashboard stats finish loading (no stuck "Loading…")', loaded)
    page.wait_for_selector('aside img, nav img, img[src*="logo-mark"]', timeout=10000)
    side = [i for i in imgs(page) if 'logo-mark' in i['src']]
    check('admin login redirects to dashboard', '/admin/dashboard' in page.url, page.url)
    check('admin sidebar logo loaded', bool(side and side[0]['w'] > 0), json.dumps(side))
    page.screenshot(path=f'{SHOTS}/admin-dashboard.png')

    # 4 ── Cloudinary loader at render time: create a book with a Cloudinary cover via the API
    api = ctx.request
    authors = api.get(BASE + '/api/authors').json()['data']
    cover = 'https://res.cloudinary.com/demo/image/upload/v1700000000/book-publication/covers/sample.jpg'
    r = api.post(BASE + '/api/books', data={
        'title': 'Loader Check Book', 'authors': [authors[0]['_id']], 'description': 'Checks the Cloudinary loader.',
        'isbn': '9781234567897', 'category': 'Fiction', 'format': 'Paperback', 'price': 199,
        'coverImageUrl': cover, 'status': 'published'})
    check('created a book with a Cloudinary cover (admin API via proxy)', r.status in (200, 201), f'{r.status} {r.text()[:120]}')
    slug = r.json()['data']['slug']
    html = api.get(BASE + f'/books/{slug}').text()
    tags = re.findall(r'<img[^>]*cloudinary[^>]*>', html)
    check('book page renders the cover through the Cloudinary loader',
          bool(tags) and 'f_auto,q_auto,c_limit,w_' in tags[0] and '/_next/image' not in html, (tags[0][:230] if tags else 'no cloudinary <img> found'))
    page.route('https://res.cloudinary.com/**', lambda route: route.fulfill(status=200, content_type='image/png', body=PNG))
    go(page, BASE + f'/books/{slug}')
    cov = [i for i in imgs(page) if 'res.cloudinary.com' in i['src']]
    check('browser fetched a width-specific Cloudinary URL and decoded it',
          bool(cov) and re.search(r'/f_auto,q_auto,c_limit,w_\d+/v1700000000/', cov[0]['src']) is not None and cov[0]['w'] > 0, json.dumps(cov[:1]))
    b.close()

print(f'\n{len(results) - len(failures)}/{len(results)} checks passed')
sys.exit(1 if failures else 0)
