#!/usr/bin/env python3
"""Rebuild the LearnCorp logo kit and the site's static brand assets from the supplied artwork.

    pip install pillow numpy scipy            # + `vtracer` only if you pass --trace
    python brand/tools/build_logo_kit.py [--trace]

Input   brand/original/Learncorp_Publication_Logo.png   (supplied: a flat 1254x1254 raster on white)
Output  brand/png/        transparent PNGs: primary, primary on dark, icon, horizontal, horizontal on dark
        brand/favicon/    favicon.ico, 16/32/48 px, 192/512 px app icons, apple-touch-icon
        brand/social/     opengraph-image.png (1200x630)
        brand/svg/        auto-traced SVGs (only with --trace; see brand/README.md for the caveats)
        frontend/assets/brand/   small WebP files the site imports (logo-mark, logo-lockup, logo-lockup-dark)
        frontend/app/            icon.png, apple-icon.png, favicon.ico, opengraph-image.png (Next.js file conventions)
        frontend/public/         apple-touch-icon.png

Everything is derived from the one supplied raster, so it is only as sharp as that raster is. A hand-drawn
vector master would replace this script; until then it keeps every variant consistent and re-creatable.
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT / 'brand'
FRONTEND = ROOT / 'frontend'
SRC = BRAND / 'original' / 'Learncorp_Publication_Logo.png'

INK = (20, 27, 46)            # site navy (#141B2E): background of the dark variants, the favicon tile and the OG card
BELOW_BOOK_ROW = 700          # below this row there are no white book pages left, only the clasp, shadow and wordmark
GLOBE = (617, 406, 238)       # cx, cy, r of the globe disc (inside the gold ring) in the 1254 px source


# --------------------------------------------------------------------------------------------------
# 1. Cut the artwork out of its white background -> RGBA
# --------------------------------------------------------------------------------------------------
def cut_out(src_path: Path) -> Image.Image:
    """Icon region: flood-fill the near-white background from the border. The book pages are white too, so thin
    outlines are closed by erosion first (the fill cannot leak into them) and the globe disc is forced opaque (a
    lens flare on its rim would otherwise read as background). Wordmark region: its letters are navy/gold, so every
    light neutral pixel is background, which also removes the drop shadow and the letter counters.
    Edges are feathered by 1 px and re-coloured from the nearest solid pixel, so there is no white fringe."""
    a = np.asarray(Image.open(src_path).convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    m = a.min(axis=2)
    chroma = a.max(axis=2) - m
    yy, xx = np.mgrid[0:h, 0:w]

    cand = m >= 222
    core = ndi.binary_erosion(cand, structure=np.ones((3, 3)), iterations=3, border_value=1)
    lab, _ = ndi.label(core)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])).tolist()) - {0}
    exterior = np.isin(lab, list(border))
    exterior = ndi.binary_dilation(exterior, structure=np.ones((3, 3)), iterations=3) & cand
    obj_icon = ~exterior
    obj_icon |= (xx - GLOBE[0]) ** 2 + (yy - GLOBE[1]) ** 2 <= GLOBE[2] ** 2

    obj_word = ~((chroma <= 22) & (m >= 120))
    obj = np.where(yy < BELOW_BOOK_ROW, obj_icon, obj_word)

    lab, n = ndi.label(obj)
    sizes = ndi.sum(obj, lab, range(1, n + 1))
    obj = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 20])        # drop shadow crumbs, keep the i-dots

    alpha = np.clip((ndi.gaussian_filter(obj.astype(np.float32), 0.8) - 0.15) / 0.7, 0, 1)
    solid = ndi.binary_erosion(obj, structure=np.ones((3, 3)), iterations=2)
    idx = ndi.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    rgb = a[idx[0], idx[1]]
    rgb[solid] = a[solid]
    return Image.fromarray(np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')


# --------------------------------------------------------------------------------------------------
# 2. Variants
# --------------------------------------------------------------------------------------------------
def bbox(img: Image.Image, thr: int = 10):
    ys, xs = np.where(np.asarray(img)[:, :, 3] > thr)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def pad(img: Image.Image, frac: float) -> Image.Image:
    p = int(max(img.size) * frac)
    canvas = Image.new('RGBA', (img.width + 2 * p, img.height + 2 * p), (0, 0, 0, 0))
    canvas.paste(img, (p, p))
    return canvas


def lighten_navy(img: Image.Image) -> Image.Image:
    """Dark-background wordmark: lift the navy letters towards white, leave gold untouched."""
    arr = np.asarray(img).astype(np.float32)
    rgb = arr[:, :, :3]
    hsv = np.asarray(Image.fromarray(rgb.astype(np.uint8)).convert('HSV')).astype(np.float32)
    hue, sat, val = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2] / 255
    is_blue = (hue >= 130) & (hue <= 195) & (sat >= 55)
    t = np.clip(0.90 - 0.35 * val, 0, 1)[:, :, None]                          # darker navy -> lighter result
    lifted = rgb * (1 - t) + 255 * t
    return Image.fromarray(np.dstack([np.where(is_blue[:, :, None], lifted, rgb), arr[:, :, 3]]).clip(0, 255).astype(np.uint8), 'RGBA')


def horizontal(icon: Image.Image, word: Image.Image) -> Image.Image:
    wh = int(icon.height * 0.60)
    word = word.resize((int(word.width * wh / word.height), wh), Image.LANCZOS)
    gap = int(icon.height * 0.12)
    canvas = Image.new('RGBA', (icon.width + gap + word.width, icon.height), (0, 0, 0, 0))
    canvas.alpha_composite(icon, (0, 0))
    canvas.alpha_composite(word, (icon.width + gap, (icon.height - wh) // 2 + int(icon.height * 0.02)))
    return canvas


def tile(icon: Image.Image, size: int, rounded: bool = True, fill: float = 0.80) -> Image.Image:
    """The icon centred on a navy tile: legible at 16 px and consistent with the site header."""
    t = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(t)
    if rounded:
        d.rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.22), fill=INK + (255,))
    else:
        d.rectangle((0, 0, size, size), fill=INK + (255,))
    w = int(size * fill)
    h = int(icon.height * w / icon.width)
    t.alpha_composite(icon.resize((w, h), Image.LANCZOS), ((size - w) // 2, (size - h) // 2 + int(size * 0.01)))
    return t


def save_webp(img: Image.Image, width: int, path: Path, quality: int = 88) -> None:
    img.resize((width, int(img.height * width / img.width)), Image.LANCZOS).save(path, 'WEBP', quality=quality, method=6)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--trace', action='store_true', help='also write auto-traced SVGs (needs: pip install vtracer)')
    args = parser.parse_args()

    if not SRC.exists():
        print(f'Missing {SRC.relative_to(ROOT)}', file=sys.stderr)
        return 1

    full = cut_out(SRC)
    arr = np.asarray(full)
    lab, _ = ndi.label(arr[:, :, 3] > 10, structure=np.ones((3, 3)))
    icon_mask = ndi.binary_dilation(lab == lab[GLOBE[1], GLOBE[0]], iterations=2)   # book + globe are one connected shape

    def only(mask: np.ndarray) -> Image.Image:
        out = arr.copy()
        out[:, :, 3] = np.where(mask, out[:, :, 3], 0)
        return Image.fromarray(out, 'RGBA')

    icon_full, word_full = only(icon_mask), only(~icon_mask)
    icon_box, word_box = bbox(icon_full), bbox(word_full)
    icon, word = icon_full.crop(icon_box), word_full.crop(word_box)
    primary_box = (min(icon_box[0], word_box[0]), icon_box[1], max(icon_box[2], word_box[2]), word_box[3])
    primary = full.crop(primary_box)

    word_dark = lighten_navy(word)
    primary_dark = primary.copy()
    origin = (word_box[0] - primary_box[0], word_box[1] - primary_box[1])
    primary_dark.paste(Image.new('RGBA', word.size, (0, 0, 0, 0)), origin)           # clear the wordmark area, then redraw it
    primary_dark.alpha_composite(word_dark, origin)

    png, favicon, social = BRAND / 'png', BRAND / 'favicon', BRAND / 'social'
    for folder in (png, favicon, social, FRONTEND / 'assets' / 'brand'):
        folder.mkdir(parents=True, exist_ok=True)

    kit = {
        'learncorp-logo-primary-transparent.png': pad(primary, 0.03),
        'learncorp-logo-primary-dark-bg.png': pad(primary_dark, 0.03),
        'learncorp-logo-icon-transparent.png': pad(icon, 0.04),
        'learncorp-logo-horizontal-transparent.png': pad(horizontal(icon, word), 0.03),
        'learncorp-logo-horizontal-dark-bg.png': pad(horizontal(icon, word_dark), 0.03),
    }
    for name, img in kit.items():
        img.save(png / name, optimize=True)

    # favicons and app icons
    tile(icon, 512).save(favicon / 'icon-512.png', optimize=True)
    tile(icon, 192).save(favicon / 'icon-192.png', optimize=True)
    tile(icon, 180, rounded=False).convert('RGB').save(favicon / 'apple-touch-icon.png', optimize=True)
    tile(icon, 48, fill=0.84).save(favicon / 'favicon-48.png')
    tile(icon, 32, fill=0.86).save(favicon / 'favicon-32.png')
    tile(icon, 16, fill=0.90).save(favicon / 'favicon-16.png')
    tile(icon, 256).save(favicon / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])

    # 1200x630 Open Graph card: dark lockup on the site navy
    card = Image.new('RGBA', (1200, 630), INK + (255,))
    lockup = primary_dark.resize((int(primary_dark.width * 470 / primary_dark.height), 470), Image.LANCZOS)
    card.alpha_composite(lockup, ((1200 - lockup.width) // 2, (630 - lockup.height) // 2))
    card.convert('RGB').save(social / 'opengraph-image.png', optimize=True)

    # site assets (what the frontend actually imports / serves)
    save_webp(pad(icon, 0.02), 320, FRONTEND / 'assets' / 'brand' / 'logo-mark.webp')
    save_webp(pad(primary, 0.02), 720, FRONTEND / 'assets' / 'brand' / 'logo-lockup.webp')
    save_webp(kit['learncorp-logo-primary-dark-bg.png'], 720, FRONTEND / 'assets' / 'brand' / 'logo-lockup-dark.webp')
    for name, source in [('icon.png', 'icon-512.png'), ('apple-icon.png', 'apple-touch-icon.png'),
                         ('favicon.ico', 'favicon.ico'), ('opengraph-image.png', None)]:
        target = FRONTEND / 'app' / name
        target.write_bytes((social / 'opengraph-image.png' if source is None else favicon / source).read_bytes())
    (FRONTEND / 'public' / 'apple-touch-icon.png').write_bytes((favicon / 'apple-touch-icon.png').read_bytes())

    if args.trace:
        import vtracer  # noqa: PLC0415  (optional dependency)
        (BRAND / 'svg').mkdir(exist_ok=True)
        for source, target in [('learncorp-logo-primary-transparent.png', 'learncorp-logo-primary.svg'),
                               ('learncorp-logo-icon-transparent.png', 'learncorp-logo-icon.svg')]:
            vtracer.convert_image_to_svg_py(
                str(png / source), str(BRAND / 'svg' / target), colormode='color', hierarchical='stacked', mode='spline',
                filter_speckle=6, color_precision=7, layer_difference=10, corner_threshold=60,
                length_threshold=4.0, max_iterations=10, splice_threshold=45, path_precision=2)

    print('Logo kit rebuilt.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
