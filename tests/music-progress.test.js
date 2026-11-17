'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../js/data.js');
require('../js/engine.js');
const E = globalThis.BL.E;

test('a descent and its encounters unlock music without an audio API or playback', () => {
  const meta = E.newMeta(), run = E.newRun(5555, 0);
  assert.equal(E.noteMusicProgress(meta, run, []), true);
  assert.deepEqual(meta.heard, ['cue:reach']);
  assert.equal(E.noteMusicProgress(meta, run, []), false, 'repeated updates are idempotent');
  E.startCombat(run, 'elite', ['strider']);
  run.combat.song = 'gardener';
  E.noteMusicProgress(meta, run, []);
  for (const id of ['cue:fight', 'cue:dread', 'song:gardener']) assert.ok(meta.heard.includes(id), id);
  assert.ok(!meta.heard.includes('song:putback'));
  assert.equal(E.noteMusicProgress(meta, run, []), false, 'one encounter does not advance to an alternate song');
  E.startCombat(run, 'elite', ['strider']);
  run.combat.song = 'putback';
  E.noteMusicProgress(meta, run, []);
  assert.ok(meta.heard.includes('song:putback'));
});

test('pin phases and the final call are progress triggers, independent of the selected soundtrack', () => {
  const meta = E.newMeta(), run = E.newRun(77, 0);
  E.startCombat(run, 'boss');
  run.combat.song = 'hermit';
  E.noteMusicProgress(meta, run, []);
  assert.ok(meta.heard.includes('cue:pin'));
  assert.ok(!meta.heard.includes('cue:pin2'));
  run.combat.phase2 = true;
  E.noteMusicProgress(meta, run, []);
  assert.ok(meta.heard.includes('cue:pin2'));
  assert.ok(!meta.heard.includes('song:nobody'));
  run.level = 2;
  run.heartHome = true;
  E.startCombat(run, 'boss');
  E.noteMusicProgress(meta, run, []);
  assert.ok(!meta.heard.includes('song:nobody'));
  run.combat.phase2 = true;
  E.noteMusicProgress(meta, run, []);
  assert.ok(meta.heard.includes('song:nobody'));
});

test('the Buoy score unlocks on its saved third encounter choice, not a playback event', () => {
  const meta = E.newMeta(), run = E.newRun(44, 0);
  run.level = 1;
  for (const song of ['hush', 'chain', 'box']) {
    E.startCombat(run, 'boss');
    run.combat.song = song;
    E.noteMusicProgress(meta, run, []);
    assert.ok(meta.heard.includes(song === 'box' ? 'cue:buoy' : 'song:' + song));
    if (song !== 'box') assert.ok(!meta.heard.includes('cue:buoy'));
  }
});

test('saved story and Logbook progress recover music from muted encounters', () => {
  const meta = E.newMeta();
  meta.record = { runs: 3, wins: 2, hearts: 1, quiets: 1, deep: { level: 2, floor: 9 } };
  E.noteMusicProgress(meta, null, ['en:strider', 'en:buoy', 'en:oarfish', 'en:yearling', 'en:cantor']);
  for (const id of ['cue:reach', 'cue:fight', 'cue:dread', 'cue:pin', 'cue:pin2', 'cue:home', 'cue:fallen', 'song:bells', 'song:bell', 'song:nobody', 'song:gardener', 'song:hush', 'song:herring', 'song:eye', 'song:cantor']) assert.ok(meta.heard.includes(id), id);
  for (const id of ['song:putback', 'song:chain', 'cue:buoy', 'song:deep']) assert.ok(!meta.heard.includes(id), 'a single old encounter mark cannot prove another visit: ' + id);
  const before = meta.heard.slice();
  assert.equal(E.noteMusicProgress(meta, null, ['en:strider']), false);
  assert.deepEqual(meta.heard, before, 'existing unlocks are preserved');
});

test('tutorial and uncounted debug progress do not unlock music', () => {
  for (const flag of ['tutorial', 'cheated']) {
    const meta = E.newMeta(), run = E.newRun(33, 0);
    E.startCombat(run, 'elite', ['strider']);
    run.combat.song = 'putback';
    run[flag] = true;
    meta.ach.push('dreadhunter'); // achievements alone are not reliable: uncounted debug runs can earn them
    assert.equal(E.noteMusicProgress(meta, run, []), false);
    assert.deepEqual(meta.heard, []);
  }
});

test('homecoming and falls unlock their pieces from the run outcome', () => {
  for (const [screen, id] of [['victory', 'cue:home'], ['defeat', 'cue:fallen']]) {
    const meta = E.newMeta(), run = E.newRun(17, 0);
    run.screen = screen;
    E.noteMusicProgress(meta, run, []);
    assert.ok(meta.heard.includes(id));
  }
});
