/* The music and the sound effects: the score the page loads is music/brinelight.scrim, it compiles cleanly with
   the bundled musicbox and has every cue the game asks for, and every sound the game plays is in the kit. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { inflateRawSync } = require('zlib');
const root = path.join(__dirname, '..');
const { scoreJs, SCORE, SCORE_JS } = require('../tools/music.js');
globalThis.window = globalThis; // js/sfx.js hangs its kit on window.BL
require('../js/data.js');
require('../js/vendor/musicbox/musicbox.js');
require('../js/music-score.js');
require('../js/sfx.js');
require('../js/lyrics.js');
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
  const cues = [...new Set([...body.matchAll(/'(title|reach|cove|fog|fight|murk|dread|pin2|pin|buoy|watch|haul|home|fallen)'/g)].map((m) => m[1]))];
  assert.equal(cues.length, 14);
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
  const loop = /const TITLE_LOOP = \[([^\]]*)\]/.exec(ui); // the title screen's songs, played in turn
  assert.ok(loop && body.includes('TITLE_LOOP'), 'the title screen plays TITLE_LOOP');
  const shop = /const SHOP_SONGS = \[([^\]]*)\]/.exec(ui); // Barnaby's songs, one each visit
  assert.ok(shop && body.includes('SHOP_SONGS'), "Barnaby's shop plays SHOP_SONGS");
  // the songs a fight chooses from as it starts (FIGHT_SONGS, played as c.song); 'box' is the Buoy's music-box piece
  const fights = /const FIGHT_SONGS = \{([^}]*)\}/.exec(ui);
  assert.ok(fights && body.includes('song = c.song'), 'a fight plays the song fightSong chose (FIGHT_SONGS)');
  const fightKeys = [...fights[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]).filter((k) => k !== 'box');
  const screens = [...body.matchAll(/song = '([a-z]+)'/g)].map((m) => m[1]).concat([...(loop[1] + shop[1]).matchAll(/'([a-z]+)'/g)].map((m) => m[1]), fightKeys);
  screens.forEach((k) => assert.ok(songs.some((t) => t.key === k), `song '${k}' is not in SONGS`));
  assert.deepEqual(songs.filter((t) => !t.jukeOnly && !screens.includes(t.key)).map((t) => t.key), [], 'songs no screen plays');
});

test('the Jukebox catalog has every song and cue once, and remembers what was heard', () => {
  const song = globalThis.Musicbox.compile(BL.MUSIC_SCORE);
  assert.deepEqual(BL.MUSIC_JUKE, require('../music/jukebox.json'));
  const items = BL.MUSIC_JUKE.tracks.map(([kind, key]) => kind + ':' + key);
  assert.equal(new Set(items).size, items.length, 'each once');
  assert.deepEqual(items.filter((k) => k.startsWith('cue:')).map((k) => k.slice(4)).sort(), Object.keys(song.cues).sort());
  const songsBlock = ui.slice(ui.indexOf('const SONGS = {'), ui.indexOf('};', ui.indexOf('const SONGS = {')));
  const keys = [...songsBlock.matchAll(/^\s+([a-z]+): \{ src:/gm)].map((m) => m[1]);
  assert.deepEqual(items.filter((k) => k.startsWith('song:')).map((k) => k.slice(5)).sort(), keys.sort());
  // what was heard is kept with the rest of the progress, one of each, and a new or old save starts with none
  require('../js/engine.js');
  const E = BL.E;
  assert.deepEqual(E.newMeta().heard, []);
  assert.deepEqual(E.migrateMeta({ owned: [], ach: [] }).heard, []);
  assert.deepEqual(E.migrateMeta({ owned: [], ach: [], heard: ['song:shop', 'cue:fight', 'song:shop', 7, 'nonsense', 'cue:<x>', 'depth:2'] }).heard, ['song:shop', 'cue:fight', 'depth:2']);
});

test('each Musicbox link plays only its piece at the selected depth, including every random choice', () => {
  const full = globalThis.Musicbox.compile(BL.MUSIC_SCORE);
  assert.deepEqual(Object.keys(BL.MUSIC_LINKS).sort(), full.cueOrder.slice().sort());
  const withoutLocation = ({ ln, layer, ...settings }) => settings;
  for (const [kind, cue, title] of BL.MUSIC_JUKE.tracks) {
    if (kind !== 'cue') continue;
    assert.equal(BL.MUSIC_LINKS[cue].length, BL.MUSIC_JUKE.depths.length);
    for (const [depth, link] of BL.MUSIC_LINKS[cue].entries()) {
      assert.match(link, /^https:\/\/a403\.space\/musicbox\/editor\/#score=[A-Za-z0-9_-]+$/);
      const text = inflateRawSync(Buffer.from(link.split('#score=')[1], 'base64url')).toString('utf8');
      const piece = globalThis.Musicbox.compile(text), label = `${cue} at depth ${depth}`;
      assert.deepEqual(piece.errors, [], label);
      assert.deepEqual(piece.warnings, [], label);
      assert.equal(piece.title, title);
      assert.deepEqual(piece.cueOrder, [cue], 'other cues are not exposed');
      assert.deepEqual(piece.transitions, [], 'other cue names and transitions are not exposed');
      assert.equal(piece.about, `From Brinelight, as heard in ${BL.MUSIC_JUKE.depths[depth]}.`);
      assert.ok(!/^\s*#|\s+#/m.test(text), 'lore comments are not exposed');
      assert.ok(piece.voices.concat(piece.beds).every((v) => v.layer === 0), 'the chosen arrangement plays at the editor default');
      for (const voice of piece.voices) {
        const original = full.voices.find((v) => v.name === voice.name);
        assert.ok(original.layer <= depth, 'no deeper voice is exposed');
        assert.deepEqual(withoutLocation(voice), withoutLocation(original), 'instrument settings stay intact');
      }
      const c = full.cues[cue], p = piece.cues[cue];
      const beds = full.beds.filter((b) => b.layer <= depth && (!c.beds || c.beds[b.name] != null));
      assert.deepEqual(piece.beds.map(withoutLocation), beds.map(withoutLocation), 'only the beds used at this depth');
      assert.deepEqual(p.beds, c.beds && Object.fromEntries(Object.entries(c.beds).filter(([name]) => beds.some((b) => b.name === name))));
      const timeline = (tl, score) => ({
        dur: tl.dur,
        sections: tl.sections,
        events: tl.events.filter((e) => score.voices[e.v].layer <= depth).map((e) => ({ ...e, v: score.voices[e.v].name })),
      });
      for (const part of ['intro', 'loop']) {
        assert.deepEqual(timeline(p[part], piece), timeline(c[part], full), `${label}: ${part}`);
        const slots = (which, score) => which[part + 'Slots'] && which[part + 'Slots'].map((slot) => slot.map((tl) => timeline(tl, score)));
        assert.deepEqual(slots(p, piece), slots(c, full), `${label}: all ${part} choices`);
      }
    }
  }
});

test("every song with singing has its words (js/lyrics.js), in parts headed [like this], and the page loads them", () => {
  const block = ui.slice(ui.indexOf('const SONGS = {'), ui.indexOf('};', ui.indexOf('const SONGS = {')));
  const keys = [...block.matchAll(/^\s+([a-z]+): \{ src: /gm)].map((m) => m[1]);
  const WORDLESS = ['bells', 'departure']; // Harbour Bells at Dawn sings without words; High Tide Departure is instrumental
  assert.deepEqual(keys.filter((k) => !WORDLESS.includes(k) && !BL.LYRICS[k]), [], 'songs with no words');
  assert.deepEqual(Object.keys(BL.LYRICS).filter((k) => !keys.includes(k) || WORDLESS.includes(k)), [], 'words for no song');
  for (const [k, text] of Object.entries(BL.LYRICS)) {
    text.trim().split(/\n\s*\n/).forEach((part, i) => {
      const lines = part.split('\n');
      assert.match(lines[0], /^\[[^\]]+\]$/, `${k}, part ${i + 1}: it should start with a [heading]`);
      assert.ok(lines.length > 1 && lines.slice(1).every((l) => l.trim() && !/[[\]<>]/.test(l)), `${k}, part ${i + 1}: lines of words under its heading`);
    });
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.indexOf('js/lyrics.js') > 0 && html.indexOf('js/lyrics.js') < html.indexOf('js/ui.js'), 'index.html loads js/lyrics.js before ui.js');
});
