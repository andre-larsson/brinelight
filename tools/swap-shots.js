'use strict';
/* Screenshots of the real fight (desktop and phone) and the Workshop's kit view with Wren's picture swapped for another one,
   to judge a keeper or costume draft in the game without changing the game's files.
   Usage: node tools/swap-shots.js <outdir> <name>=<picture.webp>:<label> ...
   Writes <name>_desktop_fight.png, <name>_phone_fight.png and <name>_desktop_kit.png. The picture must be on Wren's
   400x600 canvas (tools/wren-art.py place). Example:
     node tools/swap-shots.js /tmp/shots "abena=assets-src/drafts/keepers/abena.webp:Abena, the Anchor-Smith"
   The picture goes in as a data URI, so the repo's own files are never touched. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const { serve } = require('./serve');
const { launch, sleep } = require('./cdp');
const out = process.argv[2];
const keepers = process.argv.slice(3).map((a) => {
  const [name, rest] = a.split('=');
  const [file, label] = rest.split(':');
  return { name, label, uri: 'data:image/webp;base64,' + fs.readFileSync(file).toString('base64') };
});
fs.mkdirSync(out, { recursive: true });
(async () => {
  const server = await serve(8881, root);
  const page = await launch();
  const base = 'http://127.0.0.1:8881/?seed=4242';
  const sizes = { desktop: { w: 1280, h: 800 }, phone: { w: 390, h: 844, mobile: true, touch: true } };
  const swap = (sel, k) => page.eval(`(async () => {
    const img = document.querySelector(${JSON.stringify(sel)});
    img.src = ${JSON.stringify(k.uri)};
    await img.decode();
    const n = document.querySelector('.uname'); if (n && ${JSON.stringify(sel)}.indexOf('sprite') >= 0) n.textContent = ${JSON.stringify(k.label)};
    const l = document.querySelector('.doll-lines'); if (l) l.style.display = 'none';
    return true;
  })()`);
  try {
    for (const [tag, s] of Object.entries(sizes)) {
      await page.viewport(s.w, s.h, s);
      await page.goto(base);
      await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.tutorial.v1', 'done'); localStorage.setItem('brinelight.story.v1', JSON.stringify({ opening: true })); localStorage.setItem('brinelight.hints.v1', JSON.stringify(window.Brinelight.teach ? window.Brinelight.teach.hintIds() : [])); })()`);
      await page.goto(base);
      for (const k of keepers) {
        // a Shallows fight against two creatures
        await page.eval(`(() => { const B = window.Brinelight, E = B.E; B.closeOverlay(true); const r = E.newRun(4242, 0); B.run = r; E.startCombat(r, 'hard', ['crab', 'jelly']); B.render(); })()`);
        await sleep(1400);
        await swap('#combat .sprite img[alt^="Wren"], .sprite img[alt^="Wren"]', k);
        await sleep(200);
        await page.screenshot(path.join(out, `${k.name}_${tag}_fight.png`));
        if (tag !== 'desktop') continue;
        // the Workshop's kit view
        await page.eval(`(() => { const B = window.Brinelight, E = B.E; B.run = null; const m = B.meta; m.salvage = 40; m.earned = 200; m.owned = ['cork', 'purse', 'wick']; m.kit = E.fitKit(['purse', 'wick']); B.saveMeta(); B.render(); document.querySelector('[data-act="workshop"]').click(); })()`);
        await sleep(500);
        await swap('.doll-wren img', k);
        await sleep(200);
        await page.screenshot(path.join(out, `${k.name}_${tag}_kit.png`));
        await page.eval(`window.Brinelight.closeOverlay(true)`);
      }
    }
  } finally { await page.close(); server.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
