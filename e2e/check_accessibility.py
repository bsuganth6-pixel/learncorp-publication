"""Browser check: axe-core (WCAG 2.0 / 2.1, levels A and AA) on the public pages and the admin login, at desktop and phone widths.

Uses the axe-core copy that `npm ci` installs under frontend/node_modules. Read-only: creates no data, can be re-run freely.
"""
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
AXE = ROOT / 'frontend' / 'node_modules' / 'axe-core' / 'axe.min.js'
BASE = os.environ.get('BASE_URL', 'http://localhost:3055').rstrip('/')
TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

if not AXE.exists():
    sys.exit(f'axe-core not found at {AXE} - run `npm ci` in frontend/ first')

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    page = ctx.new_page()

    pages = ['/', '/books', '/authors', '/publish', '/contact', '/about', '/faq', '/services', '/admin/login']
    book = ctx.request.get(BASE + '/api/books?limit=1').json()['data']
    author = ctx.request.get(BASE + '/api/authors?limit=1').json()['data']
    if book: pages.append(f"/books/{book[0]['slug']}")
    if author: pages.append(f"/authors/{author[0]['slug']}")

    total, failed = 0, 0
    for width, height in [(1280, 800), (390, 844)]:
        page.set_viewport_size({'width': width, 'height': height})
        for path in pages:
            page.goto(BASE + path, wait_until='load', timeout=45000)
            try: page.wait_for_load_state('networkidle', timeout=8000)
            except Exception: page.wait_for_timeout(500)
            page.add_script_tag(path=str(AXE))
            result = page.evaluate('(tags) => axe.run(document, { runOnly: { type: "tag", values: tags } })', TAGS)
            violations = result['violations']
            total += 1
            failed += bool(violations)
            print(('FAIL ' if violations else 'PASS ') + f'{width}px {path}  [{len(violations)} violations, {len(result["passes"])} rules passed]')
            for v in violations:
                print(f"     - {v['id']} ({v['impact']}): {v['help']}  e.g. {json.dumps(v['nodes'][0]['target'])[:100]}")
    browser.close()

print(f'\n{total - failed}/{total} page views have no WCAG A/AA violations (axe-core, automated rules only)')
sys.exit(1 if failed else 0)
