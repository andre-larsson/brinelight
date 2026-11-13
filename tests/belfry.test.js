/* The Belfry and slice B of the expedition: the Shallows' new pin (the Harbour Hermit, In its Bell), the Belfry's
   creatures (Echo, Breathless, Burst), the Bellwether's second form (the Thing in the Bell, the Heart's light), the
   diving dress that opens the Belfry, and the finals after the Heart has come home.
   Run with: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('../tools/bot');

const { BL, E } = load();

/* A fight in the Belfry (or the level given) against `enc`; the bell is left out so hands stay fixed. */
function fight(enc, o = {}) {
  const run = E.newRun(o.seed || 1, o.level == null ? 2 : o.level, null, null, null, o.heartHome);
  run.kit.bell = null;
  E.startCombat(run, o.kind || 'easy', enc);
  const c = run.combat;
  c.discard.push(...c.hand);
  c.hand = (o.hand || []).map((id) => ({ uid: run.nextUid++, id, up: 0 }));
  if (o.tide != null) c.tide = o.tide;
  c.fx.length = 0;
  return { run, c };
}
const give = (run, id) => { const card = { uid: run.nextUid++, id, up: 0 }; run.combat.hand.push(card); return card; };
const play = (run, id, target) => E.playCard(run, run.combat.hand.find((x) => x.id === id).uid, target ? target.uid : undefined);
const ids = (c) => E.alive(c).map((e) => e.id);
const quiet = (c) => E.alive(c).forEach((e) => { e.intent = 'none'; });
const safe = (run) => { run.hp = run.maxHp = 999; };

/* ---------- The Shallows' pin ---------- */
test('the Harbour Hermit: In its Bell, its Ward stays from turn to turn, and a Crest or a Strand shakes it all out', () => {
  assert.deepEqual(BL.BANDS.shallows.enc.boss, [['harbour']]);
  let { run, c } = fight(['harbour'], { kind: 'boss', level: 0 });
  safe(run);
  const h = c.enemies[0];
  assert.equal(h.maxHp, 150);
  assert.equal(h.st.belled, 1);
  assert.equal(h.intent, 'withdraw');
  E.endTurn(run);
  assert.equal(h.ward, 20);
  E.endTurn(run); // Pinch: its Ward does not wash away
  assert.equal(h.ward, 20);
  // a Crest knocks it out of the bell before the wave lands, so the wave hits its HP
  c.tide = 5;
  give(run, 'stormsurge');
  c.light = 3;
  const hp = h.hp;
  play(run, 'stormsurge');
  const crest = c.fx.find((f) => f.t === 'crest');
  assert.deepEqual(crest.stripped, [{ who: h.uid, n: 20 }]);
  assert.equal(h.ward, 0);
  assert.equal(h.hp, hp - c.fx.filter((f) => f.t === 'crest').reduce((a, f) => a + f.n, 0), 'every wave hits its HP');
  // a Strand strips it too
  ({ run, c } = fight(['harbour'], { kind: 'boss', level: 0 }));
  c.enemies[0].ward = 20;
  c.tide = 1;
  give(run, 'slack');
  c.light = 3;
  play(run, 'slack');
  assert.equal(c.enemies[0].ward, 0);
});

test('the Harbour Hermit pulls in, pinches and crushes, each Bell Crush 3 harder; at two thirds of its health it rings the harbour bell once', () => {
  const { run, c } = fight(['harbour'], { kind: 'boss', level: 0 });
  safe(run);
  const h = c.enemies[0];
  const seen = [];
  const crush = [];
  for (let i = 0; i < 10; i++) {
    seen.push(h.intent);
    if (h.intent === 'crush') crush.push(E.intentInfo(run, h).dmg);
    c.player.ward = 0;
    h.ward = 0;
    E.endTurn(run);
  }
  assert.deepEqual(seen, ['withdraw', 'pinch', 'crush', 'pinch', 'crush', 'withdraw', 'pinch', 'crush', 'pinch', 'crush']);
  assert.deepEqual(crush, [15, 18, 21, 24]);
  // hurt to two thirds: it rings once, two mites drop off the bell, and it gains 1 Might
  h.hp = Math.floor(h.maxHp * BL.PIN_CALL);
  E.endTurn(run);
  assert.equal(h.intent, 'ring');
  E.endTurn(run);
  assert.deepEqual(ids(c).sort(), ['harbour', 'mite', 'mite']);
  assert.equal(h.st.might, 1);
  assert.ok(c.fx.some((f) => f.t === 'phase'));
  E.endTurn(run);
  assert.notEqual(h.intent, 'ring', 'only once');
});

/* ---------- The Belfry's creatures ---------- */
test('Echo on a creature: its next move happens twice; a Drowned Ringer echoes everyone, a Bell Jelly one other', () => {
  let { run, c } = fight(['ringer', 'kelp'], { kind: 'elite' });
  safe(run);
  const [ringer, kelp] = c.enemies;
  ringer.intent = 'ring';
  kelp.intent = 'none';
  E.endTurn(run);
  assert.equal(ringer.st.echo, 1);
  assert.equal(kelp.st.echo, 1);
  const info = E.intentInfo(run, ringer); // Boathook, twice
  assert.ok(info.echo);
  assert.equal(info.hits, 2);
  // the echoed move happens twice, then the echo is gone
  ringer.intent = 'hook';
  kelp.intent = 'none';
  c.player.ward = 0;
  let hp = run.hp;
  E.endTurn(run);
  assert.equal(hp - run.hp, 20);
  assert.ok(c.fx.some((f) => f.t === 'echo' && f.who === ringer.uid));
  assert.ok(!ringer.st.echo);
  hp = run.hp;
  ringer.intent = 'hook';
  kelp.intent = 'none';
  c.player.ward = 0;
  E.endTurn(run);
  assert.equal(hp - run.hp, 10);
  // a Bell Jelly's Chime echoes one other creature (itself only when it is alone)
  ({ run, c } = fight(['belljelly', 'spawn']));
  safe(run);
  c.enemies[0].intent = 'chime';
  c.enemies[1].intent = 'none';
  E.endTurn(run);
  assert.ok(!c.enemies[0].st.echo);
  assert.equal(c.enemies[1].st.echo, 1);
});

test('Breathless: you draw that many fewer cards at the start of your next turn, never fewer than 1', () => {
  const { run, c } = fight(['spawn']);
  safe(run);
  const s = c.enemies[0];
  s.hp = s.maxHp = 500;
  s.intent = 'squeeze';
  E.endTurn(run);
  assert.equal(c.hand.length, 4);
  assert.equal(c.breathlessTurn, c.turn);
  assert.ok(!c.player.st.breathless, 'used up');
  s.intent = 'none';
  E.endTurn(run);
  assert.equal(c.hand.length, 5);
  c.player.st.breathless = 9;
  s.intent = 'none';
  E.endTurn(run);
  assert.equal(c.hand.length, 1);
  // a Crowned Oarfish's Coil takes 1 too, with a heavier hit
  const o = fight(['oarfish'], { kind: 'elite' });
  safe(o.run);
  o.c.enemies[0].intent = 'coil';
  E.endTurn(o.run);
  assert.equal(o.c.hand.length, 4);
});

test('Burst: a Glimmer Bladder bursts when it dies, 8 to you (Ward stops it) and to every other creature', () => {
  assert.equal(BL.BURST, 8);
  const { run, c } = fight(['bladder', 'spawn', 'minnow'], { hand: ['jab'] });
  safe(run);
  const [b, s, m] = c.enemies;
  assert.equal(b.st.burst, 8);
  b.hp = 1;
  s.hp = 20;
  m.hp = 5;
  c.player.ward = 3;
  c.light = 3;
  const hp = run.hp;
  play(run, 'jab', b);
  assert.ok(b.dead);
  assert.equal(hp - run.hp, 5);
  assert.equal(c.player.ward, 0);
  assert.equal(s.hp, 12);
  assert.ok(m.dead, 'the burst kills what it can');
  assert.ok(c.fx.some((f) => f.t === 'burst' && f.n === 8));
});

/* ---------- The Bellwether, and the thing that grew into it ---------- */
test('the Bellwether does not die: its bronze breaks, the Thing in the Bell comes out with two arms, and the Heart heals you and burns in your lantern', () => {
  assert.deepEqual(BL.BANDS.belfry.enc.boss, [['bell']]);
  assert.deepEqual(BL.HEART_RISE, { heal: 0.3, light: 1 });
  const { run, c } = fight(['bell'], { kind: 'boss', hand: ['jab'] });
  run.maxHp = 80;
  run.hp = 20;
  const bell = c.enemies[0];
  assert.equal(bell.maxHp, 160);
  bell.hp = 1;
  c.light = 3;
  play(run, 'jab', bell);
  assert.ok(!c.won);
  assert.equal(bell.id, 'bellthing');
  assert.equal(bell.name, 'The Thing in the Bell');
  assert.equal(bell.hp, 150);
  assert.equal(bell.maxHp, 150);
  assert.deepEqual(ids(c), ['bellthing', 'arm', 'arm']);
  assert.equal(run.hp, 20 + 24, '30% of max HP');
  assert.equal(c.player.st.heartfire, 1);
  assert.equal(c.risen, 1);
  assert.ok(c.fx.some((f) => f.t === 'rise' && f.from === 'bell'));
  // risen in your turn, it shows its first move at once: Drink the Light
  assert.equal(bell.intent, 'drink');
  // Heartfire: 1 more Light at the start of every turn, for the rest of the fight
  quiet(c);
  E.endTurn(run);
  assert.equal(c.light, c.maxLight + 1);
  // killing the Thing wins the fight, and the Heart comes home
  bell.hp = 1;
  give(run, 'jab');
  play(run, 'jab', bell);
  assert.ok(c.won);
  assert.equal(E.alive(c).length, 0, 'its arms go with it');
  E.finishCombat(run);
  assert.equal(run.screen, 'victory');
  assert.ok(run.heart);
});

test('the Bellwether rising in the enemies\' turn loses the rest of its move and waits for its next turn to act', () => {
  const { run, c } = fight(['bell'], { kind: 'boss' });
  run.maxHp = 80;
  run.hp = 50;
  const bell = c.enemies[0];
  bell.hp = 2;
  bell.intent = 'clapper'; // 7 twice: your Spines break the bronze on the first hit, and the second never comes
  c.player.st.spines = 3;
  E.endTurn(run);
  assert.equal(bell.id, 'bellthing');
  assert.ok(!c.won && !c.lost);
  assert.equal(run.hp, 50 - 7 + 24);
  // its arms came out after the enemies' order was set, so the first to act is the Thing, next turn: Drink the Light
  assert.equal(bell.intent, 'drink');
  assert.deepEqual(ids(c), ['bellthing', 'arm', 'arm']);
  assert.ok(E.alive(c).every((e) => e.intent), 'everyone shows a move for the next turn');
});

test('the Thing in the Bell drinks from your lantern through its arms, opens its eye, glares, and grows its arms back', () => {
  const { run, c } = fight(['bellthing', 'arm', 'arm'], { kind: 'boss' });
  safe(run);
  const [t, a1, a2] = c.enemies;
  assert.equal(t.intent, 'drink');
  a1.intent = 'none';
  a2.intent = 'none';
  E.endTurn(run);
  assert.equal(c.light, c.maxLight - 2, 'Doused 1 for each arm');
  assert.equal(c.dousedTurn, c.turn);
  // the eye opens: Soaked 2 on itself, and 8 Ward
  assert.equal(t.intent, 'eye');
  quiet(c);
  t.intent = 'eye';
  E.endTurn(run);
  assert.equal(t.ward, 8);
  assert.ok(t.st.soaked >= 1);
  assert.equal(t.intent, 'glare');
  assert.equal(E.intentInfo(run, t).dmg, 24);
  // cut one arm: it drinks 1 less; Reach grows it back
  a1.hp = 0;
  a1.dead = true;
  quiet(c);
  t.intent = 'drink';
  E.endTurn(run);
  assert.equal(c.light, c.maxLight - 1);
  quiet(c);
  t.intent = 'reach';
  E.endTurn(run);
  assert.equal(ids(c).filter((id) => id === 'arm').length, 2);
  assert.equal(t.ward, 12);
  // no arms, no dousing
  E.alive(c).filter((e) => e.id === 'arm').forEach((e) => { e.hp = 0; e.dead = true; });
  quiet(c);
  t.intent = 'drink';
  E.endTurn(run);
  assert.equal(c.light, c.maxLight);
});

/* ---------- The diving dress ---------- */
test('the diving dress: not for sale; found above the Belfry\'s stair and carried home; it goes in the Coat place and does nothing in a fight', () => {
  const g = BL.KIT.suit;
  assert.equal(g.place, 'coat');
  assert.ok(g.found);
  const meta = E.newMeta();
  meta.salvage = 9999;
  assert.equal(E.kitUnlocked(meta, 'suit'), false);
  assert.equal(E.buyKit(meta, 'suit'), false);
  assert.equal(meta.salvage, 9999);
  // Dark Water's pin without the dress: it is found, and going home carries it home
  const run = E.newRun(5, 1);
  run.floor = 8;
  E.startCombat(run, 'boss');
  run.combat.enemies.forEach((e) => { e.dead = true; e.hp = 0; });
  run.combat.won = true;
  E.finishCombat(run);
  assert.equal(run.found, 'suit');
  const fell = JSON.parse(JSON.stringify(run));
  fell.screen = 'defeat';
  assert.deepEqual(E.carryHome(meta, fell).found, [], 'a fall carries nothing home');
  assert.ok(E.goHome(run));
  const res = E.carryHome(meta, run);
  assert.deepEqual(res.found, ['suit']);
  assert.ok(E.ownsKit(meta, 'suit') && E.kitUnlocked(meta, 'suit'));
  assert.deepEqual(E.carryHome(meta, run).found, [], 'only once');
  // worn, it opens the stair; it takes the Coat place, and changes nothing else
  const worn = E.newRun(5, 0, { coat: 'suit' });
  const bare = E.newRun(5, 0);
  assert.ok(E.hasKit(worn, 'suit'));
  E.startCombat(worn, 'easy', ['kelp']);
  E.startCombat(bare, 'easy', ['kelp']);
  assert.deepEqual([worn.combat.maxLight, worn.combat.hand.length, worn.maxHp], [bare.combat.maxLight, bare.combat.hand.length, bare.maxHp]);
});

/* ---------- After the Heart ---------- */
test('after the Heart has come home, the Belfry\'s last landing is one of its finals, and beating it quiets the Belfry', () => {
  assert.deepEqual(BL.BANDS.belfry.enc.finals, [['thing', 'arm', 'arm'], ['cantor']]);
  const seen = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const run = E.newRun(seed, 2, null, null, null, true);
    assert.ok(run.heartHome);
    E.startCombat(run, 'boss');
    seen.add(run.combat.enc.join('+'));
    // the Shallows and Dark Water keep their pins
    const top = E.newRun(seed, 0, null, null, null, true);
    E.startCombat(top, 'boss');
    assert.deepEqual(top.combat.enc, ['harbour']);
  }
  assert.deepEqual([...seen].sort(), ['cantor', 'thing+arm+arm']);
  const run = E.newRun(3, 2, null, null, null, true);
  run.floor = 8;
  E.startCombat(run, 'boss');
  run.combat.enemies.forEach((e) => { e.dead = true; e.hp = 0; });
  run.combat.won = true;
  E.finishCombat(run);
  assert.equal(run.screen, 'victory');
  assert.ok(run.quieted && !run.heart);
  assert.ok(E.storyMarks(run).includes('quiet') && !E.storyMarks(run).includes('heart'));
  const meta = E.newMeta();
  assert.equal(E.heartIsHome(meta), false);
  meta.record.hearts = 1;
  assert.ok(E.heartIsHome(meta));
});

test('the Drowned Cantor leads the peal (everyone echoes), tolls 2 harder each time, and calls one Drowned Ringer of its choir', () => {
  const { run, c } = fight(['cantor'], { kind: 'boss', heartHome: true });
  safe(run);
  const [cantor] = c.enemies;
  assert.equal(cantor.maxHp, 160);
  assert.equal(cantor.intent, 'lead');
  E.endTurn(run);
  assert.equal(cantor.ward, 12);
  assert.equal(cantor.st.echo, 1);
  assert.equal(cantor.intent, 'toll');
  // echoed, the Toll rings twice at 10; the next one is 12
  c.player.ward = 0;
  let hp = run.hp;
  E.endTurn(run);
  assert.equal(hp - run.hp, 20);
  assert.equal(E.intentInfo(run, cantor).dmg, 12);
  hp = run.hp;
  c.player.ward = 0;
  E.endTurn(run);
  assert.equal(hp - run.hp, 12);
  // Call the Choir: one Drowned Ringer comes, and no second while it lives
  assert.equal(cantor.intent, 'call');
  E.endTurn(run);
  assert.deepEqual(ids(c), ['cantor', 'ringer']);
  E.alive(c)[1].intent = 'none';
  cantor.intent = 'call';
  E.endTurn(run);
  assert.deepEqual(ids(c), ['cantor', 'ringer']);
  // the next Lead the Peal echoes the Ringer too
  E.alive(c)[1].intent = 'none';
  cantor.intent = 'lead';
  E.endTurn(run);
  E.alive(c).forEach((e) => assert.equal(e.st.echo, 1, e.id));
  // silence the Cantor and the choir stops
  cantor.hp = 1;
  cantor.ward = 0;
  give(run, 'jab');
  c.light = 3;
  play(run, 'jab', cantor);
  assert.ok(c.won);
  assert.equal(E.alive(c).length, 0);
});

/* ---------- The Belfry's Fog ---------- */
test('the Belfry\'s Fog: the Lost Lanterns, the Glow under the Bell (which knows if the Heart is home) and the Bell-Rope', () => {
  assert.deepEqual(BL.BANDS.belfry.events, ['lanterns', 'heartglow', 'rope', 'shrine', 'garden']);
  const ev = (id) => BL.EVENTS.find((x) => x.id === id);
  const choose = (id, i, heartHome) => {
    const r = E.newRun(3, 2, null, null, null, heartHome);
    r.event = { id, stage: 'choose', text: null, next: null };
    r.hp = 40;
    const pearls = r.pearls, maxHp = r.maxHp, ks = r.keepsakes.length;
    E.chooseEventOption(r, i);
    return { r, pearls, maxHp, ks };
  };
  let x = choose('lanterns', 0);
  assert.equal(x.r.hp, 34);
  assert.equal(x.r.deck.filter((cd) => cd.up).length, 3);
  x = choose('lanterns', 1);
  assert.equal(x.r.pearls, x.pearls + 60);
  x = choose('heartglow', 0);
  assert.equal(x.r.hp, 65);
  x = choose('heartglow', 1);
  assert.equal(x.r.maxHp, x.maxHp + 6);
  assert.match(ev('heartglow').text({ heartHome: false }), /the Lantern Heart/);
  assert.match(ev('heartglow').text({ heartHome: true }), /stayed behind/);
  x = choose('rope', 0);
  assert.equal(x.r.hp, 32);
  assert.equal(x.r.event.next.cards.length, 3);
  x = choose('rope', 1);
  assert.equal(x.r.keepsakes.length, x.ks + 1);
  assert.deepEqual(x.r.followers, ['minnow', 'minnow']);
});

test('the numbers the README gives for the Belfry, its finals and the Harbour Hermit', () => {
  const M = (id) => BL.ENEMIES[id].moves;
  const hp = (id) => BL.ENEMIES[id].hp;
  const stub = { mem: {} };
  // the Harbour Hermit
  assert.deepEqual(hp('harbour'), [150, 150]);
  assert.deepEqual([M('harbour').withdraw.ward, M('harbour').pinch.dmg, M('harbour').pinch.hits, M('harbour').crush.dmg(stub)], [20, 6, 2, 15]);
  assert.deepEqual([M('harbour').ring.summon, M('harbour').ring.buff], [['mite', 'mite'], { might: 1 }]);
  // the Belfry's creatures and Dreads
  assert.equal(M('belljelly').chime.echoOne, true);
  assert.deepEqual([M('spawn').squeeze.debuff, M('arm').grip.debuff], [{ breathless: 1 }, { breathless: 1 }]);
  assert.deepEqual([M('ringer').ring.ward, M('ringer').ring.echoAll], [8, true]);
  assert.deepEqual(BL.BANDS.belfry.enc.elite, [['ringer', 'minnow'], ['oarfish'], ['chain']]);
  const oar = E.newRun(1, 2);
  E.startCombat(oar, 'elite', ['oarfish']);
  assert.equal(oar.combat.enemies[0].st.spines, 2);
  assert.deepEqual([M('oarfish').coil.dmg, M('oarfish').coil.debuff, M('oarfish').lash.dmg, M('oarfish').lash.hits, M('oarfish').ram.dmg], [6, { breathless: 1 }, 3, 4, 13]);
  // the Bellwether and its second form
  assert.deepEqual([hp('bell'), hp('bellthing')], [[160, 160], [150, 150]]);
  assert.deepEqual([M('bellthing').eye.expose, M('bellthing').eye.ward, M('bellthing').glare.dmg, M('bellthing').reach.grow, M('bellthing').reach.ward], [2, 8, 24, { id: 'arm', max: 2 }, 12]);
  // the finals
  assert.deepEqual([hp('thing'), hp('cantor')], [[170, 170], [160, 160]]);
  assert.deepEqual([M('cantor').lead.ward, M('cantor').lead.echoAll, M('cantor').toll.dmg(stub), M('cantor').call.grow], [12, true, 10, { id: 'ringer', max: 1 }]);
  // the kit: 15 pieces plus the Brass Tide-Bell, one of them found
  assert.equal(Object.keys(BL.KIT).filter((id) => !BL.KIT[id].starter).length, 15);
  assert.deepEqual(Object.keys(BL.KIT).filter((id) => BL.KIT[id].found), ['suit']);
});
