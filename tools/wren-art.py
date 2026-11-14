#!/usr/bin/env python3
"""Wren's pictures (img/units/keeper*.webp) all share one canvas, so she is the same size in every one of them.

The canvas is 400x600 (2:3). Her boot soles are on row 596 and her face is centred at x 227. Eye level to sole is
513 px. The top 40 px are empty except in the Belfry pictures, where the diving helmet reaches into them. The fight
and the kit screens draw the picture 600/560 times the height of its box, so the empty top runs over the box and
her body fills it (style.css, --wren-tall).

Plain Wren (keeper.webp) is the master. A new coat is an edit of her, so her face, pose, lantern, harpoon and bell
stay the same:
  1. python3 tools/wren-art.py input OUT.png
     makes a 1024x1536 copy of the master to attach to the image generator's edit (exact 2.56x scale).
  2. Ask Codex's built-in image tool to edit it. Change only the coat area and keep everything else identical
     (see the prompts in assets-src/wanted-images.tsv). It repaints the whole picture slightly but keeps it aligned.
  3. python3 tools/wren-art.py compose EDIT.png --allow "x,y x,y ..." [--allow ...] --out img/units/keeper_NAME.webp
     pastes back only what changed inside the --allow polygons (canvas pixels), so everything else stays the
     master's own pixels. --preview P.png saves the mask over Wren, so you can check it.
Both commands take --base PICTURE.webp to edit another picture instead (the Plated Dress is an edit of keeper_suit).
A whole new picture (a new diving dress) can't be an edit of her. Put it on the canvas at Wren's scale with:
  python3 tools/wren-art.py place SRC.png --eye Y --head X --out img/units/keeper_NAME.webp
  where Y is her eye level and X the centre of her face (or helmet) in SRC pixels. The lowest opaque row counts as
  her soles. --tall F places another keeper at F times Wren's height (eye level to sole); someone too tall for
  the canvas is shrunk until the top of the picture touches its top edge. The keeper drafts in assets-src/drafts
  were placed this way (GAME_NOTES.md, "Keeper and costume drafts")."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H, SOLE, HEAD_X, EYE_TO_SOLE = 400, 600, 596, 227, 513
MASTER = 'img/units/keeper.webp'
EDIT_SIZE = (1024, 1536)


def arg(args, name, default=None, many=False):
    vals = [args[i + 1] for i, a in enumerate(args) if a == name]
    return vals if many else (vals[-1] if vals else default)


def save(im, out):
    if out.endswith('.webp'): im.save(out, 'WEBP', quality=90, method=6)
    else: im.save(out)
    print(out)


def make_input(out, base_p=MASTER):
    save(Image.open(base_p).convert('RGBA').resize(EDIT_SIZE, Image.LANCZOS), out)


def compose(edit_p, polys, out, preview=None, base_p=MASTER):
    base = Image.open(base_p).convert('RGBA')
    edit = Image.open(edit_p).convert('RGBA').resize((W, H), Image.LANCZOS)
    A, E = np.asarray(base).astype(float), np.asarray(edit).astype(float)
    prem = lambda X: X[..., :3] * (X[..., 3:4] / 255)
    d = np.abs(prem(A) - prem(E)).mean(-1) + np.abs(A[..., 3] - E[..., 3]) * 0.5
    m = Image.fromarray((d > 34).astype(np.uint8) * 255)
    # close small gaps, drop specks, grow a little so the new item's edges are covered
    m = m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MaxFilter(5))
    allowed = Image.new('L', (W, H), 0)
    for p in polys:
        ImageDraw.Draw(allowed).polygon([tuple(float(v) for v in xy.split(',')) for xy in p.split()], fill=255)
    m = np.minimum(np.asarray(m), np.asarray(allowed))
    holes = Image.fromarray(255 - m).copy()  # fill holes: whatever the changed area encloses counts as changed
    ImageDraw.floodfill(holes, (0, 0), 0)
    m = Image.fromarray(np.maximum(m, np.asarray(holes))).filter(ImageFilter.GaussianBlur(1.6))
    res = base.copy()
    res.paste(edit, (0, 0), m)
    save(res, out)
    if preview:
        pv = base.copy()
        pv.paste(Image.new('RGBA', (W, H), (255, 0, 80, 255)), (0, 0), m.point(lambda v: v // 2))
        bg = Image.new('RGBA', (W, H), (40, 60, 70, 255))
        bg.alpha_composite(pv)
        save(bg, preview)


def place(src_p, eye, head, out, tall=1.0):
    src = Image.open(src_p).convert('RGBA')
    rows = np.where((np.asarray(src.getchannel('A')) > 128).any(1))[0]
    sole = rows.max()
    f = EYE_TO_SOLE * tall / (sole - eye)
    if SOLE - (sole - rows.min()) * f < 0:  # too tall for the canvas: shrink until the top touches it
        f = SOLE / (sole - rows.min())
        print(f'note: shrunk to fit the canvas ({f * (sole - eye) / EYE_TO_SOLE:.2f} of Wren\'s height)', file=sys.stderr)
    big = src.resize((round(src.width * f), round(src.height * f)), Image.LANCZOS)
    left, top = round(HEAD_X - head * f), round(SOLE - sole * f)
    bbox = big.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if left + bbox[0] < 0 or top + bbox[1] < 0 or left + bbox[2] > W:
        print('warning: the picture runs off the canvas', file=sys.stderr)
    cut = big.crop((max(0, -left), max(0, -top), big.width, big.height))
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    canvas.alpha_composite(cut.crop((0, 0, min(cut.width, W - max(0, left)), min(cut.height, H - max(0, top)))),
                           (max(0, left), max(0, top)))
    save(canvas, out)


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] not in ('input', 'compose', 'place'):
        sys.exit(__doc__)
    if a[0] == 'input': make_input(a[1], arg(a, '--base', MASTER))
    elif a[0] == 'compose': compose(a[1], arg(a, '--allow', many=True), arg(a, '--out'), arg(a, '--preview'), arg(a, '--base', MASTER))
    else: place(a[1], float(arg(a, '--eye')), float(arg(a, '--head')), arg(a, '--out'), float(arg(a, '--tall', 1)))
