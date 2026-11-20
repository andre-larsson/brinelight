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
  were placed this way (GAME_NOTES.md, "Keeper and costume drafts").

An outfit replaces her whole picture above water, so each Rig piece marked `overOutfit` in js/data.js has a picture
over each outfit too (img/units/<outfit art>_<kit id>.webp, such as wren_harbour_cork.webp). Make them all with:
  python3 tools/wren-art.py rigs [--preview DIR]
  It takes the piece from its picture of plain Wren, inside its outline in RIG_OUTLINES below, and puts it on each
  outfit. Where the piece only darkens the oilskin around it (its shadow), the outfit is darkened by the same amount,
  so no ochre comes along, and what the edit painted out (the coat collar beside her neck) is cleared. A new Rig piece needs an outline here; a new outfit needs nothing but this command.
  --preview DIR saves each picture with the piece in green and its shadow in red, so you can check them.
  The pictures in PAINTED below are left alone: there the cut piece didn't fit (the vest picture's scarf lies across
  the vest, and a costume has its own scarf or boa), so the piece was painted onto the outfit with Codex instead
  (input and compose with --base img/units/<outfit art>.webp; prompts in assets-src/wanted-images.tsv)."""
import json
import subprocess
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


# Canvas polygons around each Rig piece in its picture of plain Wren. Inside, what changed from the master is the piece;
# outside, only its shadow carries over. They keep out the oilskin that the edit repainted beside the piece: the
# sleeve next to the vest's right side and the lapel under the gorget's right side.
RIG_OUTLINES = {
    'keeper_cork': '128,135 150,122 180,120 200,124 250,110 292,110 290,140 283,165 283,226 250,230 170,230 148,222 '
                   '138,180 126,160',
    'keeper_gorget': '140,124 215,118 292,120 292,170 285,178 264,186 240,191 226,193 224,208 205,208 186,200 150,190 '
                     '138,160',
}


# Painted onto the outfit by an edit instead of made by `rigs` (see above).
PAINTED = {'wren_shells_cork', 'wren_gala_cork', 'wren_longjohns_cork'}


def fill_holes(m):
    holes = Image.fromarray(255 - np.asarray(m)).copy()
    ImageDraw.floodfill(holes, (0, 0), 0)
    return Image.fromarray(np.maximum(np.asarray(m), np.asarray(holes)))


def tidy(m):  # close small gaps, then drop specks
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    return m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))


def rig_over(outfit_p, rig_p, outline, base_p=MASTER):
    """Wren in the outfit at outfit_p, with the Rig piece from rig_p (a picture of the master wearing it) over it."""
    A, R, O = (np.asarray(Image.open(p).convert('RGBA')).astype(float) for p in (base_p, rig_p, outfit_p))
    prem = lambda X: X[..., :3] * (X[..., 3:4] / 255)
    d = np.abs(prem(A) - prem(R)).mean(-1) + np.abs(A[..., 3] - R[..., 3]) * 0.5
    changed = fill_holes(tidy(Image.fromarray((d > 34).astype(np.uint8) * 255))).filter(ImageFilter.MaxFilter(3))
    # the piece is a new colour; its shadow is the old colour, darker
    sa, sr = A[..., :3].sum(-1) + 30, R[..., :3].sum(-1) + 30
    hue = np.abs(A[..., :3] / sa[..., None] - R[..., :3] / sr[..., None]).sum(-1)
    piece = fill_holes(tidy(Image.fromarray(((hue > 0.06) & (np.asarray(changed) > 0)).astype(np.uint8) * 255)))
    inside = Image.new('L', (W, H), 0)
    ImageDraw.Draw(inside).polygon([tuple(float(v) for v in xy.split(',')) for xy in outline.split()], fill=255)
    piece = Image.fromarray(np.minimum(np.asarray(piece), np.asarray(inside)))
    p = np.asarray(piece.filter(ImageFilter.GaussianBlur(0.8))).astype(float)[..., None] / 255
    c = np.asarray(changed.filter(ImageFilter.GaussianBlur(1.0))).astype(float)[..., None] / 255
    shade = O.copy()
    shade[..., :3] *= np.clip(sr / sa, 0, 1.2)[..., None]
    shade[..., 3] *= np.clip(R[..., 3] / np.maximum(A[..., 3], 1), 0, 1)  # what the piece's edit painted out (a collar)
    res = (O * (1 - c) + shade * c) * (1 - p) + R * p
    return Image.fromarray(np.clip(res, 0, 255).round().astype(np.uint8), 'RGBA'), piece, changed


def rigs(preview=None):
    js = ("require('./js/data.js'); const BL = globalThis.BL; console.log(JSON.stringify({"
          "outfits: Object.values(BL.OUTFITS).map((o) => o.art).filter((a) => a !== 'keeper'), "
          "rigs: Object.entries(BL.KIT).filter(([, k]) => k.overOutfit).map(([id, k]) => [id, k.look])}))")
    data = json.loads(subprocess.check_output(['node', '-e', js], text=True))
    for rig_id, look in data['rigs']:
        if look not in RIG_OUTLINES:
            sys.exit(f'{look} has no outline in RIG_OUTLINES')
        for art in data['outfits']:
            if f'{art}_{rig_id}' in PAINTED:
                continue
            im, piece, changed = rig_over(f'img/units/{art}.webp', f'img/units/{look}.webp', RIG_OUTLINES[look])
            save(im, f'img/units/{art}_{rig_id}.webp')
            if preview:
                pv = Image.new('RGBA', (W, H), (40, 60, 70, 255))
                pv.alpha_composite(im)
                pv.paste(Image.new('RGBA', (W, H), (255, 0, 80, 255)), (0, 0), changed.point(lambda v: v // 3))
                pv.paste(Image.new('RGBA', (W, H), (0, 255, 120, 255)), (0, 0), piece.point(lambda v: v // 3))
                save(pv, f'{preview}/{art}_{rig_id}.png')


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
    if not a or a[0] not in ('input', 'compose', 'place', 'rigs'):
        sys.exit(__doc__)
    if a[0] == 'input': make_input(a[1], arg(a, '--base', MASTER))
    elif a[0] == 'rigs': rigs(arg(a, '--preview'))
    elif a[0] == 'compose': compose(a[1], arg(a, '--allow', many=True), arg(a, '--out'), arg(a, '--preview'), arg(a, '--base', MASTER))
    else: place(a[1], float(arg(a, '--eye')), float(arg(a, '--head')), arg(a, '--out'), float(arg(a, '--tall', 1)))
