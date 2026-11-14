/* The music and the sound effects: the score the page loads is music/brinelight.scrim, it compiles cleanly with
   the bundled musicbox and has every cue the game asks for, and every sound the game plays is in the kit. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const { scoreJs, SCORE, SCORE_JS } = require('../tools/music.js');
globalThis.window = globalThis; // js/sfx.js hangs its kit on window.BL
require('../js/data.js');
require('../js/vendor/musicbox/musicbox.js');
require('../js/music-score.js');
require('../js/sfx.js');
const BL = globalThis.BL;
const ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');

test('js/music-score.js is music/brinelight.scrim (run node tools/music.js after editing the score)', () => {
  assert.equal(fs.readFileSync(SCORE_JS, 'utf8'), scoreJs(fs.readFileSync(SCORE, 'utf8')));
});

test('the score compiles with the bundled musicbox, with no errors or warnings', () => {
  const song = globalThis.Musicbox.compile(BL.MUSIC_SCORE);
  assert.deepEqual(song.errors.map((e) => `line ${e.line}: ${e.msg}`), []);
  assert.deepEqual(song.warnings.map((e) => `line ${e.line}: ${e.msg}`), []);
  assert.equal(typeof globalThis.Musicbox.MusicPlayer, 'function');
  assert.match(globalThis.Musicbox.version, /^[0-9a-f]{7,}$/, 'bundled from a commit');
});

test('every cue the game switches to is in the score, and its intensity runs 0 to 2 with the depth', () => {
  const song = globalThis.Musicbox.compile(BL.MUSIC_SCORE);
  const body = ui.slice(ui.indexOf('function updateSound()'), ui.indexOf('function renderScreen()'));
  const cues = [...new Set([...body.matchAll(/'(title|reach|home|fallen|pin2|pin|dread|fight)'/g)].map((m) => m[1]))];
  assert.equal(cues.length, 8);
  cues.forEach((c) => assert.ok(song.cues[c], `cue ${c}`));
  assert.equal(Math.max(...song.voices.map((v) => v.layer || 0), ...song.beds.map((b) => b.layer || 0)), 2);
});

test('every sound the game plays is in the kit', () => {
  const kit = new Set(BL.SFX.CATALOG.flatMap((g) => g.items.map((it) => it.name)));
  const called = new Set([...ui.matchAll(/\bsfx\('([a-z]+)'/g)].map((m) => m[1]));
  ['bail', 'stir'].forEach((k) => called.add(k)); // sfx(kind) from the Bailer
  BL.STORY.opening.forEach((b) => b.sfx && called.add(b.sfx)); // the opening pictures name theirs
  assert.ok(called.size > 30);
  called.forEach((k) => assert.ok(kit.has(k), `sfx('${k}') is not in js/sfx.js`));
});

test('the page loads musicbox, the score and the kit before ui.js; the build ships them with the licence', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const at = (f) => html.indexOf(`<script src="${f}"></script>`);
  ['js/vendor/musicbox/musicbox.js', 'js/music-score.js', 'js/sfx.js'].forEach((f) => {
    assert.ok(at(f) > 0, f);
    assert.ok(at(f) < at('js/ui.js'), `${f} before js/ui.js`);
  });
  ['LICENSE', 'NOTICE'].forEach((f) => assert.ok(fs.existsSync(path.join(root, 'js/vendor/musicbox', f)), `js/vendor/musicbox/${f}`));
});

test('the recorded songs: every song ui.js names is in music/songs with its length, the build ships that folder, and every one plays somewhere', () => {
  const block = ui.slice(ui.indexOf('const SONGS = {'), ui.indexOf('};', ui.indexOf('const SONGS = {')));
  const songs = [...block.matchAll(/^\s+([a-z]+): \{ src: '(music\/songs\/[a-z0-9-]+\.mp3)'.*?secs: (\d+)(.*)$/gm)].map((m) => ({ key: m[1], src: m[2], secs: +m[3], jukeOnly: /jukeOnly: true/.test(m[4]) }));
  assert.ok(songs.length >= 1);
  songs.forEach((t) => {
    assert.ok(fs.existsSync(path.join(root, t.src)), t.src);
    // 128 kbit/s CBR: the length from the file's size, to a second
    const secs = (fs.statSync(path.join(root, t.src)).size * 8) / 128000;
    assert.ok(Math.abs(secs - t.secs) < 1.5, `${t.key}: secs ${t.secs}, the file is ${secs.toFixed(1)} s`);
  });
  const files = fs.readdirSync(path.join(root, 'music/songs')).map((f) => 'music/songs/' + f);
  assert.deepEqual(files.filter((f) => !songs.some((t) => t.src === f)), [], 'files in music/songs that nothing plays');
  assert.match(fs.readFileSync(path.join(root, 'tools/build.js'), 'utf8'), /SHIP = \[[^\]]*'music\/songs'/);
  // each screen's song is in SONGS, and each song plays on a screen unless it is only in the Jukebox
  const body = ui.slice(ui.indexOf('function updateSound()'), ui.indexOf('function renderScreen()'));
  const screens = [...body.matchAll(/song = '([a-z]+)'/g)].map((m) => m[1]);
  screens.forEach((k) => assert.ok(songs.some((t) => t.key === k), `song '${k}' is not in SONGS`));
  assert.deepEqual(songs.filter((t) => !t.jukeOnly && !screens.includes(t.key)).map((t) => t.key), [], 'songs no screen plays');
});

test('the Jukebox plays every cue of the score, and each one is in it', () => {
  const song = globalThis.Musicbox.compile(BL.MUSIC_SCORE);
  const block = ui.slice(ui.indexOf('const JUKE_SCORE = ['), ui.indexOf('];', ui.indexOf('const JUKE_SCORE = [')));
  const cues = [...block.matchAll(/^\s+\['([a-z0-9]+)',/gm)].map((m) => m[1]);
  assert.deepEqual([...cues].sort(), Object.keys(song.cues).sort());
});
