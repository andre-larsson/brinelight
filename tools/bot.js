/* Headless driver for the engine: loads the game rules into Node and plays runs with a simple,
   deterministic policy. Used by the rule tests (determinism, save/continue) and tools/opening.js. */
'use strict';
const path = require('path');

function load() {
  if (!globalThis.BL || !globalThis.BL.E) {
    require(path.join(__dirname, '../js/data.js'));
    require(path.join(__dirname, '../js/engine.js'));
  }
  return { BL: globalThis.BL, E: globalThis.BL.E };
}

/* Strip what the UI strips when saving, then parse back (exactly what Continue loads). */
function saveLoad(run) {
  return JSON.parse(JSON.stringify(run, (k, v) => (k === 'fx' ? [] : v)));
}
/* State for comparisons: drop wall-clock fields and transient fx. */
function snapshot(run) {
  return JSON.stringify(run, (k, v) => (k === 'fx' || k === 'lastTick' || k === 'elapsed' ? undefined : v));
}

/* One combat decision: returns { uid, target } to play, or null to end the turn. */
function chooseCombatAction(run) {
  const { BL, E } = load();
  const c = run.combat;
  const alive = E.alive(c);
  const playable = c.hand.filter((card) => E.playable(run, card).ok && BL.CARDS[card.id].type !== 'status' && BL.CARDS[card.id].type !== 'curse');
  if (!playable.length) return null;
  const targetsFor = (card) => (E.needsTarget(card) ? alive.map((e) => e.uid) : [null]);
  // 1. anything that wins the fight right now
  for (const card of playable) {
    for (const t of targetsFor(card)) {
      const p = E.preview(run, card.uid, t);
      if (p && p.won) return { uid: card.uid, target: t };
    }
  }
  // 2. block if the enemies would get damage through
  let incoming = 0;
  alive.forEach((e) => { const info = E.intentInfo(run, e); if (info && info.dmg) incoming += info.dmg * info.hits; });
  const unblocked = incoming - c.player.ward;
  const wardOf = (card) => { const v = E.vals(card); return v.ward || 0; };
  if (unblocked > 0) {
    const guard = playable.filter((card) => wardOf(card) > 0).sort((a, b) => wardOf(b) - wardOf(a))[0];
    if (guard) return { uid: guard.uid, target: E.needsTarget(guard) ? alive[0].uid : null };
  }
  // 3. the attack that kills something, else the biggest hit on the weakest enemy
  let best = null;
  for (const card of playable) {
    for (const t of targetsFor(card)) {
      const p = E.preview(run, card.uid, t);
      if (!p) continue;
      const score = p.kills * 100 + p.damage + p.crests * 5 + (BL.CARDS[card.id].type === 'rite' ? 8 : 0);
      if (!best || score > best.score) best = { uid: card.uid, target: t, score };
    }
  }
  if (best && best.score > 0) return best;
  return { uid: playable[0].uid, target: E.needsTarget(playable[0]) ? alive[0].uid : null };
}

/* Keepsake pick: the offered keepsake worth the most, counting its Roil as its value and each Seep it
   would add as -10. (One Seep alone costs the bot about 5 points, but Seep stacks badly with a
   second keepsake, so -10 picks better.) Null when none is worth taking. */
function pickKeepsake(run, choices) {
  const { E } = load();
  let best = null;
  let bestV = 0;
  choices.forEach((k) => {
    const v = E.chargeOf(k) - 10 * (E.seepCount(run, k) - E.seepCount(run));
    if (v > bestV) { best = k; bestV = v; }
  });
  return best;
}

/* Advance the run by one decision. Returns a short label of what happened, or null when the run is over. */
function step(run, opts = {}) {
  const { E } = load();
  const s = run.screen;
  if (s === 'victory' || s === 'defeat') return null;
  if (s === 'map') {
    const av = E.availableNodes(run);
    if (!av.length) return null;
    const pick = opts.route ? opts.route(run, av) : av[0];
    E.enterNode(run, pick);
    return 'node:' + pick.type;
  }
  if (s === 'combat') {
    const c = run.combat;
    if (c.lost) { run.screen = 'defeat'; return 'defeat'; }
    if (c.won) { E.finishCombat(run); return 'won'; }
    const a = chooseCombatAction(run);
    if (a && E.playCard(run, a.uid, a.target)) return 'play';
    E.endTurn(run);
    return 'end';
  }
  if (s === 'reward') {
    const rw = run.rewards;
    if (rw.keepsakeChoices.length && !rw.keepsake && !rw.keepsakeLeft) {
      const k = opts.keepsake ? opts.keepsake(run, rw.keepsakeChoices) : pickKeepsake(run, rw.keepsakeChoices);
      if (k) E.takeRewardKeepsake(run, k); else E.leaveKeepsakes(run);
    }
    if (rw.tonic && !rw.tonicTaken) E.takeRewardTonic(run);
    if (!rw.cardTaken) E.takeRewardCard(run, opts.skipCards ? null : 0);
    E.backToMap(run);
    return 'reward';
  }
  if (s === 'rest') { E.rest(run); E.backToMap(run); return 'rest'; }
  if (s === 'shop') { E.backToMap(run); return 'shop'; }
  if (s === 'treasure') {
    E.openTreasure(run);
    if (run.treasure.choices.length) {
      const k = opts.keepsake ? opts.keepsake(run, run.treasure.choices) : pickKeepsake(run, run.treasure.choices);
      if (k) E.takeTreasureKeepsake(run, k); else E.leaveKeepsakes(run);
    }
    E.backToMap(run);
    return 'treasure';
  }
  if (s === 'event') {
    const ev = E.eventDef(run);
    const i = ev.options.findIndex((o) => E.optionAvailable(run, o) === true);
    const res = E.chooseEventOption(run, i) || {};
    const next = res.next;
    if (next && next.fight) { run.event = null; E.startCombat(run, next.fight, null, { bonusPearls: next.bonusPearls || 0 }); return 'event-fight'; }
    if (next && next.pick === 'remove' && run.deck.length) E.removeCard(run, run.deck[0].uid);
    if (next && next.pick === 'upgrade' && E.upgradeable(run).length) E.upgradeCard(run, E.upgradeable(run)[0].uid);
    if (next && next.pick === 'duplicate') E.duplicateCard(run, run.deck[0].uid);
    if (next && next.cards && next.cards.length) E.addCard(run, next.cards[0]);
    E.backToMap(run);
    return 'event';
  }
  throw new Error('bot: unknown screen ' + s);
}

function playRun(run, maxSteps = 5000, opts) {
  const labels = [];
  for (let i = 0; i < maxSteps; i++) {
    const l = step(run, opts);
    if (!l) break;
    labels.push(l);
  }
  return labels;
}

module.exports = { load, saveLoad, snapshot, chooseCombatAction, step, playRun, pickKeepsake };
