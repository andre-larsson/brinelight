#!/usr/bin/env node
/* UI smoke test: plays Brinelight through the real interface in headless Chrome.
   - desktop 1280x800 with the mouse (clicks, a drag) and the keyboard
   - phone 390x844 with touch (taps, a drag)
   Fails on any JS error or console error, on a stuck screen, or on horizontal page overflow.
   Usage: node tests/ui-smoke.js [--port 8873] [--stops 6] [--full] [--only desktop|phone|tutorial|workshop|debug]
          [--root DIR --path /brinelight/]   (serve DIR and load the game from that sub-path) */
'use strict';
const path = require('path');
const { serve } = require('../tools/serve');
const { launch, sleep } = require('../tools/cdp');

const args = process.argv.slice(2);
const arg = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const PORT = +arg('port', process.env.PORT || 8873);
const STOPS = args.includes('--full') ? 99 : +arg('stops', 6);
const ONLY = arg('only', null);
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))); // folder to serve
const SUBPATH = arg('path', '/'); // where the game sits under ROOT, e.g. /brinelight/

const failures = [];
const log = (...a) => console.log(...a);

/* In-page helpers, injected once per page load. */
const HELPERS = `
window.__t = {
  B: () => window.Brinelight,
  idle() { const B = window.Brinelight; const r = B.run; if (!r) return true; if (r.screen !== 'combat') return true; const c = r.combat; return !B.ui.busy && (c.won || c.lost || c.phase === 'player'); },
  /* the move a simple player would make: a winning card, else an attack on the weakest enemy, else anything, else end turn */
  decide() {
    const B = window.Brinelight, E = B.E, BL = window.BL, r = B.run, c = r.combat;
    const alive = E.alive(c);
    const cards = c.hand.filter((x) => E.playable(r, x).ok && BL.CARDS[x.id].type !== 'status' && BL.CARDS[x.id].type !== 'curse');
    if (!cards.length) return null;
    const weakest = alive.slice().sort((a, b) => a.hp - b.hp)[0];
    const tgt = (x) => (E.needsTarget(x) ? weakest.uid : null);
    for (const x of cards) { const p = E.preview(r, x.uid, tgt(x)); if (p && p.won) return { uid: x.uid, target: tgt(x) }; }
    let inc = 0; alive.forEach((e) => { const i = E.intentInfo(r, e); if (i && i.dmg) inc += i.dmg * i.hits; });
    if (inc - c.player.ward > 6) { const w = cards.find((x) => (E.vals(x).ward || 0) > 0); if (w) return { uid: w.uid, target: tgt(w) }; }
    const atk = cards.find((x) => BL.CARDS[x.id].type === 'attack') || cards[0];
    return { uid: atk.uid, target: tgt(atk) };
  },
  handRects() { return Array.from(document.querySelectorAll('#hand .card')).map((el) => { const r = el.getBoundingClientRect(); return Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.width); }).join('|'); },
  overflowX() { return document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1; },
  scrollTo(sel) { const el = document.querySelector(sel); if (el) el.scrollIntoView({ block: 'center', inline: 'center' }); return !!el; },
};`;

async function inject(page) { await page.eval(HELPERS); }

async function waitIdle(page, what) {
  await page.waitFor('window.__t.idle()', 20000, what || 'idle');
  // in a fight, also wait for the hand to stop moving (cards fly in after a turn starts)
  let last = null;
  for (let i = 0; i < 40; i++) {
    const r = await page.eval('window.__t.handRects()');
    if (r === last) return;
    last = r;
    await sleep(90);
  }
}

/* Dismiss anything that teaches (first-time hints) so the run can continue. */
async function dismissHints(page) {
  for (let i = 0; i < 5; i++) {
    const has = await page.center('.coachmark:not([hidden]) [data-act="hintok"]');
    if (!has) return;
    await page.click('.coachmark:not([hidden]) [data-act="hintok"]');
    await sleep(120);
  }
}

/* Play one card through the interface. mode: 'click' | 'drag' | 'key' */
async function playCard(page, d, mode) {
  const before = await page.eval('window.Brinelight.run.combat.hand.length + ":" + window.Brinelight.run.stats.cardsPlayed');
  const cardSel = `#hand .card[data-uid="${d.uid}"]`;
  if (mode === 'key') {
    const idx = await page.eval(`window.Brinelight.run.combat.hand.findIndex((x) => x.uid === ${d.uid})`);
    await page.key(String((idx + 1) % 10));
    await sleep(250);
    if (d.target) {
      // arrow to the chosen target
      for (let i = 0; i < 6; i++) {
        const t = await page.eval('window.Brinelight.ui.target');
        if (t === d.target) break;
        await page.key('ArrowRight');
      }
    }
    await page.key('Enter');
  } else if (mode === 'drag') {
    const from = await page.center(cardSel);
    const to = d.target ? await page.center(`.unit.enemy[data-uid="${d.target}"] .sprite`) : await page.center('#field');
    await page.drag(from.x, from.y, to.x, to.y - (d.target ? 0 : 40), 10);
  } else {
    await page.click(cardSel);
    await sleep(320); // let the raised card settle, as a person would
    if (d.target && (await page.eval('window.Brinelight.E.alive(window.Brinelight.run.combat).length')) > 1) await page.click(`.unit.enemy[data-uid="${d.target}"] .sprite`);
    else await page.click(cardSel);
  }
  await sleep(100);
  await waitIdle(page, 'card play to finish');
  const after = await page.eval('window.Brinelight.run && window.Brinelight.run.combat ? window.Brinelight.run.combat.hand.length + ":" + window.Brinelight.run.stats.cardsPlayed : "done"');
  if (after === before) throw new Error(`card ${d.uid} (${mode}) was not played`);
}

async function fight(page, label, opts) {
  let plays = 0, turns = 0;
  for (let guard = 0; guard < 400; guard++) {
    await waitIdle(page, 'combat idle');
    await dismissHints(page);
    const st = await page.eval(`(() => { const r = window.Brinelight.run; if (!r || r.screen !== 'combat') return 'left'; const c = r.combat; return c.won ? 'won' : c.lost ? 'lost' : 'play'; })()`);
    if (st === 'left') return { plays, turns };
    if (st !== 'play') { await sleep(300); continue; }
    // README claims: the keeper shows the damage that will get past Ward, and End Turn lights up when nothing is playable
    const ui = await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run, c = r.combat; let inc = 0; E.alive(c).forEach((e) => { const i = E.intentInfo(r, e); if (i && i.dmg) inc += i.dmg * i.hits; }); const el = document.querySelector('.unit.player .incoming'); return { inc, unblocked: Math.max(0, inc - c.player.ward), shown: el ? el.innerText.trim() : '', anyPlayable: c.hand.some((x) => E.playable(r, x).ok), endLit: document.getElementById('btn-end').classList.contains('primary') }; })()`);
    const expectShown = ui.inc ? (ui.unblocked ? String(ui.unblocked) : 'Blocked') : '';
    if (ui.shown !== expectShown) failures.push(`${label}: keeper shows incoming "${ui.shown}", expected "${expectShown}"`);
    if (ui.endLit === ui.anyPlayable) failures.push(`${label}: End Turn ${ui.endLit ? 'lit' : 'not lit'} while ${ui.anyPlayable ? 'a card is' : 'nothing is'} playable`);
    const d = await page.eval('window.__t.decide()');
    if (d) {
      const mode = opts.keyboardTurns && turns % 2 === 1 ? 'key' : (plays === 1 && opts.drag) ? 'drag' : 'click';
      await playCard(page, d, mode);
      plays++;
    } else {
      if (opts.keyboardTurns && turns % 2 === 1) await page.key('e');
      else await page.click('#btn-end');
      turns++;
      await sleep(200);
    }
  }
  throw new Error(label + ': fight did not end');
}

async function clickIf(page, sel) {
  if (!(await page.eval(`!!document.querySelector(${JSON.stringify(sel)})`))) return false;
  await page.eval(`window.__t.scrollTo(${JSON.stringify(sel)})`);
  await sleep(80);
  await page.click(sel);
  await sleep(150);
  return true;
}

/* Handle overlays a stop can open (deck picks, card choices, confirmations). */
async function handleOverlay(page) {
  for (let i = 0; i < 4; i++) {
    const open = await page.eval(`!document.getElementById('overlay').hidden`);
    if (!open) return;
    if (await clickIf(page, '#overlay [data-act="choosecard"][data-i]')) continue;
    if (await clickIf(page, '#overlay [data-act="deckconfirm"]')) continue;
    if (await clickIf(page, '#overlay [data-act="buyconfirm"]')) continue;
    if (await clickIf(page, '#overlay [data-act="deckpick"]')) continue;
    if (await clickIf(page, '#overlay [data-act="close"]')) continue;
    throw new Error('stuck on an overlay: ' + (await page.eval(`document.getElementById('overlay').innerText.slice(0, 120)`)));
  }
}

async function playStops(page, label, opts) {
  const visited = [];
  for (let stop = 0; stop < STOPS; stop++) {
    await waitIdle(page);
    await dismissHints(page);
    await handleOverlay(page);
    const screen = await page.eval('window.Brinelight.run ? window.Brinelight.run.screen : "title"');
    if (screen === 'victory' || screen === 'defeat') { visited.push(screen); break; }
    if (screen !== 'map') throw new Error(`${label}: expected the map, got ${screen}`);
    // choose a node type not seen yet, to cover more screens
    const idx = await page.eval(`(() => { const B = window.Brinelight; const av = B.E.availableNodes(B.run); const seen = ${JSON.stringify(visited)}; let i = av.findIndex((n) => seen.indexOf(n.type) < 0 && n.type !== 'elite'); return i < 0 ? 0 : i; })()`);
    const type = await page.eval(`window.Brinelight.E.availableNodes(window.Brinelight.run)[${idx}].type`);
    const sel = `.node.avail[data-idx="${idx}"]`;
    await page.eval(`window.__t.scrollTo(${JSON.stringify(sel)})`);
    await sleep(100);
    await page.click(sel);
    visited.push(type);
    await sleep(250);
    await dismissHints(page);
    const s2 = await page.eval('window.Brinelight.run.screen');
    if (s2 === 'combat') {
      await sleep(400);
      const r = await fight(page, `${label} stop ${stop + 1}`, opts);
      log(`  ${label}: stop ${stop + 1} fight done (${r.plays} cards, ${r.turns} turn ends)`);
      await page.waitFor('window.Brinelight.run.screen !== "combat"', 8000, 'leave combat');
    }
    await afterStop(page, label);
  }
  return visited;
}

/* Keepsake picks alternate between taking one and leaving them, so both paths run. */
let ksTurn = 0;
async function decideKeepsake(page, label, takeAct) {
  if (!(await page.eval(`!!document.querySelector('[data-act="${takeAct}"]')`))) return;
  // a keepsake on offer is taken or left before Continue is offered
  if (await page.eval(`!!document.querySelector('[data-act="tomap"]')`)) failures.push(`${label}: Continue was offered before the keepsake pick was decided`);
  if (!(await page.eval(`!!document.querySelector('.ks-pick .k-charge') && !!document.querySelector('.ks-pick .k-after')`))) failures.push(`${label}: the keepsake pick doesn't show Charge`);
  if (ksTurn++ % 2) await clickIf(page, '[data-act="leaveks"]');
  else await clickIf(page, `[data-act="${takeAct}"]`);
}

async function afterStop(page, label) {
  for (let guard = 0; guard < 12; guard++) {
    await waitIdle(page);
    await dismissHints(page);
    await handleOverlay(page);
    const s = await page.eval('window.Brinelight.run ? window.Brinelight.run.screen : "title"');
    if (s === 'map' || s === 'victory' || s === 'defeat' || s === 'title') return;
    if (s === 'combat') { await fight(page, label + ' event fight', {}); continue; }
    if (s === 'reward') {
      await clickIf(page, '[data-act="taketonic"]:not([disabled])');
      await clickIf(page, '[data-act="rewardcard"][data-i="0"]');
      await decideKeepsake(page, label, 'rewardks');
      await clickIf(page, '[data-act="tomap"]');
    } else if (s === 'rest') {
      if (!(await clickIf(page, '[data-act="rest"]'))) await clickIf(page, '[data-act="tomap"]');
      else await clickIf(page, '[data-act="tomap"]');
    } else if (s === 'shop') {
      // buying asks first; confirm it, and check the shop kept its scroll position
      if (await clickIf(page, '[data-act="buy"][data-kind="cards"]')) {
        const y0 = await page.eval(`document.querySelector('.scene').scrollTop`);
        await handleOverlay(page);
        if (await page.eval(`!!document.querySelector('#overlay:not([hidden])')`)) failures.push(`${label}: the shop's buy confirmation did not close`);
        const y1 = await page.eval(`document.querySelector('.scene') ? document.querySelector('.scene').scrollTop : -1`);
        if (Math.abs(y1 - y0) > 2) failures.push(`${label}: the shop scrolled from ${y0} to ${y1} after a purchase`);
      }
      await clickIf(page, '[data-act="tomap"]');
    } else if (s === 'treasure') {
      await clickIf(page, '[data-act="opentreasure"]');
      await decideKeepsake(page, label, 'treasureks');
      await clickIf(page, '[data-act="tomap"]');
    } else if (s === 'event') {
      if (!(await clickIf(page, '[data-act="evopt"]:not([disabled])'))) await clickIf(page, '[data-act="evcontinue"]');
      await handleOverlay(page);
      await clickIf(page, '[data-act="evcontinue"]');
    }
    await sleep(200);
  }
  throw new Error(label + ': stuck after a stop');
}

async function checkPage(page, label) {
  if (await page.eval('window.__t.overflowX()')) failures.push(`${label}: horizontal page overflow`);
}

async function startRun(page, base, seed) {
  await page.goto(base + `?seed=${seed}`);
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); })()`);
  await page.goto(base + `?seed=${seed}`);
  await inject(page);
  await page.click('[data-act="newrun"]');
  await sleep(200);
  // first launch offers the tutorial; this scenario skips it
  await clickIf(page, '[data-act="tutorialskip"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map after New Descent');
}

async function scenario(page, base, name, size, opts) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'mouse+keyboard'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  await startRun(page, base, opts.seed);
  await checkPage(page, name + ' map');
  const visited = await playStops(page, name, opts);
  await checkPage(page, name + ' after stops');
  log(`  ${name}: visited ${visited.join(', ')}`);
  // save and continue: reload the page, press Continue, and find the same run
  const before = await page.eval('JSON.stringify({ f: window.Brinelight.run.floor, hp: window.Brinelight.run.hp, d: window.Brinelight.run.deck.length, s: window.Brinelight.run.screen })');
  if (!/victory|defeat/.test(before)) {
    await page.goto(base + `?seed=${opts.seed}`);
    await inject(page);
    await page.click('[data-act="continue"]');
    await sleep(200);
    const after = await page.eval('JSON.stringify({ f: window.Brinelight.run.floor, hp: window.Brinelight.run.hp, d: window.Brinelight.run.deck.length, s: window.Brinelight.run.screen })');
    if (after !== before) failures.push(`${name}: Continue restored ${after}, expected ${before}`);
  }
  if (page.errors.length) failures.push(`${name}: page errors:\n    ` + page.errors.join('\n    '));
}

/* A summoned enemy has to fade out when it dies, like any other. The boss's minnows once stayed
   on the field at 0 HP, because the summon's rise animation overrode the death fade. */
async function summonDeathCheck(page, base) {
  log('summoned enemy death: 1280x800');
  await page.viewport(1280, 800);
  page.errors.length = 0;
  await startRun(page, base, 3333);
  await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; E.startCombat(r, 'boss', ['bell']); r.combat.enemies[0].intent = 'shoal'; B.render(); })()`);
  await waitIdle(page);
  await dismissHints(page);
  await page.click('#btn-end');
  await waitIdle(page);
  await dismissHints(page);
  const n = await page.eval(`window.Brinelight.run.combat.enemies.filter((e) => e.id === 'minnow' && !e.dead).length`);
  if (n !== 2) { failures.push(`summon check: the boss called ${n} minnows, expected 2`); return; }
  await page.eval(`window.Brinelight.run.combat.enemies.forEach((e) => { if (e.id === 'minnow') e.st.brine = 99; })`);
  await page.click('#btn-end');
  await waitIdle(page);
  await sleep(1000);
  const shown = await page.eval(`window.Brinelight.run.combat.enemies.filter((e) => e.id === 'minnow').map((e) => { const el = document.querySelector('.unit[data-uid="' + e.uid + '"]'); return e.dead + ':' + (el ? getComputedStyle(el).visibility : 'none'); }).join(',')`);
  if (shown !== 'true:hidden,true:hidden') failures.push(`a summoned enemy stayed on the field after dying (dead:visibility = ${shown})`);
  if (page.errors.length) failures.push('summon check: page errors:\n    ' + page.errors.join('\n    '));
}

/* The Workshop: lasting state from before v0.10.0 carries over, buy kit with Salvage, wear it for a dive,
   see it in the run with keepsake Charge, drop a keepsake, and earn Salvage and an unlock at the end. */
async function workshopScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'mouse'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  await page.goto(base + '?seed=4444');
  // stored in the v0.9.0 shape: gear owned and packed
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); localStorage.setItem('brinelight.tutorial.v1', 'done');
    localStorage.setItem('brinelight.meta.v1', JSON.stringify({ salvage: 60, earned: 60, owned: ['purse'], packed: ['purse'], ach: ['twocrests'] })); })()`);
  await page.goto(base + '?seed=4444');
  await inject(page);
  const stored = () => page.eval(`JSON.parse(localStorage.getItem('brinelight.meta.v1'))`);
  await page.click('[data-act="workshop"]');
  await sleep(150);
  if (await page.eval(`!!document.querySelector('#overlay [data-act="kitbuy"][data-g="crackedbell"]')`)) failures.push(`${name}: locked kit can be bought`);
  if (await page.eval(`document.querySelectorAll('#overlay .ws-place').length`) !== 5) failures.push(`${name}: the Workshop doesn't group kit by its five places`);
  for (const g of ['cork', 'floodbell']) {
    await clickIf(page, `#overlay [data-act="kitbuy"][data-g="${g}"]`);
    await clickIf(page, '#overlay [data-act="kitbuyconfirm"]');
  }
  let m = await stored();
  if (m.owned.join() !== 'purse,cork,floodbell' || m.salvage !== 60 - 12 - 20) failures.push(`${name}: after buying, stored ${JSON.stringify(m)}`);
  if (!m.kit || m.kit.pocket !== 'purse' || m.kit.coat !== 'cork' || m.kit.bell !== 'tidebell') failures.push(`${name}: the old pack or the new Cork Vest isn't worn: ${JSON.stringify(m.kit)}`);
  await checkPage(page, name + ' workshop');
  await clickIf(page, '#overlay [data-act="close"]');
  // New Descent opens the kit; put on the Flood Bell, take off the Cork Vest
  await page.click('[data-act="newrun"]');
  await page.waitFor(`!!document.querySelector('#overlay [data-act="dive"]')`, 3000, 'the kit before a dive');
  await checkPage(page, name + ' kit');
  await clickIf(page, '#overlay [data-act="kitwear"][data-g="floodbell"]');
  await clickIf(page, '#overlay [data-act="kitwear"][data-g="cork"]');
  m = await stored();
  if (m.kit.bell !== 'floodbell' || m.kit.coat !== null) failures.push(`${name}: wearing kit didn't stick: ${JSON.stringify(m.kit)}`);
  await clickIf(page, '#overlay [data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map after Dive');
  const kit = await page.eval('JSON.stringify(window.Brinelight.run.kit)');
  if (kit !== JSON.stringify({ harpoon: null, bell: 'floodbell', coat: null, pocket: 'purse', ditty: null })) failures.push(`${name}: the run took kit ${kit}`);
  if (!(await page.eval(`!!document.querySelector('.hud .medal.bell') && !!document.querySelector('.hud .gear-pack')`))) failures.push(`${name}: the bell or the kit is missing from the HUD`);
  if (await page.eval('window.Brinelight.run.pearls') !== 105) failures.push(`${name}: the Coin Purse didn't add its Pearls`);
  // keepsakes past the Hold: the HUD shows the Charge in red; drop one between fights
  await dismissHints(page);
  await page.eval(`(() => { const B = window.Brinelight; B.E.gainKeepsake(B.run, 'whaletooth'); B.E.gainKeepsake(B.run, 'stormbottle'); B.render(); })()`);
  await dismissHints(page);
  const chip = await page.eval(`(() => { const c = document.querySelector('.hud .charge'); return c ? c.className + ' ' + c.innerText : ''; })()`);
  if (!/over/.test(chip) || !/37\/30/.test(chip)) failures.push(`${name}: the HUD Charge reads "${chip}"`);
  await checkPage(page, name + ' charge');
  await page.click('.hud .medal[data-k="stormbottle"]');
  await page.waitFor(`!!document.querySelector('#overlay [data-act="ksdrop"]')`, 3000, 'the keepsake opens');
  await clickIf(page, '#overlay [data-act="ksdrop"]');
  if (await page.eval('window.Brinelight.run.keepsakes.join()') !== 'whaletooth') failures.push(`${name}: dropping a keepsake didn't work`);
  if (await page.eval(`!!document.querySelector('.hud .charge.over')`)) failures.push(`${name}: still over the Hold after dropping`);
  // the first fight: Seep joins it when over the Hold
  await page.eval(`(() => { const B = window.Brinelight; B.E.gainKeepsake(B.run, 'anchor'); B.render(); })()`);
  await dismissHints(page);
  await page.click('[data-act="node"]');
  await page.waitFor('window.Brinelight.run.screen !== "map"', 5000, 'the first stop');
  if (await page.eval('window.Brinelight.run.screen !== "combat"')) await page.eval(`(() => { const B = window.Brinelight; B.E.startCombat(B.run, 'easy'); B.render(); })()`);
  const seep = await page.eval(`(() => { const c = window.Brinelight.run.combat; return c.hand.concat(c.draw).filter((x) => x.id === 'seep').length; })()`);
  if (seep !== 2) failures.push(`${name}: ${seep} Seep in a fight at Charge 37 of 30`);
  // the run ends: Salvage from the score, and an achievement reached in it unlocks kit
  await waitIdle(page);
  await page.eval(`(() => { const B = window.Brinelight; B.run.stats.maxChain = 3; B.run.screen = 'defeat'; B.render(); })()`);
  await sleep(300);
  m = await stored();
  const expect = await page.eval('window.Brinelight.E.salvageFor(window.Brinelight.run.final.score)');
  if (m.salvage !== 28 + expect) failures.push(`${name}: Salvage after the run is ${m.salvage}, expected ${28 + expect}`);
  if (m.ach.indexOf('threecrests') < 0) failures.push(`${name}: Triple Crest wasn't unlocked`);
  if (!(await page.eval(`!!document.querySelector('.salvage-box') && /Cracked Bell/.test(document.body.innerText)`))) failures.push(`${name}: the end screen doesn't show the Salvage and the unlock`);
  await checkPage(page, name + ' end');
  // abandoning a run earns nothing
  const before = (await stored()).salvage;
  await page.click('[data-act="totitle"]');
  await sleep(150);
  await page.click('[data-act="newrun"]');
  await clickIf(page, '#overlay [data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map after a second Dive');
  await page.click('.hud [data-act="menu"]');
  await clickIf(page, '#overlay [data-act="abandon"]');
  await clickIf(page, '#overlay [data-act="confirmabandon"]');
  if ((await stored()).salvage !== before) failures.push(`${name}: abandoning a run changed the Salvage`);
  if (page.errors.length) failures.push(`${name}: page errors:\n    ` + page.errors.join('\n    '));
}

/* Debug mode: off by default, on with ?debug, and its cheats work and mark the run. */
async function debugScenario(page, base) {
  log('debug mode: 1280x800');
  await page.viewport(1280, 800);
  page.errors.length = 0;
  await page.goto(base + '?seed=5555');
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); localStorage.setItem('brinelight.tutorial.v1', 'done'); localStorage.setItem('brinelight.best.v1', '777'); })()`);
  await page.goto(base + '?seed=5555');
  if (await page.eval(`!!document.querySelector('.dbg-tab')`)) failures.push('debug: the DEBUG tab shows without ?debug');
  await page.goto(base + '?seed=5555&debug');
  await inject(page);
  await page.click('.dbg-tab');
  await sleep(150);
  await clickIf(page, '#overlay [data-dbg="salvage"]');
  await clickIf(page, '#overlay [data-dbg="allkit"]');
  await clickIf(page, '#overlay [data-dbg="depths"]');
  const m = await page.eval(`JSON.parse(localStorage.getItem('brinelight.meta.v1'))`);
  if (m.salvage !== 100 || m.owned.length !== Object.keys(await page.eval('window.BL.KIT')).length - 1) failures.push(`debug: Salvage and kit cheats stored ${JSON.stringify(m)}`);
  await clickIf(page, '#overlay [data-act="close"]');
  // a run: god mode holds HP through an enemy turn, the Tide can be set, and Win the fight leads to the rewards
  await page.click('[data-act="newrun"]');
  await clickIf(page, '#overlay [data-act="startlevel"][data-lv="0"]');
  await clickIf(page, '#overlay [data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map in debug mode');
  await dismissHints(page);
  await page.click('[data-act="node"]');
  await page.waitFor('window.Brinelight.run.screen !== "map"', 5000, 'the first stop');
  if (await page.eval('window.Brinelight.run.screen !== "combat"')) await page.eval(`(() => { const B = window.Brinelight; B.E.startCombat(B.run, 'easy'); B.render(); })()`);
  await waitIdle(page);
  await dismissHints(page);
  await page.key('`');
  await sleep(150);
  await clickIf(page, '#overlay [data-dbg="god"]');
  await clickIf(page, '#overlay [data-dbg="tide"][data-n="5"]');
  if ((await page.eval('window.Brinelight.run.combat.tide')) !== 5) failures.push('debug: setting the Tide did nothing');
  await clickIf(page, '#overlay [data-act="close"]');
  const hp = await page.eval('window.Brinelight.run.hp');
  await page.click('#btn-end');
  await waitIdle(page);
  if ((await page.eval('window.Brinelight.run.hp')) !== hp) failures.push('debug: god mode let damage through');
  await dismissHints(page);
  await page.key('`');
  await sleep(150);
  await clickIf(page, '#overlay [data-dbg="win"]');
  await page.waitFor('window.Brinelight.run.screen === "reward"', 6000, 'rewards after Win the fight');
  // lose the next fight: a cheated run keeps no best score
  await page.eval(`(() => { const B = window.Brinelight; B.E.backToMap(B.run); B.render(); })()`);
  await page.key('`');
  await sleep(150);
  await clickIf(page, '#overlay [data-dbg="go"][data-type="elite"]');
  await waitIdle(page);
  await dismissHints(page);
  await page.key('`');
  await sleep(150);
  await clickIf(page, '#overlay [data-dbg="lose"]');
  await page.waitFor('window.Brinelight.run.screen === "defeat"', 6000, 'defeat after Lose the fight');
  await sleep(300);
  if ((await page.eval(`localStorage.getItem('brinelight.best.v1')`)) !== '777') failures.push('debug: a cheated run changed the best score');
  if (!(await page.eval(`/Debug run/.test(document.body.innerText)`))) failures.push('debug: the end screen does not say it was a debug run');
  // ?debug=0 turns it off again
  await page.goto(base + '?debug=0');
  if (await page.eval(`!!document.querySelector('.dbg-tab')`)) failures.push('debug: ?debug=0 did not turn it off');
  if (page.errors.length) failures.push('debug: page errors:\n    ' + page.errors.join('\n    '));
}

/* The guided first fight, start to finish, with one input method. */
async function tutorialScenario(page, base, name, size, input) {
  log(`${name}: ${size.w}x${size.h} ${input}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  await page.goto(base);
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); localStorage.setItem('brinelight.best.v1', '1234'); })()`);
  await page.goto(base);
  await inject(page);
  // first launch: New Descent offers the tutorial
  await page.click('[data-act="newrun"]');
  await sleep(250);
  await page.click('#overlay [data-act="tutorial"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.tutorial', 4000, 'tutorial run');
  const t0 = Date.now();
  let actions = 0;
  for (let guard = 0; guard < 80; guard++) {
    await waitIdle(page, 'tutorial idle');
    if (await page.eval('!document.getElementById("overlay").hidden')) break;
    const s = await page.eval('window.Brinelight.teach.stepSpec()');
    if (!s) { await sleep(200); continue; }
    await page.waitFor('!document.querySelector(".coachmark").hidden', 4000, 'bubble for ' + s.id);
    if (s.info) {
      if (input === 'keyboard') await page.key('Enter'); else await page.click('.coachmark [data-act="tutnext"]');
      actions++;
    } else if (s.endTurn) {
      if (input === 'keyboard') await page.key('e'); else await page.click('#btn-end');
      actions++;
      await sleep(300);
    } else {
      // try a wrong card first once, to check the gate holds
      if (s.id === 'attack') {
        const wrong = await page.eval(`(() => { const c = window.Brinelight.run.combat; const x = c.hand.find((k) => k.id !== ${JSON.stringify(s.play.card)}); return x ? x.uid : null; })()`);
        if (wrong) {
          await page.click(`#hand .card[data-uid="${wrong}"]`); await sleep(320); await page.click(`#hand .card[data-uid="${wrong}"]`); await sleep(200);
          const played = await page.eval('window.Brinelight.run.stats.cardsPlayed');
          if (played) failures.push(`${name}: the tutorial let a wrong card be played`);
          await page.key('Escape');
        }
      }
      const d = await page.eval(`(() => { const c = window.Brinelight.run.combat; const card = c.hand.find((k) => k.id === ${JSON.stringify(s.play.card)}); const t = ${JSON.stringify(s.play.target)} ? c.enemies.find((e) => e.id === ${JSON.stringify(s.play.target)} && !e.dead) : null; return { uid: card.uid, target: t ? t.uid : null }; })()`);
      const mode = input === 'keyboard' ? 'key' : (s.id === 'crest' ? 'drag' : 'click');
      await playCard(page, d, mode);
      actions++;
    }
    await sleep(150);
  }
  await page.waitFor('!document.getElementById("overlay").hidden && /Tutorial complete/.test(document.getElementById("overlay").innerText)', 8000, 'tutorial complete');
  const secs = (Date.now() - t0) / 1000;
  log(`  ${name}: tutorial finished, ${actions} steps acted on, ${secs.toFixed(0)} s headless`);
  await page.click('#overlay [data-act="tutback"]');
  await sleep(200);
  const st = await page.eval(`JSON.stringify({ save: localStorage.getItem('brinelight.save.v1'), best: localStorage.getItem('brinelight.best.v1'), tut: localStorage.getItem('brinelight.tutorial.v1'), run: !!window.Brinelight.run })`);
  const o = JSON.parse(st);
  if (o.save) failures.push(`${name}: the tutorial left a saved run`);
  if (o.best !== '1234') failures.push(`${name}: the tutorial changed the best score (${o.best})`);
  if (o.tut !== 'done') failures.push(`${name}: tutorial not marked done (${o.tut})`);
  if (o.run) failures.push(`${name}: expected the title screen after the tutorial`);
  // New Descent no longer offers it, and starts a run
  await page.click('[data-act="newrun"]');
  await sleep(250);
  if (await page.eval('!!document.querySelector("#overlay [data-act=\\"tutorial\\"]")')) failures.push(`${name}: offered the tutorial again`);
  await checkPage(page, name);
  if (page.errors.length) failures.push(`${name}: page errors:\n    ` + page.errors.join('\n    '));
}

/* A real run survives a trip into the tutorial and back. */
async function tutorialMidRun(page, base) {
  log('tutorial from a run: desktop');
  await page.viewport(1280, 800, {});
  page.errors.length = 0;
  await startRun(page, base, 3333);
  await clickIf(page, '.node.avail[data-idx="0"]');
  await sleep(600);
  await dismissHints(page);
  await waitIdle(page);
  const d = await page.eval('window.__t.decide()');
  if (d) await playCard(page, d, 'click');
  const before = await page.eval('JSON.stringify({ hp: window.Brinelight.run.hp, hand: window.Brinelight.run.combat.hand.length, e: window.Brinelight.run.combat.enemies.map((x) => x.hp), seed: window.Brinelight.run.seed })');
  await page.click('.hud [data-act="menu"]');
  await sleep(200);
  await page.click('#overlay [data-act="tutorial"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.tutorial', 4000, 'tutorial from menu');
  await waitIdle(page);
  await page.click('.coachmark [data-act="tutskip"]');
  await sleep(300);
  const after = await page.eval('window.Brinelight.run ? JSON.stringify({ hp: window.Brinelight.run.hp, hand: window.Brinelight.run.combat.hand.length, e: window.Brinelight.run.combat.enemies.map((x) => x.hp), seed: window.Brinelight.run.seed }) : "none"');
  if (after !== before) failures.push(`tutorial from a run: came back to ${after}, expected ${before}`);
  // save and quit in the middle of an enemy turn waits for the turn to end, then Continue picks it up
  await dismissHints(page);
  await waitIdle(page);
  await page.click('#btn-end');
  await sleep(250);
  await page.click('.hud [data-act="menu"]');
  await sleep(150);
  await page.click('#overlay [data-act="totitle"]');
  await page.waitFor('!window.Brinelight.run && !!document.querySelector(\'[data-act="continue"]\')', 15000, 'title after save and quit');
  await page.click('[data-act="continue"]');
  await sleep(300);
  const turn = await page.eval('window.Brinelight.run && window.Brinelight.run.combat ? window.Brinelight.run.combat.turn : 0');
  if (turn < 2) failures.push(`save and quit during the enemy turn: continued at turn ${turn}, expected the next turn`);
  if (page.errors.length) failures.push('tutorial from a run: page errors:\n    ' + page.errors.join('\n    '));
}

(async () => {
  const server = await serve(PORT, ROOT);
  const page = await launch();
  const base = `http://127.0.0.1:${PORT}${SUBPATH}`;
  const t0 = Date.now();
  try {
    if (!ONLY || ONLY === 'tutorial') {
      await tutorialScenario(page, base, 'tutorial desktop mouse', { w: 1280, h: 800 }, 'mouse');
      await tutorialScenario(page, base, 'tutorial phone touch', { w: 390, h: 844, mobile: true, touch: true }, 'touch');
      await tutorialScenario(page, base, 'tutorial desktop keyboard', { w: 1280, h: 800 }, 'keyboard');
      await tutorialMidRun(page, base);
    }
    if (!ONLY || ONLY === 'desktop') await scenario(page, base, 'desktop', { w: 1280, h: 800 }, { seed: 1111, drag: true, keyboardTurns: true });
    if (!ONLY || ONLY === 'desktop') await summonDeathCheck(page, base);
    if (!ONLY || ONLY === 'phone') await scenario(page, base, 'phone', { w: 390, h: 844, mobile: true, touch: true }, { seed: 2222, drag: true });
    if (!ONLY || ONLY === 'debug') await debugScenario(page, base);
    if (!ONLY || ONLY === 'workshop') {
      await workshopScenario(page, base, 'workshop desktop', { w: 1280, h: 800 });
      await workshopScenario(page, base, 'workshop phone', { w: 390, h: 844, mobile: true, touch: true });
    }
  } catch (e) {
    failures.push('crashed: ' + (e.stack || e));
    try { await page.screenshot(path.join(__dirname, '..', 'ui-smoke-failure.png')); failures.push('screenshot: ui-smoke-failure.png'); } catch (e2) { /* ignore */ }
    if (page.errors.length) failures.push('page errors:\n    ' + page.errors.join('\n    '));
  } finally {
    await page.close();
    server.close();
  }
  log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  if (failures.length) { console.error('UI SMOKE FAILED\n- ' + failures.join('\n- ')); process.exit(1); }
  log('UI smoke test passed');
})();
