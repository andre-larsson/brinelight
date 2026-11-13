/* Slice C of the expedition: richer finds deeper down (keepsakes found only in Dark Water and the Belfry, offered first
   there), the Hold that grows for good with the deepest level reached, the new keepsakes and kit, and the achievements
   that unlock the kit.
   Run with: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, playRun } = require('../tools/bot');

const { BL, E } = load();

/* A fight at `level` against `enc` with `keepsakes` carried and `kit` worn; the bell is left out unless the kit has
   one, so hands stay fixed. The enemies do nothing unless `act` is set. */
function fight(enc, o = {}) {
  const run = E.newRun(o.seed || 1, o.level || 0, o.kit || null);
  if (!o.kit || !o.kit.some((id) => BL.KIT[id].place === 'bell')) run.kit.bell = null;
  (o.keepsakes || []).forEach((k) => E.gainKeepsake(run, k));
  run.hp = run.maxHp = o.hp || 999;
  E.startCombat(run, o.kind || 'easy', enc);
  const c = run.combat;
  c.discard.push(...c.hand);
  c.hand = (o.hand || []).map((id) => ({ uid: run.nextUid++, id, up: 0 }));
  if (o.tide != null) c.tide = o.tide;
  if (!o.act) E.alive(c).forEach((e) => { e.intent = 'none'; });
  c.fx.length = 0;
  return { run, c };
}
const give = (run, id) => { const card = { uid: run.nextUid++, id, up: 0 }; run.combat.hand.push(card); return card; };
const play = (run, id, target) => E.playCard(run, run.combat.hand.find((x) => x.id === id).uid, target ? target.uid : undefined);
const hush = (c) => E.alive(c).forEach((e) => { e.intent = 'none'; });
const deep = (d) => Object.keys(BL.KEEPSAKES).filter((k) => E.keepsakeDepth(k) === d);

/* ---------- Richer finds ---------- */
test('deeper keepsakes: three found from Dark Water down, three only in the Belfry, each with more Roil than any from the Shallows', () => {
  assert.deepEqual(deep(1).sort(), ['bulb', 'leechjar', 'whelk']);
  assert.deepEqual(deep(2).sort(), ['cinder', 'clapper', 'powderhorn']);
  const top = Math.max(...deep(0).map(E.chargeOf));
  deep(1).concat(deep(2)).forEach((k) => assert.ok(E.chargeOf(k) > top, k + ' stirs the aether more than any Shallows keepsake'));
  // the pool: the level's own keepsakes and the ones from above it
  const pool = (lv) => E.keepsakePool(E.newRun(3, lv)).sort();
  assert.deepEqual(pool(0), deep(0).sort());
  assert.deepEqual(pool(1), deep(0).concat(deep(1)).sort());
  assert.deepEqual(pool(2), Object.keys(BL.KEEPSAKES).sort());
});

test('below the Shallows the first keepsake of every offer is one of the level\'s own, while any are left', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const dw = E.newRun(seed, 1);
    const ch = E.keepsakeChoices(dw, 3);
    assert.equal(ch.length, 3);
    assert.equal(E.keepsakeDepth(ch[0]), 1, 'seed ' + seed);
    const bf = E.newRun(seed, 2);
    assert.equal(E.keepsakeDepth(E.keepsakeChoices(bf, 2)[0]), 2);
    // a shop in Dark Water sells one of its own
    E.genShop(dw);
    assert.equal(E.keepsakeDepth(dw.shop.keepsakes[0].id), 1);
    // the Shallows never offer a deeper one
    assert.ok(E.keepsakeChoices(E.newRun(seed, 0), 3).every((k) => !E.keepsakeDepth(k)));
  }
  // once Wren carries all of the level's own, the offer is from the rest
  const run = E.newRun(9, 1);
  deep(1).forEach((k) => E.gainKeepsake(run, k));
  assert.ok(E.keepsakeChoices(run, 3).every((k) => !E.keepsakeDepth(k)));
});

test('the offers in the Shallows are the same as before deeper keepsakes existed (same seed, same choice)', () => {
  // keepsakeChoices draws exactly as R.shuffle(pool).slice(0, n) did, so Shallows runs replay unchanged
  const run = E.newRun(77, 0);
  const copy = JSON.parse(JSON.stringify(run));
  const R = E.makeR(copy);
  assert.deepEqual(E.keepsakeChoices(run, 3), R.shuffle(deep(0).filter((k) => !E.has(copy, k))).slice(0, 3));
});

/* ---------- The Hold grows with the deepest level reached ---------- */
test('the Hold grows for good the first time Wren reaches a deeper level, at once and on later expeditions', () => {
  const run = E.newRun(11, 0, ['suit']);
  assert.equal(E.hold(run), 20);
  run.screen = 'pin';
  run.cleared = [0];
  assert.ok(E.goDeeper(run));
  assert.equal(E.hold(run), 30);
  assert.deepEqual(run.holdRose, { from: 20, to: 30 });
  const meta = E.newMeta();
  assert.equal(E.metaHold(meta), 20);
  assert.equal(E.noteReached(meta, run), true);
  assert.equal(meta.reached, 1);
  assert.equal(E.metaHold(meta), 30);
  assert.equal(E.noteReached(meta, run), false, 'only the first time');
  // the next expedition starts with it, in the Shallows
  const next = E.newRun(12, 0, null, [], [], false, meta.reached);
  assert.equal(E.hold(next), 30);
  next.screen = 'pin';
  assert.ok(E.goDeeper(next));
  assert.equal(next.holdRose, null, 'Dark Water was reached before');
  assert.equal(E.hold(next), 30);
  // a fall still counts: recordRun notes the level reached
  const fell = E.newRun(13, 2);
  fell.screen = 'defeat';
  E.recordRun(meta, fell, false);
  assert.equal(meta.reached, 2);
  assert.equal(E.metaHold(meta), 40);
  // the tutorial and debug-cheated runs count for nothing
  const m2 = E.newMeta();
  const cheat = E.newRun(1, 2);
  cheat.cheated = true;
  assert.equal(E.noteReached(m2, cheat), false);
  assert.equal(m2.reached, 0);
});

test('lasting state from before: the deepest landing in the logbook sets the Hold, and earns the pin achievements', () => {
  const m = E.migrateMeta({ salvage: 0, earned: 0, owned: ['suit'], ach: [], record: { runs: 5, wins: 2, hearts: 1, deep: { level: 2, floor: 8 } } });
  assert.equal(m.reached, 2);
  assert.equal(E.metaHold(m), 40);
  ['outofbell', 'stillwater', 'heartlight'].forEach((a) => assert.ok(m.ach.includes(a), a));
  const fresh = E.migrateMeta({ salvage: 0, earned: 0, owned: [], ach: [] });
  assert.equal(fresh.reached, 0);
  assert.deepEqual(fresh.ach, []);
  // a saved run from before v0.22.0 has no Hold of its own: it is the one for its level
  const old = E.newRun(3, 1);
  delete old.hold;
  assert.equal(E.hold(old), 30);
});

/* ---------- The new keepsakes ---------- */
test('Hollow Whelk: your Ward no longer washes away at the start of your turn', () => {
  const { run, c } = fight(['kelp'], { keepsakes: ['whelk'], hand: ['brace', 'brace'] });
  play(run, 'brace'); play(run, 'brace');
  assert.equal(c.player.ward, 10);
  E.endTurn(run);
  assert.equal(c.player.ward, 10);
  give(run, 'brace');
  play(run, 'brace');
  hush(c);
  E.endTurn(run);
  assert.equal(c.player.ward, 15, 'it builds up');
  // without it, Ward washes away
  const plain = fight(['kelp'], { hand: ['brace'] });
  play(plain.run, 'brace');
  E.endTurn(plain.run);
  assert.equal(plain.c.player.ward, 0);
});

test('Glimmer Bulb: a Strand gives 2 Light, not 1', () => {
  const { run, c } = fight(['kelp'], { keepsakes: ['bulb'], tide: 2, hand: ['slack'] });
  const light = c.light;
  play(run, 'slack'); // costs 1, Ebb 2: a Strand
  assert.equal(c.turnLows, 1);
  assert.equal(c.light, light - 1 + 2);
});

test('Leech Jar: whenever a creature dies, your Max HP rises by 2 and you heal 4; dropping it takes that Max HP back', () => {
  const { run, c } = fight(['mite', 'mite'], { keepsakes: ['leechjar'], hand: ['jab', 'jab'] });
  run.hp = 50; run.maxHp = 70;
  c.enemies[0].hp = 1;
  play(run, 'jab', c.enemies[0]);
  assert.equal(c.enemies[0].dead, true);
  assert.deepEqual([run.hp, run.maxHp], [54, 72]);
  c.enemies[1].hp = 1;
  play(run, 'jab', c.enemies[1]);
  assert.deepEqual([run.hp, run.maxHp], [58, 74]);
  E.finishCombat(run);
  E.backToMap(run);
  assert.ok(E.dropKeepsake(run, 'leechjar'));
  assert.equal(run.maxHp, 70);
});

test('Bell Clapper: the first Crest or Strand of a turn makes the next card play twice, not the card that made it', () => {
  const { run, c } = fight(['kelp'], { keepsakes: ['clapper'], tide: 4, hand: ['swell', 'brace'] });
  c.light = 5;
  const k = c.enemies[0];
  k.hp = k.maxHp = 200;
  play(run, 'swell', k); // 5 damage, Surge 2: a Crest (6 to all)
  assert.equal(c.turnCrests, 1);
  assert.equal(k.hp, 200 - 5 - 6, 'the Rising Swell that made the Crest is played once');
  assert.equal(c.echo, 1);
  play(run, 'brace');
  assert.equal(c.player.ward, 10, 'the next card is played twice');
  assert.equal(c.echo, 0);
  // a second Crest in the same turn rings nothing
  give(run, 'swell'); c.tide = 4;
  play(run, 'swell', k);
  assert.equal(c.turnCrests, 2);
  assert.equal(c.echo, 0);
});

test('Powder Horn: a creature that dies bursts for 12 on every other creature (never on you), and bursts can chain', () => {
  const { run, c } = fight(['mite', 'mite', 'mite'], { keepsakes: ['powderhorn'], hand: ['jab'] });
  const [a, b, d] = c.enemies;
  a.hp = 1; b.hp = 10; d.hp = 50;
  const hp = run.hp;
  play(run, 'jab', a);
  assert.equal(a.dead, true);
  assert.equal(b.dead, true, 'the first burst kills the second');
  assert.equal(d.hp, 50 - 12 - 12, 'and its own burst hits the third too');
  assert.equal(run.hp, hp);
});

test('Heart Cinder: 1 more Light on the 1st, 3rd, 5th... turn of each fight', () => {
  const { run, c } = fight(['kelp'], { keepsakes: ['cinder'] });
  const seen = [c.light];
  for (let i = 0; i < 4; i++) { hush(c); E.endTurn(run); seen.push(c.light); }
  assert.deepEqual(seen, [4, 3, 4, 3, 4]);
});

/* ---------- The new kit ---------- */
test('kit places: the Toggle Iron, the Harbour Bell, the Plated Dress, the Bailer and the Safety Line', () => {
  assert.deepEqual(['toggle', 'harbourbell', 'plated', 'bailer', 'line'].map((id) => BL.KIT[id].place), ['harpoon', 'bell', 'coat', 'ditty', 'ditty']);
  assert.deepEqual(['toggle', 'harbourbell', 'plated', 'bailer', 'line'].map((id) => BL.KIT[id].unlock), ['stillwater', 'outofbell', 'heartlight', 'bothends', 'closecall']);
});

test('Toggle Iron: your first Harpoon Jab of a fight applies 2 Soaked', () => {
  const { run, c } = fight(['kelp'], { kit: ['toggle'], hand: ['jab', 'jab'] });
  const k = c.enemies[0];
  play(run, 'jab', k);
  assert.equal(k.st.soaked, 2);
  play(run, 'jab', k);
  assert.equal(k.st.soaked, 2, 'only the first Jab');
});

test('Harbour Bell: a Crest or a Strand gives 3 Ward and draws nothing', () => {
  const { run, c } = fight(['kelp'], { kit: ['harbourbell'], tide: 4, hand: ['swell'] });
  c.draw.push({ uid: run.nextUid++, id: 'jab', up: 0 });
  const hand = c.hand.length;
  play(run, 'swell', c.enemies[0]);
  assert.equal(c.turnCrests, 1);
  assert.equal(c.player.ward, 3);
  assert.equal(c.hand.length, hand - 1, 'nothing drawn');
  assert.equal(E.bellDraw('harbourbell', 'low', 1), 0);
});

test('Plated Dress: it counts as the Diving Dress for the Belfry\'s stair, and gives 3 Ward at the start of each fight', () => {
  const { c } = fight(['kelp'], { kit: ['plated'] });
  assert.equal(c.player.ward, 3);
  const run = E.newRun(4, 1, ['plated']);
  assert.ok(E.wears(run, 'suit'));
  run.screen = 'pin';
  assert.ok(E.canGoDeeper(run));
  // breaking Dark Water's pin in it finds no dress
  const r2 = E.newRun(4, 1, ['plated']);
  E.startCombat(r2, 'boss', ['buoy']);
  r2.combat.won = true;
  E.finishCombat(r2);
  assert.equal(r2.screen, 'pin');
  assert.equal(r2.found, undefined);
  // it is bought, not found
  const meta = E.newMeta();
  meta.salvage = 999;
  assert.equal(E.buyKit(meta, 'plated'), false, 'locked until the Heart comes home');
  meta.ach.push('heartlight');
  assert.equal(E.buyKit(meta, 'plated'), true);
});

test('Bailer: Bail or Stir twice a turn', () => {
  const { run, c } = fight(['kelp'], { kit: ['bailer'], tide: 3 });
  c.light = 3;
  assert.ok(E.swellAct(run, 'bail'));
  assert.ok(E.swellAct(run, 'stir'));
  assert.equal(E.canSwellAct(run).ok, false);
  assert.equal(c.tide, 3);
  E.endTurn(run);
  assert.equal(E.canSwellAct(run).ok, true, 'a new turn');
  // without it, once
  const plain = fight(['kelp'], { tide: 3 });
  assert.ok(E.swellAct(plain.run, 'bail'));
  assert.equal(E.swellAct(plain.run, 'stir'), false);
});

test('Safety Line: the first time you would fall on an expedition you are left with 5 HP; the second time you fall', () => {
  const { run, c } = fight(['kelp'], { kit: ['line'], hp: 70, act: true });
  run.hp = 3;
  hush(c);
  c.enemies[0].intent = Object.keys(BL.ENEMIES.kelp.moves).find((m) => BL.ENEMIES.kelp.moves[m].dmg);
  E.endTurn(run);
  assert.equal(c.lost, false);
  assert.equal(run.hp, 5);
  assert.equal(run.lineUsed, true);
  // Brine is caught too, but only once an expedition
  run.hp = 2;
  c.player.st.brine = 5;
  hush(c);
  E.endTurn(run);
  assert.equal(c.lost, true);
  const r2 = fight(['kelp'], { kit: ['line'], hp: 70 });
  r2.run.hp = 2;
  r2.c.player.st.brine = 5;
  E.endTurn(r2.run);
  assert.equal(r2.c.lost, false);
  assert.equal(r2.run.hp, 5);
});

/* ---------- Achievements that unlock the new kit ---------- */
test('the new achievements: Both Ends, Close Call, Out of Its Bell, Still Water and The Light Returns', () => {
  const met = (r) => E.achievementsMet(r);
  const { run, c } = fight(['kelp'], { tide: 1, hand: ['slack', 'swell'] });
  c.light = 5;
  play(run, 'slack'); // a Strand
  c.tide = 5;
  play(run, 'swell', c.enemies[0]); // a Crest
  assert.ok(met(run).includes('bothends'));
  const cc = E.newRun(2);
  E.startCombat(cc, 'easy', ['kelp']);
  cc.hp = 5;
  cc.combat.won = true;
  E.finishCombat(cc);
  assert.ok(met(cc).includes('closecall'));
  const pins = E.newRun(3);
  pins.cleared = [0];
  assert.ok(met(pins).includes('outofbell') && !met(pins).includes('stillwater'));
  pins.cleared = [0, 1];
  assert.ok(met(pins).includes('stillwater'));
  pins.heart = true;
  pins.screen = 'victory';
  assert.ok(met(pins).includes('heartlight'));
  ['bothends', 'closecall', 'outofbell', 'stillwater', 'heartlight'].forEach((a) => assert.equal(E.kitFor(a).length, 1, a + ' unlocks one piece of kit'));
});

test('the bot still plays whole expeditions with the new kit and keepsakes, deterministically', () => {
  const kit = ['toggle', 'harbourbell', 'plated', 'bailer'];
  const a = E.newRun(31, 0, kit, ['whelk', 'cinder']);
  const b = E.newRun(31, 0, kit, ['whelk', 'cinder']);
  playRun(a, 12000);
  playRun(b, 12000);
  assert.ok(a.screen === 'victory' || a.screen === 'defeat');
  assert.equal(JSON.stringify(a.stats.dmgTaken), JSON.stringify(b.stats.dmgTaken));
  assert.equal(a.floor, b.floor);
});
