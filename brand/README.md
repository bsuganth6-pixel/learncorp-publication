# LearnCorp Publication — brand kit

Everything in this folder is derived from the one logo that was supplied
(`original/Learncorp_Publication_Logo.png`, a 1254 × 1254 raster on a white background: open book + globe, "Learn**corp**
Publication" wordmark). Nothing here is a redesign.

## Files

| Need | Use | Notes |
|---|---|---|
| Full logo on **light** backgrounds | `png/learncorp-logo-primary-transparent.png` | Transparent, ~1225 × 1050 |
| Full logo on **dark** backgrounds | `png/learncorp-logo-primary-dark-bg.png` | Wordmark lightened so it stays readable on navy |
| Symbol only (avatars, stamps, certificates) | `png/learncorp-logo-icon-transparent.png` | Globe + book, no text |
| Wide / header layouts, light | `png/learncorp-logo-horizontal-transparent.png` | Symbol left, wordmark right |
| Wide / header layouts, dark | `png/learncorp-logo-horizontal-dark-bg.png` | |
| Browser tab, bookmarks, PWA | `favicon/favicon.ico`, `favicon-16/32/48.png` | Symbol on a navy tile |
| Home-screen / app icons | `favicon/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | |
| Link previews (WhatsApp, LinkedIn, X) | `social/opengraph-image.png` | 1200 × 630 |
| Scalable file | `svg/learncorp-logo-primary.svg`, `svg/learncorp-logo-icon.svg` | **Auto-traced approximations — see limits below** |
| The artwork as supplied | `original/Learncorp_Publication_Logo.png` | Opaque white background |

The website does not load files from this folder. It imports small WebP copies from `frontend/assets/brand/` and the
icons in `frontend/app/`; `tools/build_logo_kit.py` writes both from the same source, so they cannot drift apart.

## Colours (as used on the site)

| Token | Hex | Where |
|---|---|---|
| Ink / navy | `#141B2E` | Dark sections, favicon tile, link-preview card |
| Gold | `#8A6018` | Buttons and gold text on light backgrounds (WCAG AA) |
| Gold light | `#C99A3F` | Gold on dark backgrounds |
| Paper | `#F7F6F3` | Page background |

## Using it

- Light background → `*-transparent`; dark/navy background → `*-dark-bg`. Never place the light versions on navy: the
  "Learn" letters are navy and disappear.
- Keep clear space of at least the height of the "L" around the logo; don't stretch, recolour or add effects.
- Minimum sizes: full logo ≥ 160 px wide (≈ 40 mm in print); symbol ≥ 24 px.

## Limits you should know about

1. **The source is a raster.** The supplied `.svg` is a wrapper around the same PNG (one embedded image, no vector
   paths), so it does not scale cleanly either. Everything here is only as sharp as that 1254 px image: fine for the web,
   social media and normal documents; **not enough for large-format print, signage or embroidery**.
2. **The SVGs in `svg/` are auto-traced** (`vtracer`) from the transparent PNGs. They scale, but they are visibly
   posterised compared with the glossy original, and they are large (1.3–1.6 MB). Don't use them on the website.
3. **There is no editable master file**, because none exists. For a print-grade identity, have a designer redraw the
   mark as a true vector (the gloss/gradients simplify well to flat or two-tone versions); drop the result in here and
   retire `tools/build_logo_kit.py`.
4. The cut-out from the white background and the dark-background wordmark are algorithmic (see the docstring in
   `tools/build_logo_kit.py`). Check them on your real backgrounds before using them in anything formal.

## Rebuilding

```bash
pip install pillow numpy scipy          # add `vtracer` for SVG tracing
python brand/tools/build_logo_kit.py --trace
```

This regenerates every file listed above plus the site's `frontend/assets/brand/*.webp`, `frontend/app/icon.png`,
`apple-icon.png`, `favicon.ico`, `opengraph-image.png` and `frontend/public/apple-touch-icon.png`.
