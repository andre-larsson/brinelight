/* Dark Water: its own creatures, Fog events and pin (the Tolling Buoy), and the rules they bring:
   a Glimmer Leech drinks what it takes, a Murk Ray sinks out of reach, a Lamp Hermit keeps its Ward,
   a Glimmer Chain douses your lantern, a Pale Gulper swallows a card, and the Buoy rocks on your Swell.
   Run with: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { load, saveLoad, snapshot, playRun } = require('../tools/bot');

const { BL, E } = load();

/* A fight in Dark Water against `enc`, with an optional hand; the bell is left out so hands stay fixed. */
function fight(enc, o = {}) {
  const run = E.newRun(o.seed || 1, o.level == null ? 1 : o.level);
  run.kit.bell = null;
  if (o.keepsakes) run.keepsakes = o.keepsakes.slice();
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
const play = (run, id, target) => E.playCard(run, cardIn(run.combat, id).uid, target ? target.uid : undefined);
const give = (run, id) => { const card = { uid: run.nextUid++, id, up: 0 }; run.combat.hand.push(card); return card; };
const tough = (c) => c.enemies.forEach((e) => { e.hp = e.maxHp = 500; });
const idle = (e) => { e.intent = 'none'; };
const enc = (c) => c.enemies.map((e) => e.id);

test('each level of an expedition draws fights, its pin and Fog events from its own band', () => {
  assert.equal(BL.BANDS.shallows.enc, BL.ENCOUNTERS);
  assert.deepEqual(BL.BANDS.shallows.events, ['shrine', 'wreck', 'witch', 'pool', 'ghost', 'bottle', 'ambush']);
  const key = (list) => list.map((x) => x.join('+'));
  E.LEVELS.forEach((L, lv) => {
    const band = BL.BANDS[L.band];
    for (let seed = 1; seed <= 30; seed++) {
      const run = E.newRun(seed, lv);
      ['easy', 'hard', 'elite', 'boss'].forEach((kind) => {
        E.startCombat(run, kind);
        assert.ok(key(band.enc[kind]).includes(run.combat.enc.join('+')), `${L.name} ${kind}: ${run.combat.enc}`);
      });
      run.combat = null;
      E.startEvent(run);
      assert.ok(band.events.includes(run.event.id), `${L.name}: ${run.event.id}`);
    }
  });
  assert.deepEqual(BL.BANDS.dark.enc.boss, [['buoy']]);
  // every creature in a band's tables is a real, non-tutorial enemy with its picture
  Object.values(BL.BANDS).forEach((b) => Object.values(b.enc).flat(2).forEach((id) => {
    assert.ok(BL.ENEMIES[id] && !BL.ENEMIES[id].tutorial, id);
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'img/units', BL.ENEMIES[id].art + '.webp')), id);
  }));
  ['bg', 'bossBg'].forEach((k) => Object.values(BL.BANDS).forEach((b) => assert.ok(fs.existsSync(path.join(__dirname, '..', 'img/bg', b[k] + '.webp')), b[k])));
});

test('a Fog event never repeats in a run until every one in the band has been seen', () => {
  const run = E.newRun(4, 1);
  const seen = [];
  for (let i = 0; i < BL.BANDS.dark.events.length; i++) { E.startEvent(run); seen.push(run.event.id); }
  assert.deepEqual(seen.slice().sort(), BL.BANDS.dark.events.slice().sort());
});

test('Glimmer Leech: Latch heals the leech by the HP it takes from you, and Ward stops both', () => {
  let { run, c } = fight(['leech']);
  const leech = c.enemies[0];
  leech.hp = 4;
  leech.intent = 'latch';
  c.player.ward = 2;
  const hp = run.hp;
  E.endTurn(run);
  assert.equal(run.hp, hp - 3);
  assert.equal(leech.hp, 4 + 3);
  ({ run, c } = fight(['leech']));
  c.enemies[0].hp = 4;
  c.enemies[0].intent = 'latch';
  c.player.ward = 9;
  E.endTurn(run);
  assert.equal(c.enemies[0].hp, 4, 'all blocked: nothing to drink');
  const f = fight(['leech']);
  f.c.enemies[0].intent = 'latch';
  assert.match(E.intentInfo(f.run, f.c.enemies[0]).parts.join('. '), /Heal as much HP as the attack takes from you/);
});

test('Murk Ray: Submerged until it next acts; it cannot be targeted or attacked, but Crests reach it and a Strand brings it up', () => {
  const { run, c } = fight(['ray', 'leech'], { hand: ['jab', 'spraylash', 'jab'] });
  tough(c);
  const [ray, leech] = c.enemies;
  ray.intent = 'sink';
  idle(leech);
  E.endTurn(run);
  assert.equal(ray.st.submerged, 1);
  assert.deepEqual(E.targets(c).map((e) => e.id), ['leech']);
  c.hand = ['jab', 'spraylash', 'jab', 'swell'].map((id) => ({ uid: run.nextUid++, id, up: 0 }));
  c.light = 10;
  // a card aimed at it does nothing; with one enemy in reach, an aimed card goes there
  assert.equal(play(run, 'jab', ray), false);
  assert.equal(ray.hp, 500);
  assert.ok(play(run, 'jab'));
  assert.equal(leech.hp, 500 - 6);
  // an attack on ALL enemies misses it
  assert.ok(play(run, 'spraylash'));
  assert.equal(ray.hp, 500);
  assert.equal(leech.hp, 500 - 6 - 4);
  // a Crest is a wave, and it reaches the Ray
  c.tide = 5;
  play(run, 'swell', leech);
  assert.equal(ray.hp, 500 - 6);
  // a Strand brings it up
  give(run, 'slack');
  c.tide = 1;
  play(run, 'slack');
  assert.ok(!ray.st.submerged);
  assert.ok(E.targets(c).includes(ray));
  assert.ok(play(run, 'jab', ray));
  assert.equal(ray.hp, 500 - 6 - 6);
});

test('Murk Ray: with nothing in reach, aimed cards and tonics are not playable, and it comes up when it acts', () => {
  const { run, c } = fight(['ray'], { hand: ['jab', 'brace'] });
  tough(c);
  const ray = c.enemies[0];
  ray.intent = 'sink';
  E.endTurn(run);
  assert.deepEqual(E.playable(run, cardIn(c, 'jab')), { ok: false, reason: 'Nothing in reach' });
  assert.ok(E.playable(run, cardIn(c, 'brace')).ok);
  run.tonics = ['ink', null, null];
  assert.equal(E.useTonic(run, 0, ray.uid), false);
  assert.equal(E.useTonic(run, 0), false);
  assert.equal(run.tonics[0], 'ink', 'the tonic is kept');
  // its move after Sink is Rise: it comes up and strikes
  const order = BL.ENEMIES.ray.ai;
  assert.equal(order({ hist: ['sting', 'sink'], mem: { offset: 0 } }), 'rise');
  ray.intent = 'rise';
  assert.match(E.intentInfo(run, ray).parts.join(' '), /Attack for 15/);
  const hp = run.hp;
  c.player.ward = 0;
  E.endTurn(run);
  assert.ok(!ray.st.submerged);
  assert.equal(run.hp, hp - 15);
  assert.ok(E.playable(run, c.hand.find((x) => BL.CARDS[x.id].target === 'enemy') || give(run, 'jab')).ok);
});

test('Lamp Hermit: Shell keeps its Ward from turn to turn, and a Strand strips it', () => {
  const { run, c } = fight(['hermit'], { hand: ['slack'] });
  tough(c);
  const h = c.enemies[0];
  assert.equal(h.st.shell, 1);
  h.intent = 'withdraw';
  E.endTurn(run);
  assert.equal(h.ward, 8);
  h.intent = 'clamp';
  E.endTurn(run);
  assert.equal(h.ward, 8, 'still there after its next turn');
  h.intent = 'withdraw';
  E.endTurn(run);
  assert.equal(h.ward, 16);
  give(run, 'slack');
  c.tide = 1;
  play(run, 'slack');
  assert.equal(h.ward, 0);
});

test('Glimmer Chain: Drink the Light douses your lantern, and you start your next turn with 1 less Light', () => {
  const { run, c } = fight(['chain']);
  tough(c);
  const ch = c.enemies[0];
  ch.intent = 'douse';
  assert.match(E.intentInfo(run, ch).parts.join('. '), /Douse your lantern: 1 less Light next turn/);
  E.endTurn(run);
  assert.equal(c.light, 2);
  assert.ok(!c.player.st.doused, 'used up at the start of the turn');
  assert.equal(c.dousedTurn, c.turn);
  ch.intent = 'lash';
  E.endTurn(run);
  assert.equal(c.light, 3, 'back to full the turn after');
  // two douses stack, and the Storm Bottle's extra Light still counts
  c.player.st.doused = 2;
  run.keepsakes = ['stormbottle'];
  ch.intent = 'glut';
  while ((c.turn + 1) % 3 !== 0) { c.player.st.doused = 2; ch.intent = 'glut'; E.endTurn(run); }
  c.player.st.doused = 2;
  ch.intent = 'glut';
  E.endTurn(run);
  assert.equal(c.turn % 3, 0);
  assert.equal(c.light, 3 + 1 - 2);
});

test('Pale Gulper: Gulp swallows the last card you played this turn, and the card comes back when it dies', () => {
  const { run, c } = fight(['gulper'], { hand: ['jab', 'brace'] });
  tough(c);
  const g = c.enemies[0];
  g.intent = 'gulp';
  assert.match(E.intentInfo(run, g).parts.join('. '), /Swallow the last card you play this turn/);
  play(run, 'jab', g);
  play(run, 'brace');
  const brace = c.discard.find((x) => x.id === 'brace' && x.uid === c.lastPlayed);
  E.endTurn(run);
  assert.equal(g.st.swallowed, 1);
  assert.deepEqual(g.mem.swallowed.map((x) => x.uid), [brace.uid]);
  assert.ok(![...c.draw, ...c.hand, ...c.discard].some((x) => x.uid === brace.uid), 'out of every pile');
  // it dies, and the card is back in the discard pile
  g.hp = 1;
  c.hand.push({ uid: run.nextUid++, id: 'jab', up: 0 });
  c.light = 3;
  play(run, 'jab', g);
  assert.ok(c.won);
  assert.ok(c.discard.some((x) => x.uid === brace.uid));
});

test('Pale Gulper: nothing is swallowed if you played nothing this turn, or the last card was a Rite', () => {
  let { run, c } = fight(['gulper'], { hand: ['brace'] });
  tough(c);
  c.enemies[0].intent = 'gulp';
  E.endTurn(run);
  assert.ok(!c.enemies[0].st.swallowed);
  ({ run, c } = fight(['gulper'], { hand: ['brace', 'moonpull'] }));
  tough(c);
  c.enemies[0].intent = 'gulp';
  play(run, 'brace');
  play(run, 'moonpull');
  E.endTurn(run);
  assert.ok(!c.enemies[0].st.swallowed, 'a Rite stays in play');
  assert.equal(c.rites.length, 1);
});

test('The Tolling Buoy: Rocking Toll hits 12, +4 for each step the Swell is from 3, and 2 harder with every Toll', () => {
  const { run, c } = fight(['buoy'], { kind: 'boss' });
  const b = c.enemies[0];
  assert.equal(b.maxHp, 165);
  b.intent = 'toll';
  const dmgAt = (tide) => { c.tide = tide; return E.intentInfo(run, b).dmg; };
  assert.deepEqual([1, 2, 3, 4, 5].map(dmgAt), [20, 16, 12, 16, 20]);
  assert.match(E.intentInfo(run, b).parts.join(' '), /4 harder for each step/);
  c.tide = 3;
  c.player.ward = 0;
  let hp = run.hp;
  E.endTurn(run);
  assert.equal(run.hp, hp - 12);
  b.intent = 'toll';
  assert.equal(dmgAt(3), 14, 'the second Toll rings 2 harder');
  // it swings at the Swell you end your turn on
  c.tide = 5;
  hp = run.hp;
  E.endTurn(run);
  assert.equal(run.hp, hp - (14 + 8));
  // Haul the Chain: Ward and a douse
  b.intent = 'haul';
  c.tide = 3;
  E.endTurn(run);
  assert.equal(b.ward, 12);
  assert.equal(c.light, 2);
});

test('The Tolling Buoy: at two thirds of its health it slips its chain (15 Ward, 1 Might), and from then on rings a Wild Peal in place of Haul the Chain', () => {
  const { run, c } = fight(['buoy'], { kind: 'boss' });
  const b = c.enemies[0];
  b.intent = 'clang';
  b.hp = Math.floor(b.maxHp * BL.PIN_CALL) + 1; // 111 of 165: not yet
  c.player.ward = 99;
  E.endTurn(run);
  assert.notEqual(b.intent, 'slip');
  b.intent = 'clang';
  b.hp = Math.floor(b.maxHp * BL.PIN_CALL); // 110
  c.player.ward = 99;
  E.endTurn(run);
  assert.equal(b.intent, 'slip');
  E.endTurn(run);
  assert.deepEqual(enc(c), ['buoy'], 'nobody comes to help it');
  assert.equal(b.ward, 15);
  assert.equal(b.st.might, 1);
  assert.ok(c.fx.some((f) => f.t === 'phase'));
  // its round is now Wild Peal, Rocking Toll, Clang, Rocking Toll: no more Haul the Chain
  const seen = [];
  for (let i = 0; i < 8; i++) { seen.push(b.intent); c.player.ward = 999; b.hp = 100; E.endTurn(run); }
  assert.deepEqual(seen, ['peal', 'toll', 'clang', 'toll', 'peal', 'toll', 'clang', 'toll']);
  b.hp = 1;
  c.hand.push({ uid: run.nextUid++, id: 'jab', up: 0 });
  c.light = 3;
  play(run, 'jab', b);
  assert.ok(c.won);
  E.finishCombat(run);
  assert.equal(run.screen, 'victory');
});

test('The Wild Peal hits for 30, and each Crest or Strand you make that turn muffles it by 10; at 0 it does not hit at all', () => {
  assert.deepEqual(BL.PEAL, { dmg: 30, quiet: 10 });
  const { run, c } = fight(['buoy'], { kind: 'boss', hand: ['jab', 'jab', 'jab'] });
  const b = c.enemies[0];
  b.hp = b.maxHp = 500;
  b.mem.free = true;
  b.intent = 'peal';
  delete b.st.might;
  const shown = () => E.intentInfo(run, b).dmg;
  assert.equal(shown(), 30);
  c.light = 9;
  c.tide = 1;
  E.swellAct(run, 'bail');
  assert.equal(shown(), 20, 'one Strand: 30 - 10');
  play(run, 'jab', b); // no wave
  assert.equal(shown(), 20);
  c.swellActTurn = null;
  c.tide = 5;
  E.swellAct(run, 'stir');
  assert.equal(c.turnCrests + c.turnLows, 2);
  assert.equal(shown(), 10, 'a Strand and a Crest: 30 - 20');
  const hp = run.hp;
  c.player.ward = 0;
  E.endTurn(run);
  assert.equal(hp - run.hp, 10);
  // three waves silence it: no hit at all, so not even its Might gets through
  const f2 = fight(['buoy'], { kind: 'boss' });
  const b2 = f2.c.enemies[0];
  b2.hp = b2.maxHp = 500;
  b2.mem.free = true;
  b2.intent = 'peal';
  b2.st.might = 1;
  f2.c.turnCrests = 2;
  f2.c.turnLows = 1;
  assert.equal(E.intentInfo(f2.run, b2).dmg, 0);
  const hp2 = f2.run.hp;
  f2.c.player.ward = 0;
  E.endTurn(f2.run);
  assert.equal(f2.run.hp, hp2);
  assert.ok(!f2.c.fx.some((f) => f.t === 'dmg' && f.who === 'p'), 'no hit for 0');
});

test('Pale Gulper: at half its health it retches up two Glimmer Leeches and every card it swallowed', () => {
  assert.equal(BL.DREAD_CALL, 1 / 2);
  const { run, c } = fight(['gulper'], { hand: ['jab', 'brace'] });
  const g = c.enemies[0];
  g.hp = g.maxHp;
  g.intent = 'gulp';
  play(run, 'brace');
  const brace = c.discard.find((x) => x.uid === c.lastPlayed);
  c.player.ward = 99;
  E.endTurn(run);
  assert.equal(g.st.swallowed, 1);
  assert.notEqual(g.intent, 'retch', 'not yet: still at full health');
  g.hp = Math.floor(g.maxHp / 2);
  g.intent = 'bite';
  c.player.ward = 99;
  E.endTurn(run);
  assert.equal(g.intent, 'retch');
  assert.match(E.intentInfo(run, g).parts.join('. '), /Bring up the cards it swallowed/);
  E.endTurn(run);
  assert.deepEqual(enc(c), ['gulper', 'leech', 'leech']);
  assert.ok(c.discard.some((x) => x.uid === brace.uid), 'the Brace is back in the discard pile');
  assert.ok(!g.st.swallowed);
  assert.ok(c.fx.some((f) => f.t === 'disgorge'));
  // it goes back to Bite, Gulp and Tail Whip, and never retches twice
  const seen = [];
  for (let i = 0; i < 6; i++) { seen.push(g.intent); c.player.ward = 999; g.hp = 10; E.endTurn(run); }
  assert.ok(!seen.includes('retch'));
  assert.deepEqual([...new Set(seen)].sort(), ['bite', 'gulp', 'whip']);
});

test('The Glimmer Garden: picking the beads pays 45 Pearls, and a Glimmer Leech follows you into your next fight only', () => {
  const ev = BL.EVENTS.find((e) => e.id === 'garden');
  const run = E.newRun(3, 1);
  run.event = { id: 'garden', stage: 'choose', text: null, next: null };
  const p = run.pearls;
  E.chooseEventOption(run, ev.options.findIndex((o) => /beads/.test(o.label)));
  assert.equal(run.pearls, p + 45);
  E.backToMap(run);
  E.startCombat(run, 'easy', ['ray']);
  assert.deepEqual(enc(run.combat), ['ray', 'leech']);
  assert.ok(run.combat.enemies[1].follower);
  run.combat = null;
  E.startCombat(run, 'easy', ['ray']);
  assert.deepEqual(enc(run.combat), ['ray'], 'only the next fight');
  // reaching into the glow costs 9 HP and gives a keepsake
  const r2 = E.newRun(3, 1);
  r2.event = { id: 'garden', stage: 'choose', text: null, next: null };
  E.chooseEventOption(r2, 0);
  assert.equal(r2.hp, r2.maxHp - 9);
  assert.equal(r2.keepsakes.length, 1);
});

test('The Tide-Board offers cards that Surge or Ebb, or 5 Max HP; the Diving Bell heals 18 or offers a card', () => {
  const tb = BL.EVENTS.find((e) => e.id === 'tideboard');
  for (let seed = 1; seed <= 20; seed++) {
    const run = E.newRun(seed, 1);
    run.event = { id: 'tideboard', stage: 'choose', text: null, next: null };
    const res = E.chooseEventOption(run, 0);
    assert.equal(res.next.cards.length, 3);
    res.next.cards.forEach((id) => assert.ok(E.movesSwell(id), id));
  }
  const run = E.newRun(1, 1);
  run.event = { id: 'tideboard', stage: 'choose', text: null, next: null };
  E.chooseEventOption(run, tb.options.findIndex((o) => /line/.test(o.label)));
  assert.equal(run.maxHp, 75);
  assert.equal(run.hp, 75);
  const db = E.newRun(1, 1);
  db.hp = 30;
  db.event = { id: 'divingbell', stage: 'choose', text: null, next: null };
  E.chooseEventOption(db, 0);
  assert.equal(db.hp, 48);
  db.event = { id: 'divingbell', stage: 'choose', text: null, next: null };
  assert.equal(E.chooseEventOption(db, 1).next.cards.length, 3);
});

test('Dark Water runs are deterministic, and a fight with a Submerged enemy and a swallowed card saves and loads', () => {
  for (const seed of [2, 9]) {
    const a = E.newRun(seed, 1), b = E.newRun(seed, 1);
    playRun(a); playRun(b);
    assert.equal(snapshot(a), snapshot(b));
  }
  const { run, c } = fight(['gulper', 'ray'], { hand: ['jab', 'brace'] });
  tough(c);
  const [g, ray] = c.enemies;
  g.intent = 'gulp';
  ray.intent = 'sink';
  play(run, 'brace');
  E.endTurn(run);
  const back = saveLoad(run);
  assert.equal(back.combat.enemies[0].mem.swallowed.length, 1);
  assert.equal(back.combat.enemies[1].st.submerged, 1);
  assert.deepEqual(E.targets(back.combat).map((e) => e.id), ['gulper']);
});

test('the bot finishes whole expeditions, with and without currents, and every one that reaches Dark Water goes through the Cove at the stair', () => {
  let deeper = 0;
  [[], Object.keys(E.CURRENTS)].forEach((cur) => {
    for (let seed = 1; seed <= 40; seed++) {
      const run = E.newRun(seed, 0, null, [], cur);
      const labels = playRun(run, 8000);
      assert.ok(run.screen === 'victory' || run.screen === 'defeat', `${seed}: ${run.screen}`);
      const i = labels.indexOf('deeper');
      if (i >= 0) { deeper++; assert.equal(labels[i + 1], 'rest'); assert.ok(run.level === 1); }
      if (run.screen === 'victory') assert.ok(run.heart && run.cleared.length === 2);
    }
  });
  assert.ok(deeper > 0, 'some go deeper');
  // and a bot told to go home after the Shallows comes home without the Heart
  for (let seed = 1; seed <= 200; seed++) {
    const run = E.newRun(seed);
    playRun(run, 8000, { home: 0 });
    if (run.cleared.length) { assert.equal(run.screen, 'victory'); assert.ok(!run.heart); return; }
  }
  assert.fail('no run broke the Shallows pin');
});
