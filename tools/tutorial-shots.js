#!/usr/bin/env node
/* Screenshot every tutorial step, for reviewing the bubbles.
   Usage: node tools/tutorial-shots.js <outdir> [port=8874] [phone|desktop|small|land] */
'use strict';
const fs = require('fs');
const path = require('path');
const { serve } = require('./serve');
const { launch, sleep } = require('./cdp');
const SIZES = { desktop: { w: 1280, h: 800 }, phone: { w: 390, h: 844, mobile: true, touch: true }, small: { w: 360, h: 640, mobile: true, touch: true }, land: { w: 844, h: 390, mobile: true, touch: true } };

(async () => {
  const out = path.resolve(process.argv[2] || 'screens');
  const port = +(process.argv[3] || 8874);
  const tag = process.argv[4] || 'phone';
  fs.mkdirSync(out, { recursive: true });
  const server = await serve(port, path.join(__dirname, '..'));
  const page = await launch();
  try {
    const s = SIZES[tag];
    await page.viewport(s.w, s.h, s);
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.eval(`localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true }))`);
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.eval('window.Brinelight.teach.startTutorial()');
    const idle = () => page.waitFor('!window.Brinelight.ui.busy && window.Brinelight.run.combat && (window.Brinelight.run.combat.won || window.Brinelight.run.combat.phase === "player")', 15000);
    for (let i = 0; i < 40; i++) {
      await idle();
      await sleep(900);
      if (await page.eval('!document.getElementById("overlay").hidden')) { await page.screenshot(path.join(out, `${tag}_tut_done.png`)); break; }
      const st = await page.eval('window.Brinelight.teach.stepSpec()');
      if (!st) { await sleep(300); continue; }
      const n = String(i + 1).padStart(2, '0');
      await page.screenshot(path.join(out, `${tag}_tut_${n}_${st.id}.png`));
      if (st.info) { await page.eval('window.Brinelight.teach.next()'); continue; }
      if (st.endTurn) { await page.eval('document.getElementById("btn-end").click()'); await sleep(400); continue; }
      if (st.act) { await page.click(`#tidebar .tb-act.${st.act}`); await sleep(600); continue; }
      // select the card through the UI, screenshot the aiming state, then play it
      const d = await page.eval(`(() => { const c = window.Brinelight.run.combat; const card = c.hand.find((k) => k.id === ${JSON.stringify(st.play.card)}); const t = ${JSON.stringify(st.play.target)} ? c.enemies.find((e) => e.id === ${JSON.stringify(st.play.target)} && !e.dead) : null; return { uid: card.uid, target: t ? t.uid : null }; })()`);
      await page.click(`#hand .card[data-uid="${d.uid}"]`);
      await sleep(500);
      await page.screenshot(path.join(out, `${tag}_tut_${n}b_${st.id}_selected.png`));
      if (d.target) await page.click(`.unit.enemy[data-uid="${d.target}"] .sprite`); else await page.click(`#hand .card[data-uid="${d.uid}"]`);
      await sleep(300);
    }
    if (page.errors.length) { console.log(page.errors.join('\n')); process.exitCode = 1; }
  } finally { await page.close(); server.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
