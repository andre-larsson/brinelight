#!/usr/bin/env node
/* Measure the opening: the first real fight, and the tutorial fight, in player actions and seconds.
   - Node part: the bot plays the first fight of 500 seeds (actions, taps, turns).
   - Browser part (--ui): times the real interface at normal animation speed with instant decisions,
     for a few first fights and for the whole tutorial.
   Estimated play time = animation time + a simple thinking-time model (printed below).
   Usage: node tools/opening.js [--ui] [--port 8874] */
'use strict';
const path = require('path');
const { load, chooseCombatAction } = require('./bot');

const { BL, E } = load();
const args = process.argv.slice(2);
const PORT = args.indexOf('--port') >= 0 ? +args[args.indexOf('--port') + 1] : 8874;

// thinking-time model, in seconds (a first-time player, not an expert)
const THINK = { play: 3.5, endTurn: 1.5, readWord: 60 / 180, readBase: 1.0 };

const pct = (arr, p) => { const a = arr.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(p * a.length))]; };
const mean = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;

/* An aggressive player: attack the weakest enemy first, block only with what's left. */
function aggressiveAction(run) {
  const c = run.combat;
  const al = E.alive(c);
  const cards = c.hand.filter((x) => E.playable(run, x).ok && ['status', 'curse'].indexOf(BL.CARDS[x.id].type) < 0);
  if (!cards.length) return null;
  const weakest = al.slice().sort((a, b) => a.hp - b.hp)[0];
  const atk = cards.find((x) => BL.CARDS[x.id].type === 'attack') || cards[0];
  return { uid: atk.uid, target: E.needsTarget(atk) ? weakest.uid : null };
}

function firstFight(seed, policy) {
  const run = E.newRun(seed);
  E.enterNode(run, E.availableNodes(run)[0]);
  const c = run.combat;
  let plays = 0, ends = 0;
  for (let i = 0; i < 300 && !c.won && !c.lost; i++) {
    const a = policy(run);
    if (a && E.playCard(run, a.uid, a.target)) plays++;
    else { E.endTurn(run); ends++; }
  }
  return { enc: c.enc.join('+'), plays, ends, turns: c.turn, won: c.won, hpLost: 70 - run.hp };
}

function nodeReport(policy, label) {
  const rows = [];
  for (let s = 1; s <= 500; s++) rows.push(firstFight(s, policy));
  const plays = rows.map((r) => r.plays), ends = rows.map((r) => r.ends), turns = rows.map((r) => r.turns);
  const actions = rows.map((r) => r.plays + r.ends);
  const taps = rows.map((r) => r.plays * 2 + r.ends);
  const think = rows.map((r) => r.plays * THINK.play + r.ends * THINK.endTurn);
  const byEnc = {};
  rows.forEach((r) => { (byEnc[r.enc] = byEnc[r.enc] || []).push(r.plays + r.ends); });
  console.log(`First real fight, ${label} bot over 500 seeds (median / p90 / mean):`);
  console.log(`  turns            ${pct(turns, 0.5)} / ${pct(turns, 0.9)} / ${mean(turns).toFixed(2)}`);
  console.log(`  cards played     ${pct(plays, 0.5)} / ${pct(plays, 0.9)} / ${mean(plays).toFixed(1)}`);
  console.log(`  actions          ${pct(actions, 0.5)} / ${pct(actions, 0.9)} / ${mean(actions).toFixed(1)}   (card plays + End Turns)`);
  console.log(`  taps on a phone  ${pct(taps, 0.5)} / ${pct(taps, 0.9)} / ${mean(taps).toFixed(1)}   (2 per card, 1 per End Turn)`);
  console.log(`  thinking time    ${pct(think, 0.5).toFixed(0)} / ${pct(think, 0.9).toFixed(0)} s   (${THINK.play} s per card, ${THINK.endTurn} s per End Turn)`);
  console.log(`  won ${rows.filter((r) => r.won).length}/500, HP lost median ${pct(rows.map((r) => r.hpLost), 0.5)}`);
  console.log('  actions by encounter: ' + Object.keys(byEnc).map((k) => `${k} ${pct(byEnc[k], 0.5)}`).join(', '));
  return { medianThink: pct(think, 0.5), medianActions: pct(actions, 0.5) };
}

async function uiReport(nodeStats) {
  const { serve } = require('./serve');
  const { launch, sleep } = require('./cdp');
  const server = await serve(PORT, path.join(__dirname, '..'));
  const page = await launch();
  const idle = () => page.waitFor('!window.Brinelight.ui.busy && (!window.Brinelight.run || !window.Brinelight.run.combat || window.Brinelight.run.combat.won || window.Brinelight.run.combat.lost || window.Brinelight.run.combat.phase === "player")', 30000);
  try {
    await page.viewport(1280, 800);
    await page.goto(`http://127.0.0.1:${PORT}/`);
    await page.eval(`localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: false })); localStorage.setItem('brinelight.hints.v1', JSON.stringify(window.Brinelight.teach.hintIds()))`);
    await page.goto(`http://127.0.0.1:${PORT}/`);
    // first real fights: animation time with instant decisions
    const anim = [];
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      await page.eval(`(() => { const B = window.Brinelight, E = B.E; const r = E.newRun(${seed}); B.run = r; E.enterNode(r, E.availableNodes(r)[0]); B.render(); })()`);
      const t0 = Date.now();
      for (let i = 0; i < 200; i++) {
        await idle();
        const st = await page.eval(`(() => { const r = window.Brinelight.run; return r.screen !== 'combat' ? 'done' : r.combat.won || r.combat.lost ? 'over' : 'play'; })()`);
        if (st !== 'play') break;
        // the same policy as the Node bot, through the engine
        const a = await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run, c = r.combat; const al = E.alive(c); const cards = c.hand.filter((x) => E.playable(r, x).ok && ['status', 'curse'].indexOf(BL.CARDS[x.id].type) < 0); if (!cards.length) return null; const x = cards[0]; return { uid: x.uid, t: E.needsTarget(x) ? al.slice().sort((p, q) => p.hp - q.hp)[0].uid : null }; })()`);
        if (a) {
          await page.eval(`(() => { const ui = window.Brinelight.ui; ui.sel = ${a.uid}; ui.target = ${JSON.stringify(a.t)}; document.querySelector('#hand .card[data-uid="${a.uid}"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`);
        } else await page.eval(`document.getElementById('btn-end').click()`);
        await sleep(30);
      }
      await page.waitFor('window.Brinelight.run.screen !== "combat"', 15000);
      anim.push((Date.now() - t0) / 1000);
    }
    console.log(`\nFirst real fight in the browser at normal speed, decisions instant: ${anim.map((x) => x.toFixed(1)).join(', ')} s (median ${pct(anim, 0.5).toFixed(1)} s)`);
    // the tutorial: animation time with instant decisions
    await page.eval('window.Brinelight.run = null; window.Brinelight.render(); window.Brinelight.teach.startTutorial()');
    const t0 = Date.now();
    let infos = 0, acts = 0, ends = 0, words = 0;
    for (let i = 0; i < 80; i++) {
      await idle();
      if (await page.eval('!document.getElementById("overlay").hidden')) break;
      const s = await page.eval('window.Brinelight.teach.stepSpec()');
      if (!s) { await sleep(50); continue; }
      await page.waitFor('!document.querySelector(".coachmark").hidden', 8000);
      const shown = await page.eval('document.querySelector(".coachmark .cm-text").innerText');
      words += shown.split(/\s+/).filter(Boolean).length + (s.play && s.play.target ? 4 : 0); // + "Now tap the X" while aiming
      if (s.info) { infos++; await page.eval('window.Brinelight.teach.next()'); continue; }
      if (s.endTurn) { ends++; await page.eval(`document.getElementById('btn-end').click()`); await sleep(100); continue; }
      acts++;
      if (s.act) { await page.eval(`document.querySelector('#tidebar .tb-act.${s.act}').click()`); await sleep(60); continue; }
      await page.eval(`(() => { const B = window.Brinelight, c = B.run.combat; const card = c.hand.find((k) => k.id === ${JSON.stringify(s.play.card)}); const t = ${JSON.stringify(s.play.target)} ? c.enemies.find((e) => e.id === ${JSON.stringify(s.play.target)} && !e.dead) : null; B.ui.sel = card.uid; B.ui.target = t ? t.uid : null; document.querySelector('#hand .card[data-uid="' + card.uid + '"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`);
      await sleep(60);
    }
    await page.waitFor('!document.getElementById("overlay").hidden', 15000);
    const tutAnim = (Date.now() - t0) / 1000;
    const read = words * THINK.readWord + (infos + acts + ends) * THINK.readBase;
    const think = acts * 1.5 + ends * 0.5; // the bubble already says which card: less deciding, mostly finding and tapping
    console.log(`\nTutorial fight: ${infos + acts + ends} steps = ${infos} Next taps + ${acts} card plays and Bails + ${ends} End Turns`);
    console.log(`  actions ${infos + acts + ends}, taps on a phone ${infos + acts * 2 + ends}`);
    console.log(`  animation time ${tutAnim.toFixed(0)} s; reading ${words} words at 180 wpm + 1 s a bubble = ${read.toFixed(0)} s; finding and tapping ${think.toFixed(0)} s`);
    console.log(`  estimated ${(tutAnim + read + think).toFixed(0)} s in all`);
    const firstFightEst = pct(anim, 0.5) + nodeStats.medianThink;
    console.log(`\nEstimated first real fight: ${pct(anim, 0.5).toFixed(0)} s animation + ${nodeStats.medianThink.toFixed(0)} s thinking (between the two bots) = ${firstFightEst.toFixed(0)} s`);
    console.log(`Estimated time to the end of the first real fight: without the tutorial ${firstFightEst.toFixed(0)} s, with it ${(tutAnim + read + think + firstFightEst).toFixed(0)} s`);
    if (page.errors.length) console.log('Page errors:\n' + page.errors.join('\n'));
  } finally {
    await page.close();
    server.close();
  }
}

(async () => {
  const careful = nodeReport(chooseCombatAction, 'careful (blocks whenever damage would get through)');
  console.log('');
  const bold = nodeReport(aggressiveAction, 'aggressive (attacks first)');
  if (args.includes('--ui')) await uiReport({ medianThink: (careful.medianThink + bold.medianThink) / 2 });
})().catch((e) => { console.error(e); process.exit(1); });
