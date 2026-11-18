/* The Belfry as a dive (v0.37.0, the user's idea): two Dreads, each with a lesser bell after it (one of six), then the
   pin; 5 landings that pay what 8 did. After the Heart: two of the Dreads that grow toward a keeper's lantern, and
   Wren's own fear, the Dark Watch, as the final. The Watch Glass is her first win's reward.
   Run with: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('../tools/bot');

const { BL, E } = load();

/* A run at the top of the Belfry, wearing the dress. */
function inBelfry(seed, heartHome) {
  const run = E.newRun(seed, 2, { coat: 'suit' }, [], [], heartHome);
  return run;
}
const row = (run, r) => run.map.grid[r].filter(Boolean);

test('the Belfry is a dive: one straight route of Dread, lesser bell, Dread, lesser bell, then the pin, 5 landings', () => {
  assert.ok(E.isDive(2) && !E.isDive(0) && !E.isDive(1));
  assert.deepEqual(E.DIVE, ['elite', 'pocket', 'elite', 'pocket']);
  for (let seed = 1; seed <= 20; seed++) {
    const run = inBelfry(seed);
    assert.equal(run.map.rows, 4);
    assert.ok(run.map.dive);
    run.map.grid.forEach((r, i) => {
      assert.equal(r.filter(Boolean).length, 1, 'one stop a row');
      assert.equal(row(run, i)[0].type, E.DIVE[i]);
    });
    // before the Heart: the Drowned Ringer with a Bell Jelly, then the Crowned Oarfish with a Bellspawn
    assert.deepEqual([row(run, 0)[0].enc, row(run, 2)[0].enc], [['ringer', 'belljelly'], ['oarfish', 'spawn']]);
  }
  assert.equal(E.landingsOf(2), 5);
  // walk it: each stop leads to the next, and the last to the pin
  const run = inBelfry(4);
  const seen = [];
  for (let i = 0; i < 5; i++) {
    const av = E.availableNodes(run);
    assert.equal(av.length, 1);
    seen.push(av[0].type);
    E.enterNode(run, av[0]);
    assert.equal(run.floor, i + 1);
    if (av[0].type === 'elite') assert.deepEqual(run.combat.enc, av[0].enc);
    if (av[0].type === 'boss') assert.deepEqual(run.combat.enc, ['bell']);
    E.backToMap(run);
  }
  assert.deepEqual(seen, ['elite', 'pocket', 'elite', 'pocket', 'boss']);
  assert.deepEqual(E.availableNodes(run), []);
  // the other levels keep their maps
  assert.equal(E.newRun(4, 0).map.rows, E.MAP_ROWS);
  assert.equal(E.newRun(4, 1).map.rows, E.MAP_ROWS);
});

test('under a lesser bell: one of six (rest, refit, shed, a flask, the sea, or swim out into the dark), never the keepers\' cache', () => {
  const run = inBelfry(9);
  E.backToMap(run);
  E.enterNode(run, E.availableNodes(run)[0]);
  run.combat = null;
  E.backToMap(run);
  E.enterNode(run, E.availableNodes(run)[0]);
  assert.equal(run.screen, 'rest');
  assert.ok(run.pocket && E.stairOpen(run));
  assert.equal(E.stairPicks(run), 1);
  assert.deepEqual(E.stairOptions(run), ['rest', 'refit', 'shed', 'flask', 'sea', 'fog']);
  assert.equal(E.stairDo(run, 'cache', 0), null, 'no cache down here');
  run.hp = 20;
  const out = E.stairDo(run, 'rest');
  assert.equal(out.healed, Math.floor(run.maxHp * E.STAIR_REST));
  assert.ok(run.restDone);
  ['refit', 'shed', 'flask', 'fog'].forEach((id) => assert.equal(E.stairWhy(run, id), 'full', id));
  // a Cove's own rest and the sea's Cove gift are not for here
  assert.equal(E.giveToSea(run, 'whaletooth'), null);
  E.backToMap(run);
  assert.ok(!run.pocket && !E.stairOpen(run));
});

test('swimming out into the dark from a lesser bell is one of the Belfry\'s own Fog events, and uses the pick', () => {
  const ids = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const run = inBelfry(seed);
    run.pos = { row: 0, col: 2 };
    E.enterNode(run, row(run, 1)[0]);
    const out = E.stairDo(run, 'fog');
    assert.ok(out && out.event);
    assert.equal(run.screen, 'event');
    assert.ok(BL.BANDS.belfry.events.includes(run.event.id));
    ids.add(run.event.id);
    assert.ok(E.storyMarks(run).includes('ev:' + run.event.id));
    E.chooseEventOption(run, 2); // Leave
    E.backToMap(run);
    assert.deepEqual(E.availableNodes(run).map((n) => n.type), ['elite']);
  }
  assert.deepEqual([...ids].sort(), ['heartglow', 'lanterns', 'rope']);
});

test('the dive scores 128 a landing: the whole Belfry pays 640, as 8 landings at 80 did', () => {
  const run = inBelfry(3);
  run.floor = 5;
  const line = E.scoreParts(run, true).parts.find((p) => p.label === 'Landings in the Belfry');
  assert.equal(line.pts, 640);
});

test('after the Heart, the dive draws two different Dreads from those that grow toward a keeper\'s lantern, and ends with the Dark Watch', () => {
  const after = BL.BANDS.belfry.enc.diveAfter.map((x) => x.join('+'));
  const seen = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const run = inBelfry(seed, true);
    const a = row(run, 0)[0].enc.join('+'), b = row(run, 2)[0].enc.join('+');
    assert.ok(after.includes(a) && after.includes(b) && a !== b, `${a} / ${b}`);
    seen.add(a); seen.add(b);
    E.startCombat(run, 'boss');
    assert.deepEqual(run.combat.enc, ['darkwatch']);
  }
  assert.equal(seen.size, after.length, 'every one turns up');
});

test('the Dark Watch rings her bell (the Swell back to 3), throws her harpoon, pinches the wick, and its Lights Out comes 4 harder each time', () => {
  const run = inBelfry(2, true);
  run.kit.bell = null;
  E.startCombat(run, 'boss');
  const c = run.combat, w = c.enemies[0];
  run.hp = run.maxHp = 999;
  assert.equal(w.maxHp, 180);
  assert.equal(w.intent, 'ring');
  c.tide = 5;
  E.endTurn(run);
  assert.equal(w.ward, 14);
  assert.equal(c.tide, 3, 'the Swell is back where you started');
  assert.equal(w.intent, 'harpoon');
  c.player.ward = 0;
  let hp = run.hp;
  E.endTurn(run);
  assert.equal(hp - run.hp, 18);
  assert.equal(w.intent, 'snuff');
  c.player.ward = 0;
  hp = run.hp;
  E.endTurn(run);
  assert.equal(hp - run.hp, 11);
  assert.equal(c.light, c.maxLight - 1, 'the wick is pinched: 1 less Light');
  assert.equal(w.intent, 'out');
  assert.equal(E.intentInfo(run, w).dmg, 22);
  E.endTurn(run);
  w.intent = 'out';
  assert.equal(E.intentInfo(run, w).dmg, 26);
});

test('at half its health the Dark Watch calls Nobody Comes Home: one Hollow Diver; when it falls, the diver goes with it', () => {
  const run = inBelfry(2, true);
  run.kit.bell = null;
  E.startCombat(run, 'boss');
  const c = run.combat, w = c.enemies[0];
  run.hp = run.maxHp = 999;
  w.hp = 90;
  w.intent = 'harpoon';
  E.endTurn(run);
  assert.equal(w.intent, 'nobody');
  E.endTurn(run);
  assert.deepEqual(E.alive(c).map((e) => e.id), ['darkwatch', 'diver']);
  assert.notEqual(w.intent, 'nobody', 'only once');
  w.hp = 1;
  w.ward = 0;
  c.light = 3;
  const jab = { uid: run.nextUid++, id: 'jab', up: 0 };
  c.hand.push(jab);
  E.playCard(run, jab.uid, w.uid);
  assert.ok(c.won);
  E.finishCombat(run);
  assert.equal(run.screen, 'victory');
  assert.ok(run.quieted);
});

test('every creature with a keeper\'s note can still be met: in a band\'s tables, or called by one that is', () => {
  const met = new Set();
  Object.values(BL.BANDS).forEach((b) => Object.values(b.enc).flat(2).forEach((id) => met.add(id)));
  Object.values(BL.KEEPERS).forEach((k) => [k.dread, k.final].filter(Boolean).forEach((id) => met.add(id)));
  let grew = true;
  while (grew) {
    grew = false;
    [...met].forEach((id) => {
      const d = BL.ENEMIES[id];
      const more = [].concat(d.next || [], d.arrive || [], ...Object.values(d.moves).map((m) => [].concat(m.summon || [], m.grow ? m.grow.id : [])));
      more.forEach((x) => { if (!met.has(x)) { met.add(x); grew = true; } });
    });
  }
  ['minnow'].forEach((id) => met.add(id)); // the Roil's minnows and the Bell-Rope's
  BL.STORY.notes.filter((n) => /^en:/.test(n.when)).forEach((n) => assert.ok(met.has(n.when.slice(3)), n.when));
});

test('the Watch Glass, for beating the Dark Watch: 1 more Light on the first turn of each fight', () => {
  assert.equal(BL.KIT.watchglass.unlock, 'longwatch');
  assert.equal(BL.KIT.watchglass.place, 'pocket');
  const run = inBelfry(5, true);
  run.screen = 'victory';
  assert.ok(!BL.ACHIEVEMENTS.longwatch.met(run));
  run.quieted = true;
  assert.ok(BL.ACHIEVEMENTS.longwatch.met(run));
  const glass = E.newRun(5, 0, { pocket: 'watchglass' });
  const bare = E.newRun(5, 0);
  E.startCombat(glass, 'easy', ['kelp']);
  E.startCombat(bare, 'easy', ['kelp']);
  assert.equal(glass.combat.light, bare.combat.light + 1);
  E.endTurn(glass);
  E.endTurn(bare);
  assert.equal(glass.combat.light, bare.combat.light, 'the first turn only');
});
