"""Browser check: the new screens at phone / tablet / desktop widths — no horizontal overflow — and axe-core.

Sets up its own accounts through the API (fast), then sweeps guest, author and admin screens.
Needs the same stack as check_auth_flows.py (API via `npm run dev:e2e`, production frontend).

PHASES (comma-separated, default all) splits the work into runs that each finish in a few minutes:
  overflow | menu | axe-1280 | axe-390
"""
import io, json, os, re, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AXE = ROOT / 'frontend' / 'node_modules' / 'axe-core' / 'axe.min.js'
BASE = os.environ.get('BASE_URL', 'http://localhost:3055').rstrip('/')
API = os.environ.get('API_URL', 'http://localhost:5055').rstrip('/')
SHOTS = os.environ.get('SHOTS_DIR', str(ROOT / 'e2e' / '.shots')); Path(SHOTS).mkdir(parents=True, exist_ok=True)
PHASES = os.environ.get('PHASES', 'overflow,menu,axe-1280,axe-390').split(',')
H = {'X-Requested-With': 'LearnCorp'}
PW = 'Sturdy-Pass-1234'
STAMP = str(int(time.time()))
EMAIL = f'sweep.{STAMP}@example.com'
PDF = b'%PDF-1.4\n' + b' ' * 4096

results, failures = [], []
def check(name, ok, detail=''):
    results.append((name, ok, detail))
    if not ok: failures.append(name)
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''), flush=True)

def settle(page):
    try: page.wait_for_load_state('networkidle', timeout=4000)
    except Exception: page.wait_for_timeout(500)

def go(page, path):
    page.goto(BASE + path, wait_until='load', timeout=45000); settle(page)

def overflow(page):
    return page.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')

def axe(page, label):
    page.add_script_tag(path=str(AXE))
    v = page.evaluate('() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a","wcag2aa","wcag21a","wcag21aa"] } })')['violations']
    check(f'axe: {label}', not v, '; '.join(f"{x['id']} {json.dumps(x['nodes'][0]['target'])[:80]}" for x in v))

with sync_playwright() as p:
    browser = p.chromium.launch()
    def ctx(w=1440, h=900):
        c = browser.new_context(viewport={'width': w, 'height': h}); c.set_default_timeout(15000); return c

    # ---- accounts and data, through the API
    author = ctx(); a = author.request
    assert a.post(f'{BASE}/api/auth/register', data={'name': 'Sweep Author', 'email': EMAIL, 'password': PW, 'confirmPassword': PW, 'acceptTerms': True}, headers=H).status == 201
    token = None
    for _ in range(20):
        mails = json.loads(urllib.request.urlopen(f'{API}/__dev/outbox?to={urllib.request.quote(EMAIL)}').read())
        m = re.search(r'token=([\w-]+)', mails[-1]['text']) if mails else None
        if m: token = m.group(1); break
        time.sleep(0.3)
    assert a.post(f'{BASE}/api/auth/verify-email', data={'token': token}, headers=H).status == 200
    sub = a.post(f'{BASE}/api/manuscripts', headers=H, multipart={
        'phone': '9876543210', 'bookTitle': 'A Rather Long Book Title That Should Wrap Nicely On Narrow Screens', 'category': 'Fiction', 'language': 'English', 'pageCount': '',
        'description': 'A description long enough to pass validation and wrap over several lines on a phone.', 'authorBio': 'A short author biography that is long enough.',
        'format': 'Paperback', 'previousExperience': '', 'additionalInfo': '', 'agreedToTerms': 'true',
        'manuscript': {'name': 'a.pdf', 'mimeType': 'application/pdf', 'buffer': PDF}})
    assert sub.status == 201, sub.text()
    SUB = sub.json()['data']['id']
    admin = ctx(); assert admin.request.post(f'{BASE}/api/auth/admin/login', data={'email': 'admin@example.com', 'password': 'correct-horse-battery'}, headers=H).status == 200
    guest = ctx()

    pages = {
        'guest': (guest, ['/', '/books', '/publish', '/login', '/register', '/forgot-password', '/reset-password?token=x', '/verify-email', '/admin/login']),
        'author': (author, ['/author/dashboard', '/author/submissions', f'/author/submissions/{SUB}', '/author/notifications', '/account', '/publish']),
        'admin': (admin, ['/admin/dashboard', '/admin/dashboard/manuscripts', f'/admin/dashboard/manuscripts/{SUB}', '/admin/dashboard/users', '/admin/dashboard/activity']),
    }

    # ---- no horizontal overflow at phone / tablet / desktop
    bad = []
    for w, h in ([(390, 844), (768, 1024), (1440, 900)] if 'overflow' in PHASES else []):
        for who, (c, paths) in pages.items():
            pg = c.new_page(); pg.set_viewport_size({'width': w, 'height': h})
            for path in paths:
                go(pg, path)
                o = overflow(pg)
                if o > 1: bad.append(f'{w}px {who} {path} +{o}')
            if who == 'author': go(pg, '/author/dashboard'); pg.screenshot(path=f'{SHOTS}/author-dashboard-{w}.png')
            if who == 'guest': go(pg, '/login'); pg.screenshot(path=f'{SHOTS}/login-{w}.png')
            pg.close()
    if 'overflow' in PHASES:
        check('no horizontal overflow on any screen at 390 / 768 / 1440 px', not bad, '; '.join(bad[:8]))

    # ---- the signed-in mobile menu
    if 'menu' in PHASES:
        pg = author.new_page(); pg.set_viewport_size({'width': 390, 'height': 844}); go(pg, '/author/dashboard')
        pg.get_by_role('button', name='Open menu').click()
        mm = pg.locator('#mobile-menu')
        check('the signed-in mobile menu shows the account block, the author links and Sign out',
              mm.get_by_text('Sweep Author').is_visible() and mm.get_by_role('link', name='My submissions').is_visible() and mm.get_by_role('button', name='Sign out').is_visible())
        check('the mobile menu fits the screen (scrolls inside itself, not the page)', overflow(pg) <= 1 and pg.evaluate('() => document.body.style.overflow') == 'hidden')
        pg.keyboard.press('Escape')
        check('Escape closes it and puts keyboard focus back on the menu button', pg.locator('#mobile-menu').count() == 0 and pg.evaluate('() => document.activeElement && document.activeElement.getAttribute("aria-label")') == 'Open menu')
        go(pg, '/author/dashboard'); pg.screenshot(path=f'{SHOTS}/auth-mobile-menu-author.png'); pg.close()

    # ---- accessibility (axe-core automated rules: WCAG 2.0/2.1 A + AA)
    if AXE.exists():
        for w, h in [(1280, 800), (390, 844)]:
            if f'axe-{w}' not in PHASES: continue
            for who, (c, paths) in pages.items():
                pg = c.new_page(); pg.set_viewport_size({'width': w, 'height': h})
                for path in paths:
                    go(pg, path); axe(pg, f'{w}px {who} {path.split("?")[0]}')
                pg.close()
    else:
        print('SKIP axe (frontend/node_modules/axe-core not found)')
    browser.close()

print(f'\n{len(results) - len(failures)}/{len(results)} checks passed')
if failures: print('FAILED:', *failures, sep='\n  - ')
sys.exit(1 if failures else 0)
