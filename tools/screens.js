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
  const shot = async (tag, name) => { await sleep(350); await page.screenshot(path.join(out, `${tag}_${name}.png`)); };
  const setup = (js) => page.eval(`(() => { const B = window.Brinelight, E = B.E, BL = window.BL; ${js}; })()`);
  try {
    for (const tag of sizes) {
      const s = SIZES[tag];
      await page.viewport(s.w, s.h, s);
      await page.goto(base + '?seed=4242');
      await page.eval(`(() => { try { localStorage.clear(); } catch (e) {} })()`);
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
      // defeat screen
      await setup(`const r = B.run; r.combat = null; r.screen = 'defeat'; r.floor = 6; B.render();`);
      await shot(tag, '12_defeat');
      // help
      await setup(`B.run = null; B.render();`);
      await page.eval(`document.querySelector('[data-act="help"]') && document.querySelector('[data-act="help"]').click()`);
      await shot(tag, '13_help');
    }
    if (page.errors.length) { console.log('Page errors:\n' + page.errors.join('\n')); process.exitCode = 1; }
    console.log('Screenshots in ' + out);
  } finally {
    await page.close();
    server.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
