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
  assert.equal(E.outfitId(saved), 'gala');
  saved.keeper = 'wren';
  const profile = E.keeperProfile(saved);
  assert.equal(E.outfitId(E.newRun(9, 0, null, [], [], true, 2, 0, profile)), 'gala');
  assert.equal(E.outfitId(E.migrateMeta({ outfit: 'longjohns' })), 'ochre');
  assert.equal(E.outfitId({ outfit: 'toString' }), 'ochre');
  assert.equal(E.outfitId({}), 'ochre');
});

test('above-water outfits change the sprite while the rig and submerged art still apply', () => {
  const profile = { outfit: 'gala' };
  const kit = E.fitKit(['plated']);
  assert.equal(E.keeperArt(kit, false, 'wren', true, profile.outfit), 'wren_gala');
  assert.equal(E.keeperArt(kit, true, 'wren', true, profile.outfit), 'keeper_plated');
  assert.equal(E.keeperArt(E.fitKit(['suit']), true, 'wren', true, profile.outfit), 'keeper_suit');
  assert.equal(E.keeperArt(E.fitKit(), true, 'wren', true, profile.outfit), 'keeper_suit');
  assert.equal(E.keeperArt(kit, false, 'mateo', true, profile.outfit), 'mateo_suit');
  const run = E.newRun(9, 0, kit, [], [], true, 2, 0, profile);
  E.startCombat(run, 'easy', ['kelp']);
  assert.equal(run.kit.coat, 'plated');
  assert.equal(run.combat.player.ward, BL.KIT.plated.ward);
});
