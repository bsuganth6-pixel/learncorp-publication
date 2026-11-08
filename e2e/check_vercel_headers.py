"""Browser check: the response headers in frontend/vercel.json do not break the site.

Vercel applies those headers at its edge, which a local `next start` does not do, so this script adds the REAL
headers from frontend/vercel.json to every response in Chromium (via request interception) and then walks guest,
author and admin screens and the main forms, failing on any Content-Security-Policy violation, any page error,
or a form/search that stops working.

Needs the same stack as check_auth_flows.py (API via `npm run dev:e2e`, production frontend).
"""
import json, os, sys, time
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('BASE_URL', 'http://localhost:3055').rstrip('/')
API = os.environ.get('API_URL', 'http://localhost:5055').rstrip('/')
H = {'X-Requested-With': 'LearnCorp'}
PW = 'Sturdy-Pass-1234'
EMAIL = f'hdr.{int(time.time())}@example.com'

config = json.loads((ROOT / 'frontend' / 'vercel.json').read_text())
rule = next(r for r in config['headers'] if r['source'] == '/(.*)')
VERCEL_HEADERS = {h['key']: h['value'] for h in rule['headers']}

results, failures = [], []
def check(name, ok, detail=''):
    results.append((name, ok, detail))
    if not ok: failures.append(name)
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''), flush=True)

problems = []   # CSP violations / page errors, tagged with the page they happened on
def watch(page):
    page.on('console', lambda m: problems.append((page.url, m.text[:200])) if m.type == 'error' and ('Content Security Policy' in m.text or 'Refused to' in m.text) else None)
    page.on('pageerror', lambda e: problems.append((page.url, 'pageerror: ' + str(e)[:160])))
    page.add_init_script("document.addEventListener('securitypolicyviolation', e => console.error('Content Security Policy violation: ' + e.violatedDirective + ' ' + e.blockedURI))")

def add_vercel_headers(route):
    # Vercel adds these to responses from the site itself; third-party requests (map, CDN images) go through untouched.
    if not route.request.url.startswith(BASE):
        return route.continue_()
    try:
        response = route.fetch()
    except Exception:
        return route.abort()
    headers = dict(response.headers)
    headers.update({k.lower(): v for k, v in VERCEL_HEADERS.items()})
    route.fulfill(response=response, headers=headers)

def go(page, path):
    page.goto(BASE + path, wait_until='load', timeout=45000)
    try: page.wait_for_load_state('networkidle', timeout=4000)
    except Exception: page.wait_for_timeout(400)

with sync_playwright() as p:
    browser = p.chromium.launch()
    def ctx():
        c = browser.new_context(viewport={'width': 1280, 'height': 800}); c.set_default_timeout(15000)
        c.route('**/*', add_vercel_headers); return c

    guest = ctx(); page = guest.new_page(); watch(page)

    # sanity: the headers really are on the documents the browser receives
    seen = {}
    page.on('response', lambda r: seen.update({k.lower(): v for k, v in r.headers.items()}) if r.request.resource_type == 'document' and r.url == BASE + '/' else None)
    go(page, '/')
    check('the headers from vercel.json are applied to the documents under test', seen.get('x-frame-options') == 'DENY' and "frame-ancestors 'none'" in seen.get('content-security-policy', ''), str({k: seen.get(k) for k in ('x-frame-options', 'x-content-type-options')}))

    slug = json.loads(urlopen(f'{API}/api/books?limit=1', timeout=10).read())['data'][0]['slug']
    for path in ['/', '/books', f'/books/{slug}', '/authors', '/services', '/about', '/faq', '/contact', '/publish', '/login', '/register', '/forgot-password']:
        go(page, path)
    check('public and sign-in pages render with the headers and raise no CSP violation or page error', not problems, '; '.join(f'{u.replace(BASE, "")}: {m}' for u, m in problems[:3]))
    # The contact page's map (site-config `mapEmbedUrl`) is empty by default, so prove the headers would not block one:
    # add a map iframe to a page and make sure the browser raises no CSP violation for it. (Whether the map itself loads
    # depends on internet access; only the policy is being tested here.)
    before = len(problems)
    go(page, '/contact')
    page.evaluate("() => { for (const src of ['https://www.openstreetmap.org/export/embed.html?bbox=0,0,1,1', 'https://www.google.com/maps/embed?pb=x']) { const f = document.createElement('iframe'); f.src = src; document.body.appendChild(f); } }")
    page.wait_for_timeout(1500)
    check('a third-party map iframe on the contact page is not blocked by the headers', len(problems) == before, '; '.join(m for _, m in problems[before:before + 2]))

    # forms and navigation that CSP form-action / base-uri could in principle affect
    go(page, '/books')
    search = page.get_by_role('searchbox').first if page.get_by_role('searchbox').count() else page.locator('input[type="search"], input[name="q"]').first
    if search.count():
        search.fill('river'); search.press('Enter'); page.wait_for_timeout(800)
        check('the catalogue search (a GET form) still works', 'q=river' in page.url or 'river' in page.url, page.url)
    else:
        print('SKIP search form (no search input found)')

    go(page, '/register')
    page.get_by_label('Full name').fill('Header Check'); page.get_by_label('Email address').fill(EMAIL)
    page.get_by_label('Password', exact=True).fill(PW); page.get_by_label('Confirm password').fill(PW)
    page.get_by_label('I agree to the terms').check(); page.get_by_role('button', name='Create author account').click()
    page.wait_for_url('**/author/dashboard**')
    check('registering through the UI works under the headers', '/author/dashboard' in page.url)
    for path in ['/author/dashboard', '/author/submissions', '/author/notifications', '/account', '/publish']:
        go(page, path)
    check('author screens raise no CSP violation or page error', not problems, '; '.join(f'{u.replace(BASE, "")}: {m}' for u, m in problems[:3]))
    page.get_by_role('button', name='Account menu for Header Check').click()
    page.locator('#account-menu').get_by_role('button', name='Sign out').click()
    page.wait_for_url(BASE + '/'); page.get_by_role('link', name='Log in').first.wait_for()
    check('signing out works under the headers', True)

    admin = ctx(); ap = admin.new_page(); watch(ap)
    go(ap, '/admin/login')
    ap.locator('#email').fill('admin@example.com'); ap.locator('#password').fill('correct-horse-battery'); ap.get_by_role('button', name='Sign in').click()
    ap.wait_for_url('**/admin/dashboard**')
    for path in ['/admin/dashboard', '/admin/dashboard/manuscripts', '/admin/dashboard/users', '/admin/dashboard/activity', '/admin/dashboard/books']:
        go(ap, path)
    check('admin sign-in and screens work under the headers with no CSP violation or page error', '/admin/dashboard' in ap.url and not problems, '; '.join(f'{u.replace(BASE, "")}: {m}' for u, m in problems[:3]))
    browser.close()

print(f'\n{len(results) - len(failures)}/{len(results)} checks passed')
if failures: print('FAILED:', *failures, sep='\n  - ')
sys.exit(1 if failures else 0)
