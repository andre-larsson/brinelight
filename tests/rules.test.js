/* Rule tests: every rule the README and the in-game How to Play state, checked against js/engine.js.
   Run with: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, saveLoad, snapshot, playRun, step } = require('../tools/bot');

const { BL, E } = load();

/* ---------- helpers ---------- */
/* A fight against `enc` with an optional fixed deck, hand and keepsakes. As before the bell became kit,
   a keepsake list without 'tidebell' also leaves the bell out, so hands stay fixed. */
function fight(enc, o = {}) {
  const run = E.newRun(o.seed || 1, o.level || 0);
  if (o.deck) { run.deck = []; o.deck.forEach((id) => E.addCard(run, id)); }
  if (o.keepsakes) {
    run.keepsakes = o.keepsakes.filter((k) => k !== 'tidebell');
    if (o.keepsakes.indexOf('tidebell') < 0) run.kit.bell = null;
  }
  E.startCombat(run, o.kind || 'easy', enc);
  const c = run.combat;
  if (o.hand) {
    c.discard.push(...c.hand);
    c.hand = o.hand.map((id) => ({ uid: run.nextUid++, id, up: 0 }));
  }
  if (o.tide != null) c.tide = o.tide;
  c.fx.length = 0;
  return { run, c };
}
const cardIn = (c, id) => c.hand.find((x) => x.id === id);
function play(run, id, target) {
  const c = run.combat;
  const card = cardIn(c, id);
  assert.ok(card, `${id} should be in hand`);
  return E.playCard(run, card.uid, target ? target.uid : undefined);
}
const give = (run, id, up) => { const card = { uid: run.nextUid++, id, up: up ? 1 : 0 }; run.combat.hand.push(card); return card; };
const tough = (c) => c.enemies.forEach((e) => { e.hp = e.maxHp = 500; });
/* Make every enemy do nothing this turn. */
const pacify = (c) => c.enemies.forEach((e) => { e.intent = 'none'; });

/* ---------- hero ---------- */
test('the keeper starts with 70 HP, 3 Light and the 10-card starting deck', () => {
  const run = E.newRun(5);
  assert.equal(run.hp, 70);
  assert.equal(run.maxHp, 70);
  const count = (id) => run.deck.filter((c) => c.id === id).length;
  assert.equal(run.deck.length, 10);
  assert.deepEqual([count('jab'), count('brace'), count('swell'), count('slack')], [4, 4, 1, 1]);
  assert.deepEqual(run.keepsakes, [], 'no keepsakes yet');
  assert.equal(E.bell(run), 'tidebell', 'the Brass Tide-Bell is part of the kit');
  E.startCombat(run, 'easy');
  assert.equal(run.combat.maxLight, 3);
});

/* ---------- Light ---------- */
test('you get 3 Light each turn, and each card costs the Light in its corner', () => {
  const { run, c } = fight(['kelp'], { hand: ['jab', 'brace', 'depthcharge', 'riptide'], tide: 6 - 1 }); // Ebb 3 + 1 stays above a Strand
  tough(c);
  assert.equal(c.light, 3);
  assert.ok(play(run, 'jab'));
  assert.equal(c.light, 2);
  assert.ok(play(run, 'depthcharge'), 'a 2-cost card is playable with 2 Light');
  assert.equal(c.light, 0);
  const brace = cardIn(c, 'brace');
  assert.deepEqual(E.playable(run, brace), { ok: false, reason: 'Not enough Light' });
  assert.equal(E.playCard(run, brace.uid), false, 'cannot play without enough Light');
  assert.ok(cardIn(c, 'brace'), 'the card stays in hand');
  assert.ok(play(run, 'riptide'), 'a 0-cost card is playable at 0 Light');
  pacify(c);
  E.endTurn(run);
  assert.equal(c.light, 3, 'Light refills to 3 at the start of the next turn');
});

test('unused Light does not carry over', () => {
  const { run, c } = fight(['kelp']);
  pacify(c);
  E.endTurn(run);
  assert.equal(c.light, 3);
});

/* ---------- Drawing ---------- */
test('you draw 5 cards each turn', () => {
  const { run, c } = fight(['kelp'], { keepsakes: [] });
  tough(c);
  assert.equal(c.hand.length, 5);
  assert.equal(c.draw.length, 5);
  pacify(c);
  E.endTurn(run);
  assert.equal(c.hand.length, 5);
});

test('cards you play and cards you do not play both go to the discard pile', () => {
  const { run, c } = fight(['kelp'], { keepsakes: [] });
  tough(c);
  const before = c.hand.map((x) => x.uid).sort();
  const jab = cardIn(c, 'jab') || cardIn(c, 'brace');
  E.playCard(run, jab.uid, c.enemies[0].uid);
  assert.ok(c.discard.some((x) => x.uid === jab.uid), 'played card is in the discard pile');
  pacify(c);
  E.endTurnStart(run);
  assert.equal(c.hand.length, 0, 'hand is emptied at the end of the turn');
  assert.deepEqual(c.discard.map((x) => x.uid).sort(), before);
});

test('when the draw pile runs out, the discard pile is shuffled back into it', () => {
  const { run, c } = fight(['kelp'], { keepsakes: [] });
  tough(c);
  pacify(c);
  E.endTurn(run); // turn 2 draws the last 5
  assert.equal(c.draw.length, 0);
  assert.equal(c.discard.length, 5);
  c.fx.length = 0;
  pacify(c);
  E.endTurn(run); // turn 3 must reshuffle
  assert.ok(c.fx.some((f) => f.t === 'shuffle'), 'a shuffle happened');
  assert.equal(c.hand.length, 5);
  assert.equal(c.hand.length + c.draw.length + c.discard.length, 10, 'no card is lost or duplicated');
});

/* ---------- Ward ---------- */
test('Ward blocks damage', () => {
  const { run, c } = fight(['kelp'], { hand: ['brace'] });
  c.enemies[0].intent = 'lash'; // 8 damage
  play(run, 'brace');
  assert.equal(c.player.ward, 5);
  E.endTurn(run);
  assert.equal(run.hp, 70 - 3);
});

test('Ward washes away at the start of your next turn', () => {
  const { run, c } = fight(['kelp'], { hand: ['brace', 'brace'] });
  pacify(c);
  play(run, 'brace');
  play(run, 'brace');
  assert.equal(c.player.ward, 10);
  E.endTurn(run);
  assert.equal(c.player.ward, 0);
});

test('enemies can have Ward too: it blocks your attacks and washes away when they act again', () => {
  const { run, c } = fight(['crab'], { hand: ['jab'] });
  const crab = c.enemies[0];
  crab.ward = 9;
  const hp = crab.hp;
  play(run, 'jab', crab);
  assert.equal(crab.hp, hp, 'all 6 damage is blocked');
  assert.equal(crab.ward, 3);
  crab.intent = 'snap';
  E.endTurn(run);
  assert.equal(crab.ward, 0, 'Ward is gone once the enemy acts');
});

/* ---------- Intents ---------- */
test('the intent number is the damage the enemy deals when it acts (all enemies, several turns)', () => {
  const ids = ['kelp', 'crab', 'eel', 'sailor', 'jelly', 'mite', 'wisp', 'gull', 'hulk', 'siren', 'angler', 'bell', 'minnow'];
  for (const id of ids) {
    for (let seed = 1; seed <= 6; seed++) {
      const { run, c } = fight([id], { seed, deck: ['brace', 'brace', 'brace', 'brace', 'brace'], keepsakes: [] });
      const e = c.enemies[0];
      e.hp = e.maxHp = 999;
      for (let turn = 0; turn < 7; turn++) {
        run.hp = run.maxHp = 9999;
        const info = E.intentInfo(run, e);
        const expected = info.dmg * info.hits;
        const before = run.hp;
        c.player.ward = 0;
        E.endTurn(run);
        // Brine on the keeper is lost at the start of the turn, not from the attack
        const brine = c.fx.filter((f) => f.t === 'dmg' && f.who === 'p' && f.brine).reduce((s, f) => s + f.n, 0);
        c.fx.length = 0;
        assert.equal(before - run.hp - brine, expected, `${id} seed ${seed} turn ${turn + 1}: ${info.name} showed ${expected}`);
      }
    }
  }
});

test('an intent that guards shows the Ward the enemy gains when it acts', () => {
  let guarded = 0;
  for (const id of ['crab', 'eel', 'sailor', 'mite']) {
    for (let seed = 1; seed <= 6; seed++) {
      const { run, c } = fight([id], { seed, deck: ['brace', 'brace', 'brace', 'brace', 'brace'], keepsakes: [] });
      const e = c.enemies[0];
      e.hp = e.maxHp = 999;
      for (let turn = 0; turn < 6; turn++) {
        run.hp = run.maxHp = 9999;
        const info = E.intentInfo(run, e);
        if (!info.kinds.includes('defend')) { E.endTurn(run); c.fx.length = 0; continue; }
        e.ward = 0;
        E.endTurn(run);
        c.fx.length = 0;
        assert.equal(e.ward, info.ward, `${id} seed ${seed}: ${info.name} showed ${info.ward} Ward`);
        guarded++;
      }
    }
  }
  assert.ok(guarded > 10, 'enough guarding moves were checked');
});

/* ---------- The Swell (tide in the code) ---------- */
test('the Swell starts every fight at 3; Surge raises it and Ebb lowers it', () => {
  const { run, c } = fight(['kelp'], { hand: ['swell', 'slack'] });
  tough(c);
  assert.equal(c.tide, 3);
  play(run, 'swell', c.enemies[0]);
  assert.equal(c.tide, 5);
  play(run, 'slack');
  assert.equal(c.tide, 3);
});

test('at 6 the wave Crests: 6 damage to every enemy, then the Swell resets to 3', () => {
  const { run, c } = fight(['kelp', 'crab', 'mite'], { hand: ['swell'], tide: 4, keepsakes: [] });
  tough(c);
  const target = c.enemies[0];
  play(run, 'swell', target);
  assert.equal(c.tide, 3);
  assert.equal(c.turnCrests, 1);
  assert.deepEqual(c.enemies.map((e) => 500 - e.hp), [5 + 6, 6, 6]);
});

test('at 0 you Strand the enemies: they lose all their Ward and you gain 1 Light, then the Swell resets to 3', () => {
  const { run, c } = fight(['kelp', 'crab'], { hand: ['slack'], tide: 2, keepsakes: [] });
  c.enemies[0].ward = 9;
  c.enemies[1].ward = 4;
  play(run, 'slack');
  assert.equal(c.tide, 3);
  assert.equal(c.turnLows, 1);
  assert.deepEqual(c.enemies.map((e) => e.ward), [0, 0], 'stranded: every enemy loses its Ward');
  assert.equal(c.light, 3 - 1 + 1, 'Slack Water cost 1, the Strand gave 1 back');
  assert.equal(c.player.ward, 4, 'only the card\'s own Ward: a Strand gives none');
});

test('a Strand strips enemy Ward before its own damage lands (Drowned Anchor, Abyssal Pull)', () => {
  const { run, c } = fight(['kelp'], { hand: ['slack'], tide: 2, keepsakes: ['anchor'] });
  tough(c);
  c.enemies[0].ward = 9;
  play(run, 'slack');
  assert.equal(500 - c.enemies[0].hp, 4, 'the Anchor\'s 4 damage is not blocked');
});

test('extra Surge carries over: Surge 6 from Swell 3 Crests twice', () => {
  const { run, c } = fight(['kelp', 'crab'], { hand: ['stormsurge'], keepsakes: [] });
  tough(c);
  play(run, 'stormsurge');
  assert.equal(c.turnCrests, 2);
  assert.equal(c.tide, 3);
  assert.deepEqual(c.enemies.map((e) => 500 - e.hp), [6 + 9, 6 + 9]);
});

test('extra Ebb carries over too: Ebb 2 from Swell 1 Strands and keeps falling from 3', () => {
  const { run, c } = fight(['kelp'], { hand: ['slack'], tide: 1, keepsakes: [] });
  play(run, 'slack');
  assert.equal(c.turnLows, 1);
  assert.equal(c.tide, 2);
});

test('chains: each extra Crest in a turn hits 3 harder (6, 9, 12); every Strand gives 1 Light', () => {
  const { run, c } = fight(['kelp'], { hand: ['stormsurge', 'tidereading'], keepsakes: [] });
  tough(c);
  const e = c.enemies[0];
  play(run, 'stormsurge');
  assert.equal(500 - e.hp, 6 + 9);
  c.tide = 5;
  play(run, 'tidereading');
  assert.equal(500 - e.hp, 6 + 9 + 12);
  assert.equal(c.maxChain, 3);
  const r2 = fight(['kelp'], { hand: ['bilgepump', 'bilgepump'], tide: 2, keepsakes: [] });
  play(r2.run, 'bilgepump');
  assert.equal(r2.c.light, 3 - 1 + 1);
  r2.c.tide = 2;
  play(r2.run, 'bilgepump');
  assert.equal(r2.c.light, 3 - 2 + 2);
  assert.equal(r2.c.maxLowChain, 2);
  assert.equal(r2.c.player.ward, 0);
});

test('chains start over each turn', () => {
  const { run, c } = fight(['kelp'], { hand: ['stormsurge'], keepsakes: [] });
  tough(c);
  play(run, 'stormsurge');
  pacify(c);
  E.endTurn(run);
  const e = c.enemies[0];
  const hp = e.hp;
  give(run, 'tidereading');
  c.tide = 5;
  play(run, 'tidereading');
  assert.equal(hp - e.hp, 6);
});

test('the Brass Tide-Bell (the starting bell) draws a card whenever you Crest or Strand', () => {
  const { run, c } = fight(['kelp'], { hand: ['swell', 'slack'] });
  tough(c);
  c.tide = 4;
  const n = c.hand.length;
  play(run, 'swell', c.enemies[0]);
  assert.equal(c.hand.length, n - 1 + 1);
  c.tide = 2;
  play(run, 'slack');
  assert.equal(c.hand.length, n - 2 + 2);
});

test('cards that scale with the Swell: Undercurrent, Tsunami, Lighthouse Beam, Toppled Tower', () => {
  let f = fight(['kelp'], { hand: ['undercurrent'], tide: 5 });
  tough(f.c);
  play(f.run, 'undercurrent', f.c.enemies[0]);
  assert.equal(500 - f.c.enemies[0].hp, 3 + 2 * 5);

  f = fight(['kelp', 'crab'], { hand: ['tsunami'], tide: 4, keepsakes: [] });
  tough(f.c);
  play(f.run, 'tsunami');
  assert.deepEqual(f.c.enemies.map((e) => 500 - e.hp), [12, 12]);
  assert.equal(f.c.turnLows, 1, 'Tsunami ends in a Strand');
  assert.equal(f.c.light, 3 - 2 + 1);

  f = fight(['kelp'], { hand: ['beam'], tide: 4 });
  tough(f.c);
  play(f.run, 'beam');
  f.c.tide = 5;
  pacify(f.c);
  E.endTurnStart(f.run);
  assert.equal(500 - f.c.enemies[0].hp, 2 * 5, 'Lighthouse Beam: 2 damage for each Swell');
  assert.deepEqual([BL.CARDS.beam.v.per, BL.CARDS.beam.up.per], [2, 3]);

  f = fight(['kelp'], { hand: ['toppledtower', 'stormsurge'] });
  tough(f.c);
  const tower = cardIn(f.c, 'toppledtower');
  assert.equal(E.cost(tower, f.c), 3);
  play(f.run, 'stormsurge');
  assert.equal(E.cost(tower, f.c), 1, 'costs 1 less per Crest this turn');
});

/* ---------- Keywords and statuses ---------- */
test('Sink: the card is gone for the rest of the fight once played', () => {
  const { run, c } = fight(['kelp'], { hand: ['stormsurge'] });
  tough(c);
  const uid = cardIn(c, 'stormsurge').uid;
  play(run, 'stormsurge');
  assert.ok(c.sunk.some((x) => x.uid === uid));
  assert.ok(!c.discard.some((x) => x.uid === uid));
  pacify(c); E.endTurn(run); pacify(c); E.endTurn(run); pacify(c); E.endTurn(run);
  assert.ok(![...c.hand, ...c.draw, ...c.discard].some((x) => x.uid === uid), 'it never comes back');
});

test('Float: the card stays in your hand at the end of the turn', () => {
  const { run, c } = fight(['kelp'], { hand: ['driftwood', 'jab'] });
  const uid = cardIn(c, 'driftwood').uid;
  pacify(c);
  E.endTurnStart(run);
  assert.deepEqual(c.hand.map((x) => x.uid), [uid]);
});

test('Rite: stays in effect for the rest of the fight', () => {
  const { run, c } = fight(['kelp'], { hand: ['moonpull'] });
  tough(c);
  play(run, 'moonpull');
  assert.equal(c.rites.length, 1);
  assert.equal(c.discard.filter((x) => x.id === 'moonpull').length, 0);
  for (let t = 0; t < 2; t++) {
    const tide = c.tide;
    pacify(c);
    E.endTurn(run);
    assert.equal(c.tide, tide === 5 ? 3 : tide + 1, 'Moon Pull Surges 1 at the start of each turn');
  }
});

test('Echo: your next card is played twice', () => {
  const { run, c } = fight(['kelp'], { hand: ['sirensecho', 'jab', 'jab'] });
  tough(c);
  play(run, 'sirensecho');
  assert.equal(c.echo, 1, 'playing Echo does not use itself up');
  play(run, 'jab', c.enemies[0]);
  assert.equal(500 - c.enemies[0].hp, 12);
  play(run, 'jab', c.enemies[0]);
  assert.equal(500 - c.enemies[0].hp, 18, 'only the next card');
});

test('Might adds damage to every hit', () => {
  const { run, c } = fight(['kelp'], { hand: ['galeheart', 'oarflurry'] });
  tough(c);
  play(run, 'galeheart');
  play(run, 'oarflurry', c.enemies[0]);
  assert.equal(500 - c.enemies[0].hp, 3 * (3 + 2));
});

test('Spines deal damage back to attackers', () => {
  const { run, c } = fight(['hulk'], { hand: ['jab', 'oarflurry'], kind: 'elite' });
  assert.equal(c.enemies[0].st.spines, 3);
  play(run, 'jab', c.enemies[0]);
  assert.equal(run.hp, 70 - 3);
  play(run, 'oarflurry', c.enemies[0]);
  assert.equal(run.hp, 70 - 3 - 9, 'once per hit');
});

test('Soaked: takes 50% more damage from attacks and Crests', () => {
  const { run, c } = fight(['kelp'], { hand: ['jab', 'swell'], keepsakes: [] });
  tough(c);
  const e = c.enemies[0];
  e.st.soaked = 2;
  play(run, 'jab', e);
  assert.equal(500 - e.hp, 9);
  c.tide = 4;
  play(run, 'swell', e);
  assert.equal(500 - e.hp, 9 + 7 + 9, 'Swell 5 -> 7, Crest 6 -> 9');
});

test('Soaked on the keeper makes the next enemy attack hit 50% harder, as its intent shows', () => {
  const { run, c } = fight(['kelp'], { keepsakes: [] });
  const e = c.enemies[0];
  e.intent = 'lash';
  c.player.st.soaked = 1;
  assert.equal(E.intentInfo(run, e).dmg, 12);
  E.endTurn(run);
  assert.equal(run.hp, 70 - 12);
  assert.equal(c.player.st.soaked, undefined, 'and then it wears off');
});

test('Chilled: deals 25% less attack damage', () => {
  const { run, c } = fight(['kelp'], { hand: ['jab', 'kelpsnare'] });
  tough(c);
  const e = c.enemies[0];
  play(run, 'kelpsnare', e);
  e.intent = 'lash';
  assert.equal(E.intentInfo(run, e).dmg, 6, '8 -> 6');
  E.endTurn(run);
  assert.equal(run.hp, 70 - Math.max(0, 6 - 5));
  c.player.st.chilled = 1;
  give(run, 'jab');
  const hp = e.hp;
  play(run, 'jab', e);
  assert.equal(hp - e.hp, 4, 'a Chilled keeper hits for 25% less too');
});

test('Brine: loses that much HP at the start of its turn, then Brine drops by 1', () => {
  const { run, c } = fight(['kelp'], { hand: ['saltspray'] });
  tough(c);
  const e = c.enemies[0];
  play(run, 'saltspray', e);
  assert.equal(e.st.brine, 5);
  pacify(c);
  E.endTurn(run);
  assert.equal(500 - e.hp, 5);
  assert.equal(e.st.brine, 4);
  pacify(c);
  E.endTurn(run);
  assert.equal(500 - e.hp, 9);
});

test('status cards: Fog Bank is unplayable; Lull sinks at the end of your turn', () => {
  const { run, c } = fight(['kelp'], { hand: ['fogbank', 'lull'] });
  assert.equal(E.playable(run, cardIn(c, 'fogbank')).ok, false);
  const lull = cardIn(c, 'lull').uid;
  pacify(c);
  E.endTurnStart(run);
  assert.ok(c.sunk.some((x) => x.uid === lull));
});

/* ---------- Badges (simulated plays) ---------- */
test('card badges come from simulating the play, and match what really happens', () => {
  const { run, c } = fight(['mite', 'mite'], { hand: ['stormsurge', 'jab', 'slack'] });
  c.enemies[0].hp = 5;
  c.enemies[1].hp = 15;
  const pStorm = E.preview(run, cardIn(c, 'stormsurge').uid);
  assert.equal(pStorm.crests, 2);
  assert.equal(pStorm.chain, 2);
  const pJab = E.preview(run, cardIn(c, 'jab').uid, c.enemies[0].uid);
  assert.equal(pJab.kills, 1);
  assert.equal(pJab.won, false);
  c.tide = 2;
  const pSlack = E.preview(run, cardIn(c, 'slack').uid);
  assert.equal(pSlack.lows, 1);
  const json = snapshot(run);
  E.preview(run, cardIn(c, 'stormsurge').uid);
  assert.equal(snapshot(run), json, 'previewing does not change the real state');
  c.tide = 3;
  play(run, 'stormsurge');
  assert.equal(c.turnCrests, 2);
  assert.ok(c.won, 'two Crests (6 + 9) beat 5 and 15 HP');
});

test('the number on a CREST badge is how many Crests that card makes, not the chain so far', () => {
  const { run, c } = fight(['kelp'], { hand: ['swell', 'swell', 'stormsurge'], tide: 4, keepsakes: [] });
  tough(c);
  play(run, 'swell');
  assert.equal(c.turnCrests, 1, 'the first Rising Swell Crests');
  c.tide = 4;
  const p = E.preview(run, cardIn(c, 'swell').uid, c.enemies[0].uid);
  assert.equal(p.crests, 1, 'the second one makes one Crest: the badge says CREST');
  assert.equal(p.chain, 2, 'even though it would be the 2nd Crest this turn');
  c.tide = 3;
  assert.equal(E.preview(run, cardIn(c, 'stormsurge').uid).crests, 2, 'Surge 6 from 3 makes two: CREST x2');
});

/* ---------- Bosses and elites ---------- */
test('the Bellwether calls a shoal of Bell Minnows at two thirds of its health, and the shoal scatters when it falls', () => {
  assert.equal(BL.PIN_CALL, 2 / 3);
  const { run, c } = fight(['bell'], { kind: 'boss', deck: ['brace', 'brace', 'brace', 'brace', 'brace'] });
  run.hp = run.maxHp = 999;
  const bell = c.enemies[0];
  bell.intent = 'clapper';
  bell.hp = Math.floor(bell.maxHp * 2 / 3) + 1; // 107 of 160: not yet
  E.endTurn(run);
  assert.notEqual(bell.intent, 'shoal');
  bell.hp = Math.floor(bell.maxHp * 2 / 3); // 106
  E.endTurn(run);
  assert.equal(bell.intent, 'shoal');
  E.endTurn(run);
  assert.equal(E.alive(c).filter((e) => e.id === 'minnow').length, 2);
  bell.hp = 1;
  give(run, 'jab');
  play(run, 'jab', bell);
  assert.ok(c.won);
  assert.equal(E.alive(c).length, 0);
});

test('a Dread pays Pearls and a pick of 1 of 2 keepsakes, and offers no card and no tonic', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const f = fight(['hulk'], { kind: 'elite', seed });
    f.c.enemies[0].dead = true;
    f.c.won = true;
    E.finishCombat(f.run);
    const rw = f.run.rewards;
    assert.ok(rw.pearls >= 30);
    assert.equal(rw.keepsakeChoices.length, 2);
    assert.deepEqual(rw.cards, []);
    assert.equal(rw.cardTaken, true, 'nothing to pick, and leaving is not a decline');
    assert.equal(rw.tonic, null);
    const d0 = f.run.stats.declined;
    E.takeRewardKeepsake(f.run, rw.keepsakeChoices[0]);
    E.backToMap(f.run);
    assert.equal(f.run.stats.declined, d0);
  }
});

test('Bail and Stir: once a turn, without a card, 1 Light to Ebb 1 or Surge 1; a Bail that Strands gets its Light back', () => {
  let f = fight(['kelp'], { tide: 2 });
  tough(f.c);
  assert.deepEqual(E.canSwellAct(f.run), { ok: true });
  assert.ok(E.swellAct(f.run, 'bail'));
  assert.equal(f.c.tide, 1);
  assert.equal(f.c.light, 2, 'Bail costs 1 Light');
  assert.equal(f.run.stats.bails, 1);
  // once a turn, and Bail or Stir, not both
  assert.equal(E.swellAct(f.run, 'bail'), false);
  assert.equal(E.swellAct(f.run, 'stir'), false);
  assert.match(E.canSwellAct(f.run).reason, /Once a turn/);
  assert.equal(f.c.light, 2);
  // next turn it is back
  pacify(f.c);
  E.endTurn(f.run);
  assert.ok(E.canSwellAct(f.run).ok);
  // a Bail that makes a Strand pays for itself
  f.c.tide = 1;
  const light = f.c.light;
  f.c.enemies[0].ward = 7;
  assert.ok(E.swellAct(f.run, 'bail'));
  assert.equal(f.c.turnLows, 1);
  assert.equal(f.c.enemies[0].ward, 0, 'the Strand strips Ward');
  assert.equal(f.c.light, light, '-1 for the Bail, +1 for the Strand');
  assert.equal(f.c.tide, 3);

  // Stir: Surge 1, and a Crest at 6 (it does not give the Light back)
  f = fight(['kelp', 'crab'], { tide: 5, hand: ['spindrift'] });
  tough(f.c);
  play(f.run, 'spindrift');
  const hp = f.c.enemies.map((e) => e.hp);
  const l0 = f.c.light;
  assert.ok(E.swellAct(f.run, 'stir'));
  assert.equal(f.c.turnCrests, 1);
  assert.equal(f.c.light, l0 - 1);
  const dealt = f.c.enemies.reduce((a, e, i) => a + hp[i] - e.hp, 0);
  assert.equal(dealt, 6 * 2 + 3, 'a Crest on both, and Spindrift on one: Stir is a Surge');
  assert.equal(f.run.stats.stirs, 1);

  // not without Light, and not on the enemies' turn
  f = fight(['kelp']);
  f.c.light = 0;
  assert.equal(E.canSwellAct(f.run).reason, 'Not enough Light');
  assert.equal(E.swellAct(f.run, 'stir'), false);
  f.c.light = 3;
  f.c.phase = 'enemy';
  assert.equal(E.swellAct(f.run, 'stir'), false);
  assert.equal(E.swellAct(f.run, 'nope'), false);
});

test('Riptide Cut, Saltspray, Sea Wall and Whirlpool Ebb 2', () => {
  assert.deepEqual(['riptide', 'saltspray', 'seawall', 'whirlpool'].map((id) => BL.CARDS[id].v.ebb), [2, 2, 2, 2]);
  const f = fight(['kelp'], { hand: ['riptide'], tide: 2 });
  tough(f.c);
  play(f.run, 'riptide', f.c.enemies[0]);
  assert.equal(f.c.turnLows, 1, 'from 2, Ebb 2 Strands');
  assert.equal(f.c.tide, 3);
});

test('Kelp Lurker: each Lash hits 2 harder than the last', () => {
  const { run, c } = fight(['kelp'], { deck: ['brace', 'brace', 'brace', 'brace', 'brace'] });
  run.hp = run.maxHp = 999;
  const k = c.enemies[0];
  const hits = [];
  for (let i = 0; i < 3; i++) {
    k.intent = 'lash';
    assert.equal(E.intentInfo(run, k).dmg, 8 + 2 * i, 'the intent shows the next Lash');
    const hp = run.hp;
    c.player.ward = 0;
    E.endTurn(run);
    hits.push(hp - run.hp);
  }
  assert.deepEqual(hits, [8, 10, 12]);
});

test('Barnacle Mite: Burrow gives it 5 Ward and 1 Might', () => {
  const { run, c } = fight(['mite']);
  const m = c.enemies[0];
  m.intent = 'burrow';
  E.endTurn(run);
  assert.equal(m.st.might, 1);
  assert.equal(m.ward, 5);
});

test('Hollow Siren: the lullaby flattens your Swell back to 3', () => {
  const { run, c } = fight(['siren'], { kind: 'elite' });
  c.enemies[0].intent = 'lullaby';
  c.tide = 5;
  E.endTurn(run);
  assert.equal(c.tide, 3);
});

test('Angler Twins: the survivor enrages when its twin dies', () => {
  const { run, c } = fight(['angler', 'angler'], { kind: 'elite', hand: ['jab'] });
  const [a, b] = c.enemies;
  a.hp = 1;
  play(run, 'jab', a);
  assert.equal(b.st.might, 4);
});

/* ---------- After a fight ---------- */
test('after a fight: Pearls, an optional tonic and a choice of 3 cards you can skip', () => {
  const { run, c } = fight(['mite'], { hand: ['jab'] });
  c.enemies[0].hp = 1;
  const pearls = run.pearls;
  play(run, 'jab', c.enemies[0]);
  E.finishCombat(run);
  assert.equal(run.screen, 'reward');
  assert.equal(run.rewards.cards.length, 3);
  assert.ok(run.pearls > pearls);
  const n = run.deck.length;
  E.takeRewardCard(run, null);
  assert.equal(run.deck.length, n, 'skipping adds nothing');
});

test('High and Dry: 2 or more Strands in one turn pays bonus Pearls like Tidal Fury (6 per Strand in the chain)', () => {
  const { run, c } = fight(['kelp'], { hand: ['bilgepump', 'bilgepump'], tide: 2, keepsakes: [] });
  play(run, 'bilgepump');
  c.tide = 2;
  play(run, 'bilgepump');
  c.enemies[0].dead = true;
  c.won = true;
  E.finishCombat(run);
  const b = run.rewards.bonuses.find((x) => x.name === 'High and Dry');
  assert.ok(b, 'High and Dry is paid');
  assert.equal(b.pearls, 12);
  const f = fight(['kelp'], { hand: ['stormsurge'], keepsakes: [] });
  f.c.enemies[0].hp = 30;
  play(f.run, 'stormsurge');
  assert.equal(f.c.maxChain, 2);
  f.c.enemies[0].dead = true;
  f.c.won = true;
  E.finishCombat(f.run);
  assert.equal(f.run.rewards.bonuses.find((x) => x.name === 'Tidal Fury').pearls, 12, 'the same rate as Tidal Fury');
});

test('a new best chain is announced with the bonus it earns, except where no Pearls are paid', () => {
  const { run, c } = fight(['kelp'], { hand: ['stormsurge', 'tidereading'], keepsakes: [] });
  tough(c);
  play(run, 'stormsurge');
  assert.deepEqual(c.fx.filter((f) => f.t === 'crest').map((f) => f.fury), [0, 12]);
  c.tide = 5;
  play(run, 'tidereading');
  assert.equal(c.fx.filter((f) => f.t === 'crest').pop().fury, 18, 'chain 3 raises it to 18');
  const boss = fight(['bell'], { hand: ['stormsurge'], keepsakes: [], kind: 'boss' });
  tough(boss.c);
  play(boss.run, 'stormsurge');
  assert.ok(boss.c.fx.filter((f) => f.t === 'crest').every((f) => !f.fury), 'the boss fight pays no bonus Pearls');
});

test('bonus Pearls: Flawless, Swift (3 turns, 4 for elites) and Tidal Fury', () => {
  const { run, c } = fight(['kelp'], { hand: ['stormsurge'], keepsakes: [] });
  c.enemies[0].hp = 30;
  play(run, 'stormsurge'); // 15 damage, chain 2
  c.enemies[0].hp = 1;
  give(run, 'jab');
  play(run, 'jab', c.enemies[0]);
  E.finishCombat(run);
  const names = run.rewards.bonuses.map((b) => b.name);
  assert.deepEqual(names, ['Flawless', 'Swift', 'Tidal Fury']);

  const slow = fight(['kelp'], { kind: 'elite' });
  slow.c.turn = 4;
  slow.c.flags.hpLost = true;
  slow.c.enemies[0].dead = true;
  slow.c.won = true;
  E.finishCombat(slow.run);
  assert.deepEqual(slow.run.rewards.bonuses.map((b) => b.name), ['Swift'], 'turn 4 is still Swift for an elite');
  assert.equal(slow.run.rewards.keepsakeChoices.length, 2, 'elites offer 1 of 2 keepsakes');
});

test('the map: 8 landings a level (7 rows of stops, then the pin), fights first, a wreck halfway, a cove before the pin, and enough variety', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const run = E.newRun(seed);
    const nodes = run.map.grid.flat().filter(Boolean);
    assert.equal(run.map.rows + 1, 8);
    assert.equal(E.LANDINGS, 8);
    assert.ok(run.map.grid[0].filter(Boolean).every((n) => n.type === 'fight'));
    assert.ok(run.map.grid[3].filter(Boolean).every((n) => n.type === 'treasure'));
    assert.ok(run.map.grid[6].filter(Boolean).every((n) => n.type === 'rest'));
    const count = (t) => nodes.filter((n) => n.type === t).length;
    ['fight', 'elite', 'event', 'shop', 'rest', 'treasure'].forEach((t) => assert.ok(count(t) >= 1, `seed ${seed} has a ${t}`));
    assert.ok(nodes.every((n) => n.type !== 'elite' || n.row >= 2), 'no elites in the first rows');
  }
});

test('Sheltered Cove: rest heals 30% of max HP (20% with the Cold Coves current), or upgrade a card', () => {
  const run = E.newRun(3);
  run.hp = 20;
  E.rest(run);
  assert.equal(run.hp, 20 + 21);
  const cold = E.newRun(3, 0, null, [], ['cold']);
  cold.hp = 20;
  E.rest(cold);
  assert.equal(cold.hp, 20 + 14);
  const card = run.deck.find((c) => c.id === 'jab');
  E.upgradeCard(run, card.uid);
  assert.equal(card.up, 1);
  assert.equal(E.vals(card).dmg, 9);
});

test("Barnaby's shop: cards, keepsakes, tonics, and one paid card removal per visit", () => {
  const run = E.newRun(9);
  run.pearls = 1000;
  E.enterNode(run, { row: 2, col: 0, type: 'shop' });
  const s = run.shop;
  assert.equal(s.cards.length, 5);
  assert.equal(s.cards.filter((x) => x.sale).length, 1);
  assert.equal(s.keepsakes.length, 2);
  assert.equal(s.tonics.length, 2);
  const n = run.deck.length;
  assert.ok(E.buy(run, 'cards', 0));
  assert.equal(run.deck.length, n + 1);
  assert.equal(E.buy(run, 'cards', 0), false, 'sold out');
  assert.ok(E.buy(run, 'keepsakes', 0));
  assert.ok(E.has(run, s.keepsakes[0].id));
  assert.ok(E.buy(run, 'tonics', 0));
  assert.equal(run.tonics.filter(Boolean).length, 1);
  const cost = E.removePrice(run);
  assert.ok(E.buyRemoval(run, run.deck[0].uid));
  assert.equal(E.buyRemoval(run, run.deck[0].uid), false, 'once per visit');
  assert.equal(run.removeCost, cost + 25);
});

test('Wrecks: a chest of Pearls and a choice of 1 of 3 keepsakes', () => {
  const run = E.newRun(4);
  E.enterNode(run, { row: 5, col: 0, type: 'treasure' });
  const pearls = run.pearls;
  E.openTreasure(run);
  assert.ok(run.pearls > pearls);
  assert.equal(run.treasure.choices.length, 3);
  E.takeTreasureKeepsake(run, run.treasure.choices[1]);
  assert.ok(E.has(run, run.treasure.choices[1]));
  E.takeTreasureKeepsake(run, run.treasure.choices[0]);
  assert.ok(!E.has(run, run.treasure.choices[0]), 'only one');
});

test('a keepsake pick is optional: take one, or leave them for +80 score; a pick left open is lost', () => {
  // Wreck: take one, and only one
  let run = E.newRun(4);
  E.enterNode(run, { row: 5, col: 0, type: 'treasure' });
  E.openTreasure(run);
  E.takeTreasureKeepsake(run, run.treasure.choices[2]);
  assert.ok(E.has(run, run.treasure.choices[2]));
  assert.equal(E.leaveKeepsakes(run), false, 'already taken');
  const n = run.keepsakes.length;
  E.backToMap(run);
  assert.equal(run.keepsakes.length, n);

  // Wreck: leave them
  run = E.newRun(4);
  E.enterNode(run, { row: 5, col: 0, type: 'treasure' });
  E.openTreasure(run);
  const s0 = E.score(run, false);
  assert.equal(E.leaveKeepsakes(run), true);
  assert.equal(E.leaveKeepsakes(run), false, 'once');
  E.takeTreasureKeepsake(run, run.treasure.choices[0]);
  assert.equal(run.keepsakes.length, 0, 'left behind means left behind');
  assert.equal(E.score(run, false), s0 + E.DECLINE_SCORE.keepsake);
  assert.equal(E.DECLINE_SCORE.keepsake, 80);

  // Dread reward left open: nothing is taken, and it doesn't score
  const f = fight(['kelp'], { kind: 'elite' });
  f.c.enemies[0].dead = true;
  f.c.won = true;
  E.finishCombat(f.run);
  assert.equal(f.run.rewards.keepsakeChoices.length, 2);
  f.run.rewards.tonic = null; // (a tonic left behind would count on its own)
  const d0 = f.run.stats.declined;
  E.backToMap(f.run);
  assert.equal(f.run.keepsakes.length, 0);
  assert.equal(f.run.stats.declined, d0);
});

test('Kelp Bracelet: a Strand gives 8 Ward. Tidal Memory: each Crest gives 1 Light. Spring Tide: Strand, then Crest', () => {
  let f = fight(['kelp'], { hand: ['slack'], tide: 2, keepsakes: ['kelpbracelet'] });
  play(f.run, 'slack');
  assert.equal(f.c.player.ward, 4 + 8);

  f = fight(['kelp'], { hand: ['tidereading', 'slack'], tide: 5, keepsakes: [] });
  tough(f.c);
  f.c.player.st.r_tidalmemory = 1;
  play(f.run, 'tidereading');
  assert.equal(f.c.light, 3 + 1, 'Crest: +1');
  f.c.tide = 2;
  play(f.run, 'slack');
  assert.equal(f.c.light, 3 + 1 - 1 + 1, 'the Strand: only its own +1');

  f = fight(['kelp'], { hand: ['springtide'], keepsakes: [] });
  tough(f.c);
  f.c.enemies[0].ward = 10;
  play(f.run, 'springtide');
  assert.equal(500 - f.c.enemies[0].hp, 6, 'the Crest lands in full on a stranded enemy');
  assert.equal(f.c.light, 3 - 1 + 1);
});

/* ---------- Depths and score ---------- */
/* Win the boss fight the run is in, the quick way. */
const beatPin = (run) => { E.startCombat(run, 'boss'); run.combat.enemies.forEach((e) => { e.dead = true; e.hp = 0; }); run.combat.won = true; E.finishCombat(run); };

test('an expedition goes down level by level: after a pin, go home or go deeper; the stair down starts at a Cove; the last pin brings the Heart home', () => {
  assert.deepEqual(E.LEVELS.map((l) => l.band), ['shallows', 'dark']);
  const run = E.newRun(5);
  assert.equal(run.level, 0);
  run.floor = 8;
  beatPin(run);
  assert.equal(run.screen, 'pin');
  assert.deepEqual(run.cleared, [0]);
  assert.ok(E.storyMarks(run).includes('won:0'));
  assert.equal(E.goDeeper(Object.assign({}, run, { screen: 'map' })), false, 'only from a broken pin');
  // going home ends the expedition: it came home, without the Heart
  const home = JSON.parse(JSON.stringify(run));
  assert.ok(E.goHome(home));
  assert.equal(home.screen, 'victory');
  assert.ok(!home.heart);
  assert.ok(E.storyMarks(home).includes('home') && !E.storyMarks(home).includes('heart'));
  // going deeper keeps the deck, keepsakes and HP, and the stair down starts at a Cove
  run.hp = 30;
  E.gainKeepsake(run, 'tidewatch');
  const deck = run.deck.length, oldMap = run.map;
  assert.ok(E.goDeeper(run));
  assert.equal(run.level, 1);
  assert.equal(run.screen, 'rest');
  assert.ok(run.passage);
  assert.equal(run.hp, 30);
  assert.equal(run.deck.length, deck);
  assert.ok(E.has(run, 'tidewatch'));
  assert.notEqual(run.map, oldMap);
  assert.equal(E.bandId(run), 'dark');
  E.rest(run);
  assert.equal(run.hp, 30 + 21);
  E.backToMap(run);
  assert.equal(run.screen, 'map');
  assert.ok(!run.passage);
  assert.deepEqual(E.availableNodes(run), run.map.grid[0].filter(Boolean), 'the new level starts at its first landing');
  // the last pin: the Heart comes home, and there is no deeper
  run.floor = 8;
  beatPin(run);
  assert.equal(run.screen, 'victory');
  assert.ok(run.heart);
  assert.deepEqual(run.cleared, [0, 1]);
  ['won:0', 'won:1', 'home', 'heart'].forEach((m) => assert.ok(E.storyMarks(run).includes(m), m));
  assert.equal(E.goDeeper(run), false);
  assert.equal(E.goHome(run), false);
});

test('the score: each landing scores 40 in the Shallows and 60 in Dark Water; coming home adds 5 per HP left; the Heart adds 600', () => {
  assert.deepEqual(E.LEVELS.map((l) => l.landing), [40, 60]);
  const run = E.newRun(1);
  run.floor = 5;
  const line = (r, won, label) => (E.scoreParts(r, won).parts.find((p) => p.label === label) || {}).pts;
  assert.equal(line(run, false, 'Landings in the Shallows'), 200);
  run.floor = 8;
  beatPin(run);
  E.goDeeper(run);
  E.backToMap(run);
  E.enterNode(run, run.map.grid[0].find(Boolean));
  run.screen = 'map';
  assert.deepEqual(E.landed(run), [8, 1]);
  assert.equal(line(run, false, 'Landings in the Shallows'), 320);
  assert.equal(line(run, false, 'Landings in Dark Water'), 60);
  assert.equal(line(run, false, 'HP left'), undefined, 'a fall counts no HP');
  assert.equal(line(run, true, 'HP left'), run.hp * 5);
  assert.equal(line(run, true, 'The Lantern Heart brought home'), undefined);
  run.heart = true;
  assert.equal(line(run, true, 'The Lantern Heart brought home'), 600);
  assert.equal(E.scoreParts(run, true).mult, 1);
});

test('currents: each makes the expedition harder and adds 0.25 to the score multiplier; they combine, and they open once the Heart has come home', () => {
  assert.deepEqual(Object.keys(E.CURRENTS), ['fed', 'teeth', 'cold', 'backwash']);
  const hpWith = (cur) => { const r = E.newRun(11, 0, null, [], cur); E.startCombat(r, 'easy', ['ray']); return r.combat.enemies[0].maxHp; };
  const base = hpWith([]);
  assert.equal(hpWith(['fed']), Math.round(base * 1.1));
  const dmgWith = (cur) => { const r = E.newRun(11, 0, null, [], cur); E.startCombat(r, 'easy', ['kelp']); r.combat.enemies[0].intent = 'lash'; return E.intentInfo(r, r.combat.enemies[0]).dmg; };
  assert.deepEqual([[], ['teeth'], ['fed', 'teeth']].map(dmgWith), [8, Math.round(8 * 1.15), Math.round(8 * 1.15)]);
  // the score
  const run = E.newRun(1, 0, null, [], ['fed', 'teeth', 'nope', 'fed']);
  assert.deepEqual(run.currents, ['fed', 'teeth'], 'unknown and repeated currents are dropped');
  assert.equal(E.scoreMult(run), 1.5);
  run.floor = 5;
  const plain = E.newRun(1); plain.floor = 5;
  assert.equal(E.score(run, false), Math.round(E.score(plain, false) * 1.5));
  assert.equal(E.scoreMult(E.newRun(1, 0, null, [], Object.keys(E.CURRENTS))), 2);
  // opening them
  const meta = E.newMeta();
  assert.equal(E.currentsOpen(meta), false);
  assert.equal(E.toggleCurrent(meta, 'fed'), false);
  const back = E.newRun(2); back.floor = 8; back.screen = 'victory';
  E.recordRun(meta, back, true);
  assert.equal(E.currentsOpen(meta), false, 'coming home without the Heart does not open them');
  back.heart = true;
  E.recordRun(meta, back, true);
  assert.ok(E.currentsOpen(meta));
  assert.ok(E.toggleCurrent(meta, 'cold'));
  assert.ok(E.toggleCurrent(meta, 'fed'));
  assert.ok(E.toggleCurrent(meta, 'cold'));
  assert.deepEqual(meta.currents, ['fed']);
  assert.deepEqual(E.migrateMeta({ owned: [], ach: [], currents: ['fed', 'x', 'fed', 'backwash'] }).currents, ['fed', 'backwash']);
});

test('the Backwash current: from your second turn on, each turn starts with the Swell 1 step closer to 3', () => {
  const { run, c } = fight(['kelp'], {});
  run.currents = ['backwash'];
  c.enemies.forEach((e) => { e.hp = e.maxHp = 500; e.intent = 'none'; });
  c.tide = 5;
  E.endTurn(run);
  assert.equal(c.tide, 4);
  c.tide = 1;
  E.endTurn(run);
  assert.equal(c.tide, 2);
  c.tide = 3;
  E.endTurn(run);
  assert.equal(c.tide, 3);
  // without it the Swell stays put between turns, and the first turn of a fight is never pulled
  const f2 = fight(['kelp'], {});
  f2.c.enemies.forEach((e) => { e.hp = e.maxHp = 500; e.intent = 'none'; });
  f2.c.tide = 5;
  E.endTurn(f2.run);
  assert.equal(f2.c.tide, 5);
  const moon = E.newRun(3, 0, null, ['moonshard'], ['backwash']);
  E.startCombat(moon, 'easy', ['kelp']);
  assert.equal(moon.combat.tide, 5, 'the Moon Shard still starts a fight at 5');
});

test('turning down a reward adds to the score: 50 for a card or an event Leave, 20 for a tonic left with a free slot', () => {
  const won = (seed, o, enc) => { const f = fight(enc || ['kelp'], Object.assign({ seed }, o)); f.c.enemies.forEach((e) => { e.dead = true; }); f.c.won = true; E.finishCombat(f.run); return f.run; };
  assert.deepEqual(E.DECLINE_SCORE, { card: 50, eliteCard: 80, eventCard: 50, event: 50, tonic: 20, keepsake: 80 });
  // skip the reward card
  let run = won(1);
  const s0 = E.score(run, false);
  E.takeRewardCard(run, null);
  assert.equal(run.stats.declined, 1);
  assert.equal(E.score(run, false), s0 + 50);
  // a Dread offers no card since v0.16.0; a Dread's card in a reward saved before that was worth 80 to turn down
  run = won(1, { kind: 'elite' }, ['hulk']);
  run.rewards.cards = [{ id: 'jab', up: 0 }];
  run.rewards.cardTaken = false;
  assert.equal(E.skipCardKind(run.rewards), 'eliteCard');
  const e0 = E.score(run, false);
  E.takeRewardCard(run, null);
  assert.equal(E.score(run, false), e0 + 80);
  // taking a card is not a decline
  run = won(1);
  E.takeRewardCard(run, 0);
  assert.equal(run.stats.declined, 0);
  // a reward tonic left behind counts only with a free slot
  run = won(1);
  run.rewards.tonic = 'shell';
  const t0 = E.score(run, false);
  E.backToMap(run);
  assert.equal(run.stats.declined, 1, 'left with a free slot');
  assert.equal(E.score(run, false), t0 + 20);
  run = won(1);
  run.rewards.tonic = 'shell';
  run.tonics = ['shell', 'shell', 'shell'];
  E.backToMap(run);
  assert.equal(run.stats.declined, 0, 'slots full: no choice was made');
  run = won(1);
  run.rewards.tonic = 'shell';
  E.takeRewardTonic(run);
  E.backToMap(run);
  assert.equal(run.stats.declined, 0, 'taken');
  // an event's Leave / Decline counts 50; its other options don't
  for (const ev of BL.EVENTS) {
    ev.options.forEach((opt, i) => {
      const r = E.newRun(3);
      r.pearls = 500;
      r.event = { id: ev.id, stage: 'choose', text: null, next: null };
      if (E.chooseEventOption(r, i) === null) return;
      const isLeave = /^(Leave|Decline)$/.test(opt.label);
      assert.equal(r.stats.declined, isLeave ? 1 : 0, `${ev.id}: ${opt.label}`);
      assert.equal(E.declinePoints(r.stats), isLeave ? 50 : 0, `${ev.id}: ${opt.label}`);
    });
  }
  // skipping an event's card pick counts 50 too
  run = E.newRun(3);
  E.takeEventCard(run, null);
  assert.equal(run.stats.declined, 1);
  assert.equal(E.declinePoints(run.stats), 50);
  const n = run.deck.length;
  E.takeEventCard(run, 'jab');
  assert.equal(run.stats.declined, 1);
  assert.equal(run.deck.length, n + 1);
});

test('a save from before the decline tiers keeps 20 a decline for what it already declined', () => {
  const run = E.newRun(3);
  run.stats.declined = 3;
  delete run.stats.declineScore;
  assert.equal(E.declinePoints(run.stats), 60);
  const s0 = E.score(run, false);
  E.takeEventCard(run, null);
  assert.equal(run.stats.declined, 4);
  assert.equal(E.declinePoints(run.stats), 110);
  assert.equal(E.score(run, false), s0 + 50);
  // a reward saved without the elite flag still counts as a Dread's when it offers keepsakes
  assert.equal(E.skipCardKind({ keepsakeChoices: ['anchor', 'moonshard'] }), 'eliteCard');
  assert.equal(E.skipCardKind({ keepsakeChoices: [] }), 'card');
});

test('Wreck of the Gilded Gull: the dive pays 150 Pearls or costs 12 HP, about half the time each; the cabin adds Barnacle Growth, which stays until removed', () => {
  const ev = BL.EVENTS.find((e) => e.id === 'wreck');
  const dive = ev.options.findIndex((o) => o.label === 'Dive into the flooded hold');
  let wins = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const r = E.newRun(seed);
    const p = r.pearls, hp = r.hp;
    r.event = { id: 'wreck', stage: 'choose', text: null, next: null };
    E.chooseEventOption(r, dive);
    if (r.pearls === p + 150) { wins++; assert.equal(r.hp, hp); } else { assert.equal(r.pearls, p); assert.equal(r.hp, hp - 12); }
  }
  assert.ok(wins > 70 && wins < 130, `wins ${wins}/200`);

  const r = E.newRun(2);
  r.event = { id: 'wreck', stage: 'choose', text: null, next: null };
  E.chooseEventOption(r, 0);
  const curse = r.deck.find((c) => c.id === 'barnacles');
  assert.ok(curse, 'the curse is in the deck');
  assert.ok(BL.CARDS.barnacles.unplayable);
  E.backToMap(r);
  E.startCombat(r, 'easy', ['kelp']);
  r.combat.enemies[0].dead = true; r.combat.won = true;
  E.finishCombat(r);
  E.backToMap(r);
  assert.ok(r.deck.some((c) => c.id === 'barnacles'), 'still there after a fight');
  E.removeCard(r, curse.uid);
  assert.ok(!r.deck.some((c) => c.id === 'barnacles'), 'gone once removed');
});

test('the score counts Strands and the best Strand chain the same as Crests', () => {
  const run = E.newRun(1, 0);
  const s0 = E.score(run, false);
  run.stats.crests = 3; run.stats.maxChain = 2;
  const sc = E.score(run, false);
  run.stats.crests = 0; run.stats.maxChain = 0;
  run.stats.lows = 3; run.stats.maxLowChain = 2;
  assert.equal(E.score(run, false), sc);
  assert.equal(sc - s0, 3 * 6 + 2 * 30);
});

/* ---------- Content (README counts) ---------- */
test('content: 38 collectible cards (14/16/8), all upgradable; 4 statuses and 1 curse; 20 enemies; 14 keepsakes; 7 tonics; 10 events', () => {
  const cards = Object.values(BL.CARDS);
  const by = (r) => cards.filter((c) => c.rarity === r).length;
  assert.deepEqual([by('common'), by('uncommon'), by('rare')], [14, 16, 8]);
  cards.filter((c) => ['common', 'uncommon', 'rare', 'starter'].includes(c.rarity)).forEach((c) => assert.ok(Object.keys(c.up).length > 0, c.id + ' has an upgrade'));
  assert.equal(cards.filter((c) => c.type === 'status').length, 4);
  assert.equal(cards.filter((c) => c.type === 'curse').length, 1);
  assert.equal(Object.values(BL.ENEMIES).filter((e) => !e.tutorial).length, 20);
  assert.equal(Object.keys(BL.KEEPSAKES).length, 14);
  Object.values(BL.KEEPSAKES).forEach((k) => assert.ok(k.charge > 0, k.name + ' has a Roil'));
  assert.equal(Object.keys(BL.TONICS).length, 7);
  assert.equal(BL.EVENTS.length, 10);
});

test('the fight words are Swell, Surge, Ebb, Crest and Strand, and a keepsake has Roil: no card, keepsake, kit, status or achievement text uses the old words', () => {
  ['Swell', 'Surge', 'Ebb', 'Crest', 'Strand', 'Roil', 'Hold', 'Seep'].forEach((k) => assert.ok(BL.KEYWORDS[k], k + ' is in the glossary'));
  ['Tide', 'Low Water', 'Charge'].forEach((k) => assert.ok(!BL.KEYWORDS[k], k + ' is gone from the glossary'));
  const fmt = { d: (n) => n, tide: null, ward: null };
  const texts = [].concat(
    Object.values(BL.CARDS).map((c) => c.text(Object.assign({}, c.v), fmt)),
    Object.values(BL.KEYWORDS),
    Object.values(BL.STATUSES).map((s) => s.desc(1)),
    Object.values(BL.KEEPSAKES).map((k) => k.desc),
    Object.values(BL.KIT).map((k) => k.desc),
    BL.KIT_PLACES.map((p) => p.desc),
    Object.values(BL.TONICS).map((t) => t.desc),
    Object.values(BL.ACHIEVEMENTS).map((a) => a.name + '. ' + a.desc),
  );
  // the Brass Tide-Bell keeps its name; a card name such as Spring Tide is not rules text
  texts.forEach((t) => assert.ok(!/Low Water|\bCharge\b|\bTide\b(?!-Bell)/.test(t), 'an old word in: ' + t));
});

/* ---------- Determinism, save and continue ---------- */
test('the same seed and the same decisions give the same run', () => {
  for (const seed of [1, 42, 2024]) {
    const a = E.newRun(seed);
    const b = E.newRun(seed);
    const la = playRun(a);
    const lb = playRun(b);
    assert.deepEqual(la, lb);
    assert.equal(snapshot(a), snapshot(b));
  }
  assert.notEqual(snapshot(E.newRun(1).map), snapshot(E.newRun(2).map), 'different seeds, different maps');
});

test('save and continue: a run reloaded from its save plays out exactly like one that never stopped', () => {
  for (const seed of [3, 77]) {
    for (const stopAt of [5, 23, 60]) {
      const a = E.newRun(seed);
      for (let i = 0; i < stopAt; i++) step(a);
      // the game only saves at the start of a turn or between stops
      while (a.screen === 'combat' && a.combat.turn > 0 && a.combat.phase !== 'player') step(a);
      const b = saveLoad(a);
      playRun(a);
      playRun(b);
      assert.equal(snapshot(b), snapshot(a), `seed ${seed}, saved after ${stopAt} steps`);
    }
  }
});

test('debug god mode (js/debug.js): the keeper loses no HP to attacks or Brine; enemies are unaffected', () => {
  const { run, c } = fight(['kelp']);
  run.debugGod = true;
  const hp = run.hp;
  c.player.st.brine = 5;
  E.endTurn(run);
  assert.equal(run.hp, hp);
  assert.ok(!c.lost);
  // the same turn without it costs HP
  const ctl = fight(['kelp']);
  ctl.c.player.st.brine = 5;
  E.endTurn(ctl.run);
  assert.ok(ctl.run.hp < hp, `without god mode: ${ctl.run.hp} < ${hp}`);
});
