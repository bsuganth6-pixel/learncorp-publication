"""Browser check: sitemap/robots/icons, hostile query strings, all five admin lists, and admin pagination.

Creates 14 authors in the API it talks to, so use a freshly started API each run.
"""
import os, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

SHOTS = os.environ.get('SHOTS_DIR', str(Path(__file__).resolve().parent / '.shots'))
Path(SHOTS).mkdir(parents=True, exist_ok=True)
BASE = os.environ.get('BASE_URL', 'http://localhost:3055').rstrip('/')
failures = []
def check(name, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''))
    if not ok: failures.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1280, 'height': 800})
    page = ctx.new_page()
    page.on('dialog', lambda d: d.accept())
    api = ctx.request

    # ---- SEO files
    urls = re.findall(r'<loc>([^<]+)</loc>', api.get(BASE + '/sitemap.xml').text())
    check('sitemap lists static pages, books and authors', len(urls) >= 18 and any('/books/' in u for u in urls) and any('/authors/' in u for u in urls), f'{len(urls)} urls')
    check('sitemap uses the configured site URL', all(u.startswith(BASE) for u in urls))
    robots = api.get(BASE + '/robots.txt').text()
    check('robots.txt blocks /admin/ and points at the sitemap', 'Disallow: /admin/' in robots and 'sitemap.xml' in robots)
    og = api.get(BASE + '/opengraph-image.png')
    check('Open Graph image is served', og.status == 200 and 'image/png' in og.headers.get('content-type', ''), f'{og.status} {len(og.body())//1024} KB')
    for path in ['/favicon.ico', '/icon.png', '/apple-icon.png']:
        r = api.get(BASE + path); check(f'{path} is served', r.status == 200, str(r.status))

    # ---- hostile / junk query strings must not produce 5xx
    check('/authors?page=-3 renders instead of the error page', api.get(BASE + '/authors?page=-3').status == 200)
    check('/books?page=abc&year=zzz renders', api.get(BASE + '/books?page=abc&year=zzz&minPrice=-5').status == 200)
    check('API: array search -> 400 (through the proxy)', api.get(BASE + '/api/authors?search[]=a&search[]=b').status == 400)
    check('API: page=-3 -> 400', api.get(BASE + '/api/authors?page=-3').status == 400)
    r = api.get(BASE + '/api/authors', params={'search': '('})
    check('API: regex metacharacters are matched literally -> 200', r.status == 200 and r.json()['data'] == [])

    # ---- admin: login, then the paginated lists
    r = api.post(BASE + '/api/auth/login', data={'email': 'admin@example.com', 'password': 'correct-horse-battery'})
    check('admin login via the proxy', r.status == 200)
    for path, label in [('books', 'Books'), ('authors', 'Authors'), ('manuscripts', 'Manuscripts'), ('messages', 'Messages'), ('testimonials', 'Testimonials')]:
        page.goto(f'{BASE}/admin/dashboard/{path}', wait_until='load')
        try: page.wait_for_selector('text=Loading', state='detached', timeout=10000); ok = True
        except Exception: ok = False
        check(f'admin {label} list loads', ok and page.locator('h1').first.inner_text().strip() == label)

    for i in range(14):
        r = api.post(BASE + '/api/authors', data={'name': f'Zz Pager Author {i:02d}'})
        assert r.status == 201, r.text()
    page.goto(BASE + '/admin/dashboard/authors', wait_until='load')
    page.wait_for_selector('text=Page 1 of 2', timeout=10000)
    dels = lambda: page.locator('button[aria-label^="Delete "]').count()
    check('authors: page 1 shows 12 of 17 with a pager', dels() == 12 and page.get_by_role('button', name='Previous page').is_disabled())
    page.get_by_role('button', name='Next page').click()
    page.wait_for_selector('text=Page 2 of 2', timeout=10000)
    page.wait_for_function("document.querySelectorAll('button[aria-label^=\"Delete \"]').length === 5")
    check('authors: page 2 shows the remaining 5', dels() == 5 and page.get_by_role('button', name='Next page').is_disabled())
    for n in range(5):                                         # empty page 2 by deleting its items
        before = dels()
        page.locator('button[aria-label^="Delete "]').first.click()
        if n < 4: page.wait_for_function(f"document.querySelectorAll('button[aria-label^=\"Delete \"]').length === {before - 1}", timeout=10000)
    page.wait_for_selector('nav[aria-label="Pagination"]', state='detached', timeout=10000)
    page.wait_for_function("document.querySelectorAll('button[aria-label^=\"Delete \"]').length === 12", timeout=10000)
    check('authors: deleting the last item on page 2 steps back to a full page 1 (pager gone)', dels() == 12 and page.locator('nav[aria-label="Pagination"]').count() == 0)
    page.screenshot(path=f'{SHOTS}/admin-authors.png')
    b.close()

print(f"\n{'FAILED: ' + ', '.join(failures) if failures else 'all admin/SEO checks passed'}")
sys.exit(1 if failures else 0)
