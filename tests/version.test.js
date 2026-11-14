/* The version number on the title screen, the What's new list and package.json stay in step. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
require('../js/version.js');
const BL = globalThis.BL;
const root = path.join(__dirname, '..');

const parse = (v) => v.split('.').map(Number);
const cmp = (a, b) => { const x = parse(a), y = parse(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };

test('the version is x.y.z, matches package.json, and is the newest What\'s new entry', () => {
  assert.match(BL.VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version, BL.VERSION);
  assert.equal(BL.CHANGELOG[0].v, BL.VERSION);
});

test('What\'s new lists each version once, newest first, with a date and at least one change', () => {
  const seen = new Set();
  BL.CHANGELOG.forEach((rel, i) => {
    assert.match(rel.v, /^\d+\.\d+\.\d+$/);
    assert.ok(!seen.has(rel.v), `${rel.v} listed twice`);
    seen.add(rel.v);
    assert.match(rel.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!Number.isNaN(Date.parse(rel.date)), rel.date);
    assert.ok(rel.items.length > 0 && rel.items.every((t) => typeof t === 'string' && t.length > 0));
    if (i > 0) {
      const prev = BL.CHANGELOG[i - 1];
      assert.ok(cmp(prev.v, rel.v) > 0, `${prev.v} should come before ${rel.v}`);
      assert.ok(prev.date >= rel.date, `${prev.v} is dated before ${rel.v}`);
    }
  });
});

test('Credits keep the Scrimshaw notice musicbox owes, and every link is https', () => {
  assert.ok(Array.isArray(BL.CREDITS) && BL.CREDITS.length > 0);
  BL.CREDITS.forEach((sec) => assert.ok(sec.head && sec.lines.length > 0 && sec.lines.every((l) => typeof l === 'string' && l.length > 0), sec.head));
  const all = BL.CREDITS.flatMap((sec) => sec.lines).join('\n');
  for (const must of ['Scrimshaw Jukebox', 'Simon Willison', 'Apache License 2.0', 'https://tools.simonwillison.net/scrimshaw-jukebox']) assert.ok(all.includes(must), `Credits should name ${must}`);
  const links = [...all.matchAll(/\[([^\]]+)\]\(([^)]*)\)/g)];
  assert.ok(links.length > 0);
  links.forEach(([, text, url]) => assert.match(url, /^https:\/\/\S+$/, `${text}: ${url}`));
  // the notice itself ships with the bundle
  assert.ok(fs.existsSync(path.join(root, 'js/vendor/musicbox/NOTICE')) && fs.existsSync(path.join(root, 'js/vendor/musicbox/LICENSE')));
});

test('the page loads the version before the game', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const at = (f) => html.indexOf(`src="${f}"`);
  assert.ok(at('js/version.js') >= 0 && at('js/version.js') < at('js/ui.js'));
});
