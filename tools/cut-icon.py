#!/usr/bin/env python3
"""Cut a generated icon down to the object and save it as a square 160 px WebP.
Usage: python3 tools/cut-icon.py SRC.png [SRC2.png ...] --out img/icons
Crops to the visible (alpha) bounds with 6% padding, centres it on a square, resizes with Lanczos."""
import os, sys
from PIL import Image

def cut(src, out_dir, size=160, pad=0.06):
    im = Image.open(src).convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox() or (0, 0, im.width, im.height)
    w, h = box[2] - box[0], box[3] - box[1]
    side = int(max(w, h) * (1 + 2 * pad))
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.alpha_composite(im.crop(box), ((side - w) // 2, (side - h) // 2))
    dst = os.path.join(out_dir, os.path.splitext(os.path.basename(src))[0] + '.webp')
    sq.resize((size, size), Image.LANCZOS).save(dst, 'WEBP', quality=88, method=6)
    return dst

if __name__ == '__main__':
    args = sys.argv[1:]
    out = 'img/icons'
    if '--out' in args:
        i = args.index('--out'); out = args[i + 1]; del args[i:i + 2]
    for a in args: print(cut(a, out))
