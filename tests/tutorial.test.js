/* The guided first fight is scripted: these tests play it the way the tutorial steps require
   and check that every step has something to show (Ward, enemy Ward, a Crest that hits both
   enemies, the reshuffle, Low Water, a double Crest) and that the fight ends on the payoff. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, snapshot } = require('../tools/bot');

const { BL, E } = load();
const handIds = (c) => c.hand.map((x) => x.id);
const playId = (run, id, enemyId) => {
  const c = run.combat;
  const card = c.hand.find((x) => x.id === id);
  assert.ok(card, `${id} in hand (${handIds(c)})`);
  const t = enemyId ? c.enemies.find((e) => e.id === enemyId) : null;
  assert.ok(E.playCard(run, card.uid, t ? t.uid : undefined), `play ${id}`);
};

test('the tutorial fight plays out as scripted', () => {
  const run = E.newTutorialRun();
  const c = run.combat;
  const [mite, crab] = c.enemies;
  assert.equal(run.tutorial, true);
  assert.deepEqual(run.keepsakes, [], 'no Tide-Bell, so no surprise draws');
  assert.deepEqual([mite.hp, crab.hp], [12, 24]);

  // turn 1: HP, attack, Light, intents, Ward, end turn
  assert.deepEqual(handIds(c), ['jab', 'brace', 'jab', 'brace', 'jab']);
  assert.deepEqual([E.intentInfo(run, mite).dmg, E.intentInfo(run, crab).dmg], [4, 3]);
  playId(run, 'jab', 'tut_mite');
  assert.equal(c.light, 2);
  playId(run, 'brace');
  playId(run, 'jab', 'tut_crab');
  assert.equal(c.light, 0);
  E.endTurn(run);
  assert.equal(run.hp, 70 - 2, '7 incoming, 5 blocked');

  // turn 2: enemy Ward, the Tide, a Crest that hits both, Ebb
  assert.equal(c.turn, 2);
  assert.equal(crab.ward, 4, 'the crab hardened');
  assert.deepEqual(handIds(c), ['swell', 'shellup', 'slack', 'jab', 'brace']);
  playId(run, 'swell', 'tut_crab');
  assert.equal(c.tide, 5);
  assert.equal(crab.ward, 0);
  const crabHp = crab.hp;
  playId(run, 'shellup');
  assert.equal(c.turnCrests, 1);
  assert.ok(mite.dead, 'the Crest finishes the mite');
  assert.equal(crabHp - crab.hp, 6, 'and hits the crab');
  playId(run, 'slack');
  assert.equal(c.tide, 1);
  E.endTurn(run);
  assert.ok(!c.lost && run.hp === 68, 'the Ward holds');

  // turn 3: the reshuffle, Low Water, then Surge 6 Crests twice and wins
  assert.equal(c.turn, 3);
  assert.ok(c.fx.some((f) => f.t === 'shuffle'), 'the discard pile was shuffled back in');
  assert.deepEqual(handIds(c), ['riptide', 'stormsurge', 'jab', 'jab', 'brace']);
  playId(run, 'riptide', 'tut_crab');
  assert.equal(c.turnLows, 1);
  assert.equal(c.player.ward, 6);
  assert.ok(!c.won);
  playId(run, 'stormsurge');
  assert.equal(c.turnCrests, 2);
  assert.ok(c.won, 'the double Crest is the finishing blow');
});

test('the tutorial is the same every time and never uses the shuffle', () => {
  assert.equal(snapshot(E.newTutorialRun()).replace(/"lastTick":\d+/, ''), snapshot(E.newTutorialRun()).replace(/"lastTick":\d+/, ''));
});

test('tutorial enemies never appear in real encounters', () => {
  const pools = Object.values(BL.ENCOUNTERS).flat(2);
  assert.ok(!pools.some((id) => BL.ENEMIES[id].tutorial));
});
