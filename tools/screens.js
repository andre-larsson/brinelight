#!/usr/bin/env node
/* Screenshot every screen at the target sizes, for layout review.
   Usage: node tools/screens.js <outdir> [port=8874] [sizes=desktop,phone,small,land]
   Drives the game through window.Brinelight, so it needs no clicking. */
'use strict';
const fs = require('fs');
const path = require('path');
const { serve } = require('./serve');
const { launch, sleep } = require('./cdp');

const SIZES = {
  desktop: { w: 1280, h: 800 },
  phone: { w: 390, h: 844, mobile: true, touch: true },
  small: { w: 360, h: 640, mobile: true, touch: true },
  land: { w: 844, h: 390, mobile: true, touch: true },
};

(async () => {
  const out = path.resolve(process.argv[2] || 'screens');
  const port = +(process.argv[3] || 8874);
  const sizes = (process.argv[4] || 'desktop,phone,small,land').split(',');
  fs.mkdirSync(out, { recursive: true });
  const server = await serve(port, path.join(__dirname, '..'));
  const page = await launch();
  const base = `http://127.0.0.1:${port}/`;
  const MIN_PX = 12;
  const small = [];
  /* every visible text element rendered below MIN_PX (transforms included) */
  const audit = (tag, name) => page.eval(`(() => {
    const out = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walk.nextNode()) {
      const t = walk.currentNode;
      const txt = t.textContent.trim();
      if (!txt) continue;
      const el = t.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || +cs.opacity === 0 || el.closest('[hidden]') || el.closest('[aria-hidden="true"]')) continue;
      const scale = el.offsetHeight ? r.height / el.offsetHeight : 1;
      const px = parseFloat(cs.fontSize) * scale;
      if (px < ${MIN_PX} - 0.05) out.push(px.toFixed(1) + 'px ' + (el.className && el.className.baseVal === undefined ? '.' + String(el.className).split(' ')[0] : el.tagName) + ' "' + txt.slice(0, 30) + '"');
    }
    return out;
  })()`).then((list) => { if (list.length) small.push(`${tag}_${name}: ${list.length}\n    ` + list.slice(0, 8).join('\n    ')); });
  const shot = async (tag, name) => { await sleep(350); await page.screenshot(path.join(out, `${tag}_${name}.png`)); await audit(tag, name); };
  const setup = (js) => page.eval(`(() => { const B = window.Brinelight, E = B.E, BL = window.BL; ${js}; })()`);
  try {
    for (const tag of sizes) {
      const s = SIZES[tag];
      await page.viewport(s.w, s.h, s);
      await page.goto(base + '?seed=4242');
      await page.eval(`(() => { try { localStorage.clear(); } catch (e) {} })()`);
      await page.goto(base + '?seed=4242');
      // review the screens themselves: mark the first-time hints and the tutorial offer as seen
      await page.eval(`(() => { localStorage.setItem('brinelight.hints.v1', JSON.stringify(window.Brinelight.teach ? window.Brinelight.teach.hintIds() : [])); localStorage.setItem('brinelight.tutorial.v1', 'done'); })()`);
      await page.goto(base + '?seed=4242');
      await sleep(400);
      await shot(tag, '01_title');
      // map
      await setup(`const r = E.newRun(4242, 0); B.run = r; B.render();`);
      await shot(tag, '02_map');
      // first fight
      await setup(`const r = B.run; E.enterNode(r, E.availableNodes(r)[0]); B.render();`);
      await sleep(1600);
      await shot(tag, '03_combat');
      // select first card
      await setup(`const c = B.run.combat; document.querySelector('#hand .card').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'mouse' })); document.querySelector('#hand .card').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1, pointerType: 'mouse' }));`);
      await shot(tag, '04_selected');
      // a two-enemy fight with statuses and ward, mid-fight
      await setup(`const r = E.newRun(77, 0); B.run = r; E.startCombat(r, 'hard', ['crab', 'jelly']); const c = r.combat; c.player.ward = 7; c.enemies[0].ward = 9; c.enemies[1].st.brine = 3; c.player.st.soaked = 1; c.tide = 5; r.tonics = ['ink', 'kelptea', null]; r.keepsakes.push('anchor', 'whaletooth'); B.render();`);
      await sleep(1600);
      await shot(tag, '05_combat_busy');
      // reward
      await setup(`const r = B.run; const c = r.combat; c.enemies.forEach((e) => { e.dead = true; e.hp = 0; }); c.won = true; E.finishCombat(r); B.render();`);
      await sleep(900);
      await shot(tag, '06_reward');
      // shop
      await setup(`const r = B.run; E.backToMap(r); r.pearls = 180; E.enterNode(r, { row: 3, col: 1, type: 'shop' }); B.render();`);
      await shot(tag, '07_shop');
      // rest
      await setup(`const r = B.run; E.backToMap(r); r.hp = 40; E.enterNode(r, { row: 4, col: 1, type: 'rest' }); B.render();`);
      await shot(tag, '08_rest');
      // event
      await setup(`const r = B.run; E.backToMap(r); E.enterNode(r, { row: 5, col: 1, type: 'event' }); B.render();`);
      await shot(tag, '09_event');
      // treasure, opened
      await setup(`const r = B.run; E.backToMap(r); E.enterNode(r, { row: 5, col: 2, type: 'treasure' }); E.openTreasure(r); B.render();`);
      await shot(tag, '10_treasure');
      // elite fight
      await setup(`const r = B.run; E.backToMap(r); E.startCombat(r, 'elite', ['angler', 'angler']); B.render();`);
      await sleep(1800);
      await shot(tag, '11_elite');
      // the Dread's reward: a keepsake pick with Charge (the run carries Whale Tooth and Drowned Anchor, over the Hold)
      await setup(`const r = B.run; const c = r.combat; c.enemies.forEach((e) => { e.dead = true; e.hp = 0; }); c.won = true; E.finishCombat(r); B.render();`);
      await sleep(900);
      await shot(tag, '11b_elite_reward');
      // defeat screen
      await setup(`const r = B.run; r.combat = null; r.screen = 'defeat'; r.floor = 6; B.render();`);
      await shot(tag, '12_defeat');
      // help
      await setup(`B.run = null; B.render();`);
      await page.eval(`document.querySelector('[data-act="help"]') && document.querySelector('[data-act="help"]').click()`);
      await shot(tag, '13_help');
      // the Workshop and the kit before a dive
      await setup(`B.closeOverlay(true); const m = B.meta; m.salvage = 40; m.earned = 200; m.owned = ['cork', 'purse', 'floodbell', 'honed', 'net']; m.ach = ['twocrests', 'dreadhunter']; m.kit = E.fitKit(['honed', 'cork', 'purse']); B.saveMeta(); B.render(); document.querySelector('[data-act="workshop"]').click();`);
      await shot(tag, '14_workshop');
      await setup(`B.closeOverlay(true); document.querySelector('[data-act="newrun"]').click();`);
      await shot(tag, '15_kit');
    }
    fs.writeFileSync(path.join(out, 'small-text.txt'), small.join('\n') + '\n');
    console.log(small.length ? `Text below ${MIN_PX}px on ${small.length} screens (see small-text.txt)` : `No text below ${MIN_PX}px`);
    if (page.errors.length) { console.log('Page errors:\n' + page.errors.join('\n')); process.exitCode = 1; }
    console.log('Screenshots in ' + out);
  } finally {
    await page.close();
    server.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
