/* The stair down between levels (v0.31.0): Wren does two of six things there (five until v0.35.0), each once. A Cove
   inside a level is one thing: rest, refit, or give a keepsake to the sea (v0.35.0).
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

test('the stair down offers two of six: rest, refit, shed, a flask, the keepers\' cache and the sea, each once', () => {
  const run = onStair(21, 30);
  assert.ok(E.stairOpen(run));
  assert.deepEqual(E.STAIR_OPTIONS, ['rest', 'refit', 'shed', 'flask', 'cache', 'sea']);
  assert.equal(E.STAIR_PICKS, 2);
  E.STAIR_OPTIONS.forEach((id) => assert.equal(E.stairWhy(run, id), id === 'sea' ? 'You carry no keepsake.' : '', id));
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

/* ---------- Give one to the sea (v0.35.0) ---------- */
function atCove(seed, hp, keeps) {
  const run = E.newRun(seed, 0);
  (keeps || []).forEach((k) => E.gainKeepsake(run, k));
  run.screen = 'rest';
  run.restDone = false;
  if (hp != null) run.hp = hp;
  return run;
}

test('at a Cove, give a keepsake to the sea: it is gone with its Roil, you heal 2 HP for each Roil and refit a card, and that is the Cove', () => {
  assert.equal(E.SEA_HEAL, 2);
  const run = atCove(31, 20, ['tidewatch', 'whaletooth']);
  assert.equal(E.charge(run), 31);
  assert.equal(E.roil(run).steps, 1, '11 over a Hold of 20');
  const jab = run.deck.find((c) => c.id === 'jab');
  assert.equal(E.seaHeal('tidewatch'), 24);
  const o = E.giveToSea(run, 'tidewatch', jab.uid);
  assert.deepEqual([o.keepsake, o.healed, o.card.id, o.card.up], ['tidewatch', 24, 'jab', 1]);
  assert.equal(run.hp, 44);
  assert.equal(jab.up, 1);
  assert.deepEqual(run.keepsakes, ['whaletooth']);
  assert.equal(E.roil(run).steps, 0, 'Calm again');
  assert.ok(run.restDone, 'the Cove is used');
  assert.equal(E.giveToSea(run, 'whaletooth', null), null, 'one thing at a Cove');
  assert.equal(E.rest(run) >= 0, true);
});

test('the sea: a keepsake you do not carry, a card that cannot be upgraded, a fight and a used Cove all give nothing; no card to refit still heals', () => {
  const run = atCove(32, 10, ['moonshard']);
  assert.equal(E.giveToSea(run, 'anchor', null), null);
  const jab = run.deck.find((c) => c.id === 'jab');
  jab.up = 1;
  assert.equal(E.giveToSea(run, 'moonshard', jab.uid), null, 'already upgraded');
  assert.deepEqual(run.keepsakes, ['moonshard'], 'nothing lost');
  run.screen = 'map';
  assert.equal(E.giveToSea(run, 'moonshard', null), null, 'only at a Cove');
  run.screen = 'rest';
  const o = E.giveToSea(run, 'moonshard', null);
  assert.deepEqual([o.healed, o.card], [16, null]);
  assert.equal(run.hp, 26);
  // the heal stops at Max HP, and a Scallop Charm takes its 10 Max HP with it first
  const full = atCove(33, null, ['biscuit']);
  assert.equal(full.maxHp, 80);
  full.hp = 75;
  const p = E.giveToSea(full, 'biscuit', null);
  assert.equal(full.maxHp, 70);
  assert.equal(full.hp, 70);
  assert.equal(p.healed, 0);
});

test('a keepsake brought from the Lazaret and given to the sea is not carried home, and is still in the Lazaret', () => {
  const meta = E.newMeta();
  meta.lazaret = ['anchor'];
  meta.lazOpen = true;
  const run = E.newRun(34, 0, null, ['anchor']);
  assert.ok(E.wasBrought(run, 'anchor'));
  run.screen = 'rest';
  run.restDone = false;
  assert.ok(E.giveToSea(run, 'anchor', null));
  assert.deepEqual(run.keepsakes, []);
  assert.deepEqual(E.foundKeepsakes(run), []);
  assert.deepEqual(meta.lazaret, ['anchor']);
});

test('on the stair the sea is one of the two picks', () => {
  const run = onStair(35, 30);
  E.gainKeepsake(run, 'whaletooth');
  assert.equal(E.stairWhy(run, 'sea'), '');
  const jab = run.deck.find((c) => c.id === 'jab');
  const o = E.stairDo(run, 'sea', { k: 'whaletooth', uid: jab.uid });
  assert.deepEqual([o.id, o.keepsake, o.healed, o.card.up], ['sea', 'whaletooth', 38, 1]);
  assert.equal(run.hp, 68);
  assert.deepEqual(E.stairState(run).picks, ['sea']);
  assert.ok(!run.restDone);
  assert.equal(E.stairWhy(run, 'sea'), 'done');
  assert.equal(E.stairDo(run, 'sea', { k: 'whaletooth', uid: null }), null);
  assert.ok(E.stairDo(run, 'flask'));
  assert.ok(run.restDone, 'both picks used');
});
