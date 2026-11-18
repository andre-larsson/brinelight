'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, saveLoad } = require('../tools/bot');
const { BL, E } = load();

function newKeeperRun(keeper, level = 0, kit = ['suit']) {
  return E.newRun(23, level, kit, [], [], true, 2, 0, { keeper });
}

function heartMeta() {
  const meta = E.newMeta();
  meta.record = { ...E.newRecord(), runs: 1, wins: 1, hearts: 1 };
  return meta;
}

test('old saves are Wren and Mateo is only selectable with the Heart and his welcome recorded', () => {
  const old = E.migrateMeta({ ...E.newMeta(), keeper: 'mateo', keepers: ['mateo'] });
  assert.equal(E.keeperId(old), 'wren');
  assert.ok(!E.keeperOpen(old, 'mateo'));
  assert.equal(E.keeperId({}), 'wren');
  assert.deepEqual(E.keeperProfile(heartMeta()), { keeper: 'wren', firstRing: false, stranger: 'mateo' });
  const m = E.migrateMeta({ ...heartMeta(), keepers: ['bad', 'mateo', 'mateo'], keeper: 'mateo' });
  assert.deepEqual(m.keepers, ['mateo']);
  assert.equal(E.keeperProfile(m).keeper, 'mateo');
  assert.equal(E.keeperProfile(m).stranger, null);
  assert.equal(E.keeperId(E.newRun(23, 0, null, [], [], false, 0, 0, { keeper: 'mateo' })), 'wren');
  assert.equal(E.cardName({ id: 'jab', up: 2 }, newKeeperRun('mateo')), 'Guarded Strike');
  assert.equal(E.cardArt({ id: 'jab' }, newKeeperRun('mateo')), 'c_mallet');
});

test('the Split Cask marks one reachable Dread on every eligible Dark Water map and survives reload', () => {
  const profile = E.keeperProfile(heartMeta());
  for (let seed = 1; seed <= 200; seed++) {
    const r = E.newRun(seed, 1, null, [], [], true, 2, 0, profile);
    const node = E.strangerAhead(r);
    assert.ok(node, `seed ${seed} must have a reachable Split Cask`);
    assert.equal(r.map.grid.flat().filter((n) => n?.stranger).length, 1);
    assert.equal(node.type, 'elite');
    assert.deepEqual(node.enc, ['splitcask']);
    const saved = saveLoad(r);
    assert.deepEqual(E.strangerAhead(saved), node);
    const parent = saved.map.grid[node.row - 1].find((p) => p?.next.includes(node.col) && p.next.length > 1);
    if (parent) {
      saved.pos = { row: parent.row, col: parent.col };
      assert.deepEqual(E.bosunClue(saved).enc, ['splitcask']);
    }
    E.enterNode(saved, E.nodeAt(saved, node));
    assert.deepEqual(saved.combat.enc, ['splitcask']);
  }
  assert.equal(E.strangerAhead(newKeeperRun('mateo', 1)), null);
});

test('the Cask gives a note on victory and unlocks Mateo once on a counted, safe return', () => {
  const meta = heartMeta();
  const r = E.newRun(9, 1, null, [], [], true, 2, 0, E.keeperProfile(meta));
  E.enterNode(r, E.strangerAhead(r));
  assert.ok(!E.storyMarks(r).includes('dread:mateo'));
  r.combat.won = true;
  E.finishCombat(r);
  assert.equal(r.rewards.stranger, 'mateo');
  assert.ok(E.storyMarks(r).includes('dread:mateo'));
  assert.equal(E.welcomeKeeper(meta, { ...r, screen: 'defeat' }), null);
  assert.equal(E.welcomeKeeper(meta, { ...r, screen: 'victory', cleared: [1], cheated: true }), null);
  assert.equal(E.welcomeKeeper(meta, { ...r, screen: 'victory' }), null);
  r.screen = 'pin';
  r.cleared = [0, 1];
  assert.ok(E.goHome(r));
  const saved = saveLoad(r);
  assert.equal(E.welcomeKeeper(meta, saved), 'mateo');
  assert.equal(E.welcomeKeeper(meta, saved), null);
  assert.ok(E.storyMarks(saved).includes('keeper:mateo'));
  assert.ok(E.keeperProfile(meta).firstRing);
});

test('Bash uses four Ward and one Swell action, once a turn even with the Bailer', () => {
  const r = newKeeperRun('mateo', 0, ['bailer']);
  const c = E.startCombat(r, 'easy', ['kelp', 'crab']);
  const [kelp, crab] = c.enemies;
  c.player.ward = 10;
  crab.st.submerged = 1;
  assert.ok(!E.bash(r, crab.uid));
  const hp = kelp.hp, light = c.light;
  assert.ok(E.bash(r, kelp.uid));
  assert.equal(kelp.hp, hp - 6);
  assert.equal(c.player.ward, 6);
  assert.equal(c.light, light);
  assert.equal(E.swellActsUsed(c), 1);
  assert.ok(!E.bash(saveLoad(r), kelp.uid));
  assert.ok(E.swellAct(r, 'stir'));
  assert.ok(!E.swellAct(r, 'bail'));
  const standard = newKeeperRun('mateo');
  const normal = E.startCombat(standard, 'easy', ['kelp']);
  normal.player.ward = 5;
  assert.ok(E.bash(standard, normal.enemies[0].uid));
  assert.ok(!E.swellAct(standard, 'stir'));
  const wren = newKeeperRun('wren');
  E.startCombat(wren, 'easy', ['kelp']).player.ward = 10;
  assert.ok(!E.canBash(wren).ok);
});

test('First Ring pays once per fight for Wren after Mateo joins', () => {
  const meta = heartMeta();
  meta.keepers = ['mateo'];
  const run = E.newRun(10, 0, ['bailer'], [], [], true, 2, 0, E.keeperProfile(meta));
  const c = E.startCombat(run, 'easy', ['kelp']);
  assert.equal(E.swellActCost(run), 0);
  assert.ok(E.swellAct(run, 'stir'));
  assert.equal(c.light, 3);
  assert.equal(E.swellActCost(saveLoad(run)), 1);
  assert.ok(E.swellAct(run, 'stir'));
  assert.equal(c.light, 2);
  E.startCombat(run, 'easy', ['kelp']);
  assert.equal(E.swellActCost(run), 0);
});

test('Mateo’s final reads remaining Ward, records its own clear, and opens a shared Spare Hoop', () => {
  const meta = heartMeta();
  meta.keepers = ['mateo'];
  const r = newKeeperRun('mateo', 2);
  const c = E.startCombat(r, 'boss');
  const hoop = c.enemies[0];
  assert.equal(hoop.id, 'lasthoop');
  assert.equal(hoop.st.shell, 1);
  c.tide = 1;
  hoop.intent = 'split';
  hoop.ward = 18;
  assert.equal(E.intentInfo(r, hoop).dmg, 36);
  assert.ok(E.swellAct(r, 'bail'));
  assert.equal(E.intentInfo(r, hoop).dmg, 18);
  c.won = true;
  E.finishCombat(r);
  assert.ok(r.quieted);
  assert.ok(E.storyMarks(r).includes('quiet:mateo'));
  assert.ok(!E.storyMarks(r).includes('quiet'));
  E.recordRun(meta, r, true);
  E.noteMusicProgress(meta, r);
  assert.equal(meta.mateoQuiets, 1);
  assert.ok(!meta.heard.includes('cue:watch'));
  assert.ok(E.unlockAchievements(meta, r).includes('lasthoop'));
  assert.ok(E.kitUnlocked(meta, 'sparehoop'));
  assert.ok(!E.kitUnlocked(meta, 'watchglass'));
  const wren = newKeeperRun('wren', 2, ['suit', 'sparehoop']);
  const fight = E.startCombat(wren, 'boss');
  assert.equal(fight.enemies[0].id, 'darkwatch');
  assert.equal(fight.player.ward, 0);
  fight.tide = 1;
  assert.ok(E.swellAct(wren, 'bail'));
  assert.equal(fight.player.ward, BL.KIT.sparehoop.firstTideWard);
  E.endTurn(wren);
  assert.equal(fight.player.ward, 0);
  fight.tide = 1;
  assert.ok(E.swellAct(wren, 'bail'));
  assert.equal(fight.player.ward, 0);
});
