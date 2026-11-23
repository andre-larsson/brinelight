'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { BL, E } = require('../tools/bot').load();
const saveLoad = (meta) => E.migrateMeta(JSON.parse(JSON.stringify(meta)));

test('outfits open from returned progress and their shore notices are acknowledged once', () => {
  const meta = E.newMeta();
  assert.deepEqual(E.unlockedOutfits(meta), ['ochre', 'harbour']);
  assert.equal(E.equipOutfit(meta, 'gala'), false);
  assert.equal(E.equipOutfit(meta, '__proto__'), false);

  const run = E.newRun(23);
  E.offerHesterJob(meta, run);
  E.enterNode(run, E.nodeAt(run, E.hesterJob(run)));
  E.chooseEventOption(run, E.eventOptions(run).length - 1);
  assert.equal(E.outfitOpen(meta, 'lamplighter'), false);
  E.deliverHesterJobs(meta, { ...run, screen: 'defeat' });
  assert.equal(E.outfitOpen(meta, 'lamplighter'), false);
  E.deliverHesterJobs(meta, { ...run, screen: 'victory', cleared: [0] });
  assert.equal(E.outfitOpen(meta, 'lamplighter'), true);

  E.recordRun(meta, { ...run, heart: true }, true);
  assert.equal(E.outfitOpen(meta, 'gala'), true);
  const mateo = { ...run, keeper: 'mateo', quieted: true, screen: 'victory' };
  E.unlockAchievements(meta, mateo);
  E.recordRun(meta, mateo, true);
  assert.equal(E.outfitOpen(meta, 'longjohns'), false);

  const watch = { ...run, quieted: true, screen: 'victory' };
  E.unlockAchievements(meta, { ...watch, cheated: true });
  assert.equal(E.outfitOpen(meta, 'longjohns'), false, 'an uncounted win leaves the recorded clears unchanged');
  E.unlockAchievements(meta, watch);
  E.recordRun(meta, watch, true);
  assert.equal(E.outfitOpen(meta, 'longjohns'), true);
  const earned = ['outfit:lamplighter', 'outfit:gala', 'outfit:longjohns'];
  assert.deepEqual(E.featureNews(meta).filter((id) => id.startsWith('outfit:')), earned);
  assert.deepEqual(E.featureNews(saveLoad(meta)).filter((id) => id.startsWith('outfit:')), earned);
  E.tellFeatures(meta, earned);
  assert.ok(E.featureNews(saveLoad(meta)).every((id) => !id.startsWith('outfit:')));
});

test('the Shell Bikini opens on Wren’s safe return after breaking the Shallows pin', () => {
  const meta = E.newMeta();
  const run = E.newRun(23);
  E.startCombat(run, 'boss');
  run.combat.won = true;
  E.finishCombat(run);
  E.unlockAchievements(meta, run);
  assert.equal(E.outfitOpen(meta, 'shells'), false, 'breaking the pin alone does not bring the shells home');
  assert.ok(E.goDeeper(run));
  E.recordRun(meta, { ...run, screen: 'defeat' }, false);
  assert.equal(E.outfitOpen(meta, 'shells'), false, 'a fall in Dark Water loses the shells');

  E.startCombat(run, 'boss');
  run.combat.won = true;
  E.finishCombat(run);
  assert.ok(E.goHome(run));
  E.recordRun(meta, { ...run, keeper: 'mateo' }, true);
  E.recordRun(meta, { ...run, cheated: true }, true);
  E.recordRun(meta, { ...run, cleared: [1] }, true);
  assert.equal(E.outfitOpen(saveLoad(meta), 'shells'), false);

  E.recordRun(meta, run, true);
  const saved = saveLoad(meta);
  assert.ok(E.outfitOpen(saved, 'shells'), 'a safe return from deeper down brings back the Shallows shells');
  assert.ok(E.equipOutfit(saved, 'shells'));
  assert.ok(E.featureNews(saved).includes('outfit:shells'));
  E.tellFeatures(saved, ['outfit:shells']);
  assert.equal(E.outfitId(saveLoad(saved)), 'shells');
  assert.ok(!E.featureNews(saveLoad(saved)).includes('outfit:shells'));
});

test('the Shell Bikini recognizes older Shallows homecomings', () => {
  const priorWin = E.migrateMeta({ ach: ['outofbell'], record: { runs: 2, wins: 1 } });
  assert.ok(E.featureNews(priorWin).includes('outfit:shells'));
  const priorFall = E.migrateMeta({ ach: ['outofbell'], record: { runs: 2, wins: 0 } });
  assert.equal(E.outfitOpen(priorFall, 'shells'), false);
});

test('a saved debug outfit grant applies to known outfits without earning progression', () => {
  const meta = E.newMeta();
  meta.debugOutfits = [...Object.keys(BL.OUTFITS), 'unknown', 'gala'];
  assert.ok(E.equipOutfit(meta, 'longjohns'));
  const saved = saveLoad(meta);
  assert.deepEqual(E.unlockedOutfits(saved), Object.keys(BL.OUTFITS));
  assert.deepEqual(saved.debugOutfits, Object.keys(BL.OUTFITS));
  assert.equal(E.outfitId(saved), 'longjohns');
  assert.equal(E.outfitOpen(saved, 'toString'), false);
  assert.equal(E.heartIsHome(saved), false);
  assert.deepEqual(saved.record, E.newRecord());
  assert.deepEqual(E.unlockedOutfits(E.migrateMeta({ debugOutfits: 'true' })), ['ochre', 'harbour']);
});

test('past clears qualify and the outfit choice is saved for Wren', () => {
  const legacy = E.migrateMeta({ hesterDone: true, record: { runs: 4, wins: 3, hearts: 1, quiets: 1 }, ach: ['longwatch'] });
  assert.deepEqual(E.unlockedOutfits(legacy), Object.keys(BL.OUTFITS));
  assert.equal(E.outfitId(legacy), 'ochre');
  assert.ok(E.equipOutfit(legacy, 'gala'));
  const saved = saveLoad(legacy);
  assert.equal(E.outfitId(saved), 'gala');
  saved.keepers.push('mateo');
  saved.keeper = 'mateo';
  assert.equal(E.equipOutfit(saved, 'longjohns'), false);
  assert.equal(E.outfitId(saved), null, 'Mateo has no outfits');
  assert.equal(E.keeperProfile(saved).outfit, null);
  saved.keeper = 'wren';
  assert.equal(E.outfitId(saved), 'gala', 'her choice is kept while he goes down');
  const profile = E.keeperProfile(saved);
  assert.equal(E.outfitId(E.newRun(9, 0, null, [], [], true, 2, 0, profile)), 'gala');
  // a save from before v0.61.0 kept only Wren's, as `outfit`
  const old = E.migrateMeta({ outfit: 'harbour' });
  assert.deepEqual(old.outfits, { wren: 'harbour' });
  assert.ok(!('outfit' in old));
  assert.equal(E.outfitId(E.migrateMeta({ outfit: 'longjohns' })), 'ochre');
  assert.deepEqual(E.migrateMeta({ outfits: { wren: 'longjohns', mateo: 'gala', toString: 'gala' } }).outfits, {}, 'a locked outfit, another keeper’s and an unknown keeper are dropped');
  assert.equal(E.outfitId({ outfit: 'toString' }), 'ochre');
  assert.equal(E.outfitId({}), 'ochre');
});

test('an outfit shows on land with any kit, the dive picture shows under the sea, and the kit still works', () => {
  const profile = { outfit: 'gala' };
  const kit = E.fitKit(['plated']);
  assert.equal(E.keeperArt({ outfit: 'gala', kit }, { combat: true }), 'wren_gala');
  assert.equal(E.keeperArt({ outfit: 'gala', kit }, { under: true, combat: true }), 'keeper_suit');
  assert.equal(E.keeperArt({ outfit: 'gala', kit: E.fitKit() }, { under: true, combat: true }), 'keeper_suit');
  assert.equal(E.keeperArt({ keeper: 'mateo', outfit: 'gala', kit }, { under: true, combat: true }), 'mateo_suit');
  const run = E.newRun(9, 0, kit, [], [], true, 2, 0, profile);
  E.startCombat(run, 'easy', ['kelp']);
  assert.equal(run.kit.coat, 'plated');
  assert.equal(run.combat.player.ward, BL.KIT.plated.ward);
});
