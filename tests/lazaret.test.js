/* The Lazaret: keepsakes kept between runs. What a win keeps, what a fall loses, duplicates, choosing
   what to bring, and how brought keepsakes count toward the Hold.
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

test('the Lazaret starts closed and empty, and the first win opens it', () => {
  const meta = E.newMeta();
  assert.equal(E.lazaretOpen(meta), false);
  assert.deepEqual(meta.lazaret, []);
  assert.deepEqual(meta.bring, []);
  // a fall does not open it
  const lost = E.newRun(3);
  E.gainKeepsake(lost, 'moonshard');
  lost.screen = 'defeat';
  assert.deepEqual(E.storeKeepsakes(meta, lost), { opened: false, kept: [], dupes: [], salvage: 0 });
  assert.equal(E.lazaretOpen(meta), false);
  // a win does, even with no keepsake to keep
  const res = E.storeKeepsakes(meta, wonRun());
  assert.equal(res.opened, true);
  assert.equal(E.lazaretOpen(meta), true);
  assert.deepEqual(meta.lazaret, []);
  assert.equal(E.storeKeepsakes(meta, wonRun()).opened, false, 'it only opens once');
});

test('a win keeps every keepsake Wren carries', () => {
  const meta = E.newMeta();
  const res = E.storeKeepsakes(meta, wonRun([], ['whaletooth', 'coralcrown', 'anchor']));
  assert.deepEqual(res.kept, ['whaletooth', 'coralcrown', 'anchor']);
  assert.deepEqual(meta.lazaret, ['whaletooth', 'coralcrown', 'anchor']);
  assert.equal(res.salvage, 0);
  // a keepsake dropped on the way is not carried, so it is not kept
  const run = E.newRun(5);
  E.gainKeepsake(run, 'moonshard');
  E.gainKeepsake(run, 'tidewatch');
  E.dropKeepsake(run, 'moonshard');
  run.screen = 'victory';
  assert.deepEqual(E.storeKeepsakes(meta, run).kept, ['tidewatch']);
  assert.equal(E.inLazaret(meta, 'moonshard'), false);
});

test('the Lazaret holds one of each: a keepsake it already holds becomes Salvage, half its Roil rounded up', () => {
  const meta = metaWith({ lazaret: ['whaletooth', 'moonshard'], lazOpen: true, salvage: 5, earned: 5 });
  // Whale Tooth is found again; Moon Shard was brought from home, so it is not a duplicate
  const res = E.storeKeepsakes(meta, wonRun(['moonshard'], ['whaletooth', 'gullfeather']));
  assert.deepEqual(res.kept, ['gullfeather']);
  assert.deepEqual(res.dupes, ['whaletooth']);
  assert.equal(BL.KEEPSAKES.whaletooth.charge, 19);
  assert.equal(E.duplicateSalvage('whaletooth'), 10);
  assert.equal(E.duplicateSalvage('coralcrown'), 3);
  assert.equal(res.salvage, 10);
  assert.equal(meta.salvage, 15);
  assert.equal(meta.earned, 15);
  assert.deepEqual(meta.lazaret, ['whaletooth', 'moonshard', 'gullfeather']);
});

test('you may bring any number of kept keepsakes, and only kept ones', () => {
  const all = Object.keys(BL.KEEPSAKES);
  const meta = metaWith({ lazaret: all.slice(), lazOpen: true });
  assert.equal(E.toggleBring(metaWith({}), 'whaletooth'), false, 'not in the Lazaret');
  all.forEach((k) => assert.equal(E.toggleBring(meta, k), true));
  assert.deepEqual(meta.bring, all);
  assert.equal(E.bringCharge(meta), all.reduce((a, k) => a + BL.KEEPSAKES[k].charge, 0));
  // choosing one again leaves it at home
  E.toggleBring(meta, 'anchor');
  assert.equal(meta.bring.includes('anchor'), false);
  assert.equal(E.inLazaret(meta, 'anchor'), true);
  const run = E.newRun(9, 0, null, meta.bring);
  assert.deepEqual(run.keepsakes, meta.bring);
  assert.deepEqual(run.brought, meta.bring);
});

test('brought keepsakes are carried from the first landing and count toward the Hold', () => {
  const calm = E.newRun(4, 0, null, ['tidewatch', 'moonshard']); // Roil 12 + 8 = 20, the Shallows' Hold
  assert.equal(E.charge(calm), 20);
  assert.equal(E.seepCount(calm), 0);
  const roiled = E.newRun(4, 0, null, ['whaletooth', 'moonshard', 'saltedhook']); // Roil 19 + 8 + 7 = 34 against a Hold of 20: 2 steps
  assert.deepEqual(E.roil(roiled), { steps: 2, seep: 1, thrash: 1, minnows: 0 });
  E.startCombat(roiled, 'easy', ['kelp']);
  assert.equal(roiled.combat.draw.concat(roiled.combat.hand).filter((c) => c.id === 'seep').length, 1);
  assert.equal(roiled.combat.thrash, 1);
  // the Hold is the same deeper down: the same three are just as Roiled in Dark Water
  assert.equal(E.roil(E.newRun(4, 1, null, ['whaletooth', 'moonshard', 'saltedhook'])).steps, 2);
  // Scallop Charm gives its 10 Max HP from the start
  const plain = E.newRun(4);
  const charm = E.newRun(4, 0, null, ['biscuit']);
  assert.equal(charm.maxHp, plain.maxHp + 10);
  assert.equal(charm.hp, plain.hp + 10);
  // unknown ids and repeats are ignored
  assert.deepEqual(E.newRun(4, 0, null, ['nope', 'moonshard', 'moonshard']).keepsakes, ['moonshard']);
});

test('bringing keepsakes never changes the map', () => {
  const a = E.newRun(321, 0, null, []);
  const b = E.newRun(321, 0, null, ['whaletooth', 'biscuit', 'moonshard']);
  assert.deepEqual(b.map, a.map);
  assert.equal(b.rng, a.rng);
});

test('a fall loses the keepsakes found on that descent, and never the ones in the Lazaret', () => {
  const meta = metaWith({ lazaret: ['moonshard', 'tidewatch'], bring: ['moonshard'], lazOpen: true });
  const run = E.newRun(8, 0, null, meta.bring);
  E.gainKeepsake(run, 'anchor');
  E.gainKeepsake(run, 'gullfeather');
  assert.deepEqual(E.foundKeepsakes(run), ['anchor', 'gullfeather']);
  assert.equal(E.wasBrought(run, 'moonshard'), true);
  assert.equal(E.wasBrought(run, 'anchor'), false);
  run.screen = 'defeat';
  const res = E.storeKeepsakes(meta, run);
  assert.deepEqual(res.kept, []);
  assert.deepEqual(meta.lazaret, ['moonshard', 'tidewatch']);
  assert.deepEqual(meta.bring, ['moonshard']);
});

test('dropping a brought keepsake leaves it out of the run, and it stays in the Lazaret', () => {
  const meta = metaWith({ lazaret: ['biscuit', 'moonshard'], bring: ['biscuit', 'moonshard'], lazOpen: true });
  const run = E.newRun(8, 0, null, meta.bring);
  assert.equal(E.dropKeepsake(run, 'biscuit'), true);
  assert.deepEqual(run.keepsakes, ['moonshard']);
  run.screen = 'victory';
  const res = E.storeKeepsakes(meta, run);
  assert.deepEqual(res.kept, []);
  assert.deepEqual(res.dupes, []);
  assert.deepEqual(meta.lazaret, ['biscuit', 'moonshard']);
});

test('a run can find a keepsake that is at home, and never one it carries', () => {
  const run = E.newRun(8, 0, null, ['moonshard']);
  const pool = E.keepsakePool(run);
  assert.equal(pool.includes('moonshard'), false);
  assert.equal(pool.length, Object.keys(BL.KEEPSAKES).length - 1);
});

test('the tutorial keeps nothing, and which keepsakes were brought survives a save', () => {
  const meta = E.newMeta();
  const tut = E.newTutorialRun();
  tut.keepsakes.push('moonshard');
  tut.screen = 'victory';
  assert.deepEqual(E.storeKeepsakes(meta, tut), { opened: false, kept: [], dupes: [], salvage: 0 });
  assert.equal(E.lazaretOpen(meta), false);
  const run = saveLoad(E.newRun(8, 0, null, ['moonshard']));
  E.gainKeepsake(run, 'anchor');
  assert.deepEqual(E.foundKeepsakes(run), ['anchor']);
  // a run saved before v0.13.0 has no list: everything it carries was found
  delete run.brought;
  assert.deepEqual(E.foundKeepsakes(run), ['moonshard', 'anchor']);
});

test('lasting state from before v0.13.0 gets an empty Lazaret, and a damaged one is cleaned', () => {
  const old = E.migrateMeta({ salvage: 12, earned: 40, owned: ['cork'], ach: [] });
  assert.deepEqual(old.lazaret, []);
  assert.deepEqual(old.bring, []);
  assert.equal(old.lazOpen, false);
  assert.equal(old.salvage, 12);
  const m = E.migrateMeta({ owned: [], ach: [], lazaret: ['moonshard', 'nope', 'moonshard', 'anchor'], bring: ['anchor', 'whaletooth', 'anchor'] });
  assert.deepEqual(m.lazaret, ['moonshard', 'anchor']);
  assert.deepEqual(m.bring, ['anchor'], 'you can only bring what is kept');
  assert.equal(m.lazOpen, true);
});

/* ---------- The logbook ---------- */
test('the logbook counts finished expeditions, those that came home, Hearts brought home and the deepest landing; the tutorial is not counted', () => {
  const meta = E.newMeta();
  assert.deepEqual(meta.record, { runs: 0, wins: 0, hearts: 0, deep: null });
  const a = E.newRun(3, 0); a.floor = 6;
  E.recordRun(meta, a, false);
  assert.deepEqual(meta.record, { runs: 1, wins: 0, hearts: 0, deep: { level: 0, floor: 6 } });
  const b = E.newRun(3, 0); b.floor = 8;
  E.recordRun(meta, b, true); // home after the Shallows' pin: no Heart
  assert.deepEqual(meta.record, { runs: 2, wins: 1, hearts: 0, deep: { level: 0, floor: 8 } });
  // a deeper level beats any landing of a shallower one; a shallower run changes nothing
  const c = E.newRun(3, 1); c.floor = 2;
  E.recordRun(meta, c, false);
  assert.deepEqual(meta.record.deep, { level: 1, floor: 2 });
  E.recordRun(meta, b, true);
  assert.deepEqual(meta.record, { runs: 4, wins: 2, hearts: 0, deep: { level: 1, floor: 2 } });
  const h = E.newRun(3, 1); h.floor = 8; h.heart = true;
  E.recordRun(meta, h, true);
  assert.deepEqual(meta.record, { runs: 5, wins: 3, hearts: 1, deep: { level: 1, floor: 8 } });
  E.recordRun(meta, E.newTutorialRun(), true);
  assert.equal(meta.record.runs, 5);
  // lasting state from before v0.13.0 starts an empty logbook, and a damaged one is cleaned
  assert.deepEqual(E.migrateMeta({ owned: [], ach: [] }).record, { runs: 0, wins: 0, hearts: 0, deep: null });
  assert.deepEqual(E.migrateMeta({ owned: [], ach: [], record: { runs: 3.7, wins: 9, hearts: 5, deep: { level: 99, floor: 4 } } }).record, { runs: 3, wins: 3, hearts: 3, deep: null });
});
