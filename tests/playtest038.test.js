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

test('a free Bail needs no Light: with none left, a Bail into the turn\'s first Strand still works; not into a later Strand, not short of one', () => {
  let { run, c } = fight(['kelp']);
  c.tide = 1;
  c.light = 0;
  assert.equal(E.canSwellAct(run).reason, 'Not enough Light', 'Stir still needs it');
  assert.equal(E.canSwellAct(run, 'stir').reason, 'Not enough Light');
  assert.deepEqual(E.canSwellAct(run, 'bail'), { ok: true });
  assert.ok(E.swellAct(run, 'bail'));
  assert.equal(c.turnLows, 1);
  assert.equal(c.light, 0, 'the Strand\'s Light paid for it');
  // a Bail that only moves the Swell needs its Light
  ({ run, c } = fight(['kelp']));
  c.tide = 2;
  c.light = 0;
  assert.equal(E.canSwellAct(run, 'bail').reason, 'Not enough Light');
  // a second Strand gives no Light back, so it isn't free
  ({ run, c } = fight(['kelp']));
  c.tide = 1;
  c.light = 0;
  c.turnLows = 1;
  assert.equal(E.canSwellAct(run, 'bail').reason, 'Not enough Light');
  // with the Glimmer Bulb every Strand gives Light back
  run.keepsakes.push('bulb');
  assert.ok(E.canSwellAct(run, 'bail').ok);
  assert.match(BL.KEYWORDS.Bail, /even with no Light left/);
});

test('the Brine Crab\'s Harden gives it 6 Ward (9 until v0.41.0)', () => {
  assert.equal(BL.ENEMIES.crab.moves.harden.ward, 6);
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

test('v0.38.1: an intent counts your Soaked; a call for help says who comes; removal rises by 25', () => {
  const { run, c } = fight(['kelp']);
  const e = c.enemies[0];
  e.intent = 'lash';
  const plain = E.intentInfo(run, e).dmg;
  c.player.st.soaked = 1;
  assert.equal(E.intentInfo(run, e).dmg, Math.floor(plain * 1.5), 'the number already has your Soaked in it');
  // the Soaked you have now covers the attack that follows, as the intent showed
  c.player.ward = 0;
  run.hp = run.maxHp = 200;
  const hp = run.hp;
  E.endTurn(run);
  assert.equal(hp - run.hp, Math.floor(plain * 1.5));
  // a call for help names who comes and their HP
  const h = E.newRun(3, 0);
  E.startCombat(h, 'boss', ['harbour']);
  h.combat.enemies[0].intent = 'ring';
  assert.match(E.intentInfo(h, h.combat.enemies[0]).parts.join('. '), /Call for help: 2 Barnacle Mites \(\d+ to \d+ HP each\)/);
  assert.equal(E.REMOVE_STEP, 25);
});

test('v0.39.0: Glimmer Leeches swarm (Latch 2 harder for each other Leech); the Pistol Shrimp braces; Siren\'s Echo+ costs 1 and draws; the Conch soaks 1; removal stops at 100', () => {
  const { run, c } = fight(['leech', 'leech', 'leech']);
  const [a] = c.enemies;
  a.intent = 'latch';
  assert.equal(E.intentInfo(run, a).dmg, 5 + 2 * 2);
  assert.match(E.intentInfo(run, a).parts.join('. '), /Swarm/);
  c.enemies[1].dead = true; c.enemies[1].hp = 0;
  assert.equal(E.intentInfo(run, a).dmg, 5 + 2, 'one fewer Leech, 2 less');
  const s = fight(['shrimp']);
  s.c.enemies[0].intent = 'cock';
  assert.deepEqual([E.intentInfo(s.run, s.c.enemies[0]).dmg, E.intentInfo(s.run, s.c.enemies[0]).ward], [4, 6]);
  // Siren's Echo
  assert.equal(BL.CARDS.sirensecho.cost, 1);
  assert.equal(E.cost({ uid: 0, id: 'sirensecho', up: 1 }), 1, 'the upgrade costs 1 too');
  const e = fight(['kelp']);
  e.c.light = 3;
  const echo = { uid: e.run.nextUid++, id: 'sirensecho', up: 1 };
  e.c.hand = [echo];
  e.c.draw.push({ uid: e.run.nextUid++, id: 'jab', up: 0 });
  assert.ok(E.playCard(e.run, echo.uid, null));
  assert.equal(e.c.hand.length, 1, 'it drew a card');
  assert.equal(e.c.echo, 1);
  // the Conch
  const k = E.newRun(5, 0);
  E.gainKeepsake(k, 'sirenscale');
  E.startCombat(k, 'easy', ['kelp']);
  assert.equal(k.combat.enemies[0].st.soaked, 1);
  // removal: 75, 100, 100
  const shop = E.newRun(6, 0);
  shop.pearls = 999;
  const costs = [];
  for (let i = 0; i < 3; i++) { E.genShop(shop); costs.push(E.removePrice(shop)); E.buyRemoval(shop, shop.deck[0].uid); }
  assert.deepEqual(costs, [75, 100, 100]);
});
