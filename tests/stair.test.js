/* The stair down between levels (v0.31.0): Wren does two of five things there, each once. A Cove inside a level is
   unchanged: rest or refit.
   Run with: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('../tools/bot');

const { BL, E } = load();

/* A run on the stair down into Dark Water, with `hp` HP. */
function onStair(seed, hp, kit, currents) {
  const run = E.newRun(seed, 0, kit || null, [], currents || []);
  run.screen = 'pin';
  run.cleared = [0];
  assert.ok(E.goDeeper(run));
  if (hp != null) run.hp = hp;
  return run;
}

test('the stair down offers two of five: rest, refit, shed, a flask and the keepers\' cache, each once', () => {
  const run = onStair(21, 30);
  assert.ok(E.stairOpen(run));
  assert.deepEqual(E.STAIR_OPTIONS, ['rest', 'refit', 'shed', 'flask', 'cache']);
  assert.equal(E.STAIR_PICKS, 2);
  E.STAIR_OPTIONS.forEach((id) => assert.equal(E.stairWhy(run, id), '', id));
  const rest = E.stairDo(run, 'rest');
  assert.equal(rest.healed, 35, 'half of 70 Max HP');
  assert.equal(run.hp, 65);
  assert.equal(E.stairWhy(run, 'rest'), 'done');
  assert.equal(E.stairDo(run, 'rest'), null, 'each once');
  assert.ok(!run.restDone);
  const brace = run.deck.find((c) => c.id === 'brace');
  const n = run.deck.length;
  assert.equal(E.stairDo(run, 'shed', brace.uid).card.id, 'brace');
  assert.equal(run.deck.length, n - 1);
  assert.ok(!run.deck.some((c) => c.uid === brace.uid));
  assert.ok(run.restDone, 'both picks used');
  ['refit', 'flask', 'cache'].forEach((id) => { assert.equal(E.stairWhy(run, id), 'full'); assert.equal(E.stairDo(run, id, 0), null); });
  // the next level's map follows, and the stair is done
  E.backToMap(run);
  assert.equal(run.screen, 'map');
  assert.ok(!E.stairOpen(run));
});

test('the stair: refit upgrades a card, the flasks fill every empty tonic slot, and the cache shows 3 uncommon or rare cards until one is taken', () => {
  const run = onStair(22, 70);
  assert.equal(E.stairWhy(run, 'rest'), 'You are at full health.');
  const jab = run.deck.find((c) => c.id === 'jab');
  assert.equal(E.stairDo(run, 'refit', jab.uid).card.up, 1);
  assert.equal(jab.up, 1);
  const cache = E.stairCache(run);
  assert.equal(cache.length, 3);
  assert.equal(new Set(cache).size, 3);
  cache.forEach((id) => assert.ok(['uncommon', 'rare'].includes(BL.CARDS[id].rarity), id));
  assert.deepEqual(E.stairCache(run), cache, 'looking again shows the same three');
  const n = run.deck.length;
  assert.equal(E.stairDo(run, 'cache', 2).card.id, cache[2]);
  assert.equal(run.deck.length, n + 1);
  // a flask needs an empty slot
  const full = onStair(23, 70);
  full.tonics = ['brine', 'brine', 'brine'].map(() => Object.keys(BL.TONICS)[0]);
  assert.equal(E.stairWhy(full, 'flask'), 'Your tonic slots are full.');
  assert.equal(E.stairDo(full, 'flask'), null);
  full.tonics[1] = null;
  const f = E.stairDo(full, 'flask');
  assert.equal(f.tonics.length, 1);
  assert.ok(BL.TONICS[f.tonics[0]]);
  assert.equal(full.tonics[1], f.tonics[0]);
  // every empty slot is filled, and no two of the new tonics are alike
  for (let seed = 30; seed < 60; seed++) {
    const empty = onStair(seed, 70);
    assert.deepEqual(empty.tonics, [null, null, null]);
    const got = E.stairDo(empty, 'flask').tonics;
    assert.equal(got.length, 3);
    assert.equal(new Set(got).size, 3, 'no two alike');
    assert.deepEqual(empty.tonics, got);
  }
});

test('the stair\'s rest: 50% of Max HP, lowered in step by Cold Coves, and the Spare Wick adds 10', () => {
  assert.equal(E.stairRestAmount(onStair(24)), 35);
  assert.equal(E.stairRestAmount(onStair(24, null, null, ['cold'])), Math.floor(70 * 0.5 * (0.2 / 0.3)));
  assert.equal(E.stairRestAmount(onStair(24, null, ['wick'])), 45);
  // a Cove inside a level is unchanged: 30%, rest or refit, and no stair picks
  const cove = E.newRun(25);
  E.enterNode(cove, { row: 2, col: 0, type: 'rest' });
  assert.ok(!E.stairOpen(cove));
  assert.equal(E.restAmount(cove), 21);
  assert.equal(E.stairDo(cove, 'rest'), null);
});

test('the stair survives a save: picks made and the cache shown stay', () => {
  const run = onStair(26, 30);
  E.stairDo(run, 'rest');
  const cache = E.stairCache(run);
  const back = JSON.parse(JSON.stringify(run));
  assert.deepEqual(back.stair.picks, ['rest']);
  assert.deepEqual(E.stairCache(back), cache);
  assert.equal(E.stairWhy(back, 'rest'), 'done');
  assert.ok(E.stairDo(back, 'flask'));
  assert.ok(back.restDone);
});
