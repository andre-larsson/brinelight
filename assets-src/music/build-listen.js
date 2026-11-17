#!/usr/bin/env node
// Build assets-src/music/listen.html with embedded scores and portable #score= links
// so every draft piece can be played in-page, opened in Musicbox, or copied without CLI line wrapping.
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { deflateRawSync } = require('node:zlib');

const dir = __dirname;
const root = path.resolve(dir, '../..');
require(path.join(root, 'js/vendor/musicbox/musicbox.js'));

const ITEMS = [
  {
    id: 'charge',
    file: 'assets-src/music/charge.scrim',
    where: 'High-energy Dreads / Boss Phase 2 — 158 BPM E minor twin-lead gallop (The Trooper vibe)',
    layers: '0: twin Marshall-EQ saw leads in 3rds, guitar chug, brass stabs, synbass gallop, full drum kit · 1: +upright bass clank, fiddle, war-bell · 2: +choir',
    featured: true,
  },
  {
    id: 'gale',
    file: 'assets-src/music/gale.scrim',
    where: 'High-energy Dreads / Boss Phase 2 — 172 BPM D minor twin-lead burner turning Wren\'s Song into power metal (Aces High / Run to the Hills vibe)',
    layers: '0: twin leads in 3rds, fast gallop bass & guitar, punk-metal drums & tom fills · 1: +upright clank, fiddle, bell · 2: +choir',
    featured: true,
  },
  {
    id: 'suite',
    file: 'assets-src/music/brinelight-missing-cues.scrim',
    where: 'All 5 new cues together with switch transitions and 1-bar via bridges (lurch, her_bell)',
    layers: '0: Shallows · 1: Dark Water (+deep drone, toll, shaker) · 2: Belfry (+choir)',
    featured: true,
  },
  {
    id: 'murk',
    file: 'assets-src/music/murk.scrim',
    where: 'Dark Water ordinary fights (replaces open-air 6/8 Shallows surf jig in Level 2)',
    layers: '0: clar, bassoon, pizz, vibes, fretless, rim/conga/tom · 1: +A1 drone, toll, shaker, celesta · 2: +choir',
  },
  {
    id: 'cove',
    file: 'assets-src/music/cove.scrim',
    where: 'Sheltered Cove, Stairs between levels & Air under a Lesser Bell',
    layers: '0: fingerpicked guitar, flute, clarinet, strings, sea (no drone) · 1: +lyre, faint toll · 2: +choir & bronze hum',
  },
  {
    id: 'fog',
    file: 'assets-src/music/fog.scrim',
    where: 'All 13 Fog events (Shrine, Witch, Lamplighter, Diving Bell…), Wrecks & Toll Bells',
    layers: '0: 5/4 C minor sunken pipe organ, wordless voice, musicbox & glock drops, gong · 1: +vibes, toll · 2: +choir',
  },
  {
    id: 'haul',
    file: 'assets-src/music/haul.scrim',
    where: 'Early-retreat homecoming ("Home with your haul" — dark lighthouse, bells restarting below)',
    layers: '0: 4/4 harbour-step walk (upright bass, squeezebox, guitar chops, bodhran, horn/clar/flute, restarting knell) · 1: +shaker, toll, deep · 2: +choir',
  },
  {
    id: 'watch',
    file: 'assets-src/music/watch.scrim',
    where: 'The Dark Watch Phase 1 (180 → 90 HP, before Nobody Comes Home)',
    layers: '0: Watch Glass rim tick, inverted musicbox chime vs solo fiddle, bell, horn, timpani · 1: +toll, A1 drone · 2: +choir',
  },
  {
    id: 'current',
    file: 'music/brinelight.scrim',
    where: 'Shipped soundtrack (14 cues, including cove, fog, murk, watch and haul)',
    layers: '0: Shallows · 1: Dark Water (+toll, deep, shaker, mist vibes) · 2: Belfry (+choir)',
  },
];

const entries = ITEMS.map((item) => {
  const fullPath = path.join(root, item.file);
  const text = fs.readFileSync(fullPath, 'utf8');
  const song = globalThis.Musicbox.compile(text);
  if (song.errors.length || song.warnings.length) {
    throw new Error(`${item.file}: ${JSON.stringify({ errors: song.errors, warnings: song.warnings })}`);
  }
  const link = 'https://a403.space/musicbox/editor/#score=' + deflateRawSync(Buffer.from(text), { level: 9 }).toString('base64url');
  return {
    ...item,
    title: song.title || item.id,
    about: song.about || '',
    cues: song.cueOrder,
    text,
    link,
  };
});

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Brinelight — Missing Soundtrack Pieces</title>
<style>
  :root {
    --bg: #f3f1ea; --panel: #fffdf7; --ink: #1d2a33; --muted: #5d6a72; --line: #d9d4c7;
    --accent: #1f6f78; --accent-ink: #fff; --on: #e3efe9; --badge: #e7e2d5;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0e1a22; --panel: #15252f; --ink: #e6edf0; --muted: #93a4ad; --line: #26394580;
      --accent: #5fb7bd; --accent-ink: #0e1a22; --on: #1d3a40; --badge: #1e3340;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 system-ui, sans-serif; }
  main { max-width: 980px; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { font-size: 24px; margin: 0 0 6px; }
  h2 { font-size: 18px; margin: 28px 0 10px; }
  p.lead { color: var(--muted); margin: 0 0 16px; max-width: 72ch; }
  .bar {
    position: sticky; top: 0; z-index: 2; background: var(--bg); padding: 10px 0;
    border-bottom: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 10px 18px; align-items: center;
  }
  .seg { display: inline-flex; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
  .seg button {
    border: 0; border-right: 1px solid var(--line); background: var(--panel); color: var(--ink);
    padding: 6px 12px; font: inherit; font-size: 13px; cursor: pointer;
  }
  .seg button:last-child { border-right: 0; }
  .seg button[aria-pressed="true"] { background: var(--accent); color: var(--accent-ink); font-weight: 600; }
  .status { font-size: 13px; color: var(--muted); margin-left: auto; font-variant-numeric: tabular-nums; }
  .stack { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
  .card {
    background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
    padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;
  }
  .card.featured { border-color: var(--accent); }
  .card.playing { background: var(--on); border-color: var(--accent); }
  .head { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; justify-content: space-between; }
  .head b { font-size: 17px; }
  code { font-size: 12.5px; background: var(--badge); padding: 2px 6px; border-radius: 4px; }
  .meta { font-size: 13.5px; color: var(--muted); margin: 0; }
  .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 4px; }
  .btn, a.btn {
    display: inline-flex; align-items: center; gap: 5px; text-decoration: none;
    font: inherit; font-size: 13px; padding: 6px 12px; border-radius: 6px; cursor: pointer;
    border: 1px solid var(--line); background: var(--panel); color: var(--ink);
  }
  .btn.primary, a.btn.primary { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); font-weight: 600; }
  .btn.cue-on { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .cues { display: inline-flex; flex-wrap: wrap; gap: 5px; align-items: center; }
  .vol { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
  input[type="range"] { width: 96px; accent-color: var(--accent); }
</style>
</head>
<body>
<main>
  <h1>Brinelight — Missing Soundtrack Pieces</h1>
  <p class="lead">Play any piece straight on this page across all three depths, open it in a new tab in the online <b>Musicbox Editor</b> (no wrapped terminal URLs), or copy its portable link. If you edit a piece in Musicbox, click <b>Copy link</b> there and paste it back into chat.</p>

  <div class="bar">
    <span>Depth <span class="seg" id="depth">
      <button data-d="0" aria-pressed="true">0 · Shallows</button>
      <button data-d="1" aria-pressed="false">1 · Dark Water</button>
      <button data-d="2" aria-pressed="false">2 · Belfry</button>
    </span></span>
    <label class="vol">Volume <input id="vol" type="range" min="0" max="100" value="65"></label>
    <button class="btn" id="stop">Stop</button>
    <span class="status" id="status">Stopped</span>
  </div>

  <div class="stack" id="cards"></div>
</main>

<script src="../../js/vendor/musicbox/musicbox.js"></script>
<script>
const ENTRIES = ${JSON.stringify(entries).replace(/<\//g, '<\\/')};

let player = null;
let activeId = null;
let activeCue = null;
let depth = 0;

const cardsEl = document.getElementById('cards');
const statusEl = document.getElementById('status');
const volEl = document.getElementById('vol');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ensurePlayer = () => {
  if (!player) {
    player = new window.Musicbox.MusicPlayer({ volume: (+volEl.value / 100) * 0.8, intensity: depth });
  }
  return player;
};

const render = () => {
  cardsEl.innerHTML = ENTRIES.map((e) => {
    const isPlaying = activeId === e.id;
    const cueButtons = e.cues.map((c) => {
      const on = isPlaying && activeCue === c;
      const label = e.cues.length === 1 ? (on ? 'Pause / Stop' : '▶ Play') : (on ? '● ' + c : '▶ ' + c);
      return \`<button class="btn \${e.cues.length === 1 ? 'primary' : ''} \${on ? 'cue-on' : ''}" data-play="\${esc(e.id)}" data-cue="\${esc(c)}">\${esc(label)}</button>\`;
    }).join('');
    return \`<section class="card\${e.featured ? ' featured' : ''}\${isPlaying ? ' playing' : ''}">
      <div class="head">
        <div><b>\${esc(e.title)}</b> <code>\${esc(e.file)}</code></div>
      </div>
      <p class="meta"><b>Where:</b> \${esc(e.where)}<br><b>Layers:</b> \${esc(e.layers)}\${e.about ? '<br>' + esc(e.about) : ''}</p>
      <div class="row">
        <span class="cues">\${cueButtons}</span>
        <a class="btn" href="\${esc(e.link)}" target="_blank" rel="noopener noreferrer">Open in Musicbox ↗</a>
        <button class="btn" data-copy="\${esc(e.id)}">Copy link</button>
      </div>
    </section>\`;
  }).join('');
};

const stopAll = () => {
  if (player) player.stop(0.3);
  activeId = null;
  activeCue = null;
  statusEl.textContent = 'Stopped';
  render();
};

cardsEl.addEventListener('click', async (ev) => {
  const playBtn = ev.target.closest('[data-play]');
  if (playBtn) {
    const id = playBtn.dataset.play;
    const cue = playBtn.dataset.cue;
    const entry = ENTRIES.find((x) => x.id === id);
    const p = ensurePlayer();
    p.unlock();
    if (activeId === id && activeCue === cue) {
      stopAll();
      return;
    }
    if (activeId !== id) {
      p.stop(0.15);
      p.load(entry.text);
      activeId = id;
      activeCue = cue;
      p.play(cue, { intensity: depth });
    } else {
      activeCue = cue;
      p.goto(cue);
    }
    render();
    return;
  }
  const copyBtn = ev.target.closest('[data-copy]');
  if (copyBtn) {
    const entry = ENTRIES.find((x) => x.id === copyBtn.dataset.copy);
    await navigator.clipboard.writeText(entry.link);
    const prev = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = prev; }, 1200);
  }
});

document.getElementById('depth').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-d]');
  if (!b) return;
  depth = +b.dataset.d;
  document.querySelectorAll('#depth button').forEach((el) => el.setAttribute('aria-pressed', String(+el.dataset.d === depth)));
  if (player) player.setIntensity(depth);
});

volEl.addEventListener('input', () => {
  if (player) player.setVolume((+volEl.value / 100) * 0.8);
});

document.getElementById('stop').addEventListener('click', stopAll);

setInterval(() => {
  if (!player || !activeId || !player.state.playing) return;
  const st = player.state;
  statusEl.textContent = \`Playing \${activeCue} · depth \${depth}\${st.pattern ? ' · ' + st.pattern : ''}\${st.bar != null ? ' bar ' + (st.bar + 1) : ''}\`;
}, 200);

render();
</script>
</body>
</html>
`;

const outPath = path.join(dir, 'listen.html');
fs.writeFileSync(outPath, html);
console.log(`Wrote ${path.relative(root, outPath)} (${entries.length} entries)`);
