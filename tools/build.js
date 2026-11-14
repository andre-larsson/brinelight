#!/usr/bin/env node
/* Assemble the shipped site in _site/: only what the page loads at runtime
   (index.html, style.css, js/, img/), then check every referenced file exists.
   Usage: node tools/build.js [outdir=_site] */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.resolve(process.argv[2] || path.join(root, '_site'));
const SHIP = ['index.html', 'style.css', 'js', 'img'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const p of SHIP) fs.cpSync(path.join(root, p), path.join(out, p), { recursive: true });

// every src/href in index.html, every url(img/...) in style.css, and every img/... path in js/ must exist
const missing = [];
const check = (rel, from) => { if (!fs.existsSync(path.join(out, rel))) missing.push(`${rel} (from ${from})`); };
const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) if (!/^(https?:|#|data:)/.test(m[1])) check(m[1], 'index.html');
const css = fs.readFileSync(path.join(out, 'style.css'), 'utf8');
for (const m of css.matchAll(/url\((img\/[^)]+)\)/g)) check(m[1], 'style.css');
for (const f of fs.readdirSync(path.join(out, 'js'))) {
  const js = fs.readFileSync(path.join(out, 'js', f), 'utf8');
  for (const m of js.matchAll(/img\/(bg|units|scenes|icons|cards)\/([a-z_]+)\.webp/g)) check(m[0], 'js/' + f);
}
// art named in data (card, unit, keepsake, tonic, event images)
global.BL = undefined;
require(path.join(out, 'js/data.js'));
const BL = globalThis.BL;
Object.values(BL.CARDS).forEach((c) => check(`img/cards/${c.art}.webp`, 'card ' + c.id));
Object.values(BL.ENEMIES).forEach((e) => check(`img/units/${e.art}.webp`, 'enemy ' + e.name));
Object.values(BL.KEEPSAKES).forEach((k) => check(`img/icons/${k.art}.webp`, 'keepsake ' + k.name));
Object.values(BL.TONICS).forEach((t) => check(`img/icons/${t.art}.webp`, 'tonic ' + t.name));
BL.EVENTS.forEach((e) => check(`img/scenes/${e.art}.webp`, 'event ' + e.id));
Object.values(BL.BANDS).forEach((b) => [b.bg, b.bossBg].forEach((bg) => check(`img/bg/${bg}.webp`, 'band ' + b.name)));
// Story so far and the opening name their pictures by path under img/
[...BL.STORY.opening, ...BL.STORY.chapters, ...BL.STORY.notes].forEach((x) => [x.art, x.fig].filter(Boolean).forEach((a) => check(`img/${a}.webp`, 'story ' + (x.title || 'opening'))));
if (/\b(src|href)="\//.test(html)) missing.push('index.html uses a root-absolute path; use relative paths so /<repo>/ works');

if (missing.length) { console.error('Missing files:\n  ' + missing.join('\n  ')); process.exit(1); }
const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`Built ${path.relative(root, out) || out}: ${(size(out) / 1048576).toFixed(1)} MB`);
