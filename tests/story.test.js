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
const texts = () => [S.title].concat(S.opening.map((b) => b.text), Object.values(S.scenes).flatMap((sc) => sc.beats.map((b) => b.text)),
  S.chapters.flatMap((c) => [c.title].concat(c.text || [], c.lock || [])),
  S.world.flatMap((g) => g.items.flatMap((r) => [r[0], r[1]])),
  S.notes.flatMap((n) => [n.title, n.text, n.lock]));

test('the title line is short and says who you are, what was taken and what to do', () => {
  assert.ok(S.title.split(/\s+/).length <= 40, 'the title screen has room for about 40 words');
  ['bell', 'lighthouse', 'town', 'keeper', 'Go down'].forEach((w) => assert.ok(S.title.includes(w), w));
});

test('the opening is five pictures, each with its text and art that exists; the fourth brings in Hester and Bosun', () => {
  assert.equal(S.opening.length, 5);
  S.opening.forEach((b) => {
    assert.ok(b.text.length > 40 && b.pos);
    assert.ok(fs.existsSync(img(b.art)), b.art);
    if (b.fig) assert.ok(fs.existsSync(img(b.fig)), b.fig);
  });
  // each name is explained where it first appears
  assert.match(S.opening[0].text, /Wren, the lighthouse keeper of Saltmere, a harbour town/);
  assert.match(S.opening[0].text, /a magic fire called the Lantern Heart/);
  assert.match(S.opening[1].text, /an enchanted bell, the Bellwether/);
  assert.match(S.opening[3].text, /Hester/);
  assert.match(S.opening[3].text, /Bosun/);
});

test('story scenes have valid beats and art, and their chapters replay them at the right milestone', () => {
  const at = Object.values(S.scenes).map((sc) => sc.at);
  assert.deepEqual(at.slice().sort(), E.LEVELS.slice(0, -1).map((L, i) => 'pin:' + i).concat(['dress', 'in:' + (E.LEVELS.length - 1), 'heart', 'quiet', 'fell', 'keeper:mateo', 'quiet:mateo', 'rise:bell', 'lead:mateo', 'dread:mateo']).sort());
  Object.keys(S.scenes).forEach((id) => {
    const sc = S.scenes[id];
    assert.ok(sc.beats.length >= 1 && sc.beats.length <= 8, `${id}: a scene has a short sequence of beats`);
    sc.beats.forEach((b) => {
      assert.ok(b.text.length > 40 && b.text.split(/\s+/).length <= 60, `${id}: a beat is a few lines`);
      if (b.art) {
        assert.ok(b.pos, `${id}: a beat says where its picture sits`);
        assert.ok(fs.existsSync(img(b.art)), b.art);
      } else assert.equal(b.sfx, 'knock', `${id}: a dark beat marks the doorstep knock`);
      if (b.found) assert.ok(BL.KIT[b.found] && BL.KIT[b.found].found, `${id}: ${b.found} is kit that is found`);
    });
    assert.equal(S.chapters.filter((c) => c.scene === id).length, ['unbound', 'knocking', 'cask'].includes(id) ? 0 : 1, id);
  });
  // the scene opens with the chapter that replays it: the same mark
  const mark = { 'pin:0': 'won:0', 'pin:1': 'won:1', dress: 'won:1' };
  S.chapters.filter((c) => c.scene).forEach((c) => assert.equal(c.when, mark[S.scenes[c.scene].at] || S.scenes[c.scene].at, c.id));
  // the Belfry is named for the first time when Dark Water's pin breaks, and the dress is found there
  assert.match(S.scenes.buoy.beats[1].text, /The keepers called it the Belfry/);
  assert.equal(S.scenes.buoy.beats[2].found, 'suit');
  assert.doesNotMatch(S.scenes.hermit.beats.map((b) => b.text).join(' '), /Belfry|Dark Water/);
  // why there are so many bells (v0.40.0, the user asked for it to be clear): said when the Hermit breaks, on the way
  // into the Belfry, and in The world
  assert.match(S.scenes.hermit.beats[1].text, /Every bell on this coast answers the Bellwether/);
  assert.match(S.scenes.below.beats[1].text, /Every bell on this coast was cast to answer the Bellwether/);
  assert.match(S.scenes.below.beats[2].text, /young wear broken bronze for shells/);
  // The world says it in two entries (v0.63.0): one open from the start, and one that opens with the Belfry's name
  const bells = S.world.flatMap((g) => g.items).find((it) => it[0] === 'Why so many bells');
  const lost = S.world.flatMap((g) => g.items).find((it) => it[0] === 'The lost bells');
  assert.ok(bells && !bells[2] && /harbour bell/.test(bells[1]) && !/bell-buoy|Belfry/.test(bells[1]));
  assert.ok(lost && lost[2].level === 2 && /bell-buoy/.test(lost[1]) && /one winter storm, a hundred years ago/.test(lost[1]) && /broken bronze/.test(lost[1]));
  assert.equal(S.scenes.cask.beats[0].quote, BL.CASK_NOTE);
  assert.equal(S.scenes.mateo.beats[0].quote, BL.CASK_NOTE);
  assert.ok(S.scenes.mateo.beats.some((b) => /Saltmere inn/.test(b.text)));
  assert.ok(S.scenes.mateo.beats.every((b) => !/sc_mateo_(lamp|tea)$/.test(b.art || '')));
  assert.match(S.scenes.hoop.beats.at(-1).art, /sc_mateo_tea/);
  assert.equal(S.scenes.unbound.beats[0].cue, 'pin2');
  assert.equal(S.scenes.heart.beats.at(-1).song, 'bells');
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
  const plain = ['fell', 'shop', 'cove', 'wreck', 'toll', 'boss', 'keepsake', 'roiled', 'home', 'heart', 'quiet'];
  E.storyEntries().filter((en) => en.when).forEach((en) => {
    const [kind, id] = en.when.split(':');
    if (kind === 'ev') assert.ok(BL.EVENTS.some((ev) => ev.id === id), en.when);
    else if (kind === 'en') assert.ok(BL.ENEMIES[id] && !BL.ENEMIES[id].tutorial, en.when);
    else if (kind === 'won') assert.ok(+id >= 0 && +id < E.LEVELS.length, en.when);
    else if (kind === 'in') assert.ok(+id >= 1 && +id < E.LEVELS.length, en.when);
    else if (kind === 'keeper' || kind === 'dread' || (kind === 'quiet' && id)) assert.ok(BL.KEEPERS[id]?.dread, en.when);
    else assert.ok(plain.indexOf(en.when) >= 0, en.when);
  });
  // one chapter for each pin broken on the way down, and the Heart's chapters for the last
  E.LEVELS.slice(0, -1).forEach((L, i) => assert.ok(S.chapters.some((c) => c.when === 'won:' + i), L.name));
  assert.ok(S.chapters.some((c) => c.when === 'heart'));
});

test('there are twelve chapters and 46 notes, with a note for every Fog event, a shop, a Cove, a Wreck, a toll bell, Hester, Bosun, each boss and each Dread of the Shallows', () => {
  assert.equal(S.chapters.length, 12);
  assert.equal(S.notes.length, 46);
  assert.deepEqual(['hester', 'bosun'].map((id) => S.notes.find((n) => n.id === id).when), ['home', 'fell']);
  const whens = S.notes.map((n) => n.when);
  BL.EVENTS.forEach((ev) => assert.ok(whens.includes('ev:' + ev.id), ev.title));
  ['shop', 'cove', 'wreck', 'toll', 'keepsake', 'roiled', 'en:sailor', 'en:siren', 'en:bell', 'en:buoy', 'en:leech', 'en:hermit', 'en:harbour', 'en:bellthing', 'en:cantor', 'en:darkwatch'].forEach((m) => assert.ok(whens.includes(m), m));
  // every Dread of the Shallows has a note (v0.62.0: the Hulk and the Twins had none), and so does the Fog Wisp
  BL.ENCOUNTERS.elite.flat().concat('wisp').forEach((id) => assert.ok(whens.includes('en:' + id), id));
  // every boss has a note
  Object.keys(BL.ENEMIES).filter((id) => BL.ENEMIES[id].boss && !BL.ENEMIES[id].tutorial).forEach((id) => assert.ok(whens.includes('en:' + id), id));
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
  assert.ok(at('toll').includes('toll'));
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
  assert.ok(E.storyMarks(boss).includes('boss') && E.storyMarks(boss).includes('en:harbour'));
});

test('a fall, each pin broken, coming home, the Heart, a keepsake and a Roiled aether each earn their mark', () => {
  const fell = E.newRun(7);
  fell.screen = 'defeat';
  assert.deepEqual(E.storyMarks(fell), ['fell']);
  const pinned = E.newRun(7);
  pinned.cleared = [0];
  pinned.screen = 'pin';
  assert.deepEqual(E.storyMarks(pinned), ['won:0']);
  pinned.screen = 'victory';
  assert.deepEqual(E.storyMarks(pinned), ['won:0', 'home']);
  const heart = E.newRun(7, 1);
  heart.cleared = [0, 1];
  heart.heart = true;
  heart.screen = 'victory';
  assert.deepEqual(E.storyMarks(heart), ['won:0', 'won:1', 'in:1', 'home', 'heart']);
  // being down in a level below the Shallows is a mark: 'in:2' opens Into the Belfry and plays its scene
  const below = E.newRun(7, 2);
  assert.ok(E.storyMarks(below).includes('in:2') && !E.storyMarks(E.newRun(7)).some((m) => /^in:/.test(m)));
  const r = E.newRun(7);
  E.gainKeepsake(r, 'coralcrown');
  assert.deepEqual(E.storyMarks(r), ['keepsake']);
  Object.keys(BL.KEEPSAKES).slice(0, 6).forEach((k) => E.gainKeepsake(r, k));
  assert.ok(E.charge(r) > E.hold() && E.storyMarks(r).includes('roiled'));
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
  // Expeditions names the level every expedition starts in; each level below it has an entry of its own that opens
  // when the level is known and says where it lies (v0.63.0: until then Expeditions' text grew as levels were found)
  const world = S.world.flatMap((g) => g.items);
  const exp = world.find((r) => r[0] === 'Expeditions')[1];
  assert.ok(exp.includes(E.levelName(0)));
  assert.match(exp, /go home after any pin/);
  E.LEVELS.forEach((L, i) => {
    if (!i) return;
    const own = world.find((r) => r[2] && r[2].level === i && r[0].toLowerCase() === E.levelName(i).toLowerCase());
    assert.ok(own && own[1].includes('below ' + E.levelName(i - 1)), L.name);
  });
  const all = texts().join('\n');
  assert.doesNotMatch(all, /Low Water|\bCharge\b|Tide gauge|\bswim|\bdive\b/i);
  ['Swell', 'Crest', 'Strand', 'Roil', 'Hold', 'Seep', 'Calm', 'Roiled'].forEach((w) => assert.ok(all.includes(w), w));
  // the Lamplighter's note explains a real cost
  const share = BL.EVENTS.find((e) => e.id === 'ghost').options[0];
  assert.match(share.desc, /Lose \d+ HP/);
});

test('The world: every entry has one text, and what is learned later is a new entry that opens (v0.63.0)', () => {
  const world = S.world.flatMap((g) => g.items);
  const names = new Set();
  world.forEach((r) => {
    assert.ok(r.length <= 3 && r[0] && r[1].length > 20, r[0]);
    assert.ok(!names.has(r[0]), `${r[0]} is listed twice`);
    names.add(r[0]);
    if (!r[2]) return;
    // it opens with a level or with a story mark, and it has no second text to swap in
    assert.deepEqual(Object.keys(r[2]).filter((k) => k !== 'level' && k !== 'when'), [], r[0]);
    assert.ok((r[2].level >= 1 && r[2].level < E.LEVELS.length) || ['heart', 'keeper:mateo'].includes(r[2].when), r[0]);
  });
  // an entry does not name a level before the level is known (WORLD.md, "What the player is told about the levels")
  const opensAt = (r) => (r[2] && r[2].when ? E.LEVELS.length : (r[2] && r[2].level) || 0);
  world.forEach((r) => {
    const text = r[0] + ' ' + r[1];
    if (opensAt(r) < 1) assert.doesNotMatch(text, /Dark Water|Tolling Buoy/, r[0]);
    if (opensAt(r) < 2) assert.doesNotMatch(text, /Belfry|lesser bell|diving dress|last dry step/i, r[0]);
  });
  // an entry open before the Heart is home is still true after it: these lines were only true on the first night
  world.filter((r) => !(r[2] && r[2].when === 'heart')).forEach((r) => assert.doesNotMatch(r[1],
    /rings by itself|over the Lantern Heart|burns in the lighthouse lamp|lamp burns the Lantern Heart|last lighthouse keeper|Bellwether keeps them flooded|the bell holds\b|that holds the tide/, r[0]));
  // what used to be the second half of an entry is an entry now, and the two that open after the Heart are there
  const at = (name) => world.find((r) => r[0] === name);
  assert.deepEqual(['The last dry step', 'The lost bells', 'The Belfry', 'The diving dress'].map((n) => at(n)[2].level), [2, 2, 2, 2]);
  assert.equal(at('Dark Water')[2].level, 1);
  assert.match(at('Dark Water')[1], /Its pin is the Tolling Buoy/);
  assert.match(at('The last dry step')[1], /Bosun/);
  assert.equal(at('The broken bell')[2].when, 'heart');
  assert.equal(at('Mateo')[2].when, 'keeper:mateo');
  // a flask filled on the stair gives the Witch's tonics too, and the entry says how
  assert.match(at('Tonics')[1], /Tide-Witch brews them/);
  assert.match(at('Tonics')[1], /an empty flask fills/);
});

test('text the second opinion found wrong stays right (v0.63.0)', () => {
  const note = (id) => S.notes.find((n) => n.id === id).text;
  const chapter = (id) => S.chapters.find((c) => c.id === id).text.join(' ');
  // Hester's knees do not take the tower stairs, so she is not on the gallery when Wren falls
  assert.doesNotMatch(texts().join('\n'), /gallery/);
  assert.match(chapter('fall'), /saw your ember from the door/);
  // the lamplighter's tag still hangs in the Belfry, so he drowned below it, and he does not wait in one place
  const tag = BL.HESTER_JOBS.find((j) => j.id === 'tag');
  assert.match(tag.brief, /never came back up past it/);
  assert.doesNotMatch(tag.home, /knows who lit/);
  assert.doesNotMatch(note('lamplighter'), /waited there/);
  assert.match(chapter('sunk'), /low stair, under the sea/);
  // the Belfry never drains, so the keepers did not simply walk down to the bell
  assert.doesNotMatch(chapter('sunk'), /walked down to it/);
  assert.match(chapter('sunk'), /diving bell at first and later in diving dresses/);
  // Wren's is the last flame lit from the Heart: no other lamp in the Reach burns
  assert.doesNotMatch(note('diver'), /burns/);
  assert.doesNotMatch(BL.EVENTS.find((e) => e.id === 'lanterns').text, /hold a spark/);
  // the picture of the mending has the lamp on a beam and Wren alone at the bench
  assert.doesNotMatch(S.scenes.dress.beats[0].text + chapter('belfry'), /holds the lamp|holding the lamp/);
  // the great bell is below, and after the Heart it is broken: the rope's note does not say where the sound comes from
  const pull = BL.EVENTS.find((e) => e.id === 'rope').options[1].act({ keepsakes: [], followers: [] }, { gainRandomKeepsake: () => null, addFollower: () => {} });
  assert.doesNotMatch(pull.text + note('rope'), /Far above|the great bell gives/);
  // each keeper raises their own weapon
  const raise = (keeper) => BL.EVENTS.find((e) => e.id === 'ambush').options[0].act({ keeper }, E).text;
  assert.equal(raise('wren'), 'You raise your harpoon.');
  assert.equal(raise('mateo'), 'You raise your mallet.');
  // the Shallows' pin breaks on every expedition, the ones after the Heart is home included
  assert.doesNotMatch(BL.BANDS.shallows.pin, /Lantern Heart is not here|glow of the fire/);
});
