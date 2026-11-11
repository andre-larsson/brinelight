/* Workshop rules: Salvage from score, buying gear, packing within the depth's capacity, what each piece
   of gear does, and the achievements that unlock gear. Run with: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, snapshot, playRun } = require('../tools/bot');

const { BL, E } = load();

const metaWith = (o) => Object.assign(E.newMeta(), o);
const fightIn = (run, enc, kind) => { E.startCombat(run, kind || 'easy', enc || ['kelp']); run.combat.fx.length = 0; return run.combat; };
const win = (run) => { const c = run.combat; c.enemies.forEach((e) => { e.dead = true; }); c.won = true; E.finishCombat(run); };

test('a finished run earns 1 Salvage per 50 score, rounded down', () => {
  assert.equal(E.SALVAGE_PER_SCORE, 50);
  assert.equal(E.salvageFor(0), 0);
  assert.equal(E.salvageFor(49), 0);
  assert.equal(E.salvageFor(50), 1);
  assert.equal(E.salvageFor(1634), 32);
  const meta = E.newMeta();
  assert.equal(E.earnSalvage(meta, 1634), 32);
  E.earnSalvage(meta, 420);
  assert.equal(meta.salvage, 40);
  assert.equal(meta.earned, 40);
});

test('capacity follows the depth of the dive: Shallows 1, then 1 more per depth', () => {
  assert.deepEqual([0, 1, 2, 3].map(E.capacity), [1, 2, 3, 4]);
});

test('gear costs Salvage, is bought once, and locked gear waits for its achievement', () => {
  const meta = metaWith({ salvage: 30 });
  assert.equal(E.buyGear(meta, 'cork'), true);
  assert.equal(meta.salvage, 30 - BL.GEAR.cork.price);
  assert.deepEqual(meta.owned, ['cork']);
  assert.equal(E.buyGear(meta, 'cork'), false, 'already owned');
  meta.salvage = 100;
  assert.equal(E.gearUnlocked(meta, 'stormlens'), false);
  assert.equal(E.buyGear(meta, 'stormlens'), false, 'locked');
  meta.ach.push('threecrests');
  assert.equal(E.buyGear(meta, 'stormlens'), true);
  const poor = metaWith({ salvage: BL.GEAR.flask.price - 1 });
  assert.equal(E.buyGear(poor, 'flask'), false, 'not enough Salvage');
  // every locked piece names a real achievement, and every achievement unlocks something
  Object.values(BL.GEAR).forEach((g) => { if (g.unlock) assert.ok(BL.ACHIEVEMENTS[g.unlock], g.name); });
  Object.keys(BL.ACHIEVEMENTS).forEach((a) => assert.ok(E.gearFor(a).length > 0, a));
});

test('packing: only owned gear, up to the capacity plus 2 spaces of overburden', () => {
  assert.equal(E.OVERBURDEN_MAX, 2);
  assert.deepEqual([0, 1, 2, 3].map(E.packLimit), [3, 4, 5, 6]);
  const meta = metaWith({ owned: ['cork', 'flask', 'purse', 'whetstone'] });
  assert.equal(E.togglePack(meta, 'gorget', 0), false, 'not owned');
  assert.equal(E.togglePack(meta, 'cork', 0), true);
  assert.equal(E.overburden(meta.packed, 0), 0);
  assert.equal(E.togglePack(meta, 'whetstone', 0), true, 'the Shallows hold 1, and 2 more as overburden');
  assert.equal(E.overburden(meta.packed, 0), 2);
  assert.equal(E.togglePack(meta, 'flask', 0), false, 'past the limit');
  assert.equal(E.togglePack(meta, 'flask', 1), true, 'Dark Water holds 2, so 4 with overburden');
  assert.equal(E.overburden(meta.packed, 1), 2);
  assert.equal(E.togglePack(meta, 'whetstone', 1), true, 'unpacking always works');
  assert.deepEqual(meta.packed, ['cork', 'flask']);
  // a pack made for a deeper dive is trimmed, in order, to the limit of a shallower one
  assert.deepEqual(E.fitGear(['whetstone', 'cork', 'flask', 'purse'], 0), ['whetstone', 'cork']);
  assert.deepEqual(E.fitGear(['cork', 'flask', 'purse', 'gorget'], 0), ['cork', 'flask', 'purse']);
  assert.deepEqual(E.fitGear(['cork', 'nope', 'cork'], 0), ['cork']);
  assert.deepEqual(E.fitGear(['cork', 'flask'], 0, ['flask']), ['flask'], 'unowned gear is dropped');
  // the run itself enforces the limit too
  assert.deepEqual(E.newRun(5, 0, ['whetstone', 'cork', 'stormlens']).gear, ['whetstone', 'cork']);
});

test('overburdened: each space past the capacity costs 4 Max HP for the dive', () => {
  assert.equal(E.OVERBURDEN_HP, 4);
  const base = E.newRun(5, 0);
  const fits = E.newRun(5, 0, ['gorget']);
  assert.equal(fits.overburden, 0);
  assert.equal(fits.maxHp, base.maxHp);
  const one = E.newRun(5, 0, ['gorget', 'stormlens']);
  assert.equal(one.overburden, 1);
  assert.equal(one.maxHp, base.maxHp - E.OVERBURDEN_HP);
  assert.equal(one.hp, one.maxHp, 'you start at full health');
  const two = E.newRun(5, 0, ['whetstone', 'gorget']);
  assert.equal(two.overburden, 2);
  assert.equal(two.maxHp, base.maxHp - 2 * E.OVERBURDEN_HP);
  // Cork Vest still adds its 5 on top
  const cork = E.newRun(5, 0, ['gorget', 'cork']);
  assert.equal(cork.maxHp, base.maxHp - E.OVERBURDEN_HP + 5);
  // deeper depths hold more, so the same pack is no burden there
  assert.equal(E.newRun(5, 1, ['gorget', 'stormlens']).overburden, 0);
  // rests heal a share of the (lower) Max HP
  assert.ok(E.restAmount(one) <= E.restAmount(base));
});

test('gear changes nothing about the map, and the same seed with the same gear gives the same run', () => {
  const plain = E.newRun(42, 2);
  const geared = E.newRun(42, 2, ['flask', 'cork', 'purse']);
  assert.equal(geared.gear.length, 3);
  assert.equal(snapshot(plain.map), snapshot(geared.map));
  const a = E.newRun(42, 1, ['flask', 'gorget', 'floodchart']);
  const b = E.newRun(42, 1, ['flask', 'gorget', 'floodchart']);
  assert.deepEqual(playRun(a), playRun(b));
  assert.equal(snapshot(a), snapshot(b));
});

test('start-of-run gear: Cork Vest +5 Max HP, Coin Purse +30 Pearls, Spare Flask a tonic, Whetstone upgrades Rising Swell', () => {
  const base = E.newRun(7, 2);
  const run = E.newRun(7, 2, ['cork', 'purse', 'flask']);
  assert.equal(run.maxHp, base.maxHp + 5);
  assert.equal(run.hp, base.hp + 5);
  assert.equal(run.pearls, base.pearls + 30);
  assert.ok(BL.TONICS[run.tonics[0]], 'a tonic in the first slot');
  assert.deepEqual(base.tonics, [null, null, null]);
  const ws = E.newRun(7, 1, ['whetstone']);
  ws.deck.forEach((card) => assert.equal(card.up, card.id === 'swell' ? 1 : 0, card.id));
});

test('Flood Chart and Ebb Chart move the starting Tide by 1; with Moon Shard the Tide stays between 1 and 5', () => {
  const tideWith = (gear, keepsakes) => { const run = E.newRun(3, 0, gear); if (keepsakes) run.keepsakes.push(...keepsakes); return fightIn(run).tide; };
  assert.equal(tideWith([]), 3);
  assert.equal(tideWith(['floodchart']), 4);
  assert.equal(tideWith(['ebbchart']), 2);
  assert.equal(tideWith([], ['moonshard']), 5);
  assert.equal(tideWith(['floodchart'], ['moonshard']), 5);
  assert.equal(tideWith(['ebbchart'], ['moonshard']), 4);
});

test('Shell Gorget: start each fight with 4 Ward, which washes away on your next turn like any Ward', () => {
  const run = E.newRun(3, 0, ['gorget']);
  const c = fightIn(run);
  assert.equal(c.turn, 1);
  assert.equal(c.player.ward, 4);
  assert.equal(fightIn(E.newRun(3, 0)).player.ward, 0);
});

test('Storm Lens: Crests deal 2 more damage', () => {
  const run = E.newRun(3, 0, ['stormlens']);
  const c = fightIn(run);
  const plain = fightIn(E.newRun(3, 0));
  assert.equal(E.crestDamage(run, c, 1), E.crestDamage(E.newRun(3, 0), plain, 1) + 2);
  assert.equal(E.crestDamage(run, c, 1), 8);
  assert.equal(E.crestDamage(run, c, 2), 11);
});

test("Barnaby's Marker: the first removal at Barnaby's in a run is free and doesn't raise the next price", () => {
  const run = E.newRun(3, 0, ['marker']);
  run.pearls = 200;
  run.shop = { removed: false };
  assert.equal(E.removePrice(run), 0);
  assert.equal(E.buyRemoval(run, run.deck[0].uid), true);
  assert.equal(run.pearls, 200);
  assert.equal(run.removeCost, 75);
  run.shop = { removed: false };
  assert.equal(E.removePrice(run), 75);
  E.buyRemoval(run, run.deck[0].uid);
  assert.equal(run.pearls, 125);
  const plain = E.newRun(3, 0);
  assert.equal(E.removePrice(plain), 75);
});

test('achievements: double and triple Crest, double Low Water, 3 flawless fights, a Dread, a Dread with 12 or fewer cards', () => {
  const run = E.newRun(9, 0);
  assert.deepEqual(E.achievementsMet(run), []);
  run.stats.maxChain = 2;
  run.stats.maxLowChain = 2;
  assert.deepEqual(E.achievementsMet(run), ['twocrests', 'twolows']);
  run.stats.maxChain = 3;
  assert.ok(E.achievementsMet(run).includes('threecrests'));
  // flawless fights are counted by the engine
  const r2 = E.newRun(9, 0);
  for (let i = 0; i < 3; i++) { fightIn(r2); win(r2); r2.screen = 'map'; }
  assert.equal(r2.stats.flawless, 3);
  assert.ok(E.achievementsMet(r2).includes('untouched'));
  const r3 = E.newRun(9, 0);
  fightIn(r3); r3.combat.flags.hpLost = true; win(r3);
  assert.equal(r3.stats.flawless || 0, 0);
  // a Dread, with a lean deck and with a fat one
  const lean = E.newRun(9, 0);
  fightIn(lean, ['hulk'], 'elite'); win(lean);
  assert.deepEqual(E.achievementsMet(lean).filter((a) => a === 'dreadhunter' || a === 'travellight'), ['dreadhunter', 'travellight']);
  const fat = E.newRun(9, 0);
  ['jab', 'jab', 'jab'].forEach((id) => E.addCard(fat, id));
  assert.equal(fat.deck.length, 13);
  fightIn(fat, ['hulk'], 'elite'); win(fat);
  assert.ok(E.achievementsMet(fat).includes('dreadhunter'));
  assert.ok(!E.achievementsMet(fat).includes('travellight'));
});

test('achievements unlock once, are kept on the run for the end screen, and never come from the tutorial', () => {
  const meta = E.newMeta();
  const run = E.newRun(9, 0);
  run.stats.maxChain = 2;
  assert.deepEqual(E.unlockAchievements(meta, run), ['twocrests']);
  assert.deepEqual(E.unlockAchievements(meta, run), []);
  assert.deepEqual(meta.ach, ['twocrests']);
  assert.deepEqual(run.unlocks, ['twocrests']);
  assert.deepEqual(E.gearFor('twocrests'), ['floodchart']);
  const tut = E.newTutorialRun();
  tut.stats.maxChain = 3;
  assert.deepEqual(E.achievementsMet(tut), []);
  assert.deepEqual(E.unlockAchievements(E.newMeta(), tut), []);
});
