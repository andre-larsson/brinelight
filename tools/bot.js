/* Headless driver for the engine: loads the game rules into Node and plays runs with a simple,
   deterministic policy. Used by the rule tests (determinism, save/continue), tools/measure.js and tools/opening.js.

   The policy: in fights, win now if a card can, else guard when hits would get through, else the best attack; Bail
   and Stir (twice a turn with the Bailer); tonics in big fights, in emergencies and when the slots are full. Between
   fights: always the first stop on the map, the first card of a reward, the keepsake worth the most, rest at every
   Cove, the first open option of an event, and shopping at Barnaby's. It keeps no state of its own: every decision
   comes from the run, so a saved run carries on exactly.

   Options (step and playRun): noShop, noTonics and noSwellActs turn those parts off; lateSwellOnly Bails and Stirs only
   when nothing else is left to play. { noShop, noTonics, lateSwellOnly } together play exactly like the bot before
   2026-11-14, which never shopped, never drank a tonic and never Stirred mid-turn. shopOrder and removeId change the
   shopping (see shop()); skipCards, keepsake(run, choices), route(run, nodes), home (go home after that level's pin). */
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
  const alive = E.targets(c); // a Submerged enemy is out of reach
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
  E.alive(c).forEach((e) => { const info = E.intentInfo(run, e); if (info && info.dmg) incoming += info.dmg * info.hits; });
  const unblocked = incoming - c.player.ward;
  const wardOf = (card) => { const v = E.vals(card); return v.ward || 0; };
  if (unblocked > 0) {
    // the best guard; moving the Swell counts a little, and a wave more, so Slack Water's Ebb isn't left to the order of the hand
    const guardScore = (card) => {
      const v = E.vals(card);
      const p = E.preview(run, card.uid, E.needsTarget(card) ? alive[0].uid : null);
      return wardOf(card) + (v.ebb || 0) + (v.surge || 0) + (p ? 3 * (p.crests + p.lows) : 0);
    };
    const guard = playable.filter((card) => wardOf(card) > 0).map((card) => ({ card, s: guardScore(card) })).sort((a, b) => b.s - a.s)[0];
    if (guard) return { uid: guard.card.uid, target: E.needsTarget(guard.card) ? alive[0].uid : null };
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

/* Bail or Stir, one step at a time (the next decision takes the next step). Null to do neither.
   - Any time: Bail at Swell 1, since the Strand gives the Light back.
   - During the turn: Stir into a Crest that would kill a creature; and with two acts left (the Bailer), Bail twice
     from Swell 2 when an enemy has Ward to strip or is Submerged.
   - With Light left and nothing to play: Stir or Bail when the acts left this turn and the Light can reach a Crest or
     a Strand, else Bail toward a Strand at 2 or lower. */
function chooseSwellAct(run, endOfTurn, opts = {}) {
  const { E } = load();
  const c = run.combat;
  if (!E.canSwellAct(run).ok) return null;
  if (c.tide === 1) return 'bail';
  const reach = Math.min(E.swellActsPerTurn(run) - E.swellActsUsed(c), Math.floor(c.light / E.SWELL_ACT_COST));
  if (!endOfTurn) {
    if (opts.lateSwellOnly) return null;
    // before the attacks: Stir into a Crest that kills; with two acts left, Bail twice from 2 when the Strand would
    // strip Ward off an enemy or bring a Submerged one up
    const toCrest = E.TIDE_MAX - c.tide;
    if (toCrest <= reach && stirKills(run, toCrest)) return 'stir';
    if (c.tide === 2 && reach >= 2 && E.alive(c).some((e) => e.ward > 0 || e.st.submerged)) return 'bail';
    return null;
  }
  if (E.TIDE_MAX - c.tide <= reach) return 'stir';
  if (c.tide <= reach) return 'bail';
  if (c.tide <= 2) return 'bail';
  return null;
}

/* Would Stirring n times now Crest and kill a creature (or win)? Played on a copy of the run. */
function stirKills(run, n) {
  const { E } = load();
  const r2 = JSON.parse(E.previewJSON(run));
  for (let i = 0; i < n; i++) if (!E.swellAct(r2, 'stir')) return false;
  return r2.combat.won || r2.combat.enemies.some((e, i) => e.dead && !run.combat.enemies[i].dead);
}

/* ---------------- Tonics ----------------
   What a tonic would do right now, worked out on a copy of the run (like E.preview for cards). */
function tonicPreview(run, slot, target) {
  const { E } = load();
  const c = run.combat;
  const r2 = JSON.parse(E.previewJSON(run));
  if (!E.useTonic(r2, slot, target)) return null;
  const c2 = r2.combat;
  let kills = 0;
  c.enemies.forEach((e, i) => { const e2 = c2.enemies[i]; if (e2 && e2.dead && !e.dead) kills++; });
  return { won: c2.won, kills };
}
/* Damage the enemies' intents would get through this turn's Ward. */
function unblocked(run) {
  const { E } = load();
  const c = run.combat;
  let incoming = 0;
  E.alive(c).forEach((e) => { const info = E.intentInfo(run, e); if (info && info.dmg) incoming += info.dmg * info.hits; });
  return incoming - c.player.ward;
}
/* The enemy a tonic aims at: for Squid Ink the hardest hitter, for Brine the one with the most HP. */
function tonicTarget(run, t) {
  const { BL, E } = load();
  if (BL.TONICS[t].target !== 'enemy') return null;
  const al = E.targets(run.combat);
  if (!al.length) return undefined;
  const hitOf = (e) => { const info = E.intentInfo(run, e); return info && info.dmg ? info.dmg * info.hits : 0; };
  const by = t === 'ink' ? hitOf : (e) => e.hp + e.ward;
  return al.slice().sort((a, b) => by(b) - by(a))[0].uid;
}

/* One tonic to drink in a fight: { slot, target }, or null.
   - Any fight: a tonic that wins it right now.
   - Before ending a turn (endOfTurn): if the hits coming would knock Wren down, the tonic that helps most: Shell
     Tonic, Kelp Tea, Squid Ink on the hardest hitter, or a Bottled Squall that kills something.
   - In a pin or a Dread fight, on its first turn: Squid Ink, Brine Vial, Bottled Squall (two or more enemies), and Lamp
     Oil or Moon Water whenever the hand can use them. The same in any fight while every slot is full, so a tonic
     found later isn't lost.
   - Kelp Tea is kept for a fall (in a fight) or for low HP between fights (chooseMapTonic). */
function chooseTonic(run, endOfTurn) {
  const { BL, E } = load();
  const c = run.combat;
  if (c.phase !== 'player' || c.won || c.lost) return null;
  const held = run.tonics.map((t, slot) => ({ t, slot })).filter((x) => x.t);
  if (!held.length) return null;
  for (const { t, slot } of held) {
    if (t === 'kelptea' || t === 'shell' || t === 'lampoil') continue;
    const p = tonicPreview(run, slot, tonicTarget(run, t));
    if (p && p.won) return { slot, target: tonicTarget(run, t) };
  }
  if (endOfTurn) {
    const through = unblocked(run);
    if (through >= run.hp) {
      const order = ['shell', 'kelptea', 'ink', 'squall'];
      for (const want of order) {
        const h = held.find((x) => x.t === want);
        if (!h) continue;
        if (want === 'squall') { const p = tonicPreview(run, h.slot, null); if (!p || !p.kills) continue; }
        return { slot: h.slot, target: tonicTarget(run, want) };
      }
    }
    return null;
  }
  const big = c.kind === 'boss' || c.kind === 'elite';
  const full = run.tonics.indexOf(null) < 0;
  if (!big && !full) return null;
  const hand = c.hand.filter((card) => BL.CARDS[card.id].type !== 'status' && BL.CARDS[card.id].type !== 'curse');
  const cost = hand.reduce((a, card) => a + (E.cost(card, c) || 0), 0);
  for (const { t, slot } of held) {
    if (t === 'kelptea' || t === 'shell') continue;
    if ((t === 'ink' || t === 'brine') && c.turn === 1) return { slot, target: tonicTarget(run, t) };
    if (t === 'squall' && c.turn === 1 && E.targets(c).length >= 2) return { slot, target: null };
    if (t === 'lampoil' && cost > c.light) return { slot, target: null };
    if (t === 'moonwater' && c.tide >= 2 && c.tide <= 4) return { slot, target: null };
  }
  return null;
}
/* Between fights: Kelp Tea when HP is at half or less and all 15 of it would heal. */
function chooseMapTonic(run) {
  const slot = run.tonics.indexOf('kelptea');
  if (slot >= 0 && run.hp <= run.maxHp / 2 && run.maxHp - run.hp >= 15) return slot;
  return -1;
}

/* ---------------- Barnaby's shop ----------------
   Spend Pearls in this order, each step once: take out a curse or status card; the best keepsake on offer, if
   pickKeepsake would take it; take out a starter Brace; a rare card; a tonic for an empty slot. Card removal costs 75
   and then 25 more each time (less with the Pearl Scales, free once with Barnaby's Marker). Measured 2026-11-14:
   taking out a Brace broke the Shallows' pin 3.5 points more often than a Jab; the order made no clear difference. */
const SHOP_ORDER = ['curse', 'keepsake', 'remove', 'rare', 'tonic'];
function shop(run, opts) {
  const { BL, E } = load();
  const s = run.shop;
  const bought = [];
  const order = opts.shopOrder || SHOP_ORDER;
  const removal = (pred) => {
    if (s.removed || run.pearls < E.removePrice(run)) return false;
    const card = run.deck.find(pred);
    return !!card && E.buyRemoval(run, card.uid);
  };
  const afford = (kind, i) => !s[kind][i].sold && run.pearls >= E.price(run, s[kind][i].base);
  order.forEach((what) => {
    if (what === 'curse') {
      if (removal((card) => ['curse', 'status'].indexOf(BL.CARDS[card.id].type) >= 0)) bought.push('curse');
    } else if (what === 'remove') {
      if (removal((card) => card.id === (opts.removeId || 'brace') && !card.up)) bought.push('remove');
    } else if (what === 'keepsake') {
      const offered = s.keepsakes.map((k, i) => ({ k, i })).filter(({ i }) => afford('keepsakes', i));
      const k = offered.length ? pickKeepsake(run, offered.map((o) => o.k.id)) : null;
      if (k && E.buy(run, 'keepsakes', offered.find((o) => o.k.id === k).i)) bought.push('keepsake');
    } else if (what === 'rare' || what === 'card') {
      const i = s.cards.findIndex((card, j) => afford('cards', j) && (what === 'card' || BL.CARDS[card.id].rarity === 'rare'));
      if (i >= 0 && E.buy(run, 'cards', i)) bought.push('card');
    } else if (what === 'tonic') {
      if (run.tonics.indexOf(null) < 0) return;
      const i = s.tonics.findIndex((t, j) => afford('tonics', j));
      if (i >= 0 && E.buy(run, 'tonics', i)) bought.push('tonic');
    }
  });
  return bought;
}

/* Keepsake pick: the offered keepsake worth the most, counting its Roil as its value and each step past
   the Hold it would add as -10. (One step alone costs the bot about 5 points, but steps stack badly
   with a second keepsake, so -10 picks better.) Null when none is worth taking. */
function pickKeepsake(run, choices) {
  const { E } = load();
  let best = null;
  let bestV = 0;
  choices.forEach((k) => {
    const v = E.chargeOf(k) - 10 * (E.roil(run, k).steps - E.roil(run).steps);
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
    const tea = opts.noTonics ? -1 : chooseMapTonic(run);
    if (tea >= 0) E.useTonic(run, tea);
    const pick = opts.route ? opts.route(run, av) : av[0];
    E.enterNode(run, pick);
    return 'node:' + pick.type;
  }
  if (s === 'combat') {
    const c = run.combat;
    if (c.lost) { run.screen = 'defeat'; return 'defeat'; }
    if (c.won) { E.finishCombat(run); return 'won'; }
    const tn = opts.noTonics ? null : chooseTonic(run, false);
    if (tn && E.useTonic(run, tn.slot, tn.target)) return 'tonic';
    const sw = opts.noSwellActs ? null : chooseSwellAct(run, false, opts);
    if (sw && E.swellAct(run, sw)) return sw;
    const a = chooseCombatAction(run);
    if (a && E.playCard(run, a.uid, a.target)) return 'play';
    const late = opts.noSwellActs ? null : chooseSwellAct(run, true, opts);
    if (late && E.swellAct(run, late)) return late;
    const save = opts.noTonics ? null : chooseTonic(run, true);
    if (save && E.useTonic(run, save.slot, save.target)) return 'tonic';
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
  // after a pin: go on down, unless told to go home after this level (opts.home) or the next level needs kit it lacks
  if (s === 'pin') {
    if ((opts.home != null && (run.level || 0) >= opts.home) || !E.canGoDeeper(run)) { E.goHome(run); return 'home'; }
    E.goDeeper(run);
    return 'deeper';
  }
  if (s === 'shop') {
    if (!opts.noShop) shop(run, opts);
    E.backToMap(run);
    return 'shop';
  }
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

module.exports = { load, saveLoad, snapshot, chooseCombatAction, chooseSwellAct, chooseTonic, chooseMapTonic, shop, SHOP_ORDER, step, playRun, pickKeepsake };
