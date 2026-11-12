/* Story so far: the title line, the opening, and the entries a run opens. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
require('../js/version.js');
require('../js/data.js');
require('../js/engine.js');
const BL = globalThis.BL;
const E = BL.E;
const S = BL.STORY;
const img = (p) => path.join(__dirname, '..', 'img', p + '.webp');
const texts = () => [S.title].concat(S.opening.map((b) => b.text),
  S.chapters.flatMap((c) => [c.title].concat(c.text || [], c.lock || [])),
  S.world.flatMap((g) => g.items.flat()),
  S.notes.flatMap((n) => [n.title, n.text, n.lock]));

test('the title line is short and says who you are, what was taken and what to do', () => {
  assert.ok(S.title.split(/\s+/).length <= 40, 'the title screen has room for about 40 words');
  ['bell', 'lighthouse', 'town', 'keeper', 'Go down'].forEach((w) => assert.ok(S.title.includes(w), w));
});

test('the opening is four pictures, each with its text and art that exists', () => {
  assert.equal(S.opening.length, 4);
  S.opening.forEach((b) => {
    assert.ok(b.text.length > 40 && b.pos);
    assert.ok(fs.existsSync(img(b.art)), b.art);
    if (b.fig) assert.ok(fs.existsSync(img(b.fig)), b.fig);
  });
  // each name is explained where it first appears
  assert.match(S.opening[0].text, /Wren, the lighthouse keeper of Saltmere, a harbour town/);
  assert.match(S.opening[0].text, /a magic fire called the Lantern Heart/);
  assert.match(S.opening[1].text, /an enchanted bell, the Bellwether/);
});

test('chapter 1 is the opening and is always open; every other entry is locked behind a mark it names', () => {
  assert.ok(S.chapters[0].opening && !S.chapters[0].when);
  const ids = new Set();
  E.storyEntries().forEach((en) => {
    assert.ok(en.id && !ids.has(en.id), `${en.id} is listed twice`);
    ids.add(en.id);
    assert.ok(en.title);
    if (en.opening) return;
    assert.ok(en.when && en.lock, `${en.id} needs a mark and a lock line`);
    assert.ok(Array.isArray(en.text) ? en.text.length && en.text.every((t) => t.length > 20) : en.text.length > 20, en.id);
    if (en.art) assert.ok(fs.existsSync(img(en.art)), en.art);
  });
});

test('every mark can be earned in the game as it is', () => {
  const plain = ['fell', 'shop', 'cove', 'wreck', 'boss', 'keepsake', 'roiled'];
  E.storyEntries().filter((en) => en.when).forEach((en) => {
    const [kind, id] = en.when.split(':');
    if (kind === 'ev') assert.ok(BL.EVENTS.some((ev) => ev.id === id), en.when);
    else if (kind === 'en') assert.ok(BL.ENEMIES[id] && !BL.ENEMIES[id].tutorial, en.when);
    else if (kind === 'won') assert.ok(+id >= 0 && +id < E.LEVELS.length, en.when);
    else assert.ok(plain.indexOf(en.when) >= 0, en.when);
  });
  // one chapter for each depth cleared
  E.LEVELS.forEach((L, i) => assert.ok(S.chapters.some((c) => c.when === 'won:' + i), L.name));
});

test('there are six chapters and 16 notes, with a note for every Fog event, a shop, a Cove and a Wreck', () => {
  assert.equal(S.chapters.length, 6);
  assert.equal(S.notes.length, 16);
  const whens = S.notes.map((n) => n.when);
  BL.EVENTS.forEach((ev) => assert.ok(whens.includes('ev:' + ev.id), ev.title));
  ['shop', 'cove', 'wreck', 'boss', 'keepsake', 'roiled', 'en:sailor', 'en:siren'].forEach((m) => assert.ok(whens.includes(m), m));
  assert.ok(S.chapters.some((c) => c.when === 'fell'));
});

test('a run earns marks from what it meets', () => {
  const run = E.newRun(7);
  assert.deepEqual(E.storyMarks(run), []);
  assert.deepEqual(E.storyMarks(null), []);
  const at = (type) => { const r = E.newRun(7); E.enterNode(r, { row: 0, col: 0, type }); return E.storyMarks(r); };
  assert.ok(at('shop').includes('shop'));
  assert.ok(at('rest').includes('cove'));
  assert.ok(at('treasure').includes('wreck'));
  const ev = E.newRun(7);
  E.enterNode(ev, { row: 0, col: 0, type: 'event' });
  assert.deepEqual(E.storyMarks(ev), ['ev:' + ev.event.id]);
  const fight = E.newRun(7);
  E.enterNode(fight, { row: 0, col: 0, type: 'fight' });
  const fm = E.storyMarks(fight);
  fight.combat.enemies.forEach((e) => assert.ok(fm.includes('en:' + e.id)));
  assert.ok(!fm.includes('boss'));
  const boss = E.newRun(7);
  E.enterNode(boss, { row: 0, col: 0, type: 'boss' });
  assert.ok(E.storyMarks(boss).includes('boss') && E.storyMarks(boss).includes('en:bell'));
});

test('a fall, a win at each depth, a keepsake and a Roiled aether each earn their mark', () => {
  const fell = E.newRun(7);
  fell.screen = 'defeat';
  assert.deepEqual(E.storyMarks(fell), ['fell']);
  E.LEVELS.forEach((L, lv) => {
    const won = E.newRun(7, lv);
    won.screen = 'victory';
    assert.deepEqual(E.storyMarks(won), ['won:' + lv]);
  });
  const r = E.newRun(7);
  E.gainKeepsake(r, 'coralcrown');
  assert.deepEqual(E.storyMarks(r), ['keepsake']);
  Object.keys(BL.KEEPSAKES).slice(0, 6).forEach((k) => E.gainKeepsake(r, k));
  assert.ok(E.charge(r) > E.hold(0) && E.storyMarks(r).includes('roiled'));
});

test('the tutorial earns nothing', () => {
  const t = E.newRun(7);
  t.tutorial = true;
  t.screen = 'defeat';
  assert.deepEqual(E.storyMarks(t), []);
});

test('an entry opens only once its mark is earned', () => {
  const fall = S.chapters.find((c) => c.id === 'fall');
  assert.ok(E.storyOpen(S.chapters[0], []));
  assert.ok(!E.storyOpen(fall, ['shop']));
  assert.ok(E.storyOpen(fall, ['shop', 'fell']));
});

test('the story agrees with the rules and uses the current words', () => {
  const depths = S.world.flatMap((g) => g.items).find((r) => r[0] === 'Depths')[1];
  assert.ok(depths.includes('four depths') && E.LEVELS.length === 4);
  E.LEVELS.forEach((L) => assert.ok(depths.includes(L.name.replace(/^The /, 'the ')), L.name));
  const all = texts().join('\n');
  assert.doesNotMatch(all, /Low Water|\bCharge\b|Tide gauge|\bswim|\bdive\b/i);
  ['Swell', 'Crest', 'Strand', 'Roil', 'Hold', 'Seep', 'Calm', 'Roiled'].forEach((w) => assert.ok(all.includes(w), w));
  // the Lamplighter's note explains a real cost
  const share = BL.EVENTS.find((e) => e.id === 'ghost').options[0];
  assert.match(share.desc, /Lose \d+ HP/);
});
