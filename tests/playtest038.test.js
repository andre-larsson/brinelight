/* v0.38.0, from the user's playtest notes and an agent's blind playtest: Ward blocks a Crest; a Bail that Strands is
   free; the Pale Gulper shows its Full Belly; the map and the pin say in time when the stair needs a diving dress;
   Skirmishes are tougher; Brine Spear applies less Brine; Pearls pay less.
   Run with: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('../tools/bot');

const { BL, E } = load();

function fight(enc, kind) {
  const run = E.newRun(7, 0);
  run.kit.bell = null; // no card draws in the way
  E.startCombat(run, kind || 'elite', enc);
  return { run, c: run.combat };
}

test('Ward blocks a Crest, as it blocks any hit; a Strand first takes the Ward away', () => {
  const { run, c } = fight(['kelp']);
  const e = c.enemies[0];
  e.hp = e.maxHp = 100;
  e.ward = 4;
  c.tide = 5;
  c.light = 3;
  const stir = E.swellAct(run, 'stir');
  assert.ok(stir);
  assert.equal(e.hp, 100 - 2, 'the 6 of the wave less its 4 Ward');
  assert.equal(e.ward, 0);
  assert.match(BL.KEYWORDS.Crest, /Ward blocks it/);
});

test('a Bail that makes a Strand is free: it costs 1 Light and the Strand gives 1 back', () => {
  const { run, c } = fight(['kelp']);
  c.tide = 1;
  c.light = 2;
  assert.ok(E.swellAct(run, 'bail'));
  assert.equal(c.tide, 3, 'stranded, so back to 3');
  assert.equal(c.light, 2, 'no Light lost, and none gained');
  assert.match(BL.KEYWORDS.Bail, /is free/);
});

test('the Pale Gulper shows Full Belly until a blow brings it to half, then Retches and loses it', () => {
  const { run, c } = fight(['gulper']);
  const g = c.enemies[0];
  assert.equal(g.st.fullbelly, 1);
  assert.ok(BL.STATUSES.fullbelly.desc().includes('half'));
  c.light = 3;
  g.ward = 0;
  g.hp = Math.floor(g.maxHp / 2) + 3;
  const jab = { uid: run.nextUid++, id: 'jab', up: 0 };
  c.hand.push(jab);
  assert.ok(E.playCard(run, jab.uid, g.uid));
  assert.ok(!g.st.fullbelly, 'gone once it has Retched');
  assert.equal(E.alive(c).filter((e) => e.id === 'leech').length, 2);
});

test('how deep an expedition can go: the stair under the sea needs the diving dress; the map and the pin say so', () => {
  const plain = E.newRun(3, 0);
  assert.equal(E.deepestReachable(plain), 1, 'the Shallows and Dark Water, no further');
  plain.level = 1;
  assert.equal(E.deepestReachable(plain), 1);
  const dressed = E.newRun(3, 0, { coat: 'suit' });
  assert.equal(E.deepestReachable(dressed), 2);
});

test('Skirmish creatures have 15% more HP; the same creature in a Dread fight does not', () => {
  assert.equal(E.SKIRMISH_HP, 1.15);
  const hp = (kind) => { const run = E.newRun(11, 0); E.startCombat(run, kind, ['ray']); return run.combat.enemies[0].maxHp; };
  const elite = hp('elite');
  assert.equal(hp('easy'), Math.round(elite * 1.15));
  assert.equal(hp('hard'), Math.round(elite * 1.15));
});

test('Brine Spear applies 3 Brine (4 upgraded); Pearls: a Skirmish 11 to 17, a Dread 24 to 32, a Wreck 26 to 40', () => {
  assert.deepEqual([BL.CARDS.brinespear.v.brine, BL.CARDS.brinespear.up.brine], [3, 4]);
  assert.deepEqual(E.PEARLS, { fight: [11, 17], elite: [24, 32], wreck: [26, 40], flawless: [8, 14], swift: [5, 8] });
  for (let seed = 1; seed <= 40; seed++) {
    const run = E.newRun(seed, 0);
    run.screen = 'map';
    run.pos = { row: E.WRECK_ROW - 1, col: run.map.grid[E.WRECK_ROW].findIndex(Boolean) };
    E.enterNode(run, run.map.grid[E.WRECK_ROW].find(Boolean));
    assert.ok(run.treasure.pearls >= 26 && run.treasure.pearls <= 40);
  }
});
