"""Browser check: the whole account journey in real Chromium, against the real API on a real database.

Guest -> register -> confirm email -> submit a manuscript -> admin review (changes requested) -> author
resubmits -> admin accepts and publishes -> author sees the book live; plus ownership, role separation, the
account page (profile, password, sessions), password recovery, sign-out and suspension.
Responsive overflow and axe-core run in check_auth_layout_a11y.py.

Needs the API started with `npm run dev:e2e` (it captures outgoing email at /__dev/outbox) and the production
frontend, exactly as described in e2e/README.md. Creates data: restart the API before running it again.
"""
import io, json, os, re, sys, time, urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
AXE = ROOT / 'frontend' / 'node_modules' / 'axe-core' / 'axe.min.js'
BASE = os.environ.get('BASE_URL', 'http://localhost:3055').rstrip('/')
API = os.environ.get('API_URL', 'http://localhost:5055').rstrip('/')
SHOTS = os.environ.get('SHOTS_DIR', str(ROOT / 'e2e' / '.shots'))
Path(SHOTS).mkdir(parents=True, exist_ok=True)

_b = io.BytesIO(); Image.new('RGB', (60, 90), (20, 27, 46)).save(_b, 'PNG'); PNG = _b.getvalue()
PDF = b'%PDF-1.4\n' + b' ' * 4096
PASSWORD = 'Sturdy-Pass-1234'
NEW_PASSWORD = 'Another-Pass-5678'
STAMP = str(int(time.time()))
AUTHOR_EMAIL = f'asha.{STAMP}@example.com'
OTHER_EMAIL = f'rohan.{STAMP}@example.com'
BOOK_TITLE = f'The River Between {STAMP}'
ADMIN = ('admin@example.com', 'correct-horse-battery')

results, failures = [], []
def check(name, ok, detail=''):
    results.append((name, ok, detail))
    if not ok: failures.append(name)
    print(('PASS ' if ok else 'FAIL ') + name + (f'  [{detail}]' if detail else ''), flush=True)

def outbox(to):
    with urllib.request.urlopen(f'{API}/__dev/outbox?to={urllib.request.quote(to)}', timeout=10) as r:
        return json.loads(r.read())

def token_in_latest_mail(to, subject_part):
    for _ in range(20):                       # the API sends some mail after it has already answered
        mails = [m for m in outbox(to) if subject_part.lower() in m['subject'].lower()]
        if mails:
            m = re.search(r'token=([A-Za-z0-9_-]+)', mails[-1]['text'])
            if m: return m.group(1)
        time.sleep(0.3)
    return None

def go(page, path, wait=True):
    page.goto(BASE + path, wait_until='load', timeout=45000)
    if wait:
        try: page.wait_for_load_state('networkidle', timeout=8000)
        except Exception: page.wait_for_timeout(400)

def overflow(page):
    return page.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')

def header_text(page):
    return page.locator('header').inner_text()

def sign_in_author(page, email, password, next_path=None):
    go(page, '/login' + (f'?next={next_path}' if next_path else ''))
    page.get_by_label('Email address').fill(email)
    page.get_by_label('Password', exact=True).fill(password)
    page.get_by_role('button', name='Sign in').click()

def run_axe(page, label, violations_out):
    page.add_script_tag(path=str(AXE))
    res = page.evaluate('() => axe.run(document, { runOnly: { type: "tag", values: ["wcag2a","wcag2aa","wcag21a","wcag21aa"] } })')
    v = res['violations']
    check(f'axe: {label}', not v, '; '.join(f"{x['id']} {json.dumps(x['nodes'][0]['target'])[:70]}" for x in v))

with sync_playwright() as p:
    browser = p.chromium.launch()
    def new_ctx(w=1440, h=900):
        c = browser.new_context(viewport={'width': w, 'height': h}); c.set_default_timeout(15000); return c

    console_errors = []
    guest_ctx = new_ctx(); page = guest_ctx.new_page()
    page.on('console', lambda m: console_errors.append(m.text[:200]) if m.type == 'error' else None)
    page.on('pageerror', lambda e: console_errors.append(str(e)[:200]))

    # ------------------------------------------------------------------ 1. guest navigation and guards
    go(page, '/')
    head = header_text(page)
    check('guest header offers Log in and Register', 'Log in' in head and 'Register' in head, head.replace('\n', ' | ')[:120])
    check('guest header has no account menu', page.get_by_role('button', name=re.compile('Account menu')).count() == 0)
    page.set_viewport_size({'width': 390, 'height': 844})
    page.get_by_role('button', name='Open menu').click()
    menu = page.locator('#mobile-menu')
    check('mobile menu shows Log in / Register first', menu.get_by_role('link', name='Log in').is_visible() and menu.get_by_role('link', name='Register').is_visible())
    check('mobile menu locks page scroll', page.evaluate('() => document.body.style.overflow') == 'hidden')
    page.screenshot(path=f'{SHOTS}/auth-mobile-menu-guest.png')
    page.keyboard.press('Escape')
    check('Escape closes the mobile menu', page.locator('#mobile-menu').count() == 0)
    page.set_viewport_size({'width': 1440, 'height': 900})

    for path, login in [('/author/dashboard', '/login'), ('/account', '/login'), ('/admin/dashboard', '/admin/login'), ('/author/submissions', '/login')]:
        go(page, path)
        check(f'guest to {path} is sent to {login} with a way back', page.url.startswith(BASE + login) and 'next=' in page.url, page.url)
    go(page, '/publish')
    check('guest sees the account prompt, not the form', page.get_by_text('Create an author account').first.is_visible() and page.locator('#bookTitle').count() == 0)

    # ------------------------------------------------------------------ 2. registration
    go(page, '/register')
    page.screenshot(path=f'{SHOTS}/auth-register-desktop.png')
    page.get_by_label('Password', exact=True).fill('abc')
    check('weak password shows "Too weak" and unmet rules', page.get_by_text('Too weak').is_visible() and page.get_by_text('(not met yet)').count() >= 1)
    page.get_by_role('button', name='Show password').first.click()
    check('password visibility toggle works', page.get_by_label('Password', exact=True).get_attribute('type') == 'text')
    page.get_by_label('Full name').fill('Asha Verma')
    page.get_by_label('Email address').fill(AUTHOR_EMAIL)
    page.get_by_label('Confirm password').fill('different')
    page.get_by_role('button', name='Create author account').click()
    body = page.locator('#main-content').inner_text()
    check('invalid registration is explained next to the fields', 'doesn’t meet the rules' in body and 'Passwords do not match' in body and 'accept the terms' in body, body[:100].replace('\n', ' '))
    page.get_by_label('Password', exact=True).fill(PASSWORD)
    page.get_by_label('Confirm password').fill(PASSWORD)
    check('strong password reaches "Good" or better', any(page.get_by_text(t).count() for t in ('Good', 'Strong')))
    page.get_by_label('I agree to the terms').check()
    page.get_by_role('button', name='Create author account').click()
    page.wait_for_url('**/author/dashboard**')
    page.get_by_text('Confirm your email to submit manuscripts').first.wait_for()
    check('registration lands on the dashboard with the confirm-email banner', 'welcome=1' in page.url and page.get_by_text('Confirm your email to submit manuscripts').first.is_visible())
    check('header now shows the account menu instead of Log in', page.get_by_role('button', name=re.compile('Account menu for Asha Verma')).is_visible() and 'Log in' not in header_text(page))
    check('"New submission" is disabled until the email is confirmed', page.locator('[aria-disabled="true"]', has_text='New submission').count() == 1)
    cookies = {c['name']: c for c in guest_ctx.cookies()}
    check('session cookie is HttpOnly + SameSite=Lax, hint cookie is readable', cookies['bp_session']['httpOnly'] and cookies['bp_session']['sameSite'] == 'Lax' and not cookies['bp_auth']['httpOnly'])
    check('script cannot read the session cookie', 'bp_session' not in page.evaluate('() => document.cookie') and 'bp_auth' in page.evaluate('() => document.cookie'))
    page.screenshot(path=f'{SHOTS}/author-dashboard-unverified.png')

    other = new_ctx().new_page()
    go(other, '/register')
    other.get_by_label('Full name').fill('Someone Else'); other.get_by_label('Email address').fill(AUTHOR_EMAIL.upper())
    other.get_by_label('Password', exact=True).fill(PASSWORD); other.get_by_label('Confirm password').fill(PASSWORD)
    other.get_by_label('I agree to the terms').check(); other.get_by_role('button', name='Create author account').click()
    other.get_by_text('already exists').first.wait_for()
    check('a duplicate email is refused, with a way to sign in or reset', other.get_by_role('link', name='Sign in').count() >= 1 and other.get_by_role('link', name='reset your password').count() == 1)
    other.context.close()

    # ------------------------------------------------------------------ 3. email confirmation
    token = token_in_latest_mail(AUTHOR_EMAIL, 'confirm your email')
    check('a confirmation email with a link was sent', bool(token))
    go(page, f'/verify-email?token={token}')
    page.get_by_text('Email confirmed').first.wait_for()
    check('the link confirms the address', page.get_by_text('Email confirmed').first.is_visible())
    go(page, f'/verify-email?token={token}')
    page.get_by_text('This link can’t be used').first.wait_for()
    check('the link cannot be used twice', page.get_by_text('This link can’t be used').first.is_visible())
    go(page, '/author/dashboard')
    check('after confirming, the banner is gone and submissions are enabled', page.get_by_text('Confirm your email to submit manuscripts').count() == 0 and page.get_by_role('link', name='New submission').is_visible())

    # ------------------------------------------------------------------ 4. submit a manuscript
    go(page, '/publish')
    check('the submission form is shown, with identity taken from the account', page.locator('#bookTitle').is_visible() and page.get_by_text('Submitting as').is_visible() and page.locator('#authorName').count() == 0)
    page.screenshot(path=f'{SHOTS}/publish-form-author.png', full_page=True)
    page.locator('#phone').fill('9876543210')
    page.locator('#authorBio').fill('Asha writes about rivers and the people who live beside them.')
    page.locator('#bookTitle').fill(BOOK_TITLE)
    page.locator('#category').select_option(index=1)
    page.locator('#format').select_option(index=1)
    page.locator('#description').fill('A long-form novel about two sisters and the river that divided their village.')
    page.get_by_role('button', name='Submit Manuscript').click()
    check('submitting without a file or terms is blocked with messages', page.get_by_text('Please attach your manuscript').is_visible() and page.get_by_text('accept the terms').first.is_visible())
    page.locator('#manuscript-file').set_input_files({'name': 'novel.pdf', 'mimeType': 'application/pdf', 'buffer': PDF})
    page.locator('#cover-file').set_input_files({'name': 'cover.png', 'mimeType': 'image/png', 'buffer': PNG})
    page.get_by_label('I agree to the terms').check()
    page.get_by_role('button', name='Submit Manuscript').click()
    page.get_by_text('Manuscript received').first.wait_for()
    check('the manuscript is accepted and the author can track it', page.get_by_role('link', name='Track this submission').is_visible())
    page.get_by_role('link', name='Track this submission').click()
    page.wait_for_url('**/author/submissions/**')
    page.get_by_role('heading', name=BOOK_TITLE).wait_for()
    SUB_URL = page.url
    SUB_ID = SUB_URL.rsplit('/', 1)[1]
    check('the submission page shows status and timeline', page.get_by_text('Submitted', exact=True).first.is_visible() and page.get_by_role('heading', name='Progress').is_visible())
    check('private files are offered as on-demand downloads, never as links', page.get_by_role('button', name='Manuscript').is_visible() and 'storage.invalid' not in page.content())
    page.screenshot(path=f'{SHOTS}/author-submission-detail.png', full_page=True)
    go(page, '/author/notifications')
    check('a "received" notification was created', page.get_by_text('Manuscript received').first.is_visible())

    # ------------------------------------------------------------------ 5. another author cannot reach it
    rohan_ctx = new_ctx(); rohan = rohan_ctx.new_page()
    go(rohan, '/register')
    rohan.get_by_label('Full name').fill('Rohan Das'); rohan.get_by_label('Email address').fill(OTHER_EMAIL)
    rohan.get_by_label('Password', exact=True).fill(PASSWORD); rohan.get_by_label('Confirm password').fill(PASSWORD)
    rohan.get_by_label('I agree to the terms').check(); rohan.get_by_role('button', name='Create author account').click()
    rohan.wait_for_url('**/author/dashboard**')
    go(rohan, f'/author/submissions/{SUB_ID}')
    rohan.get_by_text('Submission not found').first.wait_for()
    check("another author opening this submission's URL gets 'not found'", rohan.get_by_text('Submission not found').first.is_visible() and BOOK_TITLE not in rohan.content())
    r = rohan_ctx.request.get(f'{BASE}/api/manuscripts/mine/{SUB_ID}')
    check('...and the API says 404 too, not 403', r.status == 404, str(r.status))
    r = rohan_ctx.request.patch(f'{BASE}/api/manuscripts/{SUB_ID}/status', data={'status': 'Accepted'}, headers={'X-Requested-With': 'LearnCorp'})
    check('an author cannot approve anything through the API', r.status == 403, str(r.status))
    go(rohan, '/admin/dashboard')
    check('an author opening the admin dashboard is sent back to their own', '/author/dashboard' in rohan.url, rohan.url)
    r = rohan_ctx.request.post(f'{BASE}/api/auth/logout', data={})
    check('a write without the CSRF header is refused even with a valid session', r.status == 403, str(r.status))
    rohan_ctx.close()

    # ------------------------------------------------------------------ 6. administrator side
    admin_ctx = new_ctx(); admin = admin_ctx.new_page()
    go(admin, '/admin/login')
    admin.locator('#email').fill(AUTHOR_EMAIL); admin.locator('#password').fill(PASSWORD)
    admin.get_by_role('button', name='Sign in').click()
    admin.get_by_text('Incorrect email or password').wait_for()
    check('author credentials do not open the admin dashboard', '/admin/login' in admin.url)
    admin.locator('#email').fill(ADMIN[0]); admin.locator('#password').fill(ADMIN[1])
    admin.get_by_role('button', name='Sign in').click()
    admin.wait_for_url('**/admin/dashboard**')
    admin.get_by_text('Registered Authors').wait_for()
    check('administrator signs in to the dashboard', admin.get_by_text('Registered Authors').is_visible())
    cookies = {c['name']: c for c in admin_ctx.cookies()}
    check('admin session cookie is SameSite=Strict', cookies['bp_session']['sameSite'] == 'Strict')
    go(admin, '/author/dashboard')
    check('an administrator opening the author area is sent to the admin dashboard', '/admin/dashboard' in admin.url, admin.url)
    admin.screenshot(path=f'{SHOTS}/admin-overview.png')

    go(admin, '/admin/dashboard/manuscripts')
    admin.get_by_text(BOOK_TITLE).first.wait_for()
    check('the submission appears in the admin list', admin.get_by_text(BOOK_TITLE).first.is_visible())
    go(admin, f'/admin/dashboard/manuscripts/{SUB_ID}')
    admin.get_by_role('heading', name='Editorial decision').wait_for()
    admin.get_by_role('button', name='Request changes').click()
    admin.get_by_role('button', name='Send request').click()
    check('a decision that needs an explanation will not go without one', admin.get_by_text('Write at least 10 characters').is_visible())
    admin.locator('#decision-note').fill('Please tighten chapters 3 and 4 and add a one-page synopsis.')
    admin.get_by_role('button', name='Send request').click()
    admin.get_by_text('Waiting for the author to resubmit').wait_for()   # appears only once the page has reloaded the new state
    check('changes requested: status and history updated', admin.get_by_text('Changes Requested', exact=True).first.is_visible() and admin.get_by_text('tighten chapters 3 and 4').first.is_visible(), admin.locator('#main-content, body').first.inner_text()[:160].replace('\n', ' '))
    admin.screenshot(path=f'{SHOTS}/admin-manuscript-review.png', full_page=True)

    # ------------------------------------------------------------------ 7. author reads the feedback and resubmits
    go(page, '/author/dashboard')
    page.get_by_role('heading', name='Needs your attention').wait_for()
    check('the dashboard flags the submission that needs the author', page.get_by_text('tighten chapters 3 and 4').first.is_visible())
    bell = page.get_by_role('button', name=re.compile('Account menu'))
    check('the account menu shows there are unread notifications', 'unread notification' in (bell.get_attribute('aria-label') or ''), bell.get_attribute('aria-label') or '')
    page.get_by_role('link', name='Update & resubmit').click()
    page.get_by_role('heading', name='Note from the editors').wait_for()
    check('the editors’ note is shown on the submission', page.get_by_text('tighten chapters 3 and 4').first.is_visible() and page.get_by_text('Editorial team').first.is_visible())
    page.locator('#note').fill('Rewrote chapters 3 and 4 and added a synopsis.')
    page.locator('#manuscript-file').set_input_files({'name': 'novel-v2.pdf', 'mimeType': 'application/pdf', 'buffer': PDF})
    page.get_by_role('button', name='Send back to the editors').click()
    page.get_by_text('Your changes were sent back to the editors').first.wait_for()
    facts = page.locator('dl').first.inner_text().replace('\n', ' ')
    check('resubmitting returns it to the editors as version 2', page.get_by_text('Submitted', exact=True).first.is_visible() and re.search(r'Version\s+2', facts, re.I) is not None, facts)

    # ------------------------------------------------------------------ 8. admin accepts and publishes
    go(admin, f'/admin/dashboard/manuscripts/{SUB_ID}')
    admin.get_by_text('Resubmitted').first.wait_for()
    admin.get_by_role('button', name='Accept', exact=True).click()
    admin.get_by_role('button', name='Accept manuscript').click()
    admin.get_by_role('heading', name='Publish to the catalogue').wait_for()
    admin.get_by_role('button', name='Publish book').click()
    check('publishing needs an ISBN and a price', admin.get_by_text('Enter the ISBN').is_visible() and admin.get_by_text('Enter a price').is_visible())
    admin.locator('#pub-isbn').fill(f'978{STAMP[-9:]}0'); admin.locator('#pub-price').fill('349')
    admin.get_by_role('button', name='Publish book').click()
    admin.get_by_text('This manuscript is live in the catalogue').wait_for()
    check('the book is published, with a link to it', admin.get_by_role('link', name='View the book').is_visible())
    cat = json.loads(urllib.request.urlopen(f'{API}/api/books?limit=50', timeout=10).read())['data']
    book = next((b for b in cat if b['title'] == BOOK_TITLE), None)
    check('it appears in the public catalogue API', book is not None)
    go(page, '/author/notifications')
    check('the author was told it is published', page.get_by_text('Your book is published').first.is_visible())
    go(page, f'/author/submissions/{SUB_ID}')
    page.get_by_role('link', name='View your book in the catalogue').wait_for()
    check('the author’s submission shows Published with a link to the live book', page.get_by_text('Published', exact=True).first.is_visible())
    if book:
        go(page, f"/books/{book['slug']}")
        check('the public book page renders', BOOK_TITLE in page.title() or page.get_by_role('heading', name=BOOK_TITLE).count() > 0)
    go(admin, '/admin/dashboard/activity')
    admin.locator('tbody').get_by_text('Manuscript published').first.wait_for()
    txt = admin.locator('tbody').inner_text()
    check('the activity log recorded the decision and the publication', 'Manuscript decision' in txt and 'Manuscript published' in txt and 'Admin sign-in' in txt)
    admin.screenshot(path=f'{SHOTS}/admin-activity.png', full_page=True)

    # ------------------------------------------------------------------ 9. account page: profile, password, sessions
    go(page, '/account')
    page.get_by_label('Full name').fill('Asha V. Verma')
    page.get_by_role('button', name='Save changes').click()
    page.get_by_text('Profile saved.').wait_for()
    check('profile changes are saved and show in the header', page.get_by_role('button', name=re.compile('Account menu for Asha V. Verma')).is_visible())
    page.get_by_label('Current password').fill('Not-My-Pass-1')
    page.get_by_label('New password', exact=True).fill(NEW_PASSWORD); page.get_by_label('Confirm new password').fill(NEW_PASSWORD)
    page.get_by_role('button', name='Change password').click()
    page.get_by_text('Current password is incorrect').wait_for()
    check('a wrong current password is reported on that field and does not sign the user out', page.get_by_text('Current password is incorrect').is_visible() and '/account' in page.url)

    second_ctx = new_ctx(); second = second_ctx.new_page()
    sign_in_author(second, AUTHOR_EMAIL, PASSWORD)
    second.wait_for_url('**/author/dashboard**')
    go(page, '/account')
    page.get_by_text('This device').first.wait_for()
    check('the sessions list shows this device and the other one', page.get_by_text('This device').count() == 1 and page.get_by_role('button', name='End session').count() >= 1, str(page.get_by_role('button', name='End session').count()))
    page.screenshot(path=f'{SHOTS}/account-page.png', full_page=True)
    page.get_by_role('button', name='End session').first.click()
    page.wait_for_timeout(800)
    go(second, '/author/dashboard')
    check('ending a session signs that browser out immediately', '/login' in second.url, second.url)
    second_ctx.close()

    page.get_by_label('Current password').fill(PASSWORD)
    page.get_by_label('New password', exact=True).fill(NEW_PASSWORD); page.get_by_label('Confirm new password').fill(NEW_PASSWORD)
    page.get_by_role('button', name='Change password').click()
    page.get_by_text('Password updated. Your other devices have been signed out.').wait_for()
    check('the password can be changed', page.get_by_text('Password updated. Your other devices have been signed out.').is_visible())

    # ------------------------------------------------------------------ 10. sign out
    page.get_by_role('button', name=re.compile('Account menu')).click()
    page.get_by_role('button', name='Sign out').click()
    page.wait_for_url(BASE + '/')
    page.get_by_role('link', name='Log in').first.wait_for()
    check('signing out returns to the guest header', page.get_by_role('link', name='Log in').first.is_visible() and page.get_by_role('button', name=re.compile('Account menu')).count() == 0)
    go(page, '/author/dashboard')
    check('after signing out, the author area is closed again', '/login' in page.url, page.url)
    check('the browser kept no session cookie', not any(c['name'] == 'bp_session' and c['value'] for c in guest_ctx.cookies()))

    # ------------------------------------------------------------------ 11. forgot / reset password
    go(page, '/login')
    page.get_by_role('link', name='Forgot password?').click()
    page.wait_for_url('**/forgot-password')
    page.get_by_label('Email address').fill(AUTHOR_EMAIL)
    page.get_by_role('button', name='Send reset link').click()
    page.get_by_text('Check your inbox').wait_for()
    shown = page.locator('#main-content').inner_text()
    check('the confirmation never says whether the address has an account', 'If an account exists' in shown)
    rtoken = token_in_latest_mail(AUTHOR_EMAIL, 'reset your password')
    check('a reset email with a link was sent', bool(rtoken))
    go(page, f'/reset-password?token={rtoken}')
    page.get_by_label('New password', exact=True).wait_for()
    page.get_by_label('New password', exact=True).fill('short1'); page.get_by_label('Confirm new password').fill('short1')
    page.get_by_role('button', name='Update password').click()
    check('a weak new password is refused on the page', page.get_by_text('doesn’t meet the rules').is_visible())
    page.get_by_label('New password', exact=True).fill('Fresh-Pass-4321'); page.get_by_label('Confirm new password').fill('Fresh-Pass-4321')
    page.get_by_role('button', name='Update password').click()
    page.wait_for_url('**/login?reset=1')
    check('a successful reset sends the user to sign in, with a notice', page.get_by_text('Your password has been updated').is_visible())
    go(page, f'/reset-password?token={rtoken}')
    page.get_by_text('This link can’t be used').wait_for()
    check('the reset link works once', page.get_by_text('This link can’t be used').is_visible())
    sign_in_author(page, AUTHOR_EMAIL, NEW_PASSWORD)
    page.get_by_text('Incorrect email or password').wait_for()
    check('the previous password no longer works', page.get_by_text('Incorrect email or password').is_visible())
    sign_in_author(page, AUTHOR_EMAIL, 'Fresh-Pass-4321')
    page.wait_for_url('**/author/dashboard**')
    check('the new password signs in', '/author/dashboard' in page.url)

    # ------------------------------------------------------------------ 12. admin accounts + a suspended author is locked out at once
    go(admin, '/admin/dashboard/users')
    admin.get_by_text(AUTHOR_EMAIL).first.wait_for()
    row = admin.locator('tr', has_text=AUTHOR_EMAIL)
    row.get_by_role('button', name='Suspend').click()
    row.get_by_role('button', name='Confirm suspend').click()
    admin.get_by_text('was suspended and signed out').wait_for()
    check('an administrator can suspend an author', admin.get_by_text('was suspended and signed out').is_visible())
    admin.screenshot(path=f'{SHOTS}/admin-users.png', full_page=True)
    go(page, '/author/dashboard')
    check('the suspended author is signed out on their next request', '/login' in page.url, page.url)
    sign_in_author(page, AUTHOR_EMAIL, 'Fresh-Pass-4321')
    page.get_by_text('suspended').first.wait_for()
    check('and cannot sign back in', page.get_by_text('suspended').first.is_visible())

    check('no uncaught page errors during the guest journey', not [e for e in console_errors if 'pageerror' in e or 'Uncaught' in e], '; '.join(console_errors[:3]))
    browser.close()

print(f'\n{len(results) - len(failures)}/{len(results)} checks passed')
if failures: print('FAILED:', *failures, sep='\n  - ')
sys.exit(1 if failures else 0)
