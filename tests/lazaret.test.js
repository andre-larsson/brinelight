/* The Lazaret: keepsakes kept between runs, as a stock since v0.36.0. What coming home keeps, what a fall loses,
   copies, breaking one down, choosing what to bring, how brought keepsakes count toward the Hold, and the Hold bought
   at the Workshop.
   Run with: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, saveLoad } = require('../tools/bot');

const { BL, E } = load();

const metaWith = (o) => Object.assign(E.newMeta(), o);
const wonRun = (bring, found, seed) => {
  const run = E.newRun(seed || 11, 0, null, bring);
  (found || []).forEach((k) => E.gainKeepsake(run, k));
  run.screen = 'victory';
  return run;
};

const EMPTY = { opened: false, kept: [], added: [], dupes: [], salvage: 0, home: false };
// a descent that starts as the UI starts one: the brought keepsakes leave the Lazaret
const setOff = (meta, seed) => { const run = E.newRun(seed || 8, 0, null, meta.bring); E.takeBrought(meta, run); return run; };

test('the Lazaret starts closed and empty, and the first time home opens it', () => {
  const meta = E.newMeta();
  assert.equal(E.lazaretOpen(meta), false);
  assert.deepEqual(meta.lazaret, []);
  assert.deepEqual(meta.bring, []);
  // a fall does not open it
  const lost = E.newRun(3);
  E.gainKeepsake(lost, 'moonshard');
  lost.screen = 'defeat';
  assert.deepEqual(E.storeKeepsakes(meta, lost), EMPTY);
  assert.equal(E.lazaretOpen(meta), false);
  // coming home does, even with no keepsake to keep
  const res = E.storeKeepsakes(meta, wonRun());
  assert.equal(res.opened, true);
  assert.equal(E.lazaretOpen(meta), true);
  assert.deepEqual(meta.lazaret, []);
  assert.equal(E.storeKeepsakes(meta, wonRun()).opened, false, 'it only opens once');
});

test('coming home puts a copy of every keepsake Wren carries in the Lazaret, and copies of a kind stack', () => {
  const meta = E.newMeta();
  const res = E.storeKeepsakes(meta, wonRun([], ['whaletooth', 'coralcrown', 'anchor']));
  assert.deepEqual(res.kept, ['whaletooth', 'coralcrown', 'anchor']);
  assert.deepEqual(res.added, ['whaletooth', 'coralcrown', 'anchor']);
  assert.equal(res.salvage, 0);
  // found again: a second copy, not Salvage (until v0.36.0 it became Salvage at once)
  const again = E.storeKeepsakes(meta, wonRun([], ['whaletooth', 'gullfeather']));
  assert.deepEqual(again.kept, ['gullfeather'], 'only the new kind is new');
  assert.deepEqual(again.added, ['whaletooth', 'gullfeather']);
  assert.deepEqual(again.dupes, []);
  assert.equal(meta.salvage, 0);
  assert.equal(E.lazCount(meta, 'whaletooth'), 2);
  assert.equal(E.lazCount(meta, 'anchor'), 1);
  assert.equal(E.lazCount(meta, 'moonshard'), 0);
  assert.deepEqual(E.lazKinds(meta), ['whaletooth', 'coralcrown', 'anchor', 'gullfeather']);
  // a keepsake dropped on the way is not carried, so it is not kept
  const run = E.newRun(5);
  E.gainKeepsake(run, 'moonshard');
  E.gainKeepsake(run, 'tidewatch');
  E.dropKeepsake(run, 'moonshard');
  run.screen = 'victory';
  assert.deepEqual(E.storeKeepsakes(meta, run).kept, ['tidewatch']);
  assert.equal(E.inLazaret(meta, 'moonshard'), false);
});

test('bringing a keepsake takes its copy out of the Lazaret as the descent starts; coming home puts it back', () => {
  const meta = metaWith({ lazaret: ['moonshard', 'tidewatch', 'tidewatch'], bring: ['moonshard', 'tidewatch'], lazOpen: true });
  const run = setOff(meta);
  assert.deepEqual(run.keepsakes, ['moonshard', 'tidewatch']);
  assert.deepEqual(meta.lazaret, ['tidewatch'], 'one copy of each left: the Moon Shard is out, one Tidewatch stays');
  assert.equal(run.takenOut, true);
  assert.deepEqual(E.takeBrought(meta, run), [], 'only once');
  assert.deepEqual(meta.bring, ['moonshard', 'tidewatch'], 'still chosen: it comes back if she does');
  E.gainKeepsake(run, 'anchor');
  run.screen = 'victory';
  const res = E.storeKeepsakes(meta, run);
  assert.deepEqual(res.added, ['moonshard', 'tidewatch', 'anchor']);
  assert.deepEqual(res.kept, ['moonshard', 'anchor'], 'the Moon Shard had left, so it is a kind new to the Lazaret again');
  assert.equal(E.lazCount(meta, 'tidewatch'), 2);
  assert.equal(E.lazCount(meta, 'moonshard'), 1);
  // the tutorial takes nothing out
  const tut = E.newTutorialRun();
  tut.brought = ['tidewatch'];
  assert.deepEqual(E.takeBrought(meta, tut), []);
  assert.equal(E.lazCount(meta, 'tidewatch'), 2);
});

test('a fall loses every keepsake Wren carries, the brought ones too; copies left at home stay', () => {
  const meta = metaWith({ lazaret: ['moonshard', 'moonshard', 'tidewatch'], bring: ['moonshard', 'tidewatch'], lazOpen: true });
  const run = setOff(meta);
  E.gainKeepsake(run, 'anchor');
  assert.deepEqual(E.foundKeepsakes(run), ['anchor']);
  assert.deepEqual(E.lostKeepsakes(run), ['moonshard', 'tidewatch', 'anchor']);
  assert.equal(E.wasBrought(run, 'moonshard'), true);
  assert.equal(E.wasBrought(run, 'anchor'), false);
  run.screen = 'defeat';
  assert.deepEqual(E.storeKeepsakes(meta, run), EMPTY);
  assert.deepEqual(meta.lazaret, ['moonshard'], 'the second Moon Shard stayed home');
  assert.deepEqual(meta.bring, ['moonshard'], 'the Tidewatch is gone, so it is no longer chosen');
});

test('a fall: Wren holds on to one keepsake the bell calls back, brought or found, and it goes into the Lazaret; one a fall', () => {
  const meta = metaWith({ lazOpen: true, lazaret: ['moonshard', 'anchor'], bring: ['moonshard'] });
  const run = setOff(meta);
  E.gainKeepsake(run, 'tidewatch');
  run.screen = 'defeat';
  E.storeKeepsakes(meta, run);
  assert.deepEqual(meta.lazaret, ['anchor']);
  assert.deepEqual(meta.bring, [], 'a lost kind is no longer chosen');
  assert.deepEqual(E.lostKeepsakes(run), ['moonshard', 'tidewatch']);
  assert.equal(E.keepOnFall(meta, run, 'whaletooth'), false, 'only one she carried');
  assert.equal(E.keepOnFall(meta, run, 'moonshard'), true);
  assert.deepEqual(meta.lazaret, ['anchor', 'moonshard']);
  assert.deepEqual(meta.bring, ['moonshard'], 'one she brought is chosen again');
  assert.equal(run.keptOnFall, 'moonshard');
  assert.equal(E.keepOnFall(meta, run, 'tidewatch'), false, 'one a fall');
  assert.deepEqual(meta.lazaret, ['anchor', 'moonshard']);
  // a found one is kept, and not chosen
  const m2 = metaWith({ lazOpen: true, lazaret: [] });
  const r2 = setOff(m2);
  E.gainKeepsake(r2, 'gullfeather');
  r2.screen = 'defeat';
  E.storeKeepsakes(m2, r2);
  assert.equal(E.keepOnFall(m2, r2, 'gullfeather'), true);
  assert.deepEqual([m2.lazaret, m2.bring], [['gullfeather'], []]);
  // not before the Lazaret opens, not after coming home, not in the tutorial or a debug-cheated run
  const shut = E.newMeta();
  const r3 = E.newRun(5); E.gainKeepsake(r3, 'gullfeather'); r3.screen = 'defeat';
  assert.equal(E.keepOnFall(shut, r3, 'gullfeather'), false);
  const home = wonRun([], ['gullfeather']);
  assert.equal(E.keepOnFall(metaWith({ lazOpen: true }), home, 'gullfeather'), false);
  const cheat = E.newRun(6); E.gainKeepsake(cheat, 'gullfeather'); cheat.screen = 'defeat'; cheat.cheated = true;
  assert.equal(E.keepOnFall(metaWith({ lazOpen: true }), cheat, 'gullfeather'), false);
});

test('a brought keepsake dropped or given to the sea is gone for good', () => {
  const meta = metaWith({ lazaret: ['biscuit', 'moonshard'], bring: ['biscuit', 'moonshard'], lazOpen: true });
  const run = setOff(meta);
  assert.equal(E.dropKeepsake(run, 'biscuit'), true);
  assert.deepEqual(run.keepsakes, ['moonshard']);
  run.screen = 'victory';
  const res = E.storeKeepsakes(meta, run);
  assert.deepEqual(res.added, ['moonshard']);
  assert.deepEqual(meta.lazaret, ['moonshard']);
});

test('a spare copy breaks down for Salvage, half its Roil rounded up; the last copy of a kind does not', () => {
  const meta = metaWith({ lazaret: ['whaletooth', 'coralcrown', 'whaletooth', 'whaletooth'], bring: ['whaletooth'], lazOpen: true, salvage: 5, earned: 5 });
  assert.equal(BL.KEEPSAKES.whaletooth.charge, 19);
  assert.equal(E.duplicateSalvage('whaletooth'), 10);
  assert.equal(E.duplicateSalvage('coralcrown'), 3);
  assert.equal(E.breakDown(meta, 'whaletooth'), 10);
  assert.equal(E.breakDown(meta, 'whaletooth'), 10);
  assert.equal(E.breakDown(meta, 'whaletooth'), 0, 'the last one stays');
  assert.equal(E.breakDown(meta, 'coralcrown'), 0);
  assert.equal(E.breakDown(meta, 'moonshard'), 0, 'not kept at all');
  assert.deepEqual(meta.lazaret, ['whaletooth', 'coralcrown']);
  assert.equal(meta.salvage, 25);
  assert.equal(meta.earned, 25);
  assert.deepEqual(meta.bring, ['whaletooth']);
});

test('you may bring any number of kept kinds, one of each, and only kept ones', () => {
  const all = Object.keys(BL.KEEPSAKES);
  const meta = metaWith({ lazaret: all.concat(all), lazOpen: true });
  assert.equal(E.toggleBring(metaWith({}), 'whaletooth'), false, 'not in the Lazaret');
  all.forEach((k) => assert.equal(E.toggleBring(meta, k), true));
  assert.deepEqual(meta.bring, all);
  assert.equal(E.bringCharge(meta), all.reduce((a, k) => a + BL.KEEPSAKES[k].charge, 0));
  // choosing one again leaves it at home
  E.toggleBring(meta, 'anchor');
  assert.equal(meta.bring.includes('anchor'), false);
  assert.equal(E.inLazaret(meta, 'anchor'), true);
  const run = setOff(meta, 9);
  assert.deepEqual(run.keepsakes, meta.bring);
  assert.deepEqual(run.brought, meta.bring);
  assert.equal(meta.lazaret.length, all.length * 2 - (all.length - 1), 'one copy of each brought kind left');
});

test('brought keepsakes are carried from the first landing and count toward the Hold', () => {
  const calm = E.newRun(4, 0, null, ['tidewatch', 'coralcrown']); // Roil 12 + 6 = 18, under the Shallows' Hold of 20
  assert.equal(E.charge(calm), 18);
  assert.equal(E.seepCount(calm), 0);
  const roiled = E.newRun(4, 0, null, ['whaletooth', 'moonshard', 'saltedhook']); // Roil 19 + 12 + 7 = 38 against a Hold of 20: 2 steps
  assert.deepEqual(E.roil(roiled), { steps: 2, seep: 1, thrash: 1, minnows: 0 });
  E.startCombat(roiled, 'easy', ['kelp']);
  assert.equal(roiled.combat.draw.concat(roiled.combat.hand).filter((c) => c.id === 'seep').length, 1);
  assert.equal(roiled.combat.thrash, 1);
  // the Hold doesn't change with the deepest level ever reached either (it grew from v0.22.0 to v0.30.x)
  assert.equal(E.roil(E.newRun(4, 0, null, ['whaletooth', 'moonshard', 'saltedhook'], [], false, 1)).steps, 2);
  // Scallop Charm gives its 10 Max HP from the start
  const plain = E.newRun(4);
  const charm = E.newRun(4, 0, null, ['biscuit']);
  assert.equal(charm.maxHp, plain.maxHp + 10);
  assert.equal(charm.hp, plain.hp + 10);
  // unknown ids and repeats are ignored
  assert.deepEqual(E.newRun(4, 0, null, ['nope', 'moonshard', 'moonshard']).keepsakes, ['moonshard']);
});

test('a steadier lantern: the Workshop sells the Hold in three steps of 5, for 25, 50 and 90 Salvage, for good', () => {
  assert.deepEqual(E.HOLD_UP, { step: 5, prices: [25, 50, 90] });
  const meta = metaWith({ salvage: 200 });
  assert.equal(E.metaHold(meta), 20);
  assert.equal(E.holdUpPrice(meta), 25);
  assert.equal(E.buyHoldUp(meta), true);
  assert.equal(E.metaHold(meta), 25);
  assert.equal(meta.salvage, 175);
  assert.equal(E.holdUpPrice(meta), 50);
  assert.equal(E.buyHoldUp(meta), true);
  assert.equal(E.buyHoldUp(meta), true);
  assert.equal(meta.salvage, 35);
  assert.equal(E.metaHold(meta), 35);
  assert.equal(E.holdUpPrice(meta), null, 'all three bought');
  assert.equal(E.buyHoldUp(meta), false);
  assert.equal(E.buyHoldUp(metaWith({ salvage: 24 })), false, 'too little Salvage');
  // an expedition starts with it, and its Roil steps count from it
  const run = E.newRun(4, 0, null, ['whaletooth', 'moonshard'], [], false, 0, E.holdUpOf(meta)); // Roil 31
  assert.equal(E.hold(run), 35);
  assert.equal(E.roil(run).steps, 0);
  assert.equal(E.roil(E.newRun(4, 0, null, ['whaletooth', 'moonshard'])).steps, 1, 'Roiled at the plain Hold of 20');
  // kept in lasting state, and a damaged count is cleaned
  assert.equal(E.migrateMeta({ owned: [], ach: [] }).holdUp, 0);
  assert.equal(E.migrateMeta({ owned: [], ach: [], holdUp: 7 }).holdUp, 3);
  assert.equal(E.migrateMeta({ owned: [], ach: [], holdUp: 'x' }).holdUp, 0);
});

test('bringing keepsakes never changes the map', () => {
  const a = E.newRun(321, 0, null, []);
  const b = E.newRun(321, 0, null, ['whaletooth', 'biscuit', 'moonshard']);
  assert.deepEqual(b.map, a.map);
  assert.equal(b.rng, a.rng);
});

test('a run can find a keepsake that is at home, and never one it carries', () => {
  const run = E.newRun(8, 0, null, ['moonshard']);
  const pool = E.keepsakePool(run);
  assert.equal(pool.includes('moonshard'), false);
  assert.equal(pool.length, Object.keys(BL.KEEPSAKES).filter((k) => !BL.KEEPSAKES[k].deep).length - 1);
});

test('the tutorial keeps nothing, and which keepsakes were brought survives a save', () => {
  const meta = E.newMeta();
  const tut = E.newTutorialRun();
  tut.keepsakes.push('moonshard');
  tut.screen = 'victory';
  assert.deepEqual(E.storeKeepsakes(meta, tut), EMPTY);
  assert.equal(E.lazaretOpen(meta), false);
  const m2 = metaWith({ lazaret: ['moonshard'], bring: ['moonshard'], lazOpen: true });
  const run = saveLoad(setOff(m2));
  assert.equal(run.takenOut, true);
  E.gainKeepsake(run, 'anchor');
  assert.deepEqual(E.foundKeepsakes(run), ['anchor']);
  assert.deepEqual(E.lostKeepsakes(run), ['moonshard', 'anchor']);
  // a run saved before v0.13.0 has no list: everything it carries was found
  delete run.brought;
  assert.deepEqual(E.foundKeepsakes(run), ['moonshard', 'anchor']);
});

test('a run saved before v0.36.0 (its brought keepsakes never left the Lazaret) loses only what it found, and adds no second copy', () => {
  const meta = metaWith({ lazaret: ['moonshard'], bring: ['moonshard'], lazOpen: true });
  const run = E.newRun(8, 0, null, meta.bring); // not taken out: as an old save
  E.gainKeepsake(run, 'anchor');
  assert.deepEqual(E.lostKeepsakes(run), ['anchor']);
  run.screen = 'victory';
  assert.deepEqual(E.storeKeepsakes(meta, run).added, ['anchor']);
  assert.deepEqual(meta.lazaret, ['moonshard', 'anchor']);
});

test('lasting state from before v0.13.0 gets an empty Lazaret, and a damaged one is cleaned', () => {
  const old = E.migrateMeta({ salvage: 12, earned: 40, owned: ['cork'], ach: [] });
  assert.deepEqual(old.lazaret, []);
  assert.deepEqual(old.bring, []);
  assert.equal(old.lazOpen, false);
  assert.equal(old.salvage, 12);
  const m = E.migrateMeta({ owned: [], ach: [], lazaret: ['moonshard', 'nope', 'moonshard', 'anchor'], bring: ['anchor', 'whaletooth', 'anchor'] });
  assert.deepEqual(m.lazaret, ['moonshard', 'moonshard', 'anchor'], 'copies are kept since v0.36.0');
  assert.deepEqual(m.bring, ['anchor'], 'you can only bring what is kept, one of each');
  assert.equal(m.lazOpen, true);
});

/* ---------- The logbook ---------- */
test('the logbook counts finished expeditions, those that came home, Hearts brought home and the deepest landing; the tutorial is not counted', () => {
  const meta = E.newMeta();
  assert.deepEqual(meta.record, { runs: 0, wins: 0, hearts: 0, quiets: 0, deep: null });
  const a = E.newRun(3, 0); a.floor = 6;
  E.recordRun(meta, a, false);
  assert.deepEqual(meta.record, { runs: 1, wins: 0, hearts: 0, quiets: 0, deep: { level: 0, floor: 6 } });
  const b = E.newRun(3, 0); b.floor = 8;
  E.recordRun(meta, b, true); // home after the Shallows' pin: no Heart
  assert.deepEqual(meta.record, { runs: 2, wins: 1, hearts: 0, quiets: 0, deep: { level: 0, floor: 8 } });
  // a deeper level beats any landing of a shallower one; a shallower run changes nothing
  const c = E.newRun(3, 1); c.floor = 2;
  E.recordRun(meta, c, false);
  assert.deepEqual(meta.record.deep, { level: 1, floor: 2 });
  E.recordRun(meta, b, true);
  assert.deepEqual(meta.record, { runs: 4, wins: 2, hearts: 0, quiets: 0, deep: { level: 1, floor: 2 } });
  const h = E.newRun(3, 2); h.floor = 8; h.heart = true;
  E.recordRun(meta, h, true);
  assert.deepEqual(meta.record, { runs: 5, wins: 3, hearts: 1, quiets: 0, deep: { level: 2, floor: 8 } });
  // after the Heart, beating the Belfry's final quiets it
  const q = E.newRun(3, 2, null, null, null, true); q.floor = 8; q.quieted = true;
  E.recordRun(meta, q, true);
  assert.deepEqual(meta.record, { runs: 6, wins: 4, hearts: 1, quiets: 1, deep: { level: 2, floor: 8 } });
  E.recordRun(meta, E.newTutorialRun(), true);
  assert.equal(meta.record.runs, 6);
  // lasting state from before v0.13.0 starts an empty logbook, and a damaged one is cleaned
  assert.deepEqual(E.migrateMeta({ owned: [], ach: [] }).record, { runs: 0, wins: 0, hearts: 0, quiets: 0, deep: null });
  assert.deepEqual(E.migrateMeta({ owned: [], ach: [], record: { runs: 3.7, wins: 9, hearts: 5, quiets: 0, deep: { level: 99, floor: 4 } } }).record, { runs: 3, wins: 3, hearts: 3, quiets: 0, deep: null });
});
