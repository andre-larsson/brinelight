#!/usr/bin/env node
/* UI smoke test: plays Brinelight through the real interface in headless Chrome.
   - desktop 1280x800 with the mouse (clicks, a drag) and the keyboard
   - phone 390x844 with touch (taps, a drag)
   Fails on any JS error or console error, on a stuck screen, or on horizontal page overflow.
   Usage: node tests/ui-smoke.js [--port 8873] [--stops 6] [--full] [--only desktop|phone|tutorial|workshop|lazaret|story|debug]
          [--only darkwater|belfry|progress|finds|workshop|audio|music-unlocks|choices|mateo|outfits] [--workers 4]
          [--root DIR --path /brinelight/]   (serve DIR and load the game from that sub-path)
   Each scenario starts from cleared storage, so they run on several headless Chromes at once (--workers, 4 unless
   given; each has its own throwaway profile, so their saves don't meet). --workers 1 plays them one after another. */
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
const WORKERS = Math.max(1, Math.floor(+arg('workers', 4)) || 1);

const failures = [];
/* v0.33.0: a story scene plays the first time a pin breaks and on the end screen, and a "New at the lighthouse" window
   says what opened. The Belfry and Lazaret scenarios go through them; the others start with them seen and told. */
const SEEN_SCENES = ['hermit', 'buoy', 'dress', 'heart', 'fall', 'knocking'];
const TOLD = ['workshop', 'lazaret', 'suit', 'currents', 'outfit:lamplighter', 'outfit:shells', 'outfit:gala', 'outfit:longjohns'];
const QUIET_STORY = JSON.stringify(JSON.stringify({ opening: true, scenes: SEEN_SCENES }));
const QUIET_META = `localStorage.setItem('brinelight.meta.v1', ${JSON.stringify(JSON.stringify({ told: TOLD }))});`;
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
    const weakest = E.targets(c).slice().sort((a, b) => a.hp - b.hp)[0]; // a Submerged enemy is out of reach
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
  for (let i = 0; i < 60; i++) {
    const r = await page.eval('window.__t.handRects()');
    if (r === last) return;
    last = r;
    await sleep(60);
  }
}

/* Dismiss anything that teaches (first-time hints) so the run can continue. */
async function dismissHints(page) {
  for (let i = 0; i < 5; i++) {
    if (await page.center('#overlay [data-act="hesterbrief"]')) { await clickIf(page, '#overlay [data-act="hesterbrief"]'); continue; }
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
    await page.click(cardSel); // the next click waits for the raised card to hold still (page.click)
    if (d.target && (await page.eval('window.Brinelight.E.alive(window.Brinelight.run.combat).length')) > 1) await page.click(`.unit.enemy[data-uid="${d.target}"] .sprite`);
    else await page.click(cardSel);
  }
  await sleep(30);
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
    const ui = await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run, c = r.combat; let inc = c.thrash || 0; E.alive(c).forEach((e) => { const i = E.intentInfo(r, e); if (i && i.dmg) inc += i.dmg * i.hits; }); const el = document.querySelector('.unit.player .incoming'); return { inc, unblocked: Math.max(0, inc - c.player.ward), shown: el ? el.innerText.trim() : '', anyPlayable: c.hand.some((x) => E.playable(r, x).ok), endLit: document.getElementById('btn-end').classList.contains('primary') }; })()`);
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

async function checkModalScrollCue(page, label) {
  const top = await page.eval(`(() => { const sc = document.querySelector('#overlay .modal-body'); const cue = sc.parentElement.querySelector('.scroll-cue'); return { scrolls: sc.scrollHeight - sc.clientHeight > 2, shown: !!cue && !cue.hidden }; })()`);
  if (top.scrolls !== top.shown) failures.push(`${label}: More below should match the available scroll`);
  await page.eval(`(() => { const sc = document.querySelector('#overlay .modal-body'); sc.scrollTop = sc.scrollHeight; })()`);
  await sleep(150);
  if (await page.eval(`!!document.querySelector('#overlay .scroll-cue:not([hidden])')`)) failures.push(`${label}: More below stayed visible at the bottom`);
  await page.eval(`document.querySelector('#overlay .modal-body').scrollTop = 0`);
}

/* Handle overlays a stop can open (deck picks, card choices, confirmations). */
async function handleOverlay(page) {
  for (let i = 0; i < 4; i++) {
    const open = await page.eval(`!document.getElementById('overlay').hidden`);
    if (!open) return;
    // a card choice (v0.36.0): mark one, then take it
    if (await clickIf(page, '#overlay [data-act="pick"][data-scope="choice"]')) { await clickIf(page, '#overlay [data-act="pickok"]:not([disabled])'); continue; }
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

/* Keepsake picks alternate between taking one and leaving them, so both paths run (counted per scenario, page.ksTurn).
   Since v0.36.0 a tap marks the keepsake and the Take button takes it. `scope` is rw-ks (a Dread's reward) or tr-ks (a Wreck). */
async function decideKeepsake(page, label, scope) {
  const sel = `[data-act="pick"][data-scope="${scope}"]`;
  if (!(await page.eval(`!!document.querySelector('${sel}')`))) return;
  // a keepsake on offer is taken or left before Continue is offered
  if (await page.eval(`!!document.querySelector('[data-act="tomap"]')`)) failures.push(`${label}: Continue was offered before the keepsake pick was decided`);
  if (!(await page.eval(`!!document.querySelector('.ks-pick .k-charge') && !!document.querySelector('.ks-pick .k-after')`))) failures.push(`${label}: the keepsake pick doesn't show Roil`);
  if ((page.ksTurn = (page.ksTurn || 0) + 1) % 2 === 0) { await clickIf(page, '[data-act="leaveks"]'); return; }
  const ks0 = await page.eval('window.Brinelight.run.keepsakes.length');
  await clickIf(page, sel);
  if ((await page.eval('window.Brinelight.run.keepsakes.length')) !== ks0) failures.push(`${label}: marking a keepsake took it before Take was pressed`);
  if (!(await page.eval(`!!document.querySelector('${sel}.picked') && !!document.querySelector('[data-act="pickok"][data-scope="${scope}"]:not([disabled])')`))) failures.push(`${label}: a marked keepsake isn't shown, or its Take button isn't ready`);
  await clickIf(page, `[data-act="pickok"][data-scope="${scope}"]:not([disabled])`);
  if ((await page.eval('window.Brinelight.run.keepsakes.length')) !== ks0 + 1) failures.push(`${label}: Take didn't take the marked keepsake`);
}

/* A Dread's reward (v0.40.0): one pick, a card from three or its keepsake, marked with one scope (rw-one). Marking takes
   nothing, a second mark moves it from a card to the keepsake, and Take takes the marked one and closes the other.
   Alternates between taking the keepsake and a card (page.dreadTurn). */
async function decideDread(page, label) {
  const sel = '[data-act="pick"][data-scope="rw-one"]';
  if (!(await page.eval(`!!document.querySelector('${sel}')`))) return;
  if (await page.eval(`!!document.querySelector('[data-act="tomap"]')`)) failures.push(`${label}: Continue was offered before the Dread's pick was decided`);
  const st0 = await page.eval('(() => { const r = window.Brinelight.run; return { ks: r.keepsakes.length, deck: r.deck.length, cards: document.querySelectorAll(".card[data-scope=\'rw-one\']").length, tiles: document.querySelectorAll(".ks-pick[data-scope=\'rw-one\']").length }; })()');
  if (st0.cards !== 3 || st0.tiles !== 1) failures.push(`${label}: a Dread should offer 3 cards and 1 keepsake (${st0.cards}, ${st0.tiles})`);
  const takeKs = (page.dreadTurn = (page.dreadTurn || 0) + 1) % 2 === 1;
  await clickIf(page, `.card${sel}[data-key="0"]`);
  await clickIf(page, `.ks-pick${sel}`);
  if (!takeKs) await clickIf(page, `.card${sel}[data-key="1"]`);
  const st = await page.eval(`(() => { const r = window.Brinelight.run; return { ks: r.keepsakes.length, deck: r.deck.length, picked: [...document.querySelectorAll('${sel}.picked')].length,
    ok: !!document.querySelector('[data-act="pickok"][data-scope="rw-one"]:not([disabled])') }; })()`);
  if (st.ks !== st0.ks || st.deck !== st0.deck) failures.push(`${label}: marking in a Dread's pick took something before Take was pressed`);
  if (st.picked !== 1) failures.push(`${label}: a Dread's pick should have exactly one mark across cards and keepsake (${st.picked})`);
  if (!st.ok) failures.push(`${label}: the Dread's Take button isn't ready after a mark`);
  await clickIf(page, '[data-act="pickok"][data-scope="rw-one"]:not([disabled])');
  const st1 = await page.eval('(() => { const r = window.Brinelight.run; return { ks: r.keepsakes.length, deck: r.deck.length }; })()');
  if (takeKs && (st1.ks !== st0.ks + 1 || st1.deck !== st0.deck)) failures.push(`${label}: Take should take the Dread's keepsake and no card`);
  if (!takeKs && (st1.deck !== st0.deck + 1 || st1.ks !== st0.ks)) failures.push(`${label}: Take should take the marked card and not the keepsake`);
}

/* A reward card is marked first and taken with the button below it (v0.36.0, the user: "pressing card does not lock
   choice, until continue is pressed. Selecting a card shows explanations of effects for that card only"). Marking takes
   nothing, a second mark moves it, the legend explains only words on the marked card, and Take adds it to the deck. */
async function pickRewardCard(page, label) {
  const sel = '[data-act="pick"][data-scope="rw-card"]';
  const n = await page.eval(`document.querySelectorAll('${sel}').length`);
  if (!n) return;
  const deck0 = await page.eval('window.Brinelight.run.deck.length');
  await clickIf(page, `${sel}[data-key="${n - 1}"]`);
  if (n > 1) await clickIf(page, `${sel}[data-key="0"]`);
  const st = await page.eval(`(() => { const r = window.Brinelight.run; const picked = [...document.querySelectorAll('${sel}.picked')];
    const txt = picked.length ? picked[0].innerText.toLowerCase() : '';
    const shown = [...document.querySelectorAll('.pick-legend [data-kw]')].map((d) => d.dataset.kw);
    const near = (k) => txt.indexOf(k.toLowerCase()) >= 0 || shown.some((o) => o !== k && txt.indexOf(o.toLowerCase()) >= 0 && window.BL.KEYWORDS[o].indexOf(k) >= 0);
    return { taken: r.rewards.cardTaken, deck: r.deck.length, picked: picked.map((e) => e.dataset.key), stray: shown.filter((k) => !near(k)),
      legend: !!document.querySelector('.pick-legend'), ok: !!document.querySelector('[data-act="pickok"][data-scope="rw-card"]:not([disabled])') }; })()`);
  if (st.taken || st.deck !== deck0) failures.push(`${label}: marking a reward card took it before Take was pressed`);
  if (st.picked.join(',') !== '0') failures.push(`${label}: a second tap didn't move the reward pick (${st.picked.join(',')})`);
  if (!st.legend || st.stray.length) failures.push(`${label}: the legend should explain only the marked card's words (also ${st.stray.join(', ')})`);
  if (!st.ok) failures.push(`${label}: the reward's Take button isn't ready after a pick`);
  await clickIf(page, '[data-act="pickok"][data-scope="rw-card"]:not([disabled])');
  if ((await page.eval('window.Brinelight.run.deck.length')) !== deck0 + 1) failures.push(`${label}: Take didn't add the marked card`);
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
      await decideDread(page, label);
      await pickRewardCard(page, label);
      await decideKeepsake(page, label, 'rw-ks');
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
      await decideKeepsake(page, label, 'tr-ks');
      await clickIf(page, '[data-act="tomap"]');
    } else if (s === 'toll') {
      // a toll bell (v0.41.0): pay the first way open, then go on
      if (!(await clickIf(page, '[data-act="toll"]:not([disabled])'))) failures.push(`${label}: no way to pay the toll`);
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
  // first launch plays the opening and offers the tutorial; this scenario skips both
  await clickIf(page, '[data-act="opskip"]');
  await clickIf(page, '[data-act="tutorialskip"]');
  await clickIf(page, '[data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map after New Descent');
  await dismissHints(page);
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

/* The Workshop: lasting state from before v0.10.0 carries over, buy kit with Salvage, wear it for a descent,
   see it in the run with keepsake Roil, drop a keepsake, and earn Salvage and an unlock at the end. */
async function workshopScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'mouse'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  await page.goto(base + '?seed=4444');
  // stored in the v0.9.0 shape: gear owned and packed
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); localStorage.setItem('brinelight.tutorial.v1', 'done'); localStorage.setItem('brinelight.story.v1', JSON.stringify({ opening: true, scenes: ['fall'] }));
    localStorage.setItem('brinelight.meta.v1', JSON.stringify({ salvage: 60, earned: 60, owned: ['purse'], packed: ['purse'], ach: ['twocrests'] })); })()`);
  await page.goto(base + '?seed=4444');
  await inject(page);
  const stored = () => page.eval(`JSON.parse(localStorage.getItem('brinelight.meta.v1'))`);
  await page.click('[data-act="workshop"]');
  await sleep(150);
  // Wren with a slot for each of the five places; a slot opens a tray with all the kit for that place
  if (await page.eval(`document.querySelectorAll('#overlay .doll .kit-slot').length`) !== 5) failures.push(`${name}: the Workshop doesn't show a slot for each of the five places`);
  const slot = async (pl) => { await clickIf(page, `#overlay [data-act="kitslot"][data-place="${pl}"]`); await sleep(100); };
  await slot('bell');
  if (await page.eval(`!!document.querySelector('#overlay [data-act="kitbuy"][data-g="crackedbell"]')`)) failures.push(`${name}: locked kit can be bought`);
  if (!(await page.eval(`!!document.querySelector('#overlay .kit-tray .kit-opt.locked')`))) failures.push(`${name}: the Bell's tray doesn't show its locked bells`);
  for (const [pl, g] of [['coat', 'cork'], ['bell', 'floodbell']]) {
    await slot(pl);
    await clickIf(page, `#overlay [data-act="kitbuy"][data-g="${g}"]`);
    await clickIf(page, '#overlay [data-act="kitbuyconfirm"]');
    await sleep(100);
    if (!(await page.eval(`!!document.querySelector('#overlay .kit-tray [data-act="kitwear"][data-g="${g}"]')`))) failures.push(`${name}: after buying ${g}, its tray isn't open again`);
  }
  let m = await stored();
  if (m.owned.join() !== 'purse,cork,floodbell' || m.salvage !== 60 - 12 - 20) failures.push(`${name}: after buying, stored ${JSON.stringify(m)}`);
  if (!m.kit || m.kit.pocket !== 'purse' || m.kit.coat !== 'cork' || m.kit.bell !== 'tidebell') failures.push(`${name}: the old pack or the new Cork Vest isn't worn: ${JSON.stringify(m.kit)}`);
  // Wren is shown in the coat she wears, and on a wide screen each slot has a line to her
  if (!/keeper_cork\.webp/.test(await page.eval(`document.querySelector('#overlay .doll-wren img').src`))) failures.push(`${name}: Wren isn't shown in the Cork Vest`);
  await sleep(150);
  const lines = await page.eval(`document.querySelectorAll('#overlay .doll-lines g').length`);
  if (size.w > 600 ? lines !== 5 : lines !== 0) failures.push(`${name}: ${lines} lines from the slots to Wren`);
  await checkPage(page, name + ' workshop');
  await clickIf(page, '#overlay [data-act="close"]');
  // New Descent opens the kit; put on the Flood Bell, take off the Cork Vest
  await page.click('[data-act="newrun"]');
  await page.waitFor(`!!document.querySelector('#overlay [data-act="dive"]')`, 3000, 'the kit before a descent');
  await checkPage(page, name + ' kit');
  await slot('bell');
  await clickIf(page, '#overlay [data-act="kitwear"][data-g="floodbell"]');
  await slot('coat');
  await clickIf(page, '#overlay [data-act="kitwear"][data-g="cork"]');
  if (!/keeper\.webp/.test(await page.eval(`document.querySelector('#overlay .doll-wren img').src`))) failures.push(`${name}: Wren still wears the Cork Vest after taking it off`);
  m = await stored();
  if (m.kit.bell !== 'floodbell' || m.kit.coat !== null) failures.push(`${name}: wearing kit didn't stick: ${JSON.stringify(m.kit)}`);
  await clickIf(page, '#overlay [data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map after Set out');
  const kit = await page.eval('JSON.stringify(window.Brinelight.run.kit)');
  if (kit !== JSON.stringify({ harpoon: null, bell: 'floodbell', coat: null, pocket: 'purse', ditty: null })) failures.push(`${name}: the run took kit ${kit}`);
  if (!(await page.eval(`!!document.querySelector('.hud .medal.bell') && !!document.querySelector('.hud .gear-pack')`))) failures.push(`${name}: the bell or the kit is missing from the HUD`);
  if (await page.eval('window.Brinelight.run.pearls') !== 30) failures.push(`${name}: the Coin Purse didn't add its Pearls`);
  // keepsakes past the Hold: the HUD shows the Roil in red; drop one between fights
  await dismissHints(page);
  await page.eval(`(() => { const B = window.Brinelight; B.E.gainKeepsake(B.run, 'whaletooth'); B.E.gainKeepsake(B.run, 'stormbottle'); B.render(); })()`);
  await dismissHints(page);
  const chip = await page.eval(`(() => { const c = document.querySelector('.hud .charge'); return c ? c.className + ' ' + c.innerText : ''; })()`);
  if (!/over/.test(chip) || !/37\/20/.test(chip)) failures.push(`${name}: the HUD Roil reads "${chip}"`);
  await checkPage(page, name + ' charge');
  await page.click('.hud .medal[data-k="stormbottle"]');
  await page.waitFor(`!!document.querySelector('#overlay [data-act="ksdrop"]')`, 3000, 'the keepsake opens');
  await clickIf(page, '#overlay [data-act="ksdrop"]');
  if (await page.eval('window.Brinelight.run.keepsakes.join()') !== 'whaletooth') failures.push(`${name}: dropping a keepsake didn't work`);
  if (await page.eval(`!!document.querySelector('.hud .charge.over')`)) failures.push(`${name}: still over the Hold after dropping`);
  // the first fight, 3 steps over the Hold (Roil 19 + 18 + 12 = 49 of 20, a step for every 12): a Seep, Thrash 1 and a Bell Minnow join it
  await page.eval(`(() => { const B = window.Brinelight; B.E.gainKeepsake(B.run, 'anchor'); B.E.gainKeepsake(B.run, 'tidewatch'); B.render(); })()`);
  await dismissHints(page);
  await page.click('[data-act="node"]');
  await page.waitFor('window.Brinelight.run.screen !== "map"', 5000, 'the first stop');
  if (await page.eval('window.Brinelight.run.screen !== "combat"')) await page.eval(`(() => { const B = window.Brinelight; B.E.startCombat(B.run, 'easy'); B.render(); })()`);
  const seep = await page.eval(`(() => { const c = window.Brinelight.run.combat; return c.hand.concat(c.draw).filter((x) => x.id === 'seep').length; })()`);
  if (seep !== 1) failures.push(`${name}: ${seep} Seep in a fight at Roil 49 of 20`);
  const roiled = await page.eval(`(() => { const c = window.Brinelight.run.combat; return { thrash: c.thrash, minnows: c.enemies.filter((e) => e.roil && e.id === 'minnow').length, shown: document.querySelectorAll('.enemy').length, all: c.enemies.length }; })()`);
  if (roiled.thrash !== 1 || roiled.minnows !== 1 || roiled.shown !== roiled.all) failures.push(`${name}: a fight at Roil 49 of 20 should have Thrash 1 and 1 Bell Minnow on the field (${JSON.stringify(roiled)})`);
  // Thrash shows on the keeper, and the incoming number counts it on top of what the enemies intend
  const thrashUi = await page.eval(`(() => {
    const B = window.Brinelight, c = B.run.combat;
    let hits = 0;
    B.E.alive(c).forEach((e) => { const i = B.E.intentInfo(B.run, e); if (i && i.dmg) hits += i.dmg * i.hits; });
    const chip = document.querySelector('.unit.player .thrash-chip, .thrash-chip');
    const inc = document.querySelector('.incoming span');
    return { chip: chip ? chip.textContent.trim() : null, shown: inc ? inc.textContent.trim() : null, want: String(Math.max(0, hits + c.thrash - c.player.ward)) };
  })()`);
  if (thrashUi.chip !== '1' || thrashUi.shown !== thrashUi.want) failures.push(`${name}: a Thrashed fight should show a Thrash 1 chip and count Thrash in the incoming damage (${JSON.stringify(thrashUi)})`);
  await checkPage(page, name + ' roiled fight');
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
  await clickIf(page, '[data-act="totitle"]'); // scrolls first: on a phone the buttons sit below the fold
  await page.click('[data-act="newrun"]');
  await clickIf(page, '#overlay [data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map after a second Set out');
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
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); localStorage.setItem('brinelight.tutorial.v1', 'done'); localStorage.setItem('brinelight.story.v1', ${QUIET_STORY}); ${QUIET_META} localStorage.setItem('brinelight.best.v1', '777'); })()`);
  await page.goto(base + '?seed=5555');
  if (await page.eval(`!!document.querySelector('.dbg-tab')`)) failures.push('debug: the DEBUG tab shows without ?debug');
  await page.goto(base + '?seed=5555&debug');
  await inject(page);
  await page.click('.dbg-tab');
  await sleep(150);
  if (!(await page.eval(`document.querySelector('[data-dbg="count"]').getAttribute('aria-pressed') === 'true'`))) failures.push('debug: Cheats count as real runs should default to On');
  // A player can still opt out, and an explicit saved choice survives a reload.
  await clickIf(page, '#overlay [data-dbg="count"]');
  await page.goto(base + '?seed=5555&debug');
  await inject(page);
  await page.click('.dbg-tab');
  if (!(await page.eval(`document.querySelector('[data-dbg="count"]').getAttribute('aria-pressed') === 'false'`))) failures.push('debug: a saved Cheats count choice should survive a reload');
  await clickIf(page, '#overlay [data-dbg="count"]');
  await clickIf(page, '#overlay [data-dbg="salvage"]');
  await clickIf(page, '#overlay [data-dbg="allkit"]');
  const reached0 = await page.eval('window.Brinelight.meta.reached');
  const progress0 = await page.eval('JSON.stringify({ record: window.Brinelight.meta.record, story: window.Brinelight.story })');
  await clickIf(page, '#overlay [data-dbg="allmusic"]');
  const m = await page.eval(`JSON.parse(localStorage.getItem('brinelight.meta.v1'))`);
  if (m.salvage !== 100 || m.owned.length !== Object.keys(await page.eval('window.BL.KIT')).length - 1) failures.push(`debug: Salvage and kit cheats stored ${JSON.stringify(m)}`);
  // Hear all music opens every track and every depth of the score, without reaching a level (that would raise the Hold)
  if (!m.heard.includes('song:watch') || !m.heard.includes('depth:2') || m.reached !== reached0) failures.push(`debug: Hear all music stored heard ${JSON.stringify(m.heard)}, reached ${m.reached}`);
  await clickIf(page, '#overlay [data-act="close"]');
  // The music grant must include the Heart-gated song, without marking the Heart as home. The old check
  // granted the Heart first, masking a locked song and a lingering "Bring the Heart home" hint.
  const checkAllMusic = async (label) => {
    await page.click('.title-third [data-act="jukebox"]');
    for (const filter of ['all', 'song', 'cue']) {
      await clickIf(page, `#overlay [data-act="jukefilter"][data-filter="${filter}"]`);
      const state = await page.eval(`(() => { const B = window.Brinelight, rows = [...document.querySelectorAll('.juke-item')]; return { count: rows.length, expected: B.juke.filter(([kind]) => '${filter}' === 'all' || kind === '${filter}').length, hint: !!document.querySelector('.juke-more'), dawn: !!document.querySelector('[data-act="jukeplay"][data-key="bells"]') }; })()`);
      if (state.count !== state.expected || state.hint || (filter !== 'cue' && !state.dawn)) failures.push(`debug: ${label} ${filter}: every track should be open with no unlock hint (${JSON.stringify(state)})`);
    }
    await clickIf(page, '#overlay [data-act="close"]');
    const progress = await page.eval('JSON.stringify({ record: window.Brinelight.meta.record, story: window.Brinelight.story })');
    if (progress !== progress0) failures.push(`debug: ${label} changed story or Logbook progress`);
  };
  await checkAllMusic('Hear all music');
  await page.goto(base + '?seed=5555&debug=0');
  await inject(page);
  await checkAllMusic('saved music grant with debug off');
  await page.goto(base + '?seed=5555&debug');
  await inject(page);
  await page.click('.dbg-tab');
  await clickIf(page, '#overlay [data-dbg="hearts"]');
  await clickIf(page, '#overlay [data-act="close"]');
  // a run: god mode holds HP through an enemy turn, the Swell can be set, and Win the fight leads to the rewards
  await page.click('[data-act="newrun"]');
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
  if (await page.eval('!!window.Brinelight.run.cheated')) failures.push('debug: the default count setting should let a cheated run count normally');
  await clickIf(page, '#overlay [data-dbg="count"]'); // opt out for the marked-run checks below
  await clickIf(page, '#overlay [data-dbg="tide"][data-n="5"]');
  if ((await page.eval('window.Brinelight.run.combat.tide')) !== 5) failures.push('debug: setting the Swell did nothing');
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
  // a cheated run says at Dark Water's pin that the dress it found won't come home (it doesn't: E.carryHome is skipped)
  await page.eval(`(() => { const B = window.Brinelight, r = B.run; B.meta.owned = B.meta.owned.filter((k) => k !== 'suit'); r.combat = null; r.level = 1; r.cleared = [0, 1]; r.found = 'suit'; r.screen = 'pin'; B.render(); })()`); // "Own all kit" gave the dress above
  if (!(await page.eval(`/Debug run:.*not even the dress/.test(document.querySelector('.dbg-note') ? document.querySelector('.dbg-note').textContent : '') && !/Diving Dress too/.test(document.body.innerText)`))) failures.push("debug: a cheated run's pin screen doesn't say the dress stays below");
  await page.eval(`(() => { const B = window.Brinelight, r = B.run; B.meta.owned.push('suit'); r.level = 0; r.cleared = []; r.found = null; r.screen = 'map'; B.render(); })()`);
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
  // Skip fights wins every fight without a click; with "Cheats count as real runs" the run is not marked
  await page.key('`');
  await sleep(150);
  await clickIf(page, '#overlay [data-dbg="skip"]');
  await sleep(100);
  await clickIf(page, '#overlay [data-dbg="count"]');
  await sleep(100);
  if ((await page.eval(`localStorage.getItem('brinelight.debugopts.v1')`)) !== '{"skip":true,"count":true}') failures.push('debug: the Skip fights and Cheats count switches were not stored');
  if (!(await page.eval(`/SKIPPING/.test(document.querySelector('.dbg-tab').textContent)`))) failures.push('debug: the DEBUG tab does not say fights are skipped');
  await clickIf(page, '#overlay [data-act="close"]');
  await page.click('[data-act="newrun"]');
  await clickIf(page, '#overlay [data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map for the skipped run');
  await dismissHints(page);
  await page.click('[data-act="node"]');
  await page.waitFor('window.Brinelight.run.screen !== "map"', 5000, 'the first stop of the skipped run');
  if (await page.eval('window.Brinelight.run.screen !== "combat" && window.Brinelight.run.screen !== "reward"')) await page.eval(`(() => { const B = window.Brinelight; B.E.startCombat(B.run, 'easy'); B.render(); })()`);
  await sleep(500);
  await dismissHints(page);
  await page.waitFor('window.Brinelight.run.screen === "reward"', 8000, 'Skip fights to win the first fight');
  if (await page.eval('!!window.Brinelight.run.cheated')) failures.push('debug: with Cheats count as real runs on, the run was still marked');
  await page.eval(`(() => { const B = window.Brinelight; B.E.backToMap(B.run); B.E.gainKeepsake(B.run, 'moonshard'); B.render(); })()`);
  await page.key('`');
  await sleep(150);
  await clickIf(page, '#overlay [data-dbg="go"][data-type="boss"]');
  await sleep(800);
  await dismissHints(page);
  await page.waitFor('window.Brinelight.run.screen === "pin"', 10000, 'Skip fights to break the pin');
  await sleep(300);
  if (!(await page.eval(`!!document.querySelector('[data-act="godeeper"]') && !!document.querySelector('[data-act="gohome"]')`))) failures.push('debug: the broken pin should offer Go deeper and Go home');
  await page.click('[data-act="gohome"]');
  await page.waitFor('window.Brinelight.run.screen === "victory"', 5000, 'home after the pin');
  await sleep(300);
  if (!/Home with your haul/.test(await page.eval('document.body.innerText'))) failures.push('debug: going home after the Shallows should end the expedition without the Heart');
  if ((await page.eval(`JSON.parse(localStorage.getItem('brinelight.meta.v1')).lazaret.join(',')`)) !== 'moonshard') failures.push('debug: a counted debug win kept nothing in the Lazaret');
  if (await page.eval(`/Debug run/.test(document.body.innerText)`)) failures.push('debug: a counted debug run is still called a debug run');
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
  // first launch: New Descent plays the opening, one picture at a time, then offers the tutorial
  await page.click('[data-act="newrun"]');
  await sleep(250);
  const beats = await page.eval('window.BL.STORY.opening.length');
  for (let i = 0; i < beats; i++) {
    const shown = await page.eval(`(() => { const t = document.querySelector('#overlay .opening .op-text'); return t ? t.textContent : ''; })()`);
    if (shown !== await page.eval(`window.BL.STORY.opening[${i}].text`)) failures.push(`${name}: opening part ${i + 1} shows "${shown.slice(0, 40)}"`);
    await checkPage(page, `${name} opening ${i + 1}`);
    if (input === 'keyboard') await page.key('Enter'); else await page.click('#overlay [data-act="opnext"]');
    await sleep(200);
  }
  if (await page.eval(`!JSON.parse(localStorage.getItem('brinelight.story.v1') || '{}').opening`)) failures.push(`${name}: the opening isn't stored as seen`);
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
    } else if (s.act) {
      // the Bail step: a card doesn't count, the Bail does
      const before = await page.eval('window.Brinelight.run.stats.cardsPlayed');
      const jab = await page.eval(`(() => { const x = window.Brinelight.run.combat.hand.find((k) => k.id === 'jab'); return x ? x.uid : null; })()`);
      if (jab && input !== 'keyboard') {
        await page.click(`#hand .card[data-uid="${jab}"]`); await sleep(320); await page.click(`#hand .card[data-uid="${jab}"]`); await sleep(200);
        if ((await page.eval('window.Brinelight.run.stats.cardsPlayed')) !== before) failures.push(`${name}: the tutorial let a card be played at the Bail step`);
        await page.key('Escape');
      }
      const light = await page.eval('window.Brinelight.run.combat.light');
      // under load the raised Jab and its Escape can still be animating (a click while busy is ignored): wait for idle
      await waitIdle(page, 'before the Bail');
      const cover = await page.eval(`(() => { const b = document.querySelector('#tidebar .tb-act.bail'); const r = b.getBoundingClientRect(); const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return h === b || b.contains(h) ? '' : (h ? (h.id || h.className || h.tagName) + ' ' + (h.textContent || '').slice(0, 40) : 'none'); })()`);
      const why = await page.eval(`(() => { const B = window.Brinelight; return JSON.stringify({ busy: B.ui.busy, allows: B.teach.allows('swellact', 'bail'), can: B.E.canSwellAct(B.run, 'bail'), phase: B.run.combat.phase }); })()`);
      if (input === 'keyboard') await page.key('b'); else await page.click('#tidebar .tb-act.bail');
      actions++;
      await waitIdle(page, 'the Bail');
      // under heavy load (4 Chromes and more beside them) the first click after the blocked Jab can be lost although
      // nothing covers Bail and the game would take it (seen since v0.40.0, never alone): press it once more, and say so
      if (input !== 'keyboard' && (await page.eval('window.Brinelight.run.combat.turnLows')) === 0) {
        log(`  ${name}: the first Bail click was lost; clicking again`);
        await sleep(300);
        await page.click('#tidebar .tb-act.bail');
        await waitIdle(page, 'the Bail, again');
      }
      const after = await page.eval('(() => { const c = window.Brinelight.run.combat; return { lows: c.turnLows, light: c.light, used: !!document.querySelector("#tidebar .tb-act.used") }; })()');
      if (after.lows !== 1 || after.light !== light || !after.used) failures.push(`${name}: the tutorial's Bail should Strand, give the Light back and use up the turn's Bail (${JSON.stringify(after)}; covered by: ${cover || 'nothing'}; ${why})`);
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
  if (await page.eval('!!document.querySelector("#overlay .opening")')) failures.push(`${name}: played the opening again`);
  await clickIf(page, '[data-act="dive"]');
  await page.waitFor('window.Brinelight.run && !window.Brinelight.run.tutorial', 5000, 'expedition after tutorial');
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

/* Story so far: open from the first visit, with the rest locked; a fight and a fall open entries, marked New until read. */
async function storyScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'mouse'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  await page.goto(base + '?seed=6666');
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); })()`);
  await page.goto(base + '?seed=6666');
  await inject(page);
  const count = (sel) => page.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  const S = await page.eval('({ chapters: window.BL.STORY.chapters.length, notes: window.BL.STORY.notes.length, title: window.BL.STORY.title })');
  if ((await page.eval(`document.querySelector('.tagline').textContent`)) !== S.title) failures.push(`${name}: the title line isn't the story's`);
  if (await count('[data-act="story"] .new-pill')) failures.push(`${name}: Story so far is marked New on a first visit`);
  await page.click('[data-act="story"]');
  await sleep(200);
  if ((await count('#overlay .st-ch')) !== 1 || (await count('#overlay .st-lock')) !== S.chapters - 1) failures.push(`${name}: a first visit should read chapter 1 and see the rest locked`);
  await checkPage(page, name + ' story');
  await page.click('#overlay [data-act="storytab"][data-tab="world"]');
  await sleep(150);
  if (!(await count('#overlay .help-dl dt'))) failures.push(`${name}: The world tab is empty`);
  await checkPage(page, name + ' world');
  await page.click('#overlay [data-act="storytab"][data-tab="notes"]');
  await sleep(150);
  if ((await count('#overlay .st-lock')) !== S.notes || (await count('#overlay .st-note'))) failures.push(`${name}: a first visit should have every note locked`);
  await checkPage(page, name + ' notes');
  // the opening plays again from chapter 1 and comes back to the story
  await page.click('#overlay [data-act="storytab"][data-tab="story"]');
  await sleep(150);
  // the button is at the foot of a long page: on a phone it is out of sight until the page is scrolled to it
  await page.eval(`document.querySelector('#overlay [data-act="opening"]').scrollIntoView({ block: 'center' })`);
  await sleep(150);
  await page.click('#overlay [data-act="opening"]');
  await sleep(200);
  if (!(await count('#overlay .opening'))) failures.push(`${name}: Play the opening again didn't start the opening`);
  const beats = await page.eval('window.BL.STORY.opening.length');
  for (let i = 0; i < beats && await count('#overlay .opening'); i++) { await page.click('#overlay [data-act="opnext"]'); await sleep(200); }
  if (!(await count('#overlay .story'))) failures.push(`${name}: the replayed opening didn't come back to Story so far`);
  await clickIf(page, '#overlay .modal-foot [data-act="close"]');
  // a fight opens a note, and a fall opens chapter 2 on the end screen
  await page.click('[data-act="newrun"]');
  await sleep(200);
  if (await count('#overlay .opening')) failures.push(`${name}: the opening played again after the replay`);
  await clickIf(page, '[data-act="tutorialskip"]');
  await clickIf(page, '[data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map for the story scenario');
  await dismissHints(page);
  await clickIf(page, '.node.avail[data-idx="0"]');
  await sleep(600);
  await dismissHints(page);
  await waitIdle(page);
  const marks = await page.eval(`JSON.parse(localStorage.getItem('brinelight.story.v1')).marks`);
  if (!marks.some((m) => m.indexOf('en:') === 0)) failures.push(`${name}: the first fight stored no story mark (${marks})`);
  await page.eval(`(() => { const B = window.Brinelight; B.run.hp = 0; B.run.combat.lost = true; B.onDefeat(); })()`);
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "defeat" && !!document.querySelector(".story-new")', 5000, 'the fall on the end screen');
  // the first fall plays its story scene over the end screen, and its picture stays behind it (v0.44.0)
  if (!/sc_fall/.test(await page.eval(`(document.querySelector('#overlay .op-art') || {}).style ? document.querySelector('#overlay .op-art').style.backgroundImage : ''`))) failures.push(`${name}: the first fall didn't play its story scene`);
  if (!/sc_fall/.test(await page.eval(`document.querySelector('.scene').style.backgroundImage`))) failures.push(`${name}: the fall's end screen doesn't show Bosun bringing Wren out`);
  await checkPage(page, name + ' fall scene');
  await page.click('#overlay [data-act="opnext"]');
  await sleep(200);
  await clickIf(page, '#overlay [data-act="newsok"]');
  await checkPage(page, name + ' defeat');
  await page.click('.story-new');
  await sleep(200);
  if ((await count('#overlay .st-ch')) !== 2 || (await count('#overlay .st-ch .new-pill')) !== 1) failures.push(`${name}: the fall should open chapter 2, marked New`);
  await clickIf(page, '#overlay .modal-foot [data-act="close"]');
  await clickIf(page, '[data-act="totitle"]');
  if (await count('[data-act="story"] .new-pill')) failures.push(`${name}: Story so far is still marked New after reading`);
  if (page.errors.length) failures.push(`${name}: page errors:\n    ` + page.errors.join('\n    '));
}

/* The Lazaret: a first win opens it and keeps what Wren carries, she chooses what to bring and it leaves the Lazaret,
   coming home puts it back, a drop or a fall loses it, and it keeps many of each, a spare broken down for Salvage (v0.36.0). */
async function lazaretScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'mouse'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  await page.goto(base + '?seed=7777');
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); localStorage.setItem('brinelight.tutorial.v1', 'done'); localStorage.setItem('brinelight.story.v1', JSON.stringify({ opening: true })); })()`);
  await page.goto(base + '?seed=7777');
  await inject(page);
  const count = (sel) => page.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  const text = (sel) => page.eval(`(document.querySelector(${JSON.stringify(sel)}) || { textContent: '' }).textContent`);
  const stored = () => page.eval(`JSON.parse(localStorage.getItem('brinelight.meta.v1'))`);
  const keeps = () => page.eval('window.Brinelight.run.keepsakes.join(",")');
  const setOut = async (what) => {
    await clickIf(page, '[data-act="newrun"]');
    await sleep(200);
    await clickIf(page, '[data-act="confirmnew"]');
    await sleep(200);
    if (!(await count('#overlay [data-act="ksbring"]'))) failures.push(`${name}: no keepsakes to choose before ${what}`);
  };
  const dive = async (what) => {
    await page.click('#overlay [data-act="dive"]');
    await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map for ' + what);
    await dismissHints(page);
  };
  const end = (screen, found) => page.eval(`(() => { const B = window.Brinelight, r = B.run; ${JSON.stringify(found)}.forEach((k) => B.E.gainKeepsake(r, k)); r.combat = null; r.floor = 8; if (${JSON.stringify(screen)} === 'victory') r.cleared = [0]; r.screen = ${JSON.stringify(screen)}; B.render(); })()`);

  if (await count('[data-act="lazaret"]')) failures.push(`${name}: the Lazaret is on the title screen before the first win`);
  // first win: the Lazaret opens and keeps both keepsakes
  await page.click('[data-act="newrun"]');
  await clickIf(page, '[data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map for the first Lazaret run');
  await dismissHints(page);
  await end('victory', ['moonshard', 'anchor']);
  await sleep(200);
  // what opened is told in a window that stays until it is closed, once
  const news = () => page.eval(`[...document.querySelectorAll('#overlay .news-item > div > b')].map((e) => e.textContent).join('|')`);
  if (!/Workshop/.test(await news()) || !/Lazaret/.test(await news())) failures.push(`${name}: the first win should tell of the Workshop and the Lazaret in a window (${await news()})`);
  await checkPage(page, name + ' news');
  await page.key('Escape');
  await sleep(150);
  if (!(await news())) failures.push(`${name}: Escape closed the New at the lighthouse window; it should wait for Got it`);
  await page.click('#overlay [data-act="newsok"]');
  await sleep(200);
  let m = await stored();
  if (await news()) failures.push(`${name}: Got it didn't close the New at the lighthouse window`);
  if (!m.told || m.told.join(',') !== 'workshop,lazaret,outfit:shells') failures.push(`${name}: what was told isn't stored (${JSON.stringify(m.told)})`);
  if (!m.lazOpen || m.lazaret.join(',') !== 'moonshard,anchor') failures.push(`${name}: the first win didn't keep both keepsakes (${JSON.stringify(m.lazaret)})`);
  if (!/key to the Lazaret/.test(await text('.lz-box')) || !/Moon Shard/.test(await text('.lz-box'))) failures.push(`${name}: the end screen doesn't say the Lazaret opened and what it kept`);
  await checkPage(page, name + ' first win');
  await clickIf(page, '.lz-box');
  await sleep(200);
  const ksTotal = await page.eval('Object.keys(BL.KEEPSAKES).length');
  if ((await count('#overlay [data-act="ksbring"]')) !== 2 || (await count('#overlay .lz-missing')) !== ksTotal - 2) failures.push(`${name}: the Lazaret should show 2 kept and ${ksTotal - 2} not brought home`);
  await checkModalScrollCue(page, name + ' Lazaret');
  await checkPage(page, name + ' lazaret');
  await clickIf(page, '#overlay [data-act="ksbring"][data-k="anchor"]');
  await sleep(150);
  m = await stored();
  if (m.bring.join(',') !== 'anchor' || (await count('#overlay .kit-tile.chosen')) !== 1) failures.push(`${name}: choosing a keepsake in the Lazaret wasn't stored or shown`);
  await clickIf(page, '#overlay .modal-foot [data-act="close"]');
  await clickIf(page, '[data-act="totitle"]');
  if (!new RegExp(`2/${ksTotal}`).test(await text('[data-act="lazaret"]'))) failures.push(`${name}: the title screen doesn't show the Lazaret with 2 of ${ksTotal}`);
  if (await news()) failures.push(`${name}: the title screen told of the Workshop and the Lazaret a second time`);
  // the title screen has three levels of button, and the logbook has counted the win
  const levels = await page.eval(`({ second: document.querySelectorAll('.title-buttons .btn.second').length, third: document.querySelectorAll('.title-buttons .btn.third').length })`);
  if (levels.second !== 2 || levels.third !== 5) failures.push(`${name}: the title screen should have 2 second-level and 5 third-level buttons (Story so far, the Logbook, the Tutorial, How to Play, the Jukebox) (${JSON.stringify(levels)})`);
  await page.click('[data-act="logbook"]');
  await sleep(200);
  if (!/1 came home, 0 fell/.test(await text('#overlay .logbook')) || !/The Shallows, landing 8 of 8/.test(await text('#overlay .logbook')) || !/Pins broken1 The Shallows/.test(await text('#overlay .logbook')) || /of 3|Belfry/.test(await text('#overlay .logbook'))) failures.push(`${name}: the logbook doesn't show the first expedition home, or it gives away how many levels there are (${await text('#overlay .logbook')})`);
  await checkPage(page, name + ' logbook');
  await clickIf(page, '#overlay .modal-foot [data-act="close"]');
  // second descent: bring both (they leave the Lazaret), drop one on the way (gone for good), and come home with the
  // other, which goes back, and with the dropped kind found again
  await setOut('the second descent');
  await checkModalScrollCue(page, name + ' Pack');
  await checkPage(page, name + ' pack');
  await clickIf(page, '#overlay [data-act="ksbring"][data-k="moonshard"]');
  await sleep(150);
  if (!/Roiled/.test(await text('#overlay .lz-line'))) failures.push(`${name}: Moon Shard and Drowned Anchor (Roil 30) should be Roiled in the Shallows (Hold 20)`);
  await dive('the second descent');
  if ((await keeps()) !== 'anchor,moonshard' || (await count('.hud .medal[data-k="anchor"]')) !== 1) failures.push(`${name}: the run didn't start with the keepsakes brought (${await keeps()})`);
  m = await stored();
  if (m.lazaret.length) failures.push(`${name}: the keepsakes brought should have left the Lazaret (${JSON.stringify(m.lazaret)})`);
  await clickIf(page, '.hud .medal[data-k="anchor"]');
  await sleep(200);
  if (!/gone for good/.test(await text('#overlay .modal-body'))) failures.push(`${name}: dropping a brought keepsake doesn't say it is gone for good`);
  await clickIf(page, '#overlay [data-act="ksdrop"]');
  await sleep(200);
  if ((await keeps()) !== 'moonshard') failures.push(`${name}: dropping a brought keepsake didn't remove it from the run`);
  await end('victory', ['anchor', 'tidewatch']);
  await sleep(200);
  m = await stored();
  if (m.lazaret.join(',') !== 'moonshard,anchor,tidewatch') failures.push(`${name}: coming home should put back what was brought and keep what was found (${JSON.stringify(m.lazaret)})`);
  await checkPage(page, name + ' second win');
  await clickIf(page, '[data-act="totitle"]');
  // third descent: leave the Anchor at home, bring the Moon Shard, and fall: the bell calls back the Moon Shard and what
  // was found, and Wren holds on to one of them (v0.36.0): the Moon Shard, which goes back into the Lazaret
  await setOut('the third descent');
  await clickIf(page, '#overlay [data-act="ksbring"][data-k="anchor"]');
  await sleep(150);
  await dive('the third descent');
  if ((await keeps()) !== 'moonshard') failures.push(`${name}: a keepsake left at home came along (${await keeps()})`);
  await end('defeat', ['gullfeather']);
  await sleep(200);
  // the first fall's story scene plays over the end screen (v0.44.0)
  if (!(await count('#overlay .opening'))) failures.push(`${name}: the first fall didn't play its story scene`);
  await clickIf(page, '#overlay [data-act="opnext"]');
  await sleep(200);
  m = await stored();
  if (m.lazaret.join(',') !== 'anchor,tidewatch') failures.push(`${name}: a fall should lose the brought Moon Shard and keep what stayed home (${JSON.stringify(m.lazaret)})`);
  if ((await count('.lz-keep [data-act="pick"][data-scope="fall-ks"]')) !== 2 || !/gone from there too/.test(await text('.lz-box.lost')) || !/safe/.test(await text('.lz-box.lost'))) failures.push(`${name}: the fall should offer the Moon Shard and the Gull Feather to keep (${await text('.lz-box.lost')})`);
  await checkPage(page, name + ' fall');
  await clickIf(page, '.lz-keep [data-act="pick"][data-key="moonshard"]');
  if ((await stored()).lazaret.length !== 2) failures.push(`${name}: marking a keepsake to keep kept it before Keep was pressed`);
  await clickIf(page, '.lz-keep [data-act="pickok"]:not([disabled])');
  m = await stored();
  if (m.lazaret.join(',') !== 'anchor,tidewatch,moonshard' || m.bring.indexOf('moonshard') < 0) failures.push(`${name}: keeping the Moon Shard should put it back in the Lazaret, chosen (${JSON.stringify(m)})`);
  if (!/held on to the Moon Shard/.test(await text('.lz-box.lost')) || !/Gull Feather/.test(await text('.lz-box.lost')) || (await count('.lz-keep'))) failures.push(`${name}: the fall doesn't say what was kept and what the bell called back (${await text('.lz-box.lost')})`);
  await checkPage(page, name + ' fall, one kept');
  await clickIf(page, '[data-act="totitle"]');
  // fourth descent: bring nothing, come home with a second Drowned Anchor: the Lazaret keeps both, and one breaks down
  await setOut('the fourth descent');
  if ((await count('#overlay .kit-tile.chosen[data-act="ksbring"]')) !== 1) failures.push(`${name}: the kept Moon Shard should still be chosen to bring`);
  await clickIf(page, '#overlay [data-act="ksbring"][data-k="moonshard"]');
  await sleep(150);
  await dive('the fourth descent');
  if (await keeps()) failures.push(`${name}: the fourth descent should bring nothing (${await keeps()})`);
  await end('victory', ['anchor']);
  await sleep(200);
  m = await stored();
  if (m.lazaret.filter((k) => k === 'anchor').length !== 2) failures.push(`${name}: the Lazaret should keep two Drowned Anchors (${JSON.stringify(m.lazaret)})`);
  await clickIf(page, '.lz-box');
  await sleep(200);
  if (!/2/.test(await text('#overlay [data-act="ksbring"][data-k="anchor"] .lz-count'))) failures.push(`${name}: the Lazaret doesn't show two Drowned Anchors`);
  const salv0 = (await stored()).salvage;
  await clickIf(page, '#overlay [data-act="ksbreak"][data-k="anchor"]');
  await sleep(200);
  m = await stored();
  if (m.salvage !== salv0 + 9 || m.lazaret.filter((k) => k === 'anchor').length !== 1) failures.push(`${name}: breaking down a spare Drowned Anchor should give 9 Salvage and leave one (had ${salv0}, now ${m.salvage}; ${JSON.stringify(m.lazaret)})`);
  if (await count('#overlay [data-act="ksbreak"]')) failures.push(`${name}: the last copy can still be broken down`);
  await checkPage(page, name + ' lazaret stock');
  if (page.errors.length) failures.push(`${name}: page errors:\n    ` + page.errors.join('\n    '));
}

/* Dark Water through the real interface: its own background and boss, a Submerged Murk Ray that can't be aimed at,
   a Pale Gulper that swallows a card and gives it back, a doused lantern, the Buoy's intent following the Swell,
   then a few stops of a real Dark Water descent. */
async function darkwaterScenario(page, base, name, size, opts) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'mouse'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  await page.goto(base + `?seed=${opts.seed}`);
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); localStorage.setItem('brinelight.story.v1', ${JSON.stringify(JSON.stringify({ scenes: SEEN_SCENES }))}); ${QUIET_META} })()`);
  await page.goto(base + `?seed=${opts.seed}`);
  await inject(page);
  await page.click('[data-act="newrun"]');
  await sleep(200);
  await clickIf(page, '[data-act="opskip"]');
  await clickIf(page, '[data-act="tutorialskip"]');
  await clickIf(page, '[data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'the Shallows map');
  await dismissHints(page);
  if (!/Shallows/.test(await page.eval(`document.querySelector('.map-header h2').textContent`))) failures.push(`${name}: the map header doesn't name the Shallows`);
  // the Shallows' pin is broken: go deeper, down the stair (two of five, v0.31.0), into Dark Water
  await page.eval(`(() => { const B = window.Brinelight, r = B.run; r.floor = 8; r.cleared = [0]; r.screen = 'pin'; r.hp = 10; B.render(); })()`);
  await sleep(200);
  await checkPage(page, name + ' pin');
  await page.click('[data-act="godeeper"]');
  await page.waitFor('window.Brinelight.run.screen === "rest"', 5000, 'the stair down');
  await sleep(500);
  await dismissHints(page);
  // the stair scrolls on a phone: bring each choice into view before tapping it
  const tapIn = async (sel) => { await page.eval(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'center' })`); await sleep(150); await page.click(sel); };
  const stairText = await page.eval('document.querySelector(".scene").innerText');
  if (!/The stair down/i.test(stairText) || !/Into Dark Water/.test(stairText)) failures.push(`${name}: the stair down into Dark Water isn't named`);
  if ((await page.eval(`document.querySelectorAll('[data-act="stairdo"]:not([disabled])').length`)) !== 5) failures.push(`${name}: the stair should offer five`);
  if ((await page.eval(`document.querySelectorAll('.stair-track li').length`)) !== 3) failures.push(`${name}: the stair's track should show three levels`);
  await checkPage(page, name + ' stair');
  // the keepers' cache (v0.40.0): opening it uses the pick, the choice has no Back, and it comes back after a reload.
  // Here it is tried, and then the stair is set back to no picks for the rest and the shed below.
  await tapIn('[data-act="stairdo"][data-id="cache"]');
  await page.waitFor(`document.querySelectorAll('.modal [data-act="pick"][data-scope="choice"]').length === 3`, 3000, "the keepers' cache");
  if ((await page.eval('window.Brinelight.run.stair.picks.length')) !== 1) failures.push(`${name}: opening the keepers' cache should use a pick`);
  if (!/Take none/.test(await page.eval(`document.querySelector('.modal [data-act="cacheleave"].danger')?.textContent || ''`))) failures.push(`${name}: the keepers' cache should offer a red Take none button`);
  const cache0 = await page.eval('JSON.stringify(window.Brinelight.run.stair.cache)');
  await page.eval(`(() => { const o = document.getElementById('overlay'); o.hidden = true; o.innerHTML = ''; window.Brinelight.render(); })()`); // as after a reload
  await sleep(200);
  if ((await page.eval(`document.querySelectorAll('.modal [data-act="pick"][data-scope="choice"]').length`)) !== 3) failures.push(`${name}: the open keepers' cache should show its choice again after a reload`);
  if ((await page.eval('JSON.stringify(window.Brinelight.run.stair.cache)')) !== cache0) failures.push(`${name}: the keepers' cache changed its cards after a reload`);
  await clickIf(page, '.modal [data-act="cacheleave"]');
  if (!await page.eval('window.Brinelight.E.stairCacheOpen(window.Brinelight.run)')) failures.push(`${name}: that first tap should only open the confirmation`);
  await clickIf(page, '.modal [data-act="cacheback"]');
  if (await page.eval('JSON.stringify(window.Brinelight.run.stair.cache)') !== cache0) failures.push(`${name}: returning to the cache changed its cards`);
  await clickIf(page, '.modal [data-act="cacheleave"]');
  await clickIf(page, '.modal [data-act="choosecard"].danger');
  await sleep(200);
  if ((await page.eval('window.Brinelight.run.stair.picks.length')) !== 1 || (await page.eval('window.Brinelight.E.stairCacheOpen(window.Brinelight.run)'))) failures.push(`${name}: Take none should close the keepers' cache with its pick used`);
  await page.eval(`(() => { const B = window.Brinelight, r = B.run; r.stair = { picks: [], cache: null }; r.restDone = false; B.render(); })()`);
  await sleep(200);
  // rest deeply: 30% of Max HP (half until v0.36.0)
  await tapIn('[data-act="stairdo"][data-id="rest"]');
  await sleep(200);
  const [hpNow, hpMax] = await page.eval('[window.Brinelight.run.hp, window.Brinelight.run.maxHp]');
  if (hpNow !== 10 + Math.floor(hpMax * 0.3)) failures.push(`${name}: resting deeply on the stair should heal 30% of ${hpMax} Max HP (HP 10 -> ${hpNow})`);
  // shed a card through the deck picker
  const deck0 = await page.eval('window.Brinelight.run.deck.length');
  await tapIn('[data-act="stairdo"][data-id="shed"]');
  await page.waitFor(`!!document.querySelector('.modal [data-act="deckpick"]')`, 3000, 'the deck to shed a card from');
  await page.click('.modal [data-act="deckpick"]');
  await page.waitFor(`!!document.querySelector('.modal [data-act="deckconfirm"]')`, 3000, 'the shed confirmation');
  await page.click('.modal [data-act="deckconfirm"]');
  await sleep(250);
  if ((await page.eval('window.Brinelight.run.deck.length')) !== deck0 - 1) failures.push(`${name}: shedding a card on the stair should leave ${deck0 - 1} cards`);
  if ((await page.eval(`document.querySelectorAll('[data-act="stairdo"]:not([disabled])').length`)) !== 0) failures.push(`${name}: after two picks the stair's other three should close`);
  if ((await page.eval(`document.querySelectorAll('.stair-log li').length`)) !== 2) failures.push(`${name}: the stair should say what the two picks did`);
  if (!(await page.eval(`document.activeElement && document.activeElement.dataset.act === 'tomap'`))) failures.push(`${name}: after two picks, Go down should have the focus`);
  if (!/Dark Water/.test(await page.eval(`document.querySelector('[data-act="tomap"]').textContent`))) failures.push(`${name}: the stair's button should say it goes down into Dark Water`);
  await tapIn('[data-act="tomap"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'the Dark Water map');
  await dismissHints(page);
  if ((await page.eval('window.Brinelight.run.level')) !== 1) failures.push(`${name}: the run is not in Dark Water`);
  if (!/Dark Water/.test(await page.eval(`document.querySelector('.map-header h2').textContent`))) failures.push(`${name}: the map header doesn't name Dark Water`);
  // a Dread's one pick (v0.40.0): three cards or its keepsake, once each way (the walk above skips Dreads); then the
  // run is put back as it was, so the fights below meet no Roil
  const kept = await page.eval('JSON.stringify({ k: window.Brinelight.run.keepsakes, d: window.Brinelight.run.deck })');
  for (let i = 0; i < 2; i++) {
    await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; r.combat = null; r.screen = 'map'; E.startCombat(r, 'elite', ['chain']); const c = r.combat; c.enemies.forEach((e) => { e.dead = true; e.hp = 0; }); c.won = true; E.finishCombat(r); B.render(); })()`);
    await sleep(700);
    await dismissHints(page);
    await decideDread(page, `${name} Dread pick ${i + 1}`);
    await page.waitFor('window.Brinelight.run.screen === "map"', 3000, 'the map after the Dread pick');
  }
  await page.eval(`(() => { const B = window.Brinelight, r = B.run, o = JSON.parse(${JSON.stringify(kept)}); r.keepsakes = o.k; r.deck = o.d; B.render(); })()`);
  const setFight = async (enc, kind, setup) => {
    await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; r.combat = null; r.screen = 'map'; E.startCombat(r, ${JSON.stringify(kind)}, ${JSON.stringify(enc)}); const c = r.combat; c.enemies.forEach((e) => { e.hp = e.maxHp = 400; }); ${setup || ''}; B.render(); })()`);
    await waitIdle(page);
    await dismissHints(page);
  };
  const endTurn = async () => { await page.click('#btn-end'); await sleep(300); await waitIdle(page, 'the enemy turn'); await dismissHints(page); };
  const has = (sel) => page.eval(`!!document.querySelector(${JSON.stringify(sel)})`);
  const toastText = () => page.eval(`Array.from(document.querySelectorAll('.toast-msg')).map((t) => t.innerText).join(' | ')`);
  const tap = async (sel) => { await page.click(sel); await sleep(150); }; // a tap on a touch screen

  // the Murk Ray sinks: it looks sunk, can't be aimed at, and the leech beside it can
  await setFight(['ray', 'leech'], 'easy', "c.enemies[0].intent = 'sink'; c.enemies[1].intent = 'gorge'");
  const bg = await page.eval(`getComputedStyle(document.getElementById('field')).backgroundImage`);
  if (!/bg_dark\.webp/.test(bg)) failures.push(`${name}: Dark Water fights should use bg_dark (got ${bg})`);
  await endTurn();
  const [ray, leech] = await page.eval(`window.Brinelight.run.combat.enemies.map((e) => e.uid)`);
  if (!(await has(`.unit.enemy.submerged[data-uid="${ray}"]`))) failures.push(`${name}: the Submerged Ray doesn't look sunk`);
  await page.eval(`(() => { const B = window.Brinelight, r = B.run; r.combat.hand.unshift(B.E.newCard(r, 'jab')); r.combat.light = 3; B.render(); })()`);
  await waitIdle(page);
  const jab = await page.eval(`window.Brinelight.run.combat.hand.find((x) => x.id === 'jab').uid`);
  const played0 = await page.eval('window.Brinelight.run.stats.cardsPlayed');
  await tap(`#hand .card[data-uid="${jab}"]`);
  await tap(`.unit[data-uid="${ray}"] .sprite`);
  if ((await page.eval('window.Brinelight.run.stats.cardsPlayed')) !== played0) failures.push(`${name}: a card was played on the Submerged Ray`);
  if (!/Submerged/.test(await toastText())) failures.push(`${name}: aiming at the Submerged Ray should say why it can't`);
  await tap(`.unit[data-uid="${leech}"] .sprite`);
  await waitIdle(page);
  if ((await page.eval('window.Brinelight.run.stats.cardsPlayed')) !== played0 + 1) failures.push(`${name}: the Harpoon Jab on the leech was not played`);

  // the Pale Gulper swallows the last card played, shows it, and gives it back when it dies
  await setFight(['gulper'], 'elite', "c.enemies[0].intent = 'gulp'; c.hand.unshift(E.newCard(r, 'brace')); c.light = 3");
  const brace = await page.eval(`window.Brinelight.run.combat.hand.find((x) => x.id === 'brace').uid`);
  await tap(`#hand .card[data-uid="${brace}"]`); // raise it
  await tap(`#hand .card[data-uid="${brace}"]`); // and play it
  await waitIdle(page);
  const lastWasBrace = await page.eval(`window.Brinelight.run.combat.lastPlayed === ${brace}`);
  await endTurn();
  if (lastWasBrace) {
    if (!(await has('.unit.enemy [data-tip$=":swallowed"]'))) failures.push(`${name}: the Gulper shows no Swallowed chip`);
    await page.eval(`(() => { const B = window.Brinelight; B.run.combat.enemies[0].st.brine = 999; B.render(); })()`);
    await endTurn();
    await sleep(500);
    if (!(await page.eval(`window.Brinelight.run.combat ? window.Brinelight.run.combat.discard.some((x) => x.uid === ${brace}) || window.Brinelight.run.combat.won : true`))) failures.push(`${name}: the swallowed Brace did not come back`);
  } else failures.push(`${name}: the Brace was not played before the Gulp`);
  await page.eval(`(() => { const B = window.Brinelight; B.run.combat = null; B.run.screen = 'map'; B.render(); })()`);

  // the Glimmer Chain douses the lantern: 2 Light next turn
  await setFight(['chain'], 'elite', "c.enemies[0].intent = 'douse'");
  await endTurn();
  const light = await page.eval(`window.Brinelight.run.combat.light`);
  if (light !== 2) failures.push(`${name}: a doused lantern should give 2 Light, got ${light}`);

  // v0.21.0: the Garden Strider tends its garden, and two Glimmer Leeches come up beside it
  await setFight(['strider'], 'elite', "c.enemies[0].intent = 'tend'");
  if (!/strider\.webp/.test(await page.eval(`document.querySelector('.unit.enemy[data-id="strider"] .sprite img').src`))) failures.push(`${name}: the Garden Strider's picture isn't shown`);
  await endTurn();
  await sleep(400);
  const leechesUp = await page.eval(`[...document.querySelectorAll('.unit.enemy[data-id="leech"]')].filter((el) => getComputedStyle(el).visibility !== 'hidden').length`);
  if (leechesUp !== 2) failures.push(`${name}: Tend the Garden should bring up 2 Glimmer Leeches (got ${leechesUp})`);
  await checkPage(page, name + ' strider');

  // the Tolling Buoy: its name, its lock, and an intent that follows the Swell
  await setFight(['buoy'], 'boss', "c.enemies[0].intent = 'toll'");
  await sleep(1600);
  await dismissHints(page);
  const bossBg = await page.eval(`getComputedStyle(document.getElementById('field')).backgroundImage`);
  if (!/bg_dark_boss\.webp/.test(bossBg)) failures.push(`${name}: the Buoy's fight should use bg_dark_boss (got ${bossBg})`);
  const intentAt = (tide) => page.eval(`(() => { const B = window.Brinelight; B.run.combat.tide = ${tide}; B.render(); return document.querySelector('.unit.enemy .intent').innerText.replace(/\\s+/g, ''); })()`);
  const at3 = await intentAt(3), at5 = await intentAt(5);
  if (at3 !== '12' || at5 !== '20') failures.push(`${name}: the Rocking Toll intent should read 12 at Swell 3 and 20 at Swell 5 (got ${at3}, ${at5})`);
  const tollIcon = await page.eval(`document.querySelector('.intent.swell-mid .i-swell').innerHTML`);
  await checkPage(page, name + ' buoy');
  // once it has slipped its chain, the Wild Peal (v0.43.0: 40, 8 less a step from 3, 15 less a Crest or Strand) reads 24 at
  // Swell 1, and 25 after a Bail that Strands (the Swell back at 3)
  await page.eval(`(() => { const B = window.Brinelight, c = B.run.combat; c.enemies[0].mem.free = true; c.enemies[0].intent = 'peal'; c.tide = 1; c.light = 3; c.swellActTurn = null; B.render(); })()`);
  await sleep(300);
  const pealText = () => page.eval(`document.querySelector('.unit.enemy .intent').innerText.replace(/\\s+/g, '')`);
  const peal0 = await pealText();
  const pealIcon = await page.eval(`document.querySelector('.intent.swell-ends .i-swell').innerHTML`);
  if (tollIcon === pealIcon) failures.push(`${name}: the two Swell attacks should have distinct icons`);
  await dismissHints(page);
  if (!(await page.eval(`(localStorage.getItem('brinelight.hints.v1') || '').includes('"peal"')`))) failures.push(`${name}: no first-time hint for the Wild Peal`);
  await tap('#tidebar .tb-act.bail');
  await waitIdle(page);
  const peal1 = await pealText();
  if (peal0 !== '24' || peal1 !== '25') failures.push(`${name}: the Wild Peal intent should read 24 at Swell 1, then 25 after a Bail that Strands (got ${peal0}, ${peal1})`);
  await checkPage(page, name + ' wild peal');

  // then a few stops of the real descent
  await page.eval(`(() => { const B = window.Brinelight; B.run.combat = null; B.run.screen = 'map'; B.render(); })()`);
  const visited = await playStops(page, name, {});
  log(`  ${name}: visited ${visited.join(', ')}`);
  await checkPage(page, name + ' after stops');
  if (page.errors.length) failures.push(`${name}: page errors:\n    ` + page.errors.join('\n    '));
}

/* v0.20.0: the Belfry through the real interface. Dark Water's pin without the diving dress: the stair is shut and the
   dress hangs above it. Go home carries it to the end screen; the next expedition wears it from the kit, goes down the
   stair, and Wren wears it in the Belfry's own fights. The Bellwether breaks open into the Thing in the Bell, its
   sprite and name change in place, and the Heart's light heals her. */
async function belfryScenario(page, base, name, size, opts) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'mouse'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  const url = base + `?seed=${opts.seed}`;
  await page.goto(url);
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); localStorage.setItem('brinelight.tutorial.v1', 'done'); localStorage.setItem('brinelight.story.v1', JSON.stringify({ opening: true })); })()`);
  await page.goto(base + `?seed=${opts.seed}`);
  await inject(page);
  const body = () => page.eval('document.body.innerText');
  const has = (sel) => page.eval(`!!document.querySelector(${JSON.stringify(sel)})`);
  const tap = async (sel) => { await page.click(sel); await sleep(150); };
  const toMap = async (what) => {
    await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, what);
    await dismissHints(page);
  };
  // down to Dark Water's pin, as if both pins had broken, with the dress found above the stair
  const toDarkPin = `(() => { const B = window.Brinelight, E = B.E, r = B.run; r.floor = 8; r.cleared = [0]; r.screen = 'pin'; E.goDeeper(r); r.floor = 8; r.cleared = [0, 1]; r.found = E.hasKit(r, 'suit') ? null : 'suit'; r.screen = 'pin'; B.render(); })()`;

  await page.click('[data-act="newrun"]');
  await clickIf(page, '[data-act="dive"]');
  await toMap('the first map');
  await page.eval(toDarkPin);
  await sleep(300);
  // the Tolling Buoy's story scene plays before the choice: three pictures, the last one the dress
  const beat = () => page.eval(`(() => { const o = document.querySelector('#overlay .opening'); return o ? { text: o.querySelector('.op-text').textContent, go: o.querySelector('[data-act="opnext"]').textContent.trim(), dots: o.querySelectorAll('.op-dots i, .op-dots span').length } : null; })()`);
  let sc = await beat();
  if (!sc || !/Tolling Buoy/.test(sc.text)) failures.push(`${name}: no story scene when the Tolling Buoy breaks (${JSON.stringify(sc)})`);
  await checkPage(page, name + ' buoy scene');
  await tap('#overlay [data-act="opnext"]');
  await sleep(300);
  await tap('#overlay [data-act="opnext"]');
  await sleep(300);
  sc = await beat();
  if (!sc || !/diving dress/.test(sc.text) || sc.go !== 'Go on') failures.push(`${name}: the Buoy's scene should end on the diving dress and a Go on button (${JSON.stringify(sc)})`);
  await tap('#overlay [data-act="opnext"]');
  await sleep(300);
  if (await beat()) failures.push(`${name}: the Buoy's scene didn't close after its third picture`);
  if ((await page.eval(`JSON.parse(localStorage.getItem('brinelight.story.v1')).scenes.join(',')`)) !== 'buoy') failures.push(`${name}: the Buoy's scene isn't stored as seen`);
  if (await has('[data-act="godeeper"]')) failures.push(`${name}: Go deeper is open without the diving dress`);
  if (!(await has('.scene .found-kit'))) failures.push(`${name}: the dress doesn't hang above the stair on Dark Water's pin`);
  if (!/Diving Dress/.test(await page.eval(`document.querySelector('[data-act="gohome"]').textContent`))) failures.push(`${name}: Go home doesn't say it carries the dress home`);
  if (!(await page.eval(`document.activeElement && document.activeElement.dataset.act === 'gohome'`))) failures.push(`${name}: with the stair shut, Go home should have the focus`);
  await checkPage(page, name + ' pin, no dress');
  await page.click('[data-act="gohome"]');
  await sleep(400);
  // home with the dress: the mending scene, then the window that says it is mended
  sc = await beat();
  if (!sc || !/boathouse/.test(sc.text) || sc.go !== 'Home') failures.push(`${name}: no mending scene when the dress comes home (${JSON.stringify(sc)})`);
  await checkPage(page, name + ' mending scene');
  await tap('#overlay [data-act="opnext"]');
  await sleep(300);
  const told = await page.eval(`[...document.querySelectorAll('#overlay .news-item > div > b')].map((e) => e.textContent).join('|')`);
  if (!/Diving Dress is mended/.test(told)) failures.push(`${name}: the New at the lighthouse window doesn't tell of the mended dress (${told})`);
  await checkPage(page, name + ' dress news');
  await tap('#overlay [data-act="newsok"]');
  await sleep(200);
  if (!/You carried home the Diving Dress/.test(await body())) failures.push(`${name}: the end screen doesn't show the dress carried home`);
  if (!(await page.eval(`window.Brinelight.meta.owned.includes('suit')`))) failures.push(`${name}: the dress isn't owned after going home`);
  await checkPage(page, name + ' dress carried home');

  // the next expedition: wear the dress from the kit, and Dark Water's stair down is open
  await page.eval(`document.querySelector('[data-act="newrun"]').scrollIntoView({ block: 'center' })`);
  await sleep(200);
  await page.click('[data-act="newrun"]');
  await page.waitFor(`!!document.querySelector('#overlay [data-act="kitslot"][data-place="coat"]')`, 3000, 'the kit before a descent');
  await page.click('#overlay [data-act="kitslot"][data-place="coat"]');
  await page.waitFor(`!!document.querySelector('#overlay [data-act="kitwear"][data-g="suit"]')`, 3000, 'the dress in the kit');
  await page.click('#overlay [data-act="kitwear"][data-g="suit"]');
  await sleep(150);
  await page.click('#overlay [data-act="dive"]');
  await toMap('the map in the dress');
  if (!(await page.eval(`window.Brinelight.E.hasKit(window.Brinelight.run, 'suit')`))) failures.push(`${name}: the dress chosen in the kit isn't worn`);
  await page.eval(toDarkPin);
  await sleep(300);
  if (await beat()) failures.push(`${name}: the Buoy's scene played a second time`);
  await sleep(200);
  if (await has('.scene .found-kit')) failures.push(`${name}: the dress still hangs above the stair while Wren wears it`);
  await checkPage(page, name + ' pin, in the dress');
  await page.click('[data-act="godeeper"]');
  await page.waitFor('window.Brinelight.run.screen === "rest"', 5000, 'the stair to the Belfry');
  await sleep(300);
  await dismissHints(page);
  // going down with both picks unused is allowed
  if (!/Belfry/.test(await page.eval(`document.querySelector('[data-act="tomap"]').textContent`))) failures.push(`${name}: the stair's button should say it goes down into the Belfry`);
  await page.eval(`document.querySelector('[data-act="tomap"]').scrollIntoView({ block: 'center' })`);
  await sleep(150);
  await page.click('[data-act="tomap"]');
  await toMap('the Belfry map');
  if ((await page.eval('window.Brinelight.run.level')) !== 2) failures.push(`${name}: the run is not in the Belfry`);
  if (!/Belfry/.test(await page.eval(`document.querySelector('.map-header h2').textContent`))) failures.push(`${name}: the map header doesn't name the Belfry`);
  // the first time down into the Belfry, its scene plays over the map: three pictures, and Back goes to the one before (v0.40.0)
  let bs = await beat();
  if (!bs || !/last dry step/.test(bs.text) || bs.dots !== 3) failures.push(`${name}: going down into the Belfry should play its three-picture scene (${JSON.stringify(bs)})`);
  await tap('#overlay [data-act="opnext"]');
  await sleep(300);
  bs = await beat();
  if (!bs || !/full of bells/.test(bs.text)) failures.push(`${name}: the Belfry's second picture should say why it is full of bells (${JSON.stringify(bs)})`);
  await tap('#overlay [data-act="opback"]');
  await sleep(300);
  bs = await beat();
  if (!bs || !/last dry step/.test(bs.text)) failures.push(`${name}: Back in a story scene should go to the picture before (${JSON.stringify(bs)})`);
  for (let i = 0; i < 4 && await beat(); i++) { await tap('#overlay [data-act="opnext"]'); await sleep(300); }
  if (await beat()) failures.push(`${name}: the Belfry's scene didn't close`);
  if (!/below/.test(await page.eval(`JSON.parse(localStorage.getItem('brinelight.story.v1')).scenes.join(',')`))) failures.push(`${name}: the Belfry's scene isn't stored as seen`);
  if (!/Lamplighter’s tag/.test(await page.eval(`document.querySelector('#overlay .quest-modal')?.textContent || ''`))) failures.push(`${name}: no Hester brief for the Belfry after the dive scene`);
  await dismissHints(page);
  // v0.37.0: the Belfry is a dive: one stop a row, 5 landings, and under a lesser bell one of six
  const dive = await page.eval(`(() => { const r = window.Brinelight.run; return { rows: r.map.rows, nodes: document.querySelectorAll('.map .node').length, hud: document.querySelector('.stat.floor').textContent, legend: document.querySelector('.map-legend').textContent }; })()`);
  if (dive.rows !== 4 || dive.nodes !== 5 || !/0\/5/.test(dive.hud) || !/lesser bell/i.test(dive.legend)) failures.push(`${name}: the Belfry should be a dive of 4 stops and the pin, 5 landings (${JSON.stringify(dive)})`);
  await checkPage(page, name + ' belfry dive map');
  await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; r.pos = { row: 0, col: 2 }; r.floor = 1; E.enterNode(r, r.map.grid[1][2]); B.render(); })()`);
  await waitIdle(page);
  await dismissHints(page);
  const bellStop = await page.eval(`({ opts: [...document.querySelectorAll('.stair-opt')].map((b) => b.dataset.id), title: document.querySelector('.stair-title').textContent, count: document.querySelector('.stair-count').textContent })`);
  if (bellStop.opts.join() !== 'hester,rest,refit,shed,flask,sea,fog' || !/lesser bell/i.test(bellStop.title) || !/one/.test(bellStop.count)) failures.push(`${name}: the marked lesser bell should include the quest choice (${JSON.stringify(bellStop)})`);
  await checkPage(page, name + ' lesser bell');
  await clickIf(page, '.stair-opt[data-id="hester"]');
  if (!/Lamplighter’s tag recovered/.test(await page.eval(`document.querySelector('#overlay .modal-head')?.textContent || ''`))) failures.push(`${name}: the tag recovery should open a popup`);
  await clickIf(page, '[data-act="hesterfound"]');
  await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; E.backToMap(r); E.enterNode(r, r.map.grid[3][2]); B.render(); })()`);
  await page.eval(`document.querySelector('.stair-opt[data-id="fog"]').scrollIntoView({ block: 'center' })`);
  await tap('.stair-opt[data-id="fog"]');
  await page.waitFor('window.Brinelight.run.screen === "event"', 5000, 'a Belfry Fog event from the lesser bell');
  if (!(await page.eval(`BL.BANDS.belfry.events.includes(window.Brinelight.run.event.id)`))) failures.push(`${name}: swimming out from a lesser bell should open one of the Belfry's own Fog events`);
  await page.eval(`(() => { const B = window.Brinelight; B.E.backToMap(B.run); B.render(); })()`);
  await waitIdle(page);

  const setFight = async (enc, kind, setup) => {
    await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; r.combat = null; r.screen = 'map'; E.startCombat(r, ${JSON.stringify(kind)}, ${JSON.stringify(enc)}); const c = r.combat; c.enemies.forEach((e) => { e.hp = e.maxHp = 400; }); ${setup || ''}; B.render(); })()`);
    await waitIdle(page);
    await dismissHints(page);
  };
  // a Belfry fight: its own background, and Wren in the dress
  await setFight(['belljelly', 'spawn'], 'easy');
  const bg = await page.eval(`getComputedStyle(document.getElementById('field')).backgroundImage`);
  if (!/bg_belfry\.webp/.test(bg)) failures.push(`${name}: Belfry fights should use bg_belfry (got ${bg})`);
  if (!/keeper_suit\.webp/.test(await page.eval(`document.querySelector('.unit.player .sprite img').src`))) failures.push(`${name}: Wren isn't in the diving dress in the Belfry`);
  await checkPage(page, name + ' belfry fight');

  // the Bellwether: one jab breaks it open, and the Thing in the Bell comes out where it hung
  await setFight(['bell'], 'boss', "c.enemies[0].hp = 3; c.enemies[0].ward = 0; c.enemies[0].intent = 'clapper'; r.hp = 30; c.hand.unshift(E.newCard(r, 'jab')); c.light = 3");
  await sleep(1600);
  await dismissHints(page);
  const bell = await page.eval(`window.Brinelight.run.combat.enemies[0].uid`);
  if (!(await has(`.unit.enemy[data-uid="${bell}"][data-id="bell"]`)) && !(await has(`.unit.enemy[data-id="bell"]`))) failures.push(`${name}: the Bellwether isn't on the field`);
  const jab = await page.eval(`window.Brinelight.run.combat.hand.find((x) => x.id === 'jab').uid`);
  await tap(`#hand .card[data-uid="${jab}"]`);
  await tap(`.unit.enemy .sprite`);
  await page.waitFor(`document.querySelector('.opening [data-act="opnext"]')?.textContent === 'Face the Thing'`, 6000, 'the Bell breaking scene');
  await clickIf(page, '.opening [data-act="opnext"]');
  await waitIdle(page, 'the Bell breaking');
  await sleep(1200);
  const after = await page.eval(`(() => { const B = window.Brinelight, c = B.run.combat, e = c.enemies[0], u = document.querySelector('.unit.enemy');
    return { id: e.id, hp: e.hp, dead: e.hp <= 0, won: !!c.won, keeper: B.run.hp, domId: u && u.dataset.id, src: u && u.querySelector('.sprite img').src, name: u && u.querySelector('.uname').textContent, phase2: document.getElementById('field').classList.contains('phase2') }; })()`);
  if (after.id !== 'bellthing' || after.dead || after.won) failures.push(`${name}: the Bellwether should break open into the Thing in the Bell (got ${JSON.stringify(after)})`);
  if (after.domId !== 'bellthing' || !/bellthing\.webp/.test(after.src || '') || !/Thing in the Bell/.test(after.name || '')) failures.push(`${name}: the boss's sprite and name didn't change to the Thing in the Bell (${JSON.stringify(after)})`);
  if (!after.phase2) failures.push(`${name}: the field doesn't show the second phase`);
  if (!(after.keeper > 30)) failures.push(`${name}: the Heart's light should heal Wren when the Bell breaks (HP ${after.keeper})`);
  await checkPage(page, name + ' thing in the bell');
  await page.eval(`(() => { const B = window.Brinelight, r = B.run; r.hp = 0; r.combat.lost = true; B.E.gainKeepsake(r, 'whaletooth'); B.E.gainTonic(r, 'ink'); return B.onDefeat(); })()`);
  await page.waitFor(`!!document.querySelector('[data-act="retryfinal"]')`, 5000, 'the Belfry rematch offer');
  await page.goto(url);
  await inject(page);
  await clickIf(page, '[data-act="continue"]');
  await clickIf(page, '[data-act="retryfinal"]');
  const retry = await page.eval(`(() => { const { run, E } = window.Brinelight; return run.screen === 'combat' && run.hp === Math.ceil(run.maxHp * E.FINAL_RETRY_HP) && run.combat.enemies[0].id === 'bell' && !run.keepsakes.length && run.tonics.every((t) => !t); })()`);
  if (!retry) failures.push(`${name}: the reloaded offer should restart from the Bellwether at the stated health without carried loot`);
  if (page.errors.length) failures.push(`${name}: page errors:\n    ` + page.errors.join('\n    '));
}

/* v0.22.0, slice C: the Lazaret says where deeper keepsakes are found, the Logbook shows the Hold, the Workshop has
   the new kit, the Hold stays 20 in Dark Water (it grew there from v0.22.0 to v0.30.x), a Dark Water shop tags its own keepsake, the
   Bailer allows two Bails or Stirs a turn, and the Safety Line holds once. */
async function findsScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'mouse'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  await page.goto(base + '?seed=8181');
  const meta = { salvage: 200, earned: 200, owned: ['suit', 'bailer', 'line'], ach: ['bothends', 'closecall'], kit: { bell: 'tidebell', coat: 'suit', ditty: 'bailer' },
    lazaret: ['whaletooth'], bring: [], lazOpen: true, record: { runs: 1, wins: 1, hearts: 0, quiets: 0, deep: { level: 0, floor: 8 } } };
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); localStorage.setItem('brinelight.tutorial.v1', 'done'); localStorage.setItem('brinelight.story.v1', ${QUIET_STORY}); localStorage.setItem('brinelight.meta.v1', ${JSON.stringify(JSON.stringify(Object.assign({ told: TOLD }, meta)))}); })()`);
  await page.goto(base + '?seed=8181');
  await inject(page);
  const text = (sel) => page.eval(`(document.querySelector(${JSON.stringify(sel)}) || { textContent: '' }).textContent`);
  const all = (sel) => page.eval(`[...document.querySelectorAll(${JSON.stringify(sel)})].map((x) => x.textContent).join(' | ')`);
  const toasts = () => all('.toast-msg');
  const close = async () => { await clickIf(page, '#overlay [data-act="close"]'); await sleep(200); };

  // the Lazaret: keepsakes not brought home yet say where they are found
  await page.click('[data-act="lazaret"]');
  await sleep(250);
  const missing = await all('#overlay .lz-missing');
  if (!/Found in Dark Water/.test(missing) || !/Found in the Belfry/.test(missing)) failures.push(`${name}: the Lazaret doesn't say where deeper keepsakes are found (${missing.slice(0, 120)})`);
  await checkPage(page, name + ' lazaret');
  await close();
  // the Logbook: the Hold, which no longer grows (v0.31.0)
  await page.click('[data-act="logbook"]');
  await sleep(250);
  const log2 = await text('#overlay .logbook');
  if (!/Your Hold\s*20 Roil/.test(log2) || /once you reach/.test(log2)) failures.push(`${name}: the Logbook should show a Hold of 20 that doesn't grow (${(log2.match(/Your Hold.{0,60}/) || [log2.slice(0, 160)])[0]})`);
  await close();
  // the Workshop: the five new pieces, the Harbour Bell locked behind its achievement
  await page.click('[data-act="workshop"]');
  await sleep(250);
  // each slot's tray in turn: together they list every piece
  let ws = '';
  for (const pl of ['harpoon', 'bell', 'coat', 'pocket', 'ditty']) {
    await page.click(`#overlay [data-act="kitslot"][data-place="${pl}"]`);
    await sleep(150);
    ws += await text('#overlay .kit-tray');
  }
  ['Toggle Iron', 'Harbour Bell', 'Plated Dress', 'Bailer', 'Safety Line', "Out of Its Bell"].forEach((w) => { if (ws.indexOf(w) < 0) failures.push(`${name}: the Workshop doesn't show ${w}`); });
  // the kit screens show the dress worn, not rolled up as she carries it
  if (!/keeper_suit\.webp/.test(await page.eval(`document.querySelector('#overlay .doll-wren img').src`))) failures.push(`${name}: the Workshop doesn't show Wren wearing the Diving Dress`);
  await checkPage(page, name + ' workshop');
  await close();

  // set out in the dress with the Bailer, carrying a Hollow Whelk
  await page.click('[data-act="newrun"]');
  await page.waitFor(`!!document.querySelector('#overlay [data-act="dive"]')`, 3000, 'the pack screen');
  await page.click('#overlay [data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'the map');
  await dismissHints(page);
  await page.eval(`(() => { const B = window.Brinelight, r = B.run; B.E.gainKeepsake(r, 'whelk'); r.floor = 8; r.cleared = [0]; r.screen = 'pin'; B.render(); })()`);
  await sleep(200);
  const whelk = await page.eval('BL.KEEPSAKES.whelk.charge');
  if (!new RegExp(`${whelk}/20`).test(await text('.hud .charge'))) failures.push(`${name}: the Roil chip should read ${whelk}/20 (got ${await text('.hud .charge')})`);
  if (/Hold grows/.test(await text('[data-act="godeeper"]'))) failures.push(`${name}: Go deeper says the Hold will grow, but it is constant`);
  await page.click('[data-act="godeeper"]');
  await page.waitFor('window.Brinelight.run.screen === "rest"', 5000, 'the Cove on the stair');
  await sleep(200);
  if (/Hold grows/.test(await toasts())) failures.push(`${name}: a toast says the Hold grows, but it is constant (${await toasts()})`);
  if (!new RegExp(`${whelk}/20`).test(await text('.hud .charge'))) failures.push(`${name}: the Roil chip should still read ${whelk}/20 in Dark Water (got ${await text('.hud .charge')})`);
  const stored = await page.eval(`JSON.parse(localStorage.getItem('brinelight.meta.v1')).reached`);
  if (stored !== 1) failures.push(`${name}: reaching Dark Water should be stored at once (reached ${stored})`);
  await dismissHints(page);
  await page.eval(`document.querySelector('[data-act="tomap"]').scrollIntoView({ block: 'center' })`);
  await sleep(150);
  await page.click('[data-act="tomap"]');
  await page.waitFor('window.Brinelight.run.screen === "map"', 5000, 'the Dark Water map');
  await dismissHints(page);

  // a Dark Water shop: its first keepsake is one of Dark Water's own, and says so
  await page.eval(`(() => { const B = window.Brinelight, r = B.run; B.E.enterNode(r, { row: 1, col: r.map.grid[1].findIndex(Boolean), type: 'shop', next: [] }); B.render(); })()`);
  await sleep(250);
  await dismissHints(page);
  if (!/From Dark Water/.test(await all('.shop-tile .k-deep'))) failures.push(`${name}: the Dark Water shop doesn't tag its own keepsake`);
  await checkPage(page, name + ' dark water shop');

  // a fight: with the Bailer, Bail and Stir both
  const setFight = async (enc, setup) => {
    await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; r.combat = null; r.shop = null; r.screen = 'map'; E.startCombat(r, 'easy', ${JSON.stringify(enc)}); const c = r.combat; c.enemies.forEach((e) => { e.hp = e.maxHp = 300; }); ${setup || ''}; B.render(); })()`);
    await waitIdle(page);
    await dismissHints(page);
  };
  await setFight(['kelp'], 'c.light = 3; c.tide = 3');
  await page.click('[data-act="swellact"][data-kind="bail"]');
  await waitIdle(page, 'the Bail');
  await page.click('[data-act="swellact"][data-kind="stir"]');
  await waitIdle(page, 'the Stir');
  const sw = await page.eval(`(() => { const r = window.Brinelight.run, c = r.combat; return { used: window.Brinelight.E.swellActsUsed(c), tide: c.tide, light: c.light, off: document.querySelectorAll('.tb-act.used').length }; })()`);
  if (sw.used !== 2 || sw.tide !== 3 || sw.light !== 1 || sw.off !== 2) failures.push(`${name}: with the Bailer, a Bail and a Stir in one turn (got ${JSON.stringify(sw)})`);
  await checkPage(page, name + ' bailer');

  // the Safety Line holds once
  await page.eval(`(() => { const B = window.Brinelight, r = B.run; r.kit.ditty = 'line'; })()`);
  await setFight(['crab'], "r.hp = 1; c.enemies[0].intent = Object.keys(BL.ENEMIES.crab.moves).find((m) => BL.ENEMIES.crab.moves[m].dmg)");
  await page.click('#btn-end');
  await waitIdle(page, 'the enemy turn');
  await sleep(400);
  const ln = await page.eval(`(() => { const r = window.Brinelight.run; return { hp: r.hp, lost: !!(r.combat && r.combat.lost), screen: r.screen, used: !!r.lineUsed }; })()`);
  if (ln.lost || ln.screen !== 'combat' || ln.hp !== 5 || !ln.used) failures.push(`${name}: the Safety Line should leave Wren with 5 HP (got ${JSON.stringify(ln)})`);
  if (!/Line holds/.test(await toasts())) failures.push(`${name}: no toast when the Safety Line holds`);
  await checkPage(page, name + ' safety line');
  if (page.errors.length) failures.push(`${name}: page errors:\n    ` + page.errors.join('\n    '));
}

/* v0.16.0: the end screen's score lines and the purple Lazaret box, the Rite pill in the hand, and the title menu's
   backup, restore and reset (a reset keeps the settings; a restore brings everything back). */
async function progressScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'mouse'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  const PREFS = JSON.stringify({ sound: false, music: false, fast: true });
  await page.goto(base + '?seed=8888');
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', ${JSON.stringify(PREFS)}); localStorage.setItem('brinelight.tutorial.v1', 'done'); localStorage.setItem('brinelight.story.v1', ${QUIET_STORY}); ${QUIET_META} })()`);
  await page.goto(base + '?seed=8888');
  await inject(page);
  const count = (sel) => page.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`);
  const text = (sel) => page.eval(`(document.querySelector(${JSON.stringify(sel)}) || { textContent: '' }).textContent`);
  const waitReload = async (what) => {
    const t0 = Date.now();
    for (;;) {
      try { if (await page.eval('!window.__beforeReload && !!window.Brinelight && !!document.querySelector(".title-screen")')) break; } catch (e) { /* the page is reloading */ }
      if (Date.now() - t0 > 8000) throw new Error('timed out waiting for the reload after ' + what);
      await sleep(100);
    }
    await sleep(250);
    await inject(page);
  };

  // a won run: the score lines add up to the score, and every unlock box is the same purple
  await page.click('[data-act="newrun"]');
  await clickIf(page, '[data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map for the progress run');
  await dismissHints(page);
  await page.eval(`(() => { const B = window.Brinelight, r = B.run; B.E.gainKeepsake(r, 'moonshard'); r.stats.kills = 20; r.stats.crests = 7; r.stats.elites = 2; r.combat = null; r.landed = [8, 8]; r.level = 2; r.floor = 8; r.cleared = [0, 1, 2]; r.heart = true; r.screen = 'victory'; B.render(); })()`);
  await sleep(200);
  const sums = await page.eval(`(() => { const dd = [...document.querySelectorAll('.score-parts dl div:not(.sum) dd')].map((d) => +d.textContent.replace('+', ''));
    return { lines: dd.length, sum: dd.reduce((a, b) => a + b, 0), shown: +document.querySelector('.score-parts .sum dd').textContent, score: window.Brinelight.run.final.score }; })()`);
  if (sums.lines < 5 || sums.sum !== sums.score || sums.shown !== sums.score) failures.push(`${name}: the score lines don't add up to the score (${JSON.stringify(sums)})`);
  if (!/1 for every 50 score/.test(await text('.salvage-box'))) failures.push(`${name}: the Salvage line doesn't say how the score turns into Salvage`);
  const bgs = await page.eval(`[...document.querySelectorAll('.unlock-box')].map((el) => getComputedStyle(el).backgroundColor)`);
  if (bgs.length < 2 || new Set(bgs).size !== 1) failures.push(`${name}: the unlock boxes on the end screen aren't all the same colour (${JSON.stringify(bgs)})`);
  if (!/The Lantern Heart rises/.test(await page.eval('document.body.innerText')) || !/Currents are open/.test(await page.eval('document.body.innerText'))) failures.push(`${name}: the first Heart should say so and open the currents`);
  await checkPage(page, name + ' win');
  // the currents: chosen on shore, remembered, and they raise the score
  await page.eval(`document.querySelector('[data-act="newrun"]').scrollIntoView({ block: 'center' })`);
  await sleep(200);
  await page.click('[data-act="newrun"]');
  await page.waitFor(`!!document.querySelector('#overlay [data-act="current"]')`, 3000, 'currents in the pack');
  await checkPage(page, name + ' currents');
  const tapSeen = async (sel) => { await page.eval(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'center' })`); await sleep(150); await page.click(sel); await sleep(150); };
  await tapSeen('#overlay [data-act="current"][data-k="fed"]');
  await tapSeen('#overlay [data-act="current"][data-k="backwash"]');
  if (!/score ×1\.5/.test(await page.eval(`document.querySelector('#overlay').innerText`))) failures.push(`${name}: two currents should show score ×1.5`);
  await page.click('#overlay [data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map with currents');
  await dismissHints(page);
  if ((await page.eval('window.Brinelight.run.currents.join(",")')) !== 'fed,backwash' || (await page.eval(`JSON.parse(localStorage.getItem('brinelight.meta.v1')).currents.join(",")`)) !== 'fed,backwash') failures.push(`${name}: the chosen currents didn't reach the run or weren't remembered`);

  // a Rite in the hand wears its type; other cards in the hand don't
  await page.eval(`(() => { const B = window.Brinelight, E = B.E; const r = E.newRun(8888, 0); B.run = r; E.startCombat(r, 'easy', ['kelp']); r.combat.hand = ['beam', 'jab', 'moonpull', 'brace'].map((id) => E.newCard(r, id)); B.render(); })()`);
  await sleep(1500);
  const pills = await page.eval(`[...document.querySelectorAll('.hand .card')].map((c) => { const t = c.querySelector('.c-type'); const r = t.getBoundingClientRect(); return (getComputedStyle(t).display !== 'none' && r.width > 0 ? t.textContent : '-'); }).join(',')`);
  if (pills.toLowerCase() !== 'rite,-,rite,-') failures.push(`${name}: only the Rites in the hand should show their type (${pills})`);
  // Bail and Stir: a button at each end of the Swell; one a turn
  await page.eval(`(() => { const B = window.Brinelight, c = B.run.combat; c.tide = 5; c.light = 3; B.render(); })()`);
  await sleep(600);
  await dismissHints(page);
  if ((await count('#tidebar .tb-act.bail')) !== 1 || (await count('#tidebar .tb-act.stir')) !== 1) failures.push(`${name}: the Swell bar should have a Bail and a Stir button`);
  await checkPage(page, name + ' swell bar');
  await page.click('#tidebar .tb-act.stir');
  await waitIdle(page, 'the Stir');
  const stirred = await page.eval('(() => { const c = window.Brinelight.run.combat; return { crests: c.turnCrests, light: c.light, tide: c.tide, off: document.querySelectorAll("#tidebar .tb-act[aria-disabled]").length }; })()');
  if (stirred.crests !== 1 || stirred.light !== 2 || stirred.tide !== 3 || stirred.off !== 2) failures.push(`${name}: Stir at 5 should Crest for 1 Light and use up the turn's Bail or Stir (${JSON.stringify(stirred)})`);
  await page.key('b');
  await sleep(300);
  if ((await page.eval('window.Brinelight.run.combat.light')) !== 2 || !/Once a turn/.test(await page.eval('document.body.innerText'))) failures.push(`${name}: a second Bail in the same turn should be refused with a reason`);
  await page.eval(`(() => { const B = window.Brinelight; B.run = null; B.render(); })()`);

  // the menu during a run has no reset; on the title screen it has backup, restore and reset
  await page.eval(`(() => { const B = window.Brinelight, E = B.E; B.run = E.newRun(8888, 0); B.render(); })()`);
  await page.click('[data-act="menu"]');
  await sleep(150);
  if (await count('#overlay [data-act="progress"]')) failures.push(`${name}: the menu offers a reset during a run`);
  // Credits, from the menu and from the title screen: every link opens in a new tab, so following one never leaves a run
  const checkCredits = async (from) => {
    if (!(await clickIf(page, from))) { failures.push(`${name}: no Credits button at ${from}`); return; }
    await sleep(150);
    const links = await page.eval(`[...document.querySelectorAll('#overlay .credits a')].map((a) => a.target + ' ' + a.rel + ' ' + a.href)`);
    if (!/Simon Willison/.test(await text('#overlay .credits')) || !links.length || links.some((l) => !/^_blank noopener https:\/\//.test(l))) failures.push(`${name}: Credits from ${from} (${links.join(', ')})`);
    await checkPage(page, name + ' credits');
  };
  await checkCredits('#overlay [data-act="credits"]');
  if (!(await page.eval('!!window.Brinelight.run'))) failures.push(`${name}: opening Credits from the menu dropped the run`);
  await clickIf(page, '#overlay [data-act="close"]');
  await page.eval(`(() => { const B = window.Brinelight; B.run = null; B.render(); })()`);
  await checkCredits('.title-foot [data-act="credits"]');
  await clickIf(page, '#overlay [data-act="close"]');
  await page.click('[data-act="menu"]');
  await sleep(150);
  // on the title screen the menu is only Settings: what the title screen already has a button for isn't repeated (v0.58.1)
  const repeats = await page.eval(`['help', 'story', 'tutorial', 'changelog', 'credits'].filter((a) => document.querySelector('#overlay .modal-body [data-act="' + a + '"]')).concat(document.querySelector('#overlay .modal-body [data-act="close"]') ? ['Resume'] : [])`);
  if (repeats.length) failures.push(`${name}: the title screen's Settings repeats ${repeats.join(', ')}`);
  if (!(await count('#overlay [data-act="togglefast"]')) || !(await count('#overlay [data-vol="music"]'))) failures.push(`${name}: the title screen's Settings lost a setting`);
  await page.eval(`document.querySelector('#overlay [data-act="progress"]').scrollIntoView({ block: 'center' })`);
  await page.click('#overlay [data-act="progress"]');
  await sleep(150);
  if ((await count('#overlay [data-act="exportsave"]')) !== 1 || (await count('#overlay [data-act="importsave"]')) !== 1 || (await count('#overlay [data-act="resetask"]')) !== 1) failures.push(`${name}: the title menu should offer a backup, a restore and a reset`);
  await checkPage(page, name + ' progress dialog');
  await page.click('#overlay [data-act="exportsave"]');
  await sleep(200);
  if (!/Backup downloaded/.test(await page.eval('document.body.innerText'))) failures.push(`${name}: Download a backup didn't say it downloaded`);
  const backup = await page.eval('window.Brinelight.backupData()');
  const meta0 = await page.eval(`localStorage.getItem('brinelight.meta.v1')`);
  if (backup.kind !== 'brinelight-backup' || backup.data['brinelight.meta.v1'] !== meta0 || !backup.data['brinelight.prefs.v1'] || Object.keys(backup.data).some((k) => !k.startsWith('brinelight.'))) failures.push(`${name}: the backup doesn't hold the progress (${Object.keys(backup.data || {}).join(', ')})`);
  await page.click('#overlay [data-act="resetask"]');
  await sleep(150);
  if (!/can't be undone/.test(await text('#overlay .modal-body')) || (await count('#overlay [data-act="resetconfirm"]')) !== 1) failures.push(`${name}: Reset progress doesn't ask first`);
  await checkPage(page, name + ' reset dialog');
  await page.eval('window.__beforeReload = 1');
  await page.click('#overlay [data-act="resetconfirm"]');
  await waitReload('the reset');
  const after = await page.eval(`({ meta: localStorage.getItem('brinelight.meta.v1'), best: localStorage.getItem('brinelight.best.v1'), story: localStorage.getItem('brinelight.story.v1'), prefs: localStorage.getItem('brinelight.prefs.v1'), laz: document.querySelectorAll('[data-act="lazaret"]').length })`);
  if (after.meta || after.best || after.story || after.laz) failures.push(`${name}: the reset left progress behind (${JSON.stringify(after)})`);
  if (after.prefs !== PREFS) failures.push(`${name}: the reset changed the settings (${after.prefs})`);

  // a file that isn't a backup changes nothing; the backup brings it all back
  await page.eval(`window.Brinelight.askRestore('{"kind":"something else"}')`);
  await sleep(150);
  if (!/Not a Brinelight backup/.test(await text('#overlay .modal'))) failures.push(`${name}: a wrong file wasn't refused`);
  await clickIf(page, '#overlay [data-act="close"]');
  await page.eval(`window.Brinelight.askRestore(${JSON.stringify(JSON.stringify(backup))})`);
  await sleep(150);
  if (!/Restore this backup/.test(await text('#overlay .modal'))) failures.push(`${name}: a backup file doesn't ask before restoring`);
  await page.eval('window.__beforeReload = 1');
  await page.click('#overlay [data-act="importconfirm"]');
  await waitReload('the restore');
  const meta1 = await page.eval(`localStorage.getItem('brinelight.meta.v1')`);
  if (meta1 !== meta0 || !(await count('[data-act="lazaret"]'))) failures.push(`${name}: the restore didn't bring the progress back`);
  await checkPage(page, name + ' restored');
  if (page.errors.length) failures.push(`${name}: page errors:\n    ` + page.errors.join('\n    '));
}

/* v0.25.0: sound and music on. Nothing starts before a click; the music follows the screen (a cue for each kind of
   screen, its intensity the depth) and the place's own sounds play, fewer in a fight; the menu's switches and
   sliders work and are saved; and a whole fight's sounds raise no error. The recorded songs take over from the score
   on the title screen, at Barnaby's and in the Harbour Hermit's and the Bellwether's fights, really play, and hand
   back to the score when you leave. The Jukebox plays a song, pauses it, plays a piece of the score at a depth, and
   keeps playing after it closes until a descent starts. */
async function jukeHintChecks(page, name) {
  const errors = await page.eval(`(() => {
    const B = window.Brinelight, errors = [], all = B.juke.map(([kind, key]) => kind + ':' + key);
    const saved = { heard: B.meta.heard.slice(), hearts: B.meta.record.hearts, filter: B.ui.jukeFilter };
    const show = () => { B.closeOverlay(); document.querySelector('.title-third [data-act="jukebox"]').click(); };
    const check = (label, options, expected) => {
      B.meta.heard = options.heard || all.filter((id) => !(options.missing || []).includes(id));
      B.meta.record.hearts = options.heart === false ? 0 : 1;
      B.ui.jukeFilter = options.filter || 'all';
      show();
      const h = document.querySelector('.juke-more span'), text = h ? h.textContent : null;
      if (text !== expected) errors.push(label + ': ' + JSON.stringify(text) + ', expected ' + JSON.stringify(expected));
      if (text && /listen|music on|hear its|unfamiliar|farther down|explore/.test(text)) errors.push(label + ': hint must state an objective progress trigger');
    };
    try {
      check('first descent', { heard: ['song:title'], heart: false }, 'Start a descent.');
      check('first fight', { heard: ['song:title', 'cue:reach'], heart: false }, 'Enter a fight.');
      check('first Fog', { heard: ['song:title', 'cue:reach', 'cue:fight'], heart: false }, 'Enter the Fog, a wreck or a toll bell.');
      check('first Cove', { heard: ['song:title', 'cue:reach', 'cue:fight', 'cue:fog'], heart: false }, 'Rest at a Sheltered Cove.');
      check('first Dread', { heard: ['song:title', 'cue:reach', 'cue:fight', 'cue:fog', 'cue:cove'], heart: false }, 'Encounter a Dread.');
      check('pin', { missing: ['cue:pin'] }, 'Encounter a pin.');
      check('second phase', { missing: ['cue:pin2', 'song:nobody'] }, "Reach a pin's second phase.");
      check('homecoming', { missing: ['cue:home'] }, 'Return home after defeating a pin.');
      check('early haul', { missing: ['cue:haul'] }, 'Choose Go home after defeating a pin.');
      check('songs filter', { heard: ['song:title'], heart: false, filter: 'song' }, 'Encounter the Harbour Hermit a second time.');
      check('Dark Water fight', { missing: ['cue:murk'], filter: 'cue' }, 'Enter a fight below the Shallows.');
      check('first Strider song', { missing: ['song:gardener', 'song:putback'] }, 'Encounter the Garden Strider.');
      check('alternate Strider song', { missing: ['song:putback'] }, 'Encounter the Garden Strider again.');
      check('first Buoy song', { missing: ['song:hush', 'song:chain', 'cue:buoy'] }, 'Encounter the Tolling Buoy.');
      check('second Buoy song', { missing: ['song:chain', 'cue:buoy'] }, 'Encounter the Tolling Buoy again.');
      check('Buoy score', { missing: ['cue:buoy'], filter: 'cue' }, 'Encounter the Tolling Buoy again after unlocking both of its songs.');
      check('Oarfish', { missing: ['song:herring'] }, 'Encounter the Crowned Oarfish.');
      check('Bellwether', { missing: ['song:bell'], heart: false }, 'Encounter the Drowned Bellwether, or bring the Heart home.');
      check('Yearling', { missing: ['song:eye'] }, 'Encounter the Bell Yearling.');
      check('Cantor', { missing: ['song:cantor'] }, 'Encounter the Drowned Cantor.');
      check('Dark Watch phase 1', { missing: ['cue:watch', 'song:nobody'] }, 'Encounter the Dark Watch.');
      check('Dark Watch', { missing: ['song:nobody'] }, "Reach the Dark Watch's second phase.");
      check('fall', { missing: ['cue:fallen'] }, 'End a descent in a fall.');
      check('dawn gate', { heart: false }, 'Bring the Heart home.');
      check('retired encounter', { missing: ['song:bell'] }, null);
      for (const filter of ['all', 'song', 'cue']) check('complete ' + filter, { filter }, null);
      check('songs complete, score incomplete', { heard: all.filter((id) => id.startsWith('song:')), filter: 'song' }, null);
      check('score filter', { heard: all.filter((id) => id.startsWith('song:')), filter: 'cue' }, 'Start a descent.');
    } finally {
      B.meta.heard = saved.heard; B.meta.record.hearts = saved.hearts; B.ui.jukeFilter = saved.filter; show();
    }
    return errors;
  })()`);
  failures.push(...errors.map((e) => name + ' unlock hints: ' + e));
}

async function mutedMusicScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  await page.goto(base + '?seed=5555');
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, musicVol: 0, fast: true })); localStorage.setItem('brinelight.tutorial.v1', 'done'); localStorage.setItem('brinelight.story.v1', ${QUIET_STORY}); ${QUIET_META} })()`);
  await page.goto(base + '?seed=5555');
  await inject(page);
  const check = async (label, opened, locked = []) => {
    const state = await page.eval(`(() => { const B = Brinelight, a = B.audio(); return { ids: B.meta.heard, stored: JSON.parse(localStorage.getItem('brinelight.meta.v1') || '{}').heard || [], music: !!a.music, song: a.song, setting: JSON.parse(localStorage.getItem('brinelight.prefs.v1')).music }; })()`);
    for (const id of opened) if (!state.ids.includes(id) || !state.stored.includes(id)) failures.push(`${name}: ${label} did not persist ${id} while muted`);
    for (const id of locked) if (state.ids.includes(id)) failures.push(`${name}: ${label} opened ${id} too early`);
    if (state.setting !== false || state.music || state.song) failures.push(`${name}: ${label} started music while muted (${JSON.stringify(state)})`);
  };
  await page.click('[data-act="newrun"]');
  await clickIf(page, '#overlay [data-act="opskip"]');
  await clickIf(page, '#overlay [data-act="tutorialskip"]');
  await clickIf(page, '#overlay [data-act="dive"]');
  await page.waitFor('Brinelight.run && Brinelight.run.screen === "map"', 5000, 'muted descent');
  await check('starting a descent', ['cue:reach']);
  const set = (js) => page.eval(`(() => { const B = Brinelight; ${js}; B.fightSong(); B.render(); B.save(); B.closeOverlay(true); })()`);
  await set(`B.E.startCombat(B.run, 'elite', ['strider'])`);
  await check('first Strider encounter', ['cue:fight', 'cue:dread', 'song:gardener'], ['song:putback']);
  await set('B.render(); B.render()');
  await check('redrawing the same encounter', ['song:gardener'], ['song:putback']);
  await set(`B.E.startCombat(B.run, 'elite', ['strider'])`);
  await check('second Strider encounter', ['song:putback']);
  for (const [song, id] of [['hush', 'song:hush'], ['chain', 'song:chain'], ['box', 'cue:buoy']]) {
    await set(`B.run.level = 1; B.E.startCombat(B.run, 'boss')`);
    if ((await page.eval('Brinelight.run.combat.song')) !== song) failures.push(`${name}: expected ${song} on the next muted Buoy encounter`);
    await check('Buoy ' + song, [id, 'cue:pin'], song === 'box' ? [] : ['cue:buoy']);
  }
  await set('B.run.combat.phase2 = true');
  await check('second phase', ['cue:pin2'], ['song:nobody']);
  await set(`B.run.level = 0; B.E.startCombat(B.run, 'boss')`);
  await check('first Hermit encounter', ['song:hermit'], ['song:deep']);
  await set(`B.E.startCombat(B.run, 'boss')`);
  await check('repeat Hermit encounter', ['song:deep']);
  await set(`B.run.level = 2; B.run.heartHome = true; B.E.startCombat(B.run, 'boss'); B.run.combat.phase2 = true`);
  await check('the Dark Watch call', ['song:nobody']);
  await page.goto(base + '?seed=5555');
  await check('reload', ['cue:reach', 'song:putback', 'song:chain', 'cue:buoy', 'song:deep', 'song:nobody']);
  // An old muted collection is recovered from progress at boot, before any audio context or click exists.
  await page.eval(`(() => { localStorage.removeItem('brinelight.save.v1'); localStorage.setItem('brinelight.meta.v1', JSON.stringify({ heard: [], told: ${JSON.stringify(TOLD)}, record: { runs: 2, wins: 1, hearts: 1, quiets: 0, deep: { level: 2, floor: 3 } } })); localStorage.setItem('brinelight.story.v1', JSON.stringify({ opening: true, marks: ['en:strider', 'en:buoy', 'en:oarfish', 'heart', 'home', 'fell'] })); })()`);
  await page.goto(base + '?seed=5555');
  await inject(page);
  await check('legacy progress recovery', ['cue:reach', 'cue:fight', 'cue:pin', 'cue:pin2', 'cue:home', 'cue:fallen', 'song:gardener', 'song:hush', 'song:herring', 'song:bells', 'song:bell'], ['song:putback', 'song:chain', 'cue:buoy']);
  await checkPage(page, name);
}

async function audioScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'mouse'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  await page.goto(base + '?seed=7171');
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: true, music: true, fast: true })); localStorage.setItem('brinelight.tutorial.v1', 'done'); localStorage.setItem('brinelight.story.v1', ${QUIET_STORY}); ${QUIET_META} })()`);
  await page.goto(base + '?seed=7171');
  await inject(page);
  const audio = () => page.eval(`(() => { const a = window.Brinelight.audio(); return { ctx: a.ctx, depth: a.depth, ambience: a.ambience, playing: !!a.music, target: a.music && a.music.target, intensity: a.music && a.music.intensity, song: a.song, songAt: a.songAt, songGain: a.songGain, loop: a.loop }; })()`);
  const expect = async (label, want) => {
    await sleep(150);
    const a = await audio();
    const bad = Object.keys(want).filter((k) => a[k] !== want[k]);
    if (bad.length) failures.push(`${name}: ${label}: ${bad.map((k) => `${k} is ${JSON.stringify(a[k])}, expected ${JSON.stringify(want[k])}`).join('; ')}`);
  };
  await expect('before any click', { ctx: null, playing: false, song: null });
  // the first click starts the music: the title screen's song, in place of the score's title cue
  await page.click('.title-corner [data-act="menu"]');
  await expect('the title, after a click', { ctx: 'running', playing: false, song: 'title', ambience: '', loop: 'title,hermit,buoy,watch' }); // It Went Dark on My Watch is open from the start since v0.36.0; Harbour Bells at Dawn waits for the Heart since v0.40.0
  // a song is heard: its time moves on
  const plays = async (label) => {
    const t0 = (await audio()).songAt;
    await sleep(1200);
    const a = await audio();
    if (!(a.song && a.songAt > t0 + 0.3)) failures.push(`${name}: ${label}: the song isn't playing (${JSON.stringify(a.song)} at ${t0} then ${a.songAt})`);
  };
  await plays('the title song');
  // the menu: Sound effects and Music, each a switch and a volume slider
  if ((await page.eval(`document.querySelectorAll('#overlay .vol-row input[type="range"]').length`)) !== 2) failures.push(`${name}: the menu doesn't have a volume slider for sound effects and for music`);
  await page.eval(`(() => { const r = document.querySelector('#overlay input[data-vol="music"]'); r.value = 40; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const saved = await page.eval(`JSON.parse(localStorage.getItem('brinelight.prefs.v1')).musicVol`);
  if (saved !== 0.4) failures.push(`${name}: the music slider at 40% saved ${saved}`);
  if ((await page.eval(`document.querySelector('#overlay input[data-vol="music"] + output').textContent`)) !== '40%') failures.push(`${name}: the music slider doesn't show 40%`);
  await page.click('#overlay [data-act="togglemusic"]');
  await expect('music switched off', { playing: false, song: null });
  if (await page.eval(`!!document.querySelector('.title-now .now-btn')`)) failures.push(`${name}: the title screen names a song with the music off`);
  if (!(await page.eval(`/Music: Off/.test(document.querySelector('#overlay [data-act="togglemusic"]').textContent)`))) failures.push(`${name}: the music switch doesn't read Off`);
  await page.click('#overlay [data-act="togglemusic"]');
  await expect('music switched on again', { playing: false, song: 'title' });
  // the song playing is named on the title screen, outside the Jukebox
  const chip = await page.eval(`(() => { const b = document.querySelector('.title-now .now-btn'); return b ? b.textContent.trim() : null; })()`);
  if (chip !== 'The Great Light Turning Slow') failures.push(`${name}: the title screen names the song playing as ${JSON.stringify(chip)}`);
  await clickIf(page, '#overlay [data-act="close"]');
  // the Jukebox is there from the start
  if (!(await page.eval(`!!document.querySelector('[data-act="jukebox"]')`))) failures.push(`${name}: the Jukebox isn't on the title screen from the start`);
  // the Workshop, over the title screen, keeps the title's song
  await page.eval(`(() => { const B = window.Brinelight; B.meta.earned = Math.max(1, B.meta.earned || 0); B.meta.ach.push('outofbell'); B.render(); })()`);
  await page.click('[data-act="workshop"]');
  await expect('the Workshop', { playing: false, song: 'title' });
  await clickIf(page, '#overlay [data-act="close"]');
  // The Jukebox shows only playable tracks. Eight are open from the start; there are no spoiler placeholders.
  const heardList = () => page.eval('window.Brinelight.meta.heard.slice()');
  if (!(await heardList()).includes('song:title')) failures.push(`${name}: hearing the title song didn't count it as heard`);
  await page.click('.title-now [data-act="jukebox"]'); // the song's name opens the Jukebox
  const jb = (js) => page.eval(`(() => { const o = document.querySelector('#overlay'); return ${js}; })()`);
  await jukeHintChecks(page, name);
  const items = await jb(`o.querySelectorAll('.juke-item').length`);
  if (items !== 8) failures.push(`${name}: the Jukebox lists ${items} tracks, expected 8 playable tracks`);
  if ((await jb(`o.querySelectorAll('.juke-tag.rec').length`)) !== 7 || (await jb(`o.querySelectorAll('.juke-tag.box').length`)) !== 1) failures.push(`${name}: the Jukebox doesn't mark the 7 open songs and the Keeper's Song`);
  if (!(await jb(`!!o.querySelector('.juke-item.cur [data-key="title"][aria-pressed="true"]')`))) failures.push(`${name}: the Jukebox doesn't show the title song playing`);
  if (await jb(`!!o.querySelector('.juke-item.locked, .juke-row:disabled')`)) failures.push(`${name}: the Jukebox still has locked placeholders`);
  const shownText = await jb(`o.textContent + [...o.querySelectorAll('[aria-label], [title]')].map((e) => (e.getAttribute('aria-label') || '') + (e.title || '')).join(' ')`);
  if (/Harbour Bells at Dawn|Gardener|Put It Back|Herrings|Remember the Eye|Ring It Once Again|Nobody in the Dress|Sunken Stair|The Rocking Toll|Bring the Heart|after the Heart|Belfry|Dark Water|not heard yet/.test(shownText)) failures.push(`${name}: undiscovered music leaks through text or accessibility labels (${shownText})`);
  for (const key of ['departure', 'shop', 'shell']) if (!(await jb(`!!o.querySelector('[data-act="jukeplay"][data-key="${key}"]')`))) failures.push(`${name}: ${key} should be open from the start`);
  if (!(await jb(`[...o.querySelectorAll('.juke-item:not(.locked) .juke-row')].some((b) => /It Went Dark/.test(b.getAttribute('aria-label')))`))) failures.push(`${name}: It Went Dark on My Watch should be open from the start`);
  if (await jb(`!!o.querySelector('.juke-depth')`)) failures.push(`${name}: depth controls should be absent while a song is selected`);
  // Browsing filters don't interrupt playback, and the player stays usable when its track isn't in the list.
  await page.click('#overlay [data-act="jukefilter"][data-filter="song"]');
  if ((await jb(`o.querySelectorAll('.juke-item').length`)) !== 7 || await jb(`!!o.querySelector('.juke-tag.box')`)) failures.push(`${name}: Songs doesn't filter the list`);
  await expect('filtering Songs, still the title song', { song: 'title' });
  await page.click('#overlay [data-act="jukefilter"][data-filter="cue"]');
  if ((await jb(`o.querySelectorAll('.juke-item').length`)) !== 1 || await jb(`!!o.querySelector('.juke-tag.rec')`)) failures.push(`${name}: Music box doesn't filter the list`);
  await expect('filtering Music box, still the title song', { song: 'title' });
  await page.click('#overlay [data-act="jukeplay"][data-kind="cue"][data-key="title"]');
  await expect('the Keeper\'s Song', { song: null, playing: true, target: 'title', intensity: 0 });
  if (!(await jb(`o.querySelector('.juke-depth select').value === '0' && o.querySelectorAll('.juke-depth option').length === 1`))) failures.push(`${name}: the music box should offer only the Shallows at first`);
  if (!(await jb(`(() => { const a = o.querySelector('.juke-score'); return a && a.href.startsWith('https://a403.space/musicbox/editor/#score=') && a.target === '_blank' && a.rel.includes('noopener'); })()`))) failures.push(`${name}: no portable Musicbox score link for the piece playing`);
  await page.click('#overlay [data-act="jukefilter"][data-filter="song"]');
  if (!(await jb(`!!o.querySelector('.juke-score') && !o.querySelector('.juke-item.cur')`))) failures.push(`${name}: filtering out the playing piece should preserve the player and score link`);
  await expect('filtering Songs, still the Keeper\'s Song', { song: null, playing: true, target: 'title' });
  await page.click('#overlay [data-act="jukeplay"][data-kind="song"][data-key="title"]');
  // Lyrics opens the song's lyrics; Back returns to the player and keeps the song playing.
  if (!(await jb(`o.querySelector('[data-act="jukewords"]').textContent === 'Lyrics' && o.querySelector('[data-act="jukewords"]').getAttribute('aria-label').startsWith('Lyrics of ')`))) failures.push(`${name}: the lyrics button should be named Lyrics, including its accessible label`);
  await page.click('#overlay [data-act="jukewords"][data-key="title"]');
  await sleep(150);
  if (!(await jb(`!!o.querySelector('.lyrics-modal') && /Burn low, my lantern/.test(o.textContent) && o.querySelectorAll('.lyrics h3').length >= 6`))) failures.push(`${name}: the title song's Lyrics page doesn't show its words in parts`);
  await checkPage(page, name + ' words');
  await page.click('#overlay [data-act="jukeback"]');
  await sleep(150);
  if (!(await jb(`!!o.querySelector('.jp-links [data-act="jukewords"]') && o.querySelector('[data-filter="song"]').getAttribute('aria-pressed') === 'true'`))) failures.push(`${name}: Back from lyrics doesn't keep the player and browsing filter`);
  if (!(await jb(`document.activeElement === o.querySelector('.jp-links [data-act="jukewords"]')`))) failures.push(`${name}: Back from the lyrics doesn't put the focus back on the Lyrics button`);
  await expect('the title song, after its words', { song: 'title' });
  await page.click('#overlay [data-act="jukefilter"][data-filter="all"]');
  // A legacy save that heard Harbour Bells on the title still waits for the Heart.
  await page.eval(`window.Brinelight.meta.heard.push('song:bells')`);
  await sleep(600);
  if (await jb(`!!o.querySelector('[data-act="jukeplay"][data-key="bells"]')`)) failures.push(`${name}: hearing Harbour Bells before the Heart must not open it`);
  // Hear more: the Heart opens Harbour Bells; reaching the Belfry opens its depth.
  await clickIf(page, '#overlay [data-act="close"]');
  await page.eval(`(() => { const B = window.Brinelight; B.meta.record.runs = 1; B.meta.record.hearts = 1; B.meta.reached = 2; B.meta.heard.push('cue:dread'); })()`);
  await page.click('.title-third [data-act="jukebox"]');
  if ((await jb(`o.querySelectorAll('.juke-item').length`)) !== 11 || !(await jb(`!!o.querySelector('[data-key="bells"]') && !!o.querySelector('[data-key="bell"]')`))) failures.push(`${name}: hearing a Dread and bringing the Heart home didn't reveal its music, including the retired encounter's song`);
  await clickIf(page, '#overlay [data-act="jukeplay"][data-key="departure"]');
  await expect('the Jukebox: High Tide Departure', { playing: false, song: 'departure' });
  await plays('High Tide Departure');
  if (await jb(`!!o.querySelector('[data-act="jukewords"]')`)) failures.push(`${name}: High Tide Departure has no words, but the Jukebox offers them`);
  if (!(await jb(`o.querySelector('.jp-t').textContent.includes(' / ') && !!o.querySelector('.juke-player input.juke-pos') && !o.querySelector('.juke-list input')`))) failures.push(`${name}: the Jukebox should put seeking and elapsed time in the player only`);
  // move through it: 10 s on, then the slider to 1:40
  let at = (await audio()).songAt;
  await clickIf(page, '#overlay [data-act="jukeskip"][data-by="10"]');
  let now2 = (await audio()).songAt;
  if (!(now2 > at + 8)) failures.push(`${name}: +10 s moved the song from ${at.toFixed(1)} to ${now2.toFixed(1)}`);
  await page.eval(`(() => { const r = document.querySelector('#overlay input.juke-pos'); r.value = 100; r.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(300);
  now2 = (await audio()).songAt;
  if (!(now2 >= 99 && now2 < 103)) failures.push(`${name}: the slider at 1:40 put the song at ${now2.toFixed(1)}`);
  await clickIf(page, '#overlay [data-act="jukeskip"][data-by="-10"]');
  at = (await audio()).songAt;
  if (!(at < now2 - 8)) failures.push(`${name}: -10 s moved the song from ${now2.toFixed(1)} to ${at.toFixed(1)}`);
  // the player at the top (v0.32.0) names what plays; next and previous go through the open tracks in the list's order
  const jp = () => jb(`({ name: o.querySelector('.jp-now b').textContent, pp: o.querySelector('[data-act="jukepp"]').getAttribute('aria-label'), shuffle: o.querySelector('[data-act="jukeshuffle"]').getAttribute('aria-pressed') })`);
  const pl = await jp();
  if (pl.name !== 'High Tide Departure' || pl.pp !== 'Pause') failures.push(`${name}: the player shows ${JSON.stringify(pl)} while High Tide Departure plays`);
  const openTracks = await jb(`[...o.querySelectorAll('.juke-item:not(.locked) [data-act="jukeplay"]')].map((b) => b.dataset.kind + ':' + b.dataset.key)`);
  const afterDep = openTracks[(openTracks.indexOf('song:departure') + 1) % openTracks.length];
  await clickIf(page, '#overlay [data-act="jukenext"]');
  await expect(`the player: next after High Tide Departure (${afterDep})`, afterDep.startsWith('song:') ? { song: afterDep.slice(5) } : { song: null, playing: true, target: afterDep.slice(4) });
  // (previous goes back only in a song's first 3 s; on a busy machine the wait above can outlast them, so wind back first)
  await page.eval(`(() => { const r = document.querySelector('#overlay input.juke-pos'); if (r) { r.value = 0; r.dispatchEvent(new Event('input', { bubbles: true })); } })()`);
  await sleep(150);
  await clickIf(page, '#overlay [data-act="jukeprev"]');
  await expect('the player: previous, back to High Tide Departure', { song: 'departure' });
  // previous more than 3 s into a song starts it again
  await page.eval(`(() => { const r = document.querySelector('#overlay input.juke-pos'); r.value = 60; r.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(200);
  await clickIf(page, '#overlay [data-act="jukeprev"]');
  await sleep(200);
  at = (await audio()).songAt;
  if ((await audio()).song !== 'departure' || !(at < 5)) failures.push(`${name}: previous at 1:00 should start High Tide Departure again (at ${at.toFixed(1)} s)`);
  // shuffle: kept with the settings, and next plays every open song once before any comes round again
  await clickIf(page, '#overlay [data-act="jukeshuffle"]');
  if ((await jp()).shuffle !== 'true' || !(await page.eval(`JSON.parse(localStorage.getItem('brinelight.prefs.v1')).jukeShuffle === true`))) failures.push(`${name}: shuffle didn't turn on, or isn't kept`);
  const openSongs = openTracks.filter((t) => t.startsWith('song:')).map((t) => t.slice(5));
  const shuffled = ['departure'];
  for (let i = 1; i < openSongs.length; i++) { await clickIf(page, '#overlay [data-act="jukenext"]'); await sleep(150); shuffled.push((await audio()).song); }
  if (new Set(shuffled).size !== openSongs.length || shuffled.some((k) => !openSongs.includes(k))) failures.push(`${name}: shuffled, next played ${shuffled.join(', ')}; expected each of ${openSongs.join(', ')} once`);
  await clickIf(page, '#overlay [data-act="jukenext"]');
  await sleep(150);
  const nextRound = (await audio()).song;
  if (!openSongs.includes(nextRound) || nextRound === shuffled[shuffled.length - 1]) failures.push(`${name}: shuffled, the next round started on ${nextRound} after ${shuffled[shuffled.length - 1]}`);
  await clickIf(page, '#overlay [data-act="jukeshuffle"]');
  if ((await jp()).shuffle !== 'false') failures.push(`${name}: shuffle didn't turn off`);
  // the player's volume is the music's (the menu's Music slider)
  const jvol = (v) => page.eval(`(() => { const r = document.querySelector('#overlay .jp-vol input'); r.value = ${v}; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await jvol(40);
  if (!(await page.eval(`JSON.parse(localStorage.getItem('brinelight.prefs.v1')).musicVol === 0.4 && document.querySelector('#overlay .jp-vol output').textContent === '40%'`))) failures.push(`${name}: the player's volume didn't set the music's to 40%`);
  await jvol(80);
  await checkPage(page, name + ' jukebox player');
  // back to High Tide Departure for what follows
  if ((await audio()).song !== 'departure') await clickIf(page, '#overlay [data-act="jukeplay"][data-key="departure"]');
  await expect('High Tide Departure again', { song: 'departure' });
  await clickIf(page, '#overlay [data-act="jukeplay"][data-key="departure"]');
  await expect('the Jukebox: paused', { playing: false, song: null });
  // Depth controls appear after choosing a music box piece, then change only its depth.
  if (await jb(`!!o.querySelector('.juke-depth')`)) failures.push(`${name}: depth controls should be absent while a song is chosen`);
  const box = (await page.eval(`window.Brinelight.meta.heard.includes('cue:reach')`)) ? 'reach' : 'title';
  await clickIf(page, `#overlay [data-act="jukeplay"][data-kind="cue"][data-key="${box}"]`);
  const chooseDepth = async (depth) => {
    await page.eval(`document.querySelector('.juke-depth select').focus()`);
    const before = +(await jb(`o.querySelector('.juke-depth select').value`));
    for (let i = 0; i < Math.abs(depth - before); i++) await page.key(depth > before ? 'ArrowDown' : 'ArrowUp');
  };
  const shallowLink = await jb(`o.querySelector('.juke-score').href`);
  await chooseDepth(1);
  await expect('the Jukebox: Dark Water, chosen after a song', { playing: true, target: box, intensity: 1, song: null });
  if (!(await jb(`o.querySelector('.juke-depth select').value === '1'`))) failures.push(`${name}: Dark Water isn't selected once the music box plays there`);
  if (!(await jb(`document.activeElement === o.querySelector('.juke-depth select')`)) || (await jb(`o.querySelector('.juke-score').href`)) === shallowLink) failures.push(`${name}: choosing a depth must preserve keyboard focus and update the score link`);
  await clickIf(page, '#overlay [data-act="jukeplay"][data-kind="cue"][data-key="dread"]');
  await expect('the Jukebox: a Dread', { playing: true, target: 'dread', song: null });
  await chooseDepth(2);
  await expect('the Jukebox: the Belfry', { playing: true, target: 'dread', intensity: 2 });
  if (size.w < 500) {
    await page.viewport(360, 640, size);
    await checkPage(page, name + ' small jukebox');
    const visible = await jb(`(() => { const p = o.querySelector('.juke-player').getBoundingClientRect(), b = o.querySelector('.modal-body').getBoundingClientRect(); return [...o.querySelectorAll('.juke-item')].filter((el) => { const r = el.getBoundingClientRect(); return r.top >= p.bottom && r.bottom <= b.bottom; }).length; })()`);
    if (visible < 2) failures.push(`${name}: the small-phone player leaves only ${visible} complete track rows`);
    await page.viewport(size.w, size.h, size);
  }
  await clickIf(page, '#overlay [data-act="close"]');
  await expect('the Jukebox closed, still playing', { playing: true, target: 'dread', intensity: 2, song: null });
  await page.eval(`(() => { const B = window.Brinelight; B.meta.record.runs = 0; B.meta.record.hearts = 0; B.meta.reached = 0; B.story.opening = false; })()`); // a first descent again
  // the five-picture opening plays the score's Keeper's Song, then hands over to the map
  await page.click('[data-act="newrun"]');
  await sleep(200);
  await expect("the opening: The Keeper's Song", { playing: true, target: 'title', depth: 0, intensity: 0, song: null });
  await clickIf(page, '[data-act="opskip"]');
  await clickIf(page, '[data-act="tutorialskip"]');
  await clickIf(page, '[data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map after New Descent');
  await dismissHints(page);
  await expect('the map, the game choosing the music again', { target: 'reach', depth: 0, intensity: 0, ambience: 'shallows/1', song: null });
  if (!(await heardList()).includes('cue:reach')) failures.push(`${name}: the map's music didn't count as heard`);
  // Barnaby's has two songs, one each visit in turn, and leaving hands back to the score
  const set = (js) => page.eval(`(() => { const B = window.Brinelight; ${js}; B.render(); })()`);
  const shopSongs = [];
  for (const visit of [1, 2]) {
    await set(`const r = B.run, k = { pos: r.pos, floor: r.floor, visited: (r.visited || []).slice() }; B.E.enterNode(r, { row: 0, col: 0, type: 'shop' }); Object.assign(r, k)`);
    await sleep(150);
    const a = await audio();
    shopSongs.push(a.song);
    // in a descent, a song starting is named in a short note
    if (!(await page.eval(`[...document.querySelectorAll('.toast-msg')].some((t) => /No Haggling, No Biting|Pop the Shell/.test(t.textContent))`))) failures.push(`${name}: Barnaby's, visit ${visit}: no note names his song`);
    if (!['shop', 'shell'].includes(a.song) || a.playing || a.ambience !== 'shallows/1') failures.push(`${name}: Barnaby's, visit ${visit}: ${JSON.stringify(a)}`);
    await plays(`Barnaby's song, visit ${visit}`);
    await set('B.E.backToMap(B.run)');
    await expect(`the map, after Barnaby's (visit ${visit})`, { playing: true, target: 'reach', song: null });
  }
  if (shopSongs[0] === shopSongs[1]) failures.push(`${name}: Barnaby's played ${shopSongs[0]} twice; his two songs should take turns`);
  const heardNow = await heardList();
  if (!heardNow.includes('song:shop') || !heardNow.includes('song:shell')) failures.push(`${name}: Barnaby's songs didn't count as heard`);
  await page.click('[data-act="node"]');
  await page.waitFor('window.Brinelight.run.screen !== "map"', 3000, 'the first landing');
  if (await page.eval('window.Brinelight.run.screen !== "combat"')) await page.eval(`(() => { const B = window.Brinelight; B.E.startCombat(B.run, 'easy'); B.render(); })()`);
  await expect('a fight', { target: 'fight', ambience: 'shallows/0.5' });
  await fight(page, name, {});
  await page.waitFor('window.Brinelight.run.screen !== "combat"', 5000, 'the end of the fight');
  await expect('after the fight', { target: 'reach', ambience: 'shallows/1' });
  // the Harbour Hermit's fight has its song, both phases
  await set(`B.E.startCombat(B.run, 'boss')`);
  await expect('the Harbour Hermit', { playing: false, song: 'hermit', ambience: '' });
  await plays("the Hermit's song");
  // a pin's song goes round: over its last 8 seconds it fades out, then it starts again from the top, fading in
  await page.eval('window.Brinelight.songToEnd(5)');
  await sleep(700);
  let g = (await audio()).songGain;
  if (!(g > 0 && g < 0.19)) failures.push(`${name}: 5 s before its end, the Hermit's song isn't fading out (level ${g})`);
  await page.eval('window.Brinelight.songToEnd()');
  await page.waitFor(`(() => { const a = window.Brinelight.audio(); return a.song === 'hermit' && a.songAt < 2.5; })()`, 6000, "the Hermit's song going round");
  const round = await audio();
  if (round.playing || !(round.songGain >= 0 && round.songGain < 0.19)) failures.push(`${name}: the Hermit's song should come round again fading in, without the score (${JSON.stringify(round)})`);
  await plays("the Hermit's song, round again");
  // the Hermit's turn no longer changes the song (v0.33.0); Ring for the Deep is its second song, for a whole fight
  await set('B.run.combat.phase2 = true');
  await expect("the Hermit's second phase", { playing: false, song: 'hermit' });
  await set(`B.run.combat.song = 'deep'`);
  await expect("the Hermit's second song", { playing: false, song: 'deep' });
  await plays('Ring for the Deep');
  if (!(await heardList()).includes('song:deep')) failures.push(`${name}: Ring for the Deep didn't count as heard`);
  await set('B.E.backToMap(B.run)');
  await expect('the map, after the Hermit', { playing: true, target: 'reach', song: null });
  // Sheltered Coves and Fog stops have their own score pieces
  await set(`B.run.screen = 'rest'`);
  await expect('a Sheltered Cove', { playing: true, target: 'cove', ambience: 'shallows/1', song: null });
  await set(`B.run.screen = 'toll'; B.run.toll = { paid: null }`);
  await expect('a toll bell (Fog piece)', { playing: true, target: 'fog', ambience: 'shallows/1', song: null });
  await set('B.E.backToMap(B.run)');
  // Dark Water: the far bell and the drone come in, the echo lengthens, and ordinary fights play Held Water (murk)
  await page.eval('(() => { const B = window.Brinelight; B.run.level = 1; B.render(); })()');
  await expect('Dark Water', { depth: 1, intensity: 1, ambience: 'dark/1' });
  await set(`B.E.startCombat(B.run, 'easy')`);
  await expect('a Dark Water fight', { playing: true, target: 'murk', depth: 1, intensity: 1, ambience: 'dark/0.5', song: null });
  // a pin has no place sounds, and its own cue for each phase; then the end screens
  await set(`B.E.startCombat(B.run, 'elite', ['gulper']); B.fightSong()`);
  await expect('a Dread', { target: 'dread', ambience: 'dark/0.5', song: null });
  // the Garden Strider has two songs (v0.45.0): the sung one first, then they take turns, a fight each; a Dread's song
  // carries on from where it stopped
  await set(`B.E.startCombat(B.run, 'elite', ['strider']); B.fightSong()`);
  await expect('the Garden Strider', { playing: false, song: 'gardener', ambience: 'dark/0.5' });
  await plays('The Gardener');
  await set(`B.E.startCombat(B.run, 'elite', ['strider']); B.fightSong()`);
  await expect('the Garden Strider again', { playing: false, song: 'putback' });
  await plays('Put It Back');
  await set(`B.E.startCombat(B.run, 'elite', ['strider']); B.fightSong()`);
  await expect('the Garden Strider a third time', { playing: false, song: 'gardener' });
  if (!((await audio()).songAt > 1)) failures.push(`${name}: The Gardener started again from the top; a Dread's song should carry on from where it stopped`);
  // the Tolling Buoy (v0.45.0): its singer's two songs, then its music-box piece (since v0.36.0), one for each whole fight
  await set(`B.E.startCombat(B.run, 'boss'); B.fightSong()`);
  await expect('the Tolling Buoy', { playing: false, song: 'hush', ambience: '' });
  await plays('What the Bell Is Saying');
  await set('B.run.combat.phase2 = true');
  await expect("the Buoy's second phase", { playing: false, song: 'hush' });
  await set(`B.E.startCombat(B.run, 'boss'); B.fightSong()`);
  await expect('the Tolling Buoy again', { playing: false, song: 'chain' });
  await plays('Down on the Chain');
  await set(`B.meta.heard = B.meta.heard.filter((k) => k !== 'cue:buoy'); B.E.startCombat(B.run, 'boss'); B.fightSong()`);
  await expect('the Tolling Buoy a third time', { playing: true, target: 'buoy', song: null });
  await set('B.run.combat.phase2 = true');
  await expect("the Buoy's second phase, the music box", { playing: true, target: 'buoy', song: null });
  // the Bellwether's song hands over to the score when the Thing comes out
  await set(`B.run.level = 2; B.E.startCombat(B.run, 'boss')`);
  await expect('the Drowned Bellwether', { playing: false, song: 'bell', ambience: '' });
  await plays("the Bellwether's song");
  await set(`B.run.combat.enemies.forEach((e) => { if (e.id === 'bell') e.id = 'bellthing'; }); B.run.combat.phase2 = true`);
  await expect('the Thing in the Bell', { playing: true, target: 'pin2', song: null });
  // the Belfry's Dreads with songs (v0.45.0)
  await set(`B.E.startCombat(B.run, 'elite', ['oarfish', 'spawn']); B.fightSong()`);
  await expect('the Crowned Oarfish', { playing: false, song: 'herring' });
  const herringStart = await audio();
  if (herringStart.songGain == null || herringStart.songGain >= 0.12) failures.push(`${name}: King of the Herrings should fade in from a low level`);
  await plays('King of the Herrings');
  await page.waitFor('Brinelight.audio().songGain >= 0.19', 4000, 'the Oarfish song at its normal level');
  await set(`B.run.heartHome = true; B.E.startCombat(B.run, 'elite', ['yearling', 'listener']); B.fightSong()`);
  await expect('the Bell Yearling', { playing: false, song: 'eye' });
  await plays('Remember the Eye');
  await set(`B.E.startCombat(B.run, 'elite', ['cantor']); B.fightSong()`);
  await expect('the Drowned Cantor', { playing: false, song: 'cantor' });
  await plays('Ring It Once Again');
  // once the Heart is home the Belfry's last pin is the Dark Watch, with Her Own Bell (watch) until its call
  await set(`B.run.heartHome = true; B.E.startCombat(B.run, 'boss')`);
  await expect('the Dark Watch, first phase', { playing: true, target: 'watch', ambience: '', song: null });
  // the Dark Watch calls Nobody Comes Home, a Hollow Diver: the Divers' song from then on (v0.45.0; the score's pin2 before)
  await set('B.run.combat.phase2 = true');
  await expect("the Dark Watch's call", { playing: false, song: 'nobody' });
  await plays('Nobody in the Dress');
  await set(`B.run.quieted = false; B.run.screen = 'victory'`);
  await expect('early return: Home with Your Haul', { target: 'haul', depth: 2, intensity: 2, ambience: '' });
  await set(`B.run.quieted = true; B.run.screen = 'victory'`);
  await expect('the win screen', { target: 'home', depth: 2, intensity: 2, ambience: '' });
  await set(`B.run.screen = 'defeat'`);
  await expect('the loss screen', { target: 'fallen', ambience: '' });
  await set('B.run = null');
  // back on the title, the descent just finished opens its last song: each in turn, from the top
  await expect('back on the title', { playing: false, song: 'title', depth: 0, ambience: '', loop: 'title,hermit,buoy,watch' });
  for (const next of ['hermit', 'buoy', 'watch', 'title']) {
    await page.eval('window.Brinelight.songToEnd()');
    await page.waitFor(`window.Brinelight.audio().song === '${next}'`, 6000, `the title screen going on to ${next}`);
    await plays(`the title screen's ${next} song`);
  }
  // a new page load starts on a random open title song (the keeper's song only until it has been heard), then goes round in order
  await page.goto(base + '?seed=7171');
  await inject(page);
  await page.click('.title-corner [data-act="menu"]');
  await sleep(300);
  const again = await audio(), order = 'title,hermit,buoy,watch', rot = (l) => l.split(',').map((k, i, a) => a.slice(i).concat(a.slice(0, i)).join(','));
  if (!rot(order).includes(again.loop) || again.song !== (again.loop || '').split(',')[0]) failures.push(`${name}: after a reload the title screen should start the loop on one of its songs and keep its order (${JSON.stringify(again)})`);
  // what was heard is kept across the reload (v0.29.0 forgot it, so the keeper's song always came first)
  const kept = await page.eval(`window.Brinelight.meta.heard`);
  if (!kept.includes('song:title') || !kept.includes('song:watch')) failures.push(`${name}: after a reload the Jukebox forgot what was heard (${JSON.stringify(kept)})`);
  // and the keeper's song, heard, is no longer always first: one of up to 8 reloads starts elsewhere (all 8 on it by chance: 1 in 65,536)
  let firsts = [again.song];
  while (firsts.length < 8 && firsts.every((k) => k === 'title')) {
    await page.goto(base + '?seed=7171');
    await inject(page);
    await page.click('.title-corner [data-act="menu"]');
    await sleep(300);
    firsts.push((await audio()).song);
  }
  if (firsts.every((k) => k === 'title')) failures.push(`${name}: the title screen starts on the keeper's song on every reload, though it has been heard`);
  await clickIf(page, '#overlay [data-act="close"]');
  if (page.errors.length) failures.push(`${name}: page errors:\n    ` + page.errors.join('\n    '));
}

/* The scenarios, each a job for any worker: `group` is the name --only picks. Longest first, so the workers finish
   at about the same time: Dark Water plays six real fights there and takes about 110 s, the Shallows' runs and the
   audio about 50 to 60 s, the rest 5 to 40 s (2026-11-15). */
/* v0.35.0: give a keepsake to the sea at a Cove and on the stair, and what a Roiled aether pays on the reward screen. */
async function seaScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'mouse'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  await page.goto(base + '?seed=9292');
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); localStorage.setItem('brinelight.tutorial.v1', 'done'); localStorage.setItem('brinelight.story.v1', ${QUIET_STORY}); ${QUIET_META} })()`);
  await page.goto(base + '?seed=9292');
  await inject(page);
  const R = (js) => page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; return ${js}; })()`);
  await page.click('[data-act="newrun"]');
  await clickIf(page, '[data-act="dive"]');
  await page.waitFor('window.Brinelight.run && window.Brinelight.run.screen === "map"', 5000, 'map for the sea');
  await dismissHints(page);
  // a Cove with no keepsake: the sea is there, shut
  await page.eval(`(() => { const B = window.Brinelight, r = B.run; r.hp = 31; r.screen = 'rest'; r.restDone = false; B.render(); })()`);
  await sleep(200);
  if (!(await page.eval(`(() => { const b = document.querySelector('[data-act="sea"]'); return !!b && b.disabled && /no keepsake/.test(b.textContent); })()`))) failures.push(`${name}: a Cove without a keepsake should show the sea, disabled`);
  // with three keepsakes (Roiled, 43 of 20): choose one, then the card; backing out of either costs nothing
  await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; ['tidewatch', 'whaletooth', 'moonshard'].forEach((k) => E.gainKeepsake(r, k)); r.ksFights = { tidewatch: 5, whaletooth: 9, moonshard: 1 }; B.render(); })()`);
  await sleep(200);
  await dismissHints(page);
  await checkPage(page, name + ' cove');
  await page.click('[data-act="sea"]');
  await sleep(250);
  const tiles = await page.eval(`[...document.querySelectorAll('#overlay [data-act="seapick"]')].map((t) => t.dataset.k + ':' + t.querySelector('.sea-pay').textContent.trim()).join('|')`);
  // since v0.38.0 the sea pays 3 HP for each fight won carrying it, up to a Cove's rest (21 at 70 Max HP)
  if (tiles !== 'tidewatch:Carried 5 fights: heal 15 HP, refit a card|whaletooth:Carried 9 fights: heal 21 HP, refit a card|moonshard:Carried 1 fight: heal 3 HP, refit a card') failures.push(`${name}: the sea should offer the three keepsakes with what it pays (${tiles})`);
  await checkPage(page, name + ' sea picker');
  await page.click('#overlay .modal-foot [data-act="close"]');
  await sleep(200);
  if ((await R('r.keepsakes.length')) !== 3 || (await R('r.restDone'))) failures.push(`${name}: Keep them all should change nothing`);
  await page.click('[data-act="sea"]');
  await sleep(250);
  await page.eval(`document.querySelector('#overlay [data-act="seapick"][data-k="tidewatch"]').scrollIntoView({ block: 'center' })`);
  await page.click('#overlay [data-act="seapick"][data-k="tidewatch"]');
  await page.waitFor(`!!document.querySelector('#overlay .card[data-uid]')`, 3000, 'the card picker after choosing a keepsake');
  if ((await R('r.keepsakes.length')) !== 3) failures.push(`${name}: the keepsake went before a card was chosen`);
  await page.click('#overlay .card[data-uid]');
  await sleep(300);
  await clickIf(page, '#overlay [data-act="deckconfirm"]');
  await page.waitFor('window.Brinelight.run.restDone === true', 3000, 'the Cove used after giving to the sea');
  const after = await R(`({ hp: r.hp, keeps: r.keepsakes.join(','), ups: r.deck.filter((c) => c.up).length, steps: E.roil(r).steps })`);
  if (after.hp !== 46 || after.keeps !== 'whaletooth,moonshard' || after.ups !== 1 || after.steps !== 1) failures.push(`${name}: after giving the Tidewatch: ${JSON.stringify(after)}, expected 46 HP, two keepsakes, one card upgraded, one step`);
  if (!/You give the Tidewatch to the sea/.test(await page.eval('document.body.innerText'))) failures.push(`${name}: the Cove doesn't say what the sea gave`);
  await checkPage(page, name + ' cove after');
  // a fight begun Roiled pays for it, and the reward says so
  await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; E.backToMap(r); E.startCombat(r, 'easy'); const c = r.combat; c.turn = 9; c.flags.hpLost = true; c.enemies.forEach((e) => { e.dead = true; e.hp = 0; }); c.won = true; E.finishCombat(r); B.render(); })()`);
  await sleep(300);
  const chip = await page.eval(`(document.querySelector('.chip.bonus.roil') || { textContent: '' }).textContent.trim()`);
  if (chip !== 'Roiled +4') failures.push(`${name}: the reward should show "Roiled +4" for one step (got "${chip}")`);
  await checkPage(page, name + ' reward');
  // the stair has six, and the sea is one of its two picks
  await page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; r.rewards = null; r.hp = 30; r.floor = 8; r.cleared = [0]; r.screen = 'pin'; E.goDeeper(r); B.render(); })()`);
  await sleep(700);
  await dismissHints(page);
  if ((await page.eval(`document.querySelectorAll('.stair-opt').length`)) !== 6) failures.push(`${name}: the stair should offer six`);
  await checkPage(page, name + ' stair');
  await page.eval(`document.querySelector('.stair-opt[data-id="sea"]').scrollIntoView({ block: 'center' })`);
  const seaPay = await R(`({ hp: r.hp, pay: Math.min(E.seaHeal(r, 'moonshard'), r.maxHp - r.hp) })`); // v0.38.0: by the fights carried
  await page.click('.stair-opt[data-id="sea"]');
  await sleep(250);
  await page.eval(`document.querySelector('#overlay [data-act="seapick"][data-k="moonshard"]').scrollIntoView({ block: 'center' })`);
  await page.click('#overlay [data-act="seapick"][data-k="moonshard"]');
  await page.waitFor(`!!document.querySelector('#overlay .card[data-uid]')`, 3000, 'the card picker on the stair');
  await page.click('#overlay .card[data-uid]');
  await sleep(300);
  await clickIf(page, '#overlay [data-act="deckconfirm"]');
  await page.waitFor('window.Brinelight.E.stairState(window.Brinelight.run).picks.join(",") === "sea"', 3000, 'the sea as a pick on the stair');
  const st = await R(`({ hp: r.hp, keeps: r.keepsakes.join(','), ups: r.deck.filter((c) => c.up).length })`);
  if (st.hp !== seaPay.hp + seaPay.pay || seaPay.pay <= 0 || st.keeps !== 'whaletooth' || st.ups !== 2) failures.push(`${name}: after giving the Moon Shard on the stair: ${JSON.stringify(st)}`);
  if (!(await page.eval(`document.querySelector('.stair-opt[data-id="sea"]').classList.contains('done')`))) failures.push(`${name}: the stair doesn't mark the sea as done`);
  if (page.errors.length) failures.push(`${name}: page errors:\n    ` + page.errors.join('\n    '));
}

async function choicesScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'mouse+keyboard'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  const url = base + '?seed=2';
  await page.goto(url);
  await page.eval(`(() => { localStorage.clear(); localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true })); localStorage.setItem('brinelight.tutorial.v1', 'done'); localStorage.setItem('brinelight.story.v1', ${QUIET_STORY}); ${QUIET_META} })()`);
  await page.goto(url);
  await inject(page);
  const R = (js) => page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; return ${js}; })()`);
  await page.click('[data-act="newrun"]');
  await clickIf(page, '[data-act="dive"]');
  if (!/Keeper’s log/.test(await page.eval(`document.querySelector('#overlay .quest-modal')?.textContent || ''`))) throw new Error('Hester should brief the player in a popup before the first move');
  await dismissHints(page);
  if (!/8 Salvage/.test(await page.eval(`document.querySelector('#hester-job')?.textContent || ''`))) throw new Error('Hester should brief the player on the Shallows map');
  const parent = await R('E.availableNodes(r).find((n) => n.next.includes(E.hesterJob(r).col)).col');
  await clickIf(page, `.node.avail[data-col="${parent}"]`);
  await dismissHints(page);
  await page.eval(`(() => { const B = window.Brinelight; const c = B.run.combat; c.won = true; c.enemies.forEach((e) => { e.dead = true; e.hp = 0; }); return B.onVictory(); })()`);
  await dismissHints(page);
  await page.eval(`(() => { const B = window.Brinelight; B.run.rewards.tonic = 'kelptea'; B.render(); })()`);
  if (!await page.eval(`document.querySelector('.tonic-reward').getBoundingClientRect().bottom < document.querySelector('.reward-main').getBoundingClientRect().top`)) throw new Error('Tonic reward should appear above the card choices');
  await clickIf(page, '[data-act="taketonic"]');
  const roles = await page.eval(`[...document.querySelectorAll('.opening-option > span')].map((el) => el.textContent).join(',')`);
  if (roles !== 'Surge,Ebb,Wildcard') throw new Error('Wrong opening choices: ' + roles);
  if (size.touch) await clickIf(page, '.card[data-scope="rw-card"][data-key="1"]');
  else await page.key('2');
  await clickIf(page, '[data-act="pickok"][data-scope="rw-card"]');
  if ((await R('r.screen')) === 'reward') await clickIf(page, '[data-act="tomap"]');
  if (!(await R('E.vals(r.deck.at(-1)).ebb > 0'))) throw new Error('Taking the Ebb option should add its card to the deck');
  await clickIf(page, '.node.avail[aria-describedby="hester-job"]');
  await dismissHints(page);
  const recover = await R('E.eventOptions(r).length - 1');
  await clickIf(page, `[data-act="evopt"][data-i="${recover}"]`);
  if (!/Keeper’s log recovered/.test(await page.eval(`document.querySelector('.scene h1').textContent`))) throw new Error('The log should have a recovery screen');
  await clickIf(page, '[data-act="evcontinue"]');
  if (!(await R('E.hesterJob(r).recovered'))) throw new Error('The Fog choice should recover the log');

  const enc = await R('E.bosunClue(r).enc.join(",")');
  const warning = await page.eval(`document.querySelector('#bosun-clue').textContent`);
  await page.goto(url);
  await inject(page);
  await page.click('[data-act="continue"]');
  await dismissHints(page);
  if (await page.eval(`document.querySelector('#bosun-clue').textContent`) !== warning) throw new Error('The warning changed on reload');
  await checkPage(page, name + ' fork');
  await clickIf(page, '.node.avail[aria-describedby="bosun-clue"]');
  if ((await R('r.combat.enc.join(",")')) !== enc) throw new Error('The Dread should match Bosun’s warning');
  await dismissHints(page);

  await page.eval(`(() => { const B = window.Brinelight; B.E.backToMap(B.run); B.run.screen = 'rest'; B.run.restDone = false; B.render(); })()`);
  await dismissHints(page);
  await clickIf(page, '[data-act="refit"]');
  const swell = await R('r.deck.find((card) => card.id === "swell").uid');
  const pick = `#overlay [data-act="deckpick"][data-uid="${swell}"]`;
  await clickIf(page, pick);
  const refits = await page.eval(`[...document.querySelectorAll('.refit-option .c-name')].map((n) => n.textContent).join(',')`);
  if (refits !== 'Rising Swell+,High Swell') throw new Error('Wrong refit options: ' + refits);
  await checkPage(page, name + ' refit');
  await clickIf(page, '#overlay [data-act="deckback"]');
  if (await R(`r.restDone || r.deck.find((c) => c.uid === ${swell}).up`)) throw new Error('Backing out spent the refit');
  await clickIf(page, pick);
  await clickIf(page, '#overlay [data-act="deckconfirm"][data-up="2"]');
  if (!(await R(`r.restDone && E.cardName(r.deck.find((c) => c.uid === ${swell})) === 'High Swell'`))) throw new Error('Choosing the second refit should spend one Cove action');

  await page.eval(`(() => { const B = window.Brinelight; B.run.cleared = [0]; B.run.floor = 8; B.run.screen = 'pin'; B.E.gainKeepsake(B.run, 'tidewatch'); B.E.gainKeepsake(B.run, 'anchor'); B.render(); })()`);
  if (!/8 Salvage/.test(await page.eval(`document.querySelector('[data-act="gohome"]').textContent`))) throw new Error('The pin should show the job payout');
  await clickIf(page, '[data-act="gohome"]');
  if (!(await R('B.meta.hesterDone.includes("log") && r.final.hesterJobs[0].pay === 8 && B.meta.salvage === r.final.salvage + 8'))) throw new Error('The job should pay separately from score Salvage');
  if (!(await R('r.final.laz.added.length === 2 && B.meta.lazaret.includes("tidewatch") && B.meta.lazaret.includes("anchor")'))) throw new Error('Surfacing should bank every carried keepsake');
  if (!/Keeper’s log returned/.test(await page.eval(`document.querySelector('#overlay .quest-modal')?.textContent || ''`))) throw new Error('Returning the log should open Hester’s handoff');
  await clickIf(page, '[data-act="hesterhome"]');
  await page.goto(url);
  await inject(page);
  await page.click('[data-act="newrun"]');
  await clickIf(page, '[data-act="dive"]');
  if (!(await R('B.meta.hesterDone.includes("log") && !E.hesterJob(r)'))) throw new Error('The completed job should stay completed after reload');
  if (page.errors.length) failures.push(`${name}: page errors:\n    ` + page.errors.join('\n    '));
}

async function mateoScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h} ${size.touch ? 'touch' : 'keyboard'}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  const url = base + '?seed=23';
  await page.goto(url);
  await page.eval(`(() => {
    localStorage.clear();
    localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true }));
    localStorage.setItem('brinelight.tutorial.v1', 'done');
    localStorage.setItem('brinelight.story.v1', JSON.stringify({ opening: true, scenes: ${JSON.stringify(SEEN_SCENES.filter((id) => id !== 'knocking'))} }));
    localStorage.setItem('brinelight.meta.v1', JSON.stringify({ record: { runs: 1, wins: 1, hearts: 1 }, owned: ['suit'], reached: 2, told: ${JSON.stringify(TOLD)}, hesterDone: true }));
  })()`);
  await page.goto(url);
  await inject(page);
  const evalRun = (js) => page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; ${js} })()`);
  const has = (s) => page.eval(`!!document.querySelector(${JSON.stringify(s)})`);
  const click = async (s) => { if (!await clickIf(page, s)) throw new Error('Missing control: ' + s); };
  const shot = async (key) => {
    if (!process.env.BRINELIGHT_MATEO_SHOTS) return;
    if (key === 'pack') await page.waitFor(`!document.querySelector('#toast .toast-msg')`, 6000, 'clear Pack preview');
    await sleep(730);
    const prefix = path.join(process.env.BRINELIGHT_MATEO_SHOTS, size.touch ? 'phone' : 'desktop');
    await page.screenshot(`${prefix}-${key}.png`);
  };
  const win = () => evalRun(`r.combat.won = true; r.combat.enemies.forEach((e) => { e.hp = 0; e.dead = true; }); return B.onVictory();`);
  const art = () => page.eval(`document.querySelector('.op-art')?.style.backgroundImage || ''`);
  if (!/Follow the knocking/.test(await page.eval(`document.querySelector('[data-act="newrun"]').textContent`))) throw new Error('The title should lead a Heart winner to the knocking');
  await click('[data-act="newrun"]');
  if (!/marked Dread in Dark Water/.test(await page.eval(`document.querySelector('.op-text')?.textContent || ''`))) throw new Error('The title lead should explain the marked Dread');
  await click('[data-act="opnext"]');
  if (await has('[data-act="keeper"]')) throw new Error('Mateo appeared in Pack before the note came home');
  await click('[data-act="dive"]');
  if (!await evalRun('return r.keeper === "wren" && r.stranger === "mateo"')) throw new Error('Wren’s next descent should have Mateo’s Dread');
  await evalRun('r.cleared = [0]; r.screen = "pin"; B.render();');
  await click('[data-act="godeeper"]');
  await dismissHints(page);
  await click('[data-act="tomap"]');
  if (!/Buoy’s nameplate/.test(await page.eval(`document.querySelector('.quest-modal')?.textContent || ''`))) throw new Error('Hester should brief the player on the second job in Dark Water');
  await dismissHints(page);
  await evalRun('E.enterNode(r, E.nodeAt(r, E.hesterJob(r))); B.render();');
  await dismissHints(page);
  await click(`[data-act="evopt"][data-i="${await evalRun('return E.eventOptions(r).length - 1;')}"]`);
  if (!/Buoy’s nameplate recovered/.test(await page.eval(`document.querySelector('.scene h1').textContent`))) throw new Error('The nameplate should have a recovery screen');
  await click('[data-act="evcontinue"]');
  await evalRun(`const n = r.map.grid.flat().find((n) => n?.stranger);
    if (!n) throw new Error('Missing Split Cask');
    const p = r.map.grid[n.row - 1].find((x) => x?.next.includes(n.col) && x.next.length > 1) || r.map.grid[n.row - 1].find((x) => x?.next.includes(n.col));
    r.pos = { row: p.row, col: p.col }; r.floor = p.row + 1; B.save(); B.render();`);
  await dismissHints(page);
  await click('.node.avail[aria-describedby="strange-dread"]');
  if (!await evalRun('return r.combat.enc.includes("splitcask")')) throw new Error('The marked Dark Water Dread must be the Split Cask');
  await dismissHints(page);
  await win();
  if (!await evalRun('return r.metKeeper === "mateo" && !E.keeperOpen(B.meta, "mateo")')) throw new Error('Winning the Dread should only recover the note');
  if (!await has('.opening .cask-note')) throw new Error('The note should appear immediately after the Split Cask');
  await click('[data-act="opnext"]');
  await evalRun('r.cleared = [0, 1]; r.screen = "pin"; r.rewards = null; B.render();');
  await click('[data-act="gohome"]');
  if (!await evalRun('return B.meta.keeperNote === "mateo" && !E.keeperOpen(B.meta, "mateo")')) throw new Error('Returning should bank the note before Mateo arrives');
  await click('[data-act="hesterhome"]');
  await click('[data-act="readcask"]');
  if (await page.eval('document.querySelector(".modal .cask-note").textContent !== BL.CASK_NOTE')) throw new Error('The score screen should open the complete note');
  await click('.modal-foot [data-act="close"]');
  await click('[data-act="totitle"]');
  await page.goto(url);
  await inject(page);
  if (!/Someone at the door/.test(await page.eval(`document.querySelector('[data-act="newrun"]').textContent`))) throw new Error('The welcome should remain pending on reload');
  await click('[data-act="newrun"]');
  if (!await has('.opening .cask-note')) throw new Error('The welcome should start with Wren and Hester reading the note');
  await click('[data-act="opnext"]');
  if (!await has('.opening-night')) throw new Error('The lighthouse should fade into night');
  await click('[data-act="opnext"]');
  if (!/Open the door/.test(await page.eval(`document.querySelector('[data-act="opnext"]').textContent`))) throw new Error('The three knocks should lead to the door');
  await click('[data-act="opnext"]');
  if (!/sc_mateo_door/.test(await art())) throw new Error('Missing doorway painting');
  await shot('door');
  await click('[data-act="opnext"]');
  if (!/sc_mateo_memory/.test(await art())) throw new Error('Missing flood memory painting');
  await shot('memory');
  await click('[data-act="opnext"]');
  await click('[data-act="opnext"]');
  if (!/Saltmere inn/.test(await page.eval(`document.querySelector('.op-text').textContent`))) throw new Error('The welcome should say where Mateo stays');
  await click('[data-act="opnext"]');
  if (!await evalRun('return E.keeperOpen(B.meta, "mateo") && !B.meta.keeperNote && E.keeperProfile(B.meta).firstRing;')) throw new Error('The welcome should unlock Mateo and Wren’s First Ring');
  await click('[data-act="newrun"]');
  if (!await has('#pack-outfit option[value="lamplighter"]') || !await has('#pack-outfit option[value="gala"]')) throw new Error('The earlier log and Heart should count on this save');
  await page.eval(`(() => { const select = document.querySelector('#pack-outfit'); select.value = 'gala'; select.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await click('[data-act="keeper"][data-k="mateo"]');
  if (await has('#pack-outfit')) throw new Error('Wren’s outfit picker should be hidden for Mateo');
  await click('[data-act="keeper"][data-k="wren"]');
  if (!await page.eval(`document.querySelector('#pack-outfit').value === 'gala'`)) throw new Error('Switching keepers should remember Wren’s outfit');
  await click('[data-act="keeper"][data-k="mateo"]');
  if (!await page.eval(`document.querySelector('.doll-wren img').src.endsWith('/mateo.webp')`)) throw new Error('The Pack should show Mateo upright');
  await checkPage(page, name + ' pack');
  await shot('pack');
  await click('[data-act="dive"]');
  if (!/costs 0 Light and uses one of your Bail or Stir actions/.test(await page.eval(`document.querySelector('.quest-modal')?.textContent || ''`))) throw new Error('Mateo needs an introductory Bash briefing');
  await click('[data-act="bashbrief"]');
  await evalRun('E.startCombat(r, "easy", ["kelp", "crab"]).player.ward = 10; B.render();');
  await dismissHints(page);
  if (!await page.eval(`document.querySelector('.tb-seg').getBoundingClientRect().width >= 15`)) throw new Error('Shield Bash squeezed the Swell steps');
  if (!await page.eval(`document.querySelector('.unit.player .sprite img').src.endsWith('/mateo_guard.webp')`)) throw new Error('Mateo should fight in his wide guard above water');
  if (!/Mallet Strike/.test(await page.eval('document.querySelector("#hand").textContent'))) throw new Error('Mateo should have Mallet Strike in his opening hand');
  await shot('bash');
  const enemy = await evalRun('return { uid: r.combat.enemies[0].uid, hp: r.combat.enemies[0].hp, light: r.combat.light };');
  if (size.touch) {
    await click('[data-act="bash"]');
    await click(`.enemy[data-uid="${enemy.uid}"] .sprite`);
  } else {
    await page.key('h');
    await page.key('Enter');
  }
  await waitIdle(page, 'after Shield Bash');
  if (!await evalRun(`return r.combat.player.ward === 6 && r.combat.enemies[0].hp === ${enemy.hp - 6} && r.combat.light === ${enemy.light} && !E.canSwellAct(r, 'stir').ok;`)) throw new Error('Shield Bash should spend Ward and the Swell action');
  await page.goto(url);
  await inject(page);
  await click('[data-act="continue"]');
  if (!await evalRun('return r.keeper === "mateo" && B.meta.keeper === "mateo" && !E.canBash(r).ok;')) throw new Error('Reload should keep the selected keeper and used Bash');
  await evalRun('r.level = 2; r.kit.coat = "suit"; r.map = E.genMap(r); E.startCombat(r, "boss"); B.render();');
  await dismissHints(page);
  if (!await has('.enemy[data-id="lasthoop"]') || !await page.eval(`document.querySelector('.unit.player .sprite img').src.endsWith('/mateo_suit.webp')`)) throw new Error('The Last Hoop fight should show Mateo in his dress');
  await shot('final');
  await evalRun('E.gainKeepsake(r, "whaletooth"); E.gainKeepsake(r, "anchor");');
  await win();
  await click('[data-act="opnext"]');
  if (!/sc_mateo_lamp/.test(await art())) throw new Error('Missing lamp-room painting after the Last Hoop');
  await shot('lamp');
  await click('[data-act="opnext"]');
  if (!/sc_mateo_tea/.test(await art())) throw new Error('Missing the tea scene on Mateo’s first clear');
  if (!/Harbour regulations/.test(await page.eval(`document.querySelector('.op-text').textContent`))) throw new Error('The tea scene should show Mateo’s joke');
  await shot('tea');
  await click('[data-act="opnext"]');
  if (!await evalRun('return E.kitUnlocked(B.meta, "sparehoop") && !E.kitUnlocked(B.meta, "watchglass") && B.meta.mateoQuiets === 1;')) throw new Error('Mateo’s clear should open only his own kit and count once');
  if (await evalRun('return E.outfitOpen(B.meta, "longjohns");')) throw new Error('Mateo’s clear should not unlock Wren’s Long Johns');
  if (!await evalRun('return r.final.laz.added.length === 2 && B.meta.lazaret.includes("whaletooth") && B.meta.lazaret.includes("anchor");')) throw new Error('A full clear should bank every carried keepsake');
  if (page.errors.length) throw new Error(page.errors.join('\n'));
}

const DESK = { w: 1280, h: 800 }, PHONE = { w: 390, h: 844, mobile: true, touch: true };
async function debugUnlocksScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  const url = base + '?seed=23';
  const meta = {
    salvage: 12, earned: 12, owned: ['purse'], kit: { pocket: 'purse' }, outfit: 'harbour',
    lazaret: ['whaletooth', 'whaletooth'], bring: ['whaletooth'], lazOpen: true,
    record: { runs: 3, wins: 1 }, told: ['workshop', 'lazaret'],
  };
  await page.goto(url);
  const loadDebug = async () => {
    await page.eval(`(() => {
      localStorage.clear();
      localStorage.setItem('brinelight.meta.v1', ${JSON.stringify(JSON.stringify(meta))});
      localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true }));
      localStorage.setItem('brinelight.tutorial.v1', 'done');
      localStorage.setItem('brinelight.story.v1', ${QUIET_STORY});
    })()`);
    await page.goto(url + '&debug');
    await inject(page);
    await click('.dbg-tab');
  };
  const click = async (selector) => { if (!await clickIf(page, selector)) throw new Error('Missing control: ' + selector); };
  const press = (action) => click(`#overlay [data-dbg="${action}"]`);
  const shot = async (state) => {
    if (process.env.BRINELIGHT_DEBUG_SHOTS) await page.screenshot(path.join(process.env.BRINELIGHT_DEBUG_SHOTS, `${size.touch ? 'phone' : 'desktop'}-${state}.png`));
  };
  const progress = () => page.eval(`(() => {
    const { debugOutfits, told, ...progress } = Brinelight.meta;
    return JSON.stringify({ progress, story: Brinelight.story });
  })()`);
  const wardrobe = () => page.eval(`[...document.querySelectorAll('#pack-outfit option')].map((o) => o.value).join(',') === Object.keys(BL.OUTFITS).join(',')`);
  const firstGroup = () => page.eval("document.querySelector('.dbg-sec h3').textContent");

  await loadDebug();
  if (await firstGroup() !== 'Unlocks') throw new Error('Unlocks should be first at the lighthouse');
  if (await page.eval(`!!document.querySelector('[data-dbg="resetmeta"]') || !document.querySelector('[data-dbg="resetall"].danger')`)) throw new Error('The panel should have only the full reset in its own section');
  await checkModalScrollCue(page, name + ' lighthouse');
  await checkPage(page, name + ' lighthouse');
  await shot('lighthouse');
  const before = await progress();
  await press('allcostumes');
  if (await progress() !== before) throw new Error('The costume grant changed regular progression');
  await page.goto(url + '&debug=0');
  await inject(page);
  if (await page.eval("!!document.querySelector('.news-modal, .dbg-tab')")) throw new Error('A saved costume grant should leave the ordinary title ready to use');
  await click('[data-act="newrun"]');
  if (!await wardrobe()) throw new Error('All costumes should be selectable after turning Debug off');
  if (await page.eval(`!!document.querySelector('[data-act="keeper"][data-k="mateo"]')`)) throw new Error('The costume grant also unlocked a keeper');

  await loadDebug();
  await press('unlockall');
  const savedProgress = () => page.eval("localStorage.getItem('brinelight.meta.v1') + localStorage.getItem('brinelight.story.v1')");
  const once = await savedProgress();
  await press('unlockall');
  if (await savedProgress() !== once) throw new Error('Repeating Unlock all should leave the same progress');
  await page.goto(url + '&debug=0');
  await inject(page);
  const granted = await page.eval(`(() => {
    const { E, meta, story, juke, jukeDepths } = Brinelight;
    return {
      keepers: Object.keys(BL.KEEPERS).every((id) => E.keeperOpen(meta, id)),
      kit: Object.keys(BL.KIT).every((id) => E.ownsKit(meta, id) && E.kitUnlocked(meta, id)),
      achievements: Object.keys(BL.ACHIEVEMENTS).every((id) => meta.ach.includes(id)),
      lazaret: E.lazaretOpen(meta) && E.lazKinds(meta).length === Object.keys(BL.KEEPSAKES).length && E.lazCount(meta, 'whaletooth') === 2,
      story: E.storyEntries().every((entry) => E.storyOpen(entry, story.marks)),
      jukebox: juke.every(([kind, id]) => meta.heard.includes(kind + ':' + id)) && jukeDepths.every((_, i) => meta.heard.includes('depth:' + i)),
      progression: E.currentsOpen(meta) && meta.reached === E.LEVELS.length - 1 && E.holdUpPrice(meta) === null,
      savedChoices: meta.kit.pocket === 'purse' && meta.bring.join(',') === 'whaletooth' && meta.outfit === 'harbour' && meta.salvage === 12,
      record: meta.record.hearts === 1 && meta.record.runs === 3 && meta.record.wins === 1 && meta.record.quiets === 0,
    };
  })()`);
  for (const [group, ok] of Object.entries(granted)) if (!ok) throw new Error('Unlock all did not give or preserve ' + group);
  await click('[data-act="newrun"]');
  if (!await wardrobe()) throw new Error('Unlock all should include the costumes');
  await click('[data-act="keeper"][data-k="mateo"]');
  await click('[data-act="dive"]');
  await clickIf(page, '[data-act="bashbrief"]');
  await dismissHints(page);
  await page.goto(url + '&debug');
  await inject(page);
  await click('[data-act="continue"]');
  if (await page.eval('Brinelight.run.keeper') !== 'mateo') throw new Error('Mateo should be playable from a saved grant');
  await dismissHints(page);
  await click('.dbg-tab');
  if (await firstGroup() !== 'Go to') throw new Error('Travel should be first outside combat');
  await shot('travel');
  await click('#overlay [data-dbg="go"][data-type="fight"]');
  await waitIdle(page);
  await dismissHints(page);
  await click('.dbg-tab');
  if (await firstGroup() !== 'Combat') throw new Error('Combat tools should be first during a fight');
  await checkModalScrollCue(page, name + ' combat');
  await checkPage(page, name + ' combat');
  await shot('combat');
  if (page.errors.length) throw new Error(page.errors.join('\n'));
}

async function outfitsScenario(page, base, name, size) {
  log(`${name}: ${size.w}x${size.h}`);
  await page.viewport(size.w, size.h, size);
  page.errors.length = 0;
  const url = base + '?seed=23';
  await page.goto(url);
  await page.eval(`(() => {
    localStorage.clear();
    localStorage.setItem('brinelight.prefs.v1', JSON.stringify({ sound: false, music: false, fast: true }));
    localStorage.setItem('brinelight.tutorial.v1', 'done');
    localStorage.setItem('brinelight.story.v1', JSON.stringify({ opening: true, scenes: ${JSON.stringify(SEEN_SCENES)} }));
  })()`);
  const reload = async () => { await page.goto(url); await inject(page); };
  await reload();
  const evalRun = (js) => page.eval(`(() => { const B = window.Brinelight, E = B.E, r = B.run; ${js} })()`);
  const click = async (s) => { if (!await clickIf(page, s)) throw new Error('Missing control: ' + s); };
  const text = (s) => page.eval(`document.querySelector(${JSON.stringify(s)})?.textContent || ''`);
  const options = () => page.eval(`[...document.querySelectorAll('#pack-outfit option')].map((o) => o.value).join(',')`);
  const choose = (id) => page.eval(`(() => {
    const select = document.querySelector('#pack-outfit');
    select.value = ${JSON.stringify(id)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  const sprite = (selector, art) => page.waitFor(`(() => {
    const img = document.querySelector(${JSON.stringify(selector)});
    return img?.naturalWidth > 0 && img.src.endsWith('/${art}.webp');
  })()`, 3500, art);
  const shot = async (key) => {
    if (!process.env.BRINELIGHT_OUTFIT_SHOTS) return;
    await page.waitFor('!document.querySelector("#toast .toast-msg")', 6000, 'toasts to fade before the screenshot');
    await sleep(280);
    const prefix = path.join(process.env.BRINELIGHT_OUTFIT_SHOTS, size.touch ? 'phone' : 'desktop');
    await page.screenshot(`${prefix}-${key}.png`);
  };
  const notice = async (...outfits) => {
    const rewards = await page.eval(`[...document.querySelectorAll('.outfit-reward')].map((el) => el.textContent)`);
    const news = await text('.news-list');
    for (const outfit of outfits) {
      if (!rewards.some((reward) => reward.includes(outfit))) throw new Error('The score screen should name ' + outfit);
      if (!news.includes(outfit + ' unlocked')) throw new Error('The lighthouse should tell the player about ' + outfit);
    }
    await click('[data-act="newsok"]');
  };

  await click('[data-act="newrun"]');
  if (await options() !== 'ochre,harbour') throw new Error('The first Pack should offer the two starting outfits');
  await choose('harbour');
  await sprite('.outfit-preview img', 'wren_harbour');
  await checkPage(page, name + ' first Pack');
  await shot('first-pack');
  await click('[data-act="dive"]');
  await dismissHints(page);
  await evalRun('E.startCombat(r, "easy", ["kelp"]); B.render(); B.save();');
  await sprite('.unit.player .sprite img', 'wren_harbour');
  await reload();
  await click('[data-act="continue"]');
  await sprite('.unit.player .sprite img', 'wren_harbour');
  await dismissHints(page);

  await evalRun('E.enterNode(r, E.nodeAt(r, E.hesterJob(r))); B.render();');
  await click(`[data-act="evopt"][data-i="${await evalRun('return E.eventOptions(r).length - 1')}"]`);
  await click('[data-act="evcontinue"]');
  if (await evalRun('return E.outfitOpen(B.meta, "lamplighter")')) throw new Error('Finding the log below should wait for a safe return');
  await evalRun('E.startCombat(r, "boss"); r.combat.won = true; return B.onVictory();');
  if (!(await text('.scene-inner')).includes('two scallop shells')) throw new Error('Wren should find the shells after breaking the pin');
  if (await evalRun('return E.outfitOpen(B.meta, "shells")')) throw new Error('The shells should wait for a safe return');
  await shot('shells-pin');
  await click('[data-act="gohome"]');
  await click('[data-act="hesterhome"]');
  if (!(await text('.news-list')).includes('stitched your scallop shells into a mermaid costume')) throw new Error('The lighthouse should tell how Wren gets her shell costume');
  await sprite('.news-list img[src$="/wren_shells.webp"]', 'wren_shells');
  const visibleNotice = await page.eval(`(() => {
    const item = document.querySelector('.news-list img[src$="/wren_shells.webp"]').closest('.news-item');
    return item.getBoundingClientRect().bottom <= item.closest('.modal-body').getBoundingClientRect().bottom;
  })()`);
  if (!visibleNotice) throw new Error('The Shell Bikini notice should be visible without scrolling');
  await checkPage(page, name + ' Shell Bikini notice');
  await shot('shells-notice');
  await notice('Lamplighter’s Green', 'Shell Bikini');
  await click('[data-act="newrun"]');
  if (await options() !== 'ochre,harbour,lamplighter,shells') throw new Error('The returned log and shells should each add an outfit');
  await choose('shells');
  await sprite('.outfit-preview img', 'wren_shells');
  await shot('shells-pack');
  await reload();
  if (await text('.news-list')) throw new Error('The acknowledged outfit notices should stay closed after reload');
  await click('[data-act="newrun"]');
  await sprite('.outfit-preview img', 'wren_shells');
  await click('[data-act="dive"]');
  await dismissHints(page);
  await evalRun('E.startCombat(r, "easy", ["kelp"]); B.render();');
  await sprite('.unit.player .sprite img', 'wren_shells');
  await shot('shells-fight');
  await evalRun('r.level = 2; r.cleared = [0, 1, 2]; r.combat = null; r.heart = true; r.screen = "victory"; B.render();');
  await notice('Gala');

  await evalRun('B.meta.owned.push("plated"); B.meta.kit.coat = "plated"; B.saveMeta();');
  await click('[data-act="newrun"]');
  if (await options() !== 'ochre,harbour,lamplighter,shells,gala') throw new Error('Gala should open with the Heart');
  await choose('gala');
  await sprite('.doll-wren img', 'wren_gala');
  await checkPage(page, name + ' Pack with kit');
  await shot('gala-pack');
  await click('[data-act="dive"]');
  await dismissHints(page);
  await evalRun('E.startCombat(r, "easy", ["kelp"]); B.render();');
  await sprite('.unit.player .sprite img', 'wren_gala');
  if (!await evalRun('return r.kit.coat === "plated" && r.combat.player.ward === 3')) throw new Error('Gala should leave the rig equipped');
  await shot('gala-fight');
  await evalRun('r.level = 2; r.cleared = [0, 1]; E.startCombat(r, "boss"); B.render();');
  await sprite('.unit.player .sprite img', 'keeper_plated');
  await dismissHints(page);
  await evalRun('r.combat.won = true; r.combat.enemies.forEach((e) => { e.dead = true; e.hp = 0; }); return B.onVictory();');
  await click('[data-act="opnext"]');
  await click('[data-act="opnext"]');
  await shot('longjohns-notice');
  await notice('Long Johns');
  await reload();
  await click('[data-act="newrun"]');
  if (await options() !== 'ochre,harbour,lamplighter,shells,gala,longjohns') throw new Error('All earned outfits should be available after reload');
  await choose('longjohns');
  await sprite('.doll-wren img', 'wren_longjohns');
  // the Cork Vest is drawn over the outfit, in Pack and in a fight (v0.59.0)
  await evalRun('B.meta.owned.push("cork"); B.meta.kit.coat = "cork"; B.saveMeta();');
  await reload();
  await click('[data-act="newrun"]');
  await sprite('.doll-wren img', 'wren_longjohns_cork');
  if (!(await page.eval(`document.querySelector('.doll-wren img').alt`)).includes('Long Johns, wearing the Cork Vest')) throw new Error('Pack should name the outfit and the Cork Vest');
  await shot('longjohns-cork-pack');
  await click('[data-act="dive"]');
  await dismissHints(page);
  await evalRun('E.startCombat(r, "easy", ["kelp"]); B.render();');
  await sprite('.unit.player .sprite img', 'wren_longjohns_cork');
  await shot('longjohns-cork-fight');
  if (page.errors.length) throw new Error(page.errors.join('\n'));
}

const JOBS = [
  ['debug', 'debug unlocks desktop', (p, b) => debugUnlocksScenario(p, b, 'debug unlocks desktop', DESK)],
  ['debug', 'debug unlocks small phone', (p, b) => debugUnlocksScenario(p, b, 'debug unlocks small phone', { ...PHONE, w: 360, h: 640 })],
  ['outfits', 'outfits desktop', (p, b) => outfitsScenario(p, b, 'outfits desktop', DESK)],
  ['outfits', 'outfits small phone', (p, b) => outfitsScenario(p, b, 'outfits small phone', { ...PHONE, w: 360, h: 640 })],
  ['mateo', 'Mateo desktop', (p, b) => mateoScenario(p, b, 'Mateo desktop', DESK)],
  ['mateo', 'Mateo small phone', (p, b) => mateoScenario(p, b, 'Mateo small phone', { ...PHONE, w: 360, h: 640 })],
  ['choices', 'choices desktop', (p, b) => choicesScenario(p, b, 'choices desktop', DESK)],
  ['choices', 'choices small phone', (p, b) => choicesScenario(p, b, 'choices small phone', { ...PHONE, w: 360, h: 640 })],
  ['sea', 'sea desktop', (p, b) => seaScenario(p, b, 'sea desktop', DESK)],
  ['sea', 'sea phone', (p, b) => seaScenario(p, b, 'sea phone', PHONE)],
  ['darkwater', 'dark water phone', (p, b) => darkwaterScenario(p, b, 'dark water phone', PHONE, { seed: 5555 })],
  ['darkwater', 'dark water desktop', (p, b) => darkwaterScenario(p, b, 'dark water desktop', DESK, { seed: 4444 })],
  ['phone', 'phone', (p, b) => scenario(p, b, 'phone', PHONE, { seed: 2222, drag: true })],
  ['audio', 'audio phone', (p, b) => audioScenario(p, b, 'audio phone', PHONE)],
  ['music-unlocks', 'muted music phone', (p, b) => mutedMusicScenario(p, b, 'muted music phone', PHONE)],
  ['desktop', 'desktop', (p, b) => scenario(p, b, 'desktop', DESK, { seed: 1111, drag: true, keyboardTurns: true })],
  ['audio', 'audio desktop', (p, b) => audioScenario(p, b, 'audio desktop', DESK)],
  ['music-unlocks', 'muted music desktop', (p, b) => mutedMusicScenario(p, b, 'muted music desktop', DESK)],
  ['belfry', 'belfry phone', (p, b) => belfryScenario(p, b, 'belfry phone', PHONE, { seed: 6262 })],
  ['belfry', 'belfry desktop', (p, b) => belfryScenario(p, b, 'belfry desktop', DESK, { seed: 6161 })],
  ['tutorial', 'tutorial phone touch', (p, b) => tutorialScenario(p, b, 'tutorial phone touch', PHONE, 'touch')],
  ['tutorial', 'tutorial desktop mouse', (p, b) => tutorialScenario(p, b, 'tutorial desktop mouse', DESK, 'mouse')],
  ['tutorial', 'tutorial desktop keyboard', (p, b) => tutorialScenario(p, b, 'tutorial desktop keyboard', DESK, 'keyboard')],
  ['lazaret', 'lazaret desktop', (p, b) => lazaretScenario(p, b, 'lazaret desktop', DESK)],
  ['lazaret', 'lazaret phone', (p, b) => lazaretScenario(p, b, 'lazaret phone', PHONE)],
  ['progress', 'progress desktop', (p, b) => progressScenario(p, b, 'progress desktop', DESK)],
  ['progress', 'progress phone', (p, b) => progressScenario(p, b, 'progress phone', PHONE)],
  ['finds', 'finds desktop', (p, b) => findsScenario(p, b, 'finds desktop', DESK)],
  ['finds', 'finds phone', (p, b) => findsScenario(p, b, 'finds phone', PHONE)],
  ['workshop', 'workshop desktop', (p, b) => workshopScenario(p, b, 'workshop desktop', DESK)],
  ['workshop', 'workshop phone', (p, b) => workshopScenario(p, b, 'workshop phone', PHONE)],
  ['story', 'story desktop', (p, b) => storyScenario(p, b, 'story desktop', DESK)],
  ['story', 'story phone', (p, b) => storyScenario(p, b, 'story phone', PHONE)],
  ['tutorial', 'tutorial from a run', (p, b) => tutorialMidRun(p, b)],
  ['desktop', 'summoned enemy death', (p, b) => summonDeathCheck(p, b)],
  ['debug', 'debug', (p, b) => debugScenario(p, b)],
].map(([group, name, run]) => ({ group, name, run }));

/* One browser, taking jobs until none are left. A job that crashes is reported (with a screenshot) and the next
   one starts from a fresh page load, as every scenario does. */
async function worker(queue, base, times) {
  const page = await launch();
  try {
    for (let job = queue.shift(); job; job = queue.shift()) {
      const t = Date.now();
      page.ksTurn = 0; // each scenario takes its first keepsake, then alternates, whichever browser runs it
      try {
        await job.run(page, base);
      } catch (e) {
        failures.push(`${job.name}: crashed: ` + (e.stack || e));
        const shot = `ui-smoke-failure-${job.name.replace(/\W+/g, '-')}.png`;
        try { await page.screenshot(path.join(__dirname, '..', shot)); failures.push('screenshot: ' + shot); } catch (e2) { /* ignore */ }
        if (page.errors.length) failures.push(`${job.name}: page errors:\n    ` + page.errors.join('\n    '));
      }
      times.push([job.name, Date.now() - t]);
    }
  } finally {
    await page.close();
  }
}

(async () => {
  const server = await serve(PORT, ROOT);
  const base = `http://127.0.0.1:${PORT}${SUBPATH}`;
  const t0 = Date.now();
  const queue = JOBS.filter((j) => !ONLY || j.group === ONLY), times = [];
  if (!queue.length) { console.error(`no scenarios in --only ${ONLY}`); process.exit(1); }
  const n = Math.min(WORKERS, queue.length);
  log(`${queue.length} scenarios on ${n} browser${n > 1 ? 's' : ''}`);
  try {
    await Promise.all(Array.from({ length: n }, () => worker(queue, base, times)));
  } catch (e) {
    failures.push('crashed: ' + (e.stack || e)); // Chrome didn't start
  } finally {
    server.close();
  }
  log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s; slowest: ${times.sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, ms]) => `${k} ${(ms / 1000).toFixed(0)} s`).join(', ')}`);
  if (failures.length) { console.error('UI SMOKE FAILED\n- ' + failures.join('\n- ')); process.exit(1); }
  log('UI smoke test passed');
})();
