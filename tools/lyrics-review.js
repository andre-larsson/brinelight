#!/usr/bin/env node
/* Review page for the Jukebox lyrics: listen to each line, compare it with what two speech models heard, and fix it.
   Run tools/lyrics-check.py first (it writes .lyrics/data.json). Then:
     node tools/lyrics-review.js [port=8874]   serve the page at http://127.0.0.1:<port>/ ; decisions save to .lyrics/review.json
     node tools/lyrics-review.js --status      how far the review has got, song by song
     node tools/lyrics-review.js --apply [keys...]
                                               write the reviewed words of every song marked done (or just these) into
                                               js/lyrics.js; a song whose written words changed since the check is skipped
   Bump the version and add a changelog line afterwards (AGENTS.md): the words are player-facing. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, '.lyrics');
const DATA = path.join(DIR, 'data.json');
const REVIEW = path.join(DIR, 'review.json');
const LYRICS = path.join(ROOT, 'js', 'lyrics.js');
const PAGE = path.join(__dirname, 'lyrics-review.html');
const AUDIO_DIRS = ['music/songs/', '.lyrics/audio/'];

const readJson = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return fallback; } };
function writeJson(f, v) {
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(v, null, 1));
  fs.renameSync(tmp, f);
}

function currentLyrics() {
  delete require.cache[require.resolve(LYRICS)];
  const saved = globalThis.BL;
  globalThis.BL = {};
  require(LYRICS);
  const out = globalThis.BL.LYRICS;
  globalThis.BL = saved;
  return out;
}

function sha1(s) { return require('crypto').createHash('sha1').update(s, 'utf8').digest('hex'); }

// ------------------------------------------------------------------ apply

/** Replace one song's template literal in js/lyrics.js. */
function replaceSong(src, key, text) {
  const re = new RegExp('(\\n    ' + key + ': `)([\\s\\S]*?)(`,?\\n)');
  const m = re.exec(src);
  if (!m) throw new Error('song ' + key + ' not found in js/lyrics.js');
  const body = text.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return src.slice(0, m.index) + m[1] + body + m[3] + src.slice(m.index + m[0].length);
}

function apply(keys) {
  const data = readJson(DATA, null);
  const review = readJson(REVIEW, {});
  if (!data) { console.error('No .lyrics/data.json: run tools/lyrics-check.py first.'); process.exit(1); }
  const now = currentLyrics();
  let src = fs.readFileSync(LYRICS, 'utf8');
  const changed = [];
  for (const key of keys.length ? keys : Object.keys(review)) {
    const r = review[key];
    if (!r) { console.log(`${key}: not reviewed`); continue; }
    if (!keys.length && !r.done) continue;
    const text = (r.textOverride != null ? r.textOverride : r.text || '').replace(/\s+$/, '');
    if (!text) { console.log(`${key}: no reviewed words saved`); continue; }
    if (sha1(now[key] || '') !== r.writtenHash) {
      console.log(`${key}: SKIPPED, its words in js/lyrics.js changed after the check (run tools/lyrics-check.py ${key} again)`);
      continue;
    }
    if (text === now[key]) { console.log(`${key}: unchanged`); continue; }
    src = replaceSong(src, key, text);
    changed.push(key);
    const a = now[key].split('\n'), b = text.split('\n');
    const gone = a.filter(l => !b.includes(l)), added = b.filter(l => !a.includes(l));
    console.log(`${key}: ${added.length} lines new or changed, ${gone.length} gone`);
    for (const l of gone) console.log('   - ' + l);
    for (const l of added) console.log('   + ' + l);
  }
  if (!changed.length) { console.log('Nothing to write.'); return; }
  fs.writeFileSync(LYRICS, src);
  const check = currentLyrics();
  for (const key of changed) {
    const r = review[key];
    const want = (r.textOverride != null ? r.textOverride : r.text).replace(/\s+$/, '');
    if (check[key] !== want) { console.error(`${key}: js/lyrics.js does not read back as reviewed!`); process.exit(1); }
    r.applied = new Date().toISOString(); // the page now shows this song as stale until tools/lyrics-check.py runs on it again
  }
  writeJson(REVIEW, review);
  console.log(`Wrote ${changed.length} song(s) to js/lyrics.js: ${changed.join(', ')}. Bump the version and add a changelog line.`);
}

function status() {
  const data = readJson(DATA, null);
  const review = readJson(REVIEW, {});
  if (!data) { console.error('No .lyrics/data.json: run tools/lyrics-check.py first.'); process.exit(1); }
  for (const s of Object.values(data.songs)) {
    const r = review[s.key] || {};
    const need = s.rows.filter(x => x.type === 'extra' || x.status === 'changed' || x.status === 'check');
    const decided = need.filter(x => (x.type === 'extra' ? (r.extras || {})[x.id] : (r.lines || {})[x.id]));
    console.log(`${(r.done ? 'done ' : '     ')}${s.key.padEnd(9)} ${String(decided.length).padStart(3)}/${String(need.length).padEnd(3)} to check  ${s.name}${r.applied ? '  (applied)' : ''}`);
  }
}

// ------------------------------------------------------------------ server

function sendFile(req, res, file, type) {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
    const head = { 'Content-Type': type, 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) { // a byte range, as a browser asks for when it seeks
      const last = data.length - 1;
      const start = m[1] ? +m[1] : Math.max(0, data.length - +m[2]);
      const end = m[1] && m[2] ? Math.min(+m[2], last) : last;
      if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${data.length}` }); res.end(); return; }
      res.writeHead(206, { ...head, 'Content-Range': `bytes ${start}-${end}/${data.length}` });
      res.end(data.subarray(start, end + 1));
      return;
    }
    res.writeHead(200, head);
    res.end(data);
  });
}

function json(res, code, v) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(v));
}

function serve(port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const p = decodeURIComponent(url.pathname);
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) return sendFile(req, res, PAGE, 'text/html; charset=utf-8');
    if (req.method === 'GET' && p === '/api/data') {
      const data = readJson(DATA, null);
      if (!data) return json(res, 404, { error: 'No .lyrics/data.json yet: run tools/lyrics-check.py first.' });
      const now = currentLyrics();
      for (const s of Object.values(data.songs)) s.stale = sha1(now[s.key] || '') !== s.writtenHash;
      return json(res, 200, { data, review: readJson(REVIEW, {}) });
    }
    if (req.method === 'POST' && p.startsWith('/api/review/')) {
      const key = p.slice('/api/review/'.length);
      let body = '';
      req.on('data', c => { body += c; if (body.length > 2e6) req.destroy(); });
      req.on('end', () => {
        let v;
        try { v = JSON.parse(body); } catch (e) { return json(res, 400, { error: 'bad JSON' }); }
        const data = readJson(DATA, { songs: {} });
        if (!data.songs[key]) return json(res, 404, { error: 'no such song' });
        if (v.writtenHash !== data.songs[key].writtenHash) return json(res, 409, { error: 'the check was run again: reload the page' });
        const review = readJson(REVIEW, {});
        review[key] = { ...v, updated: new Date().toISOString() };
        writeJson(REVIEW, review);
        json(res, 200, { ok: true });
      });
      return;
    }
    if (req.method === 'GET' && p.startsWith('/file/')) {
      const rel = path.normalize(p.slice('/file/'.length)).replace(/\\/g, '/');
      if (!AUDIO_DIRS.some(d => rel.startsWith(d)) || rel.includes('..')) { res.writeHead(403); res.end(); return; }
      return sendFile(req, res, path.join(ROOT, rel), 'audio/mpeg');
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Lyrics review at http://127.0.0.1:${port}/  (decisions save to .lyrics/review.json; Ctrl+C to stop)`);
  });
}

const args = process.argv.slice(2);
if (args[0] === '--apply') apply(args.slice(1));
else if (args[0] === '--status') status();
else serve(+(args[0] || process.env.PORT || 8874));
