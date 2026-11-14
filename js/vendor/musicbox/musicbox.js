/* musicbox e371a2c: https://github.com/andre-larsson/musicbox
   Apache License 2.0; see LICENSE and NOTICE beside this file. Bundled by tools/music.js from src/score.js, src/random.js, src/synth.js, src/player.js,
   unchanged apart from the import and export lines. Sets window.Musicbox = { MusicPlayer, compile }. */
(function () {
const M = {};
M.score = (function () {
'use strict';
// Score parser and compiler. No audio, so it runs in the browser and in Node.
//
// Forked from the Scrimshaw score format by Simon Willison
// (https://tools.simonwillison.net/scrimshaw-jukebox), Apache License 2.0.
// Modified: converted to an ES module; musicbox extensions are marked "musicbox:".
// Every valid Scrimshaw score is a valid musicbox score and compiles to the same events.

const MELODIC = ['steeldrum', 'marimba', 'vibes', 'celesta', 'glock', 'xylophone', 'musicbox', 'bell',
  'organ', 'pipe', 'strings', 'pad', 'choir', 'voices', 'brass', 'trumpet', 'horn', 'tuba',
  'flute', 'clarinet', 'oboe', 'bassoon', 'accordion', 'fiddle',
  'harp', 'guitar', 'banjo', 'harpsichord', 'pizz', 'upright', 'fretless', 'synbass', 'timpani',
  'chip', 'sine', 'square', 'saw', 'triangle', 'piano']; // musicbox: piano
const DRUMS = ['kick', 'snare', 'rim', 'hat', 'ohat', 'ride', 'crash', 'shaker', 'tamb',
  'conga', 'tumba', 'bongo', 'bongolo', 'clave', 'block', 'cowbell', 'guiro',
  'tomlo', 'tommid', 'tomhi', 'bodhran', 'timbale', 'tri', 'clap', 'gong', 'thunder', 'surf'];
// musicbox: beds are continuous sounds that run under every cue
const BEDS = ['sea', 'wind', 'rain', 'drone'];
const ARPS = ['up', 'down', 'updown', 'random'];

const PC = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const NOTE_RE = /^([A-Ga-g])(##|bb|#|b)?([0-8])$/;
const ACC = { '': 0, '#': 1, '##': 2, b: -1, bb: -2 };

function noteToMidi(s) {
  const m = NOTE_RE.exec(s);
  if (!m) return null;
  return 12 * (+m[3] + 1) + PC[m[1].toLowerCase()] + ACC[m[2] || ''];
}

const CHORDS = {
  '': [0, 4, 7], maj: [0, 4, 7], m: [0, 3, 7], min: [0, 3, 7],
  '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], mmaj7: [0, 3, 7, 11],
  '6': [0, 4, 7, 9], m6: [0, 3, 7, 9], '9': [0, 4, 7, 10, 14], m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14],
  sus2: [0, 2, 7], sus4: [0, 5, 7], sus: [0, 5, 7], '7sus4': [0, 5, 7, 10],
  dim: [0, 3, 6], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], aug: [0, 4, 8], '+': [0, 4, 8],
  '5': [0, 7], '7b9': [0, 4, 7, 10, 13]
};

function pcOf(letter, acc) { return (PC[letter.toLowerCase()] + ACC[acc || ''] + 12) % 12; }
function placeNear(pc, lo) { return lo + (((pc - lo) % 12) + 12) % 12; }

const CHORD_RE = /^([A-G])(#|b)?([^/]*)(?:\/([A-G])(#|b)?)?$/;

// [Dm7] or [C/E] -> midi notes voiced in a window around `center`
function chordToMidis(sym, center) {
  const m = CHORD_RE.exec(sym);
  if (!m || !(m[3] in CHORDS)) return null;
  const root = pcOf(m[1], m[2]);
  const lo = center - 6;
  const set = new Set(CHORDS[m[3]].map(iv => placeNear((root + iv) % 12, lo)));
  if (m[4]) set.add(placeNear(pcOf(m[4], m[5]), lo - 12));
  return [...set].sort((a, b) => a - b);
}

// musicbox: pitch classes of a chord symbol, for the harmony line and the analyzer
function chordInfo(sym) {
  const m = CHORD_RE.exec(sym);
  if (!m || !(m[3] in CHORDS)) return null;
  const root = pcOf(m[1], m[2]);
  const pcs = CHORDS[m[3]].map(iv => (root + iv) % 12);
  const bass = m[4] ? pcOf(m[4], m[5]) : root;
  if (!pcs.includes(bass)) pcs.push(bass);
  return { root, bass, pcs };
}

// musicbox: chord symbols follow the arrangement's transposition (A+2 turns Dm into Em)
const SPELL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
function transposeChord(sym, n) {
  if (!n) return sym;
  const m = CHORD_RE.exec(sym);
  if (!m) return sym;
  const sh = (l, a) => SPELL[(pcOf(l, a) + n + 120) % 12];
  return sh(m[1], m[2]) + m[3] + (m[4] ? '/' + sh(m[4], m[5]) : '');
}

// musicbox: keys, used by the analyzer to point out notes outside the scale
const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11], ionian: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], aeolian: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11]
};
// how far the mode's tonic sits above its relative major, to pick sharps or flats
const MODE_OFFSET = { major: 0, ionian: 0, dorian: 2, phrygian: 4, lydian: 5, mixolydian: 7, minor: 9, aeolian: 9, harmonic: 9, locrian: 11 };

function parseKey(str) {
  const m = /^([A-G])(#|b)?(m)?(?:\s+([A-Za-z]+))?$/.exec(String(str).trim());
  if (!m) return null;
  let mode = m[4] ? m[4].toLowerCase() : (m[3] ? 'minor' : 'major');
  if (m[3] && m[4]) return null;
  if (!MODES[mode]) return null;
  const tonic = pcOf(m[1], m[2]);
  const relMajor = (tonic - MODE_OFFSET[mode] + 12) % 12;
  // how to name notes: keys with at most one sharp or flat use the everyday names (C# Eb F# G# Bb)
  const spell = m[2] === 'b' ? 'flat' : m[2] === '#' ? 'sharp'
    : [0, 7, 5].includes(relMajor) ? 'neutral' : [10, 3, 8, 1].includes(relMajor) ? 'flat' : 'sharp';
  return { tonic, mode, pcs: MODES[mode].map(i => (tonic + i) % 12), spell, name: m[1] + (m[2] || '') + ' ' + mode };
}

const T_HOLD = /^-+$/;
const T_HOLD_N = /^-:(\d+)$/;          // musicbox: -:8 holds for 8 steps
const T_REST = /^(\.+)(-*)$/;
const T_REST_N = /^\.:(\d+)$/;         // musicbox: .:8 rests for 8 steps
const NOTE_SRC = '[A-Ga-g](?:##|bb|#|b)?[0-8]';
// musicbox: D5:8 / [Dm]?:16 give a length in steps instead of dashes
const T_NOTE = new RegExp('^(~?)(\\[[^\\]]+\\]|' + NOTE_SRC + '(?:\\+' + NOTE_SRC + ')*)([!?]*)(-*)(?::(\\d+))?([!?]*)$');
// musicbox: harmony line tokens: Dm  Dm:8  Dm-------  [Dm]
const T_HARM = /^\[?([A-G](?:#|b)?[^\s[\]:/-]*(?:\/[A-G](?:#|b)?)?)\]?(-*)(?::(\d+))?$/;
// musicbox: {A5 C6 D6}:4 plays one of the notes, picked each time it comes round
const T_PICK = /^\{([^{}]*)\}([!?]*)(-*)(?::(\d+))?([!?]*)$/;
const REF_RE = /^([A-Za-z_]\w*?)([+-]\d+)?(?:\*(\d+))?$/;
const NAME_RE = /^[A-Za-z_]\w*$/;
const AT_VALUES = ['now', 'beat', 'bar', 'pattern', 'loop'];
const HARMONY = 'harmony';

// musicbox: split on spaces, but keep {A5 C6 D6}:4 together
function tokens(s) { return s.match(/[^\s{]*\{[^}]*\}\S*|\S+/g) || []; }

// musicbox: the key's notes in the octave around `center`
function scaleNotes(key, center) {
  const out = [];
  for (let m = center - 6; m < center + 6; m++) if (key.pcs.includes(((m % 12) + 12) % 12)) out.push(m);
  return out;
}

function velFrom(marks) {
  let v = 0.8;
  for (const ch of marks) v *= ch === '!' ? 1.25 : 0.6;
  return Math.min(1.35, v);
}

function num(s, lo, hi, def) {
  const n = parseFloat(s);
  if (!isFinite(n)) return def;
  return Math.max(lo, Math.min(hi, n));
}

/* ------------------------------------------------------------------ parse */
function parse(text) {
  const errors = [];
  const warnings = [];
  const err = (ln, msg) => errors.push({ line: ln, msg });
  const song = {
    title: 'Untitled', composer: '', about: '', tempo: 120, beats: 4, steps: 4, swing: 0,
    reverb: 0.3, mixEq: [], eqLines: [], key: null, voices: [], voiceMap: {}, patterns: {}, patternOrder: [],
    cues: {}, cueOrder: [], transitions: [], beds: [], bedMap: {}
  };
  let cur = null;
  let curCue = null;
  const declaredCues = new Set();
  const lines = String(text).split(/\r?\n/);

  // musicbox: play/loop/then lines belong to the current cue, or to "main" before any cue line
  function getCue(name, ln) {
    if (!song.cues[name]) { song.cues[name] = { name, play: [], loop: [], then: null, beds: null, ln }; song.cueOrder.push(name); }
    return song.cues[name];
  }
  function parseRef(w, ln, what) {
    const m = REF_RE.exec(w);
    if (!m) { err(ln, `Can't read "${w}"${what}. Write a pattern name, optionally with +N/-N to transpose and *N to repeat.`); return null; }
    return { name: m[1], trans: m[2] ? parseInt(m[2], 10) : 0, times: m[3] ? Math.min(64, parseInt(m[3], 10)) : 1, ln };
  }
  // musicbox: {B C C} in a play or loop line picks one pattern each time round (C twice as often)
  function parseItem(w, ln) {
    if (w[0] !== '{') return parseRef(w, ln, '');
    const m = /^\{([^{}]*)\}$/.exec(w);
    if (!m) { err(ln, `Can't read "${w}". Write a choice of patterns in braces, like {B C}. Repeats and transpositions go inside: {B*2 C+2}.`); return null; }
    const choice = m[1].split(/[\s,]+/).filter(Boolean).map(x => parseRef(x, ln, ' inside {…}'));
    if (!choice.length) { err(ln, 'Empty braces. Put two or more pattern names inside, like {B C}.'); return null; }
    if (choice.some(r => !r)) return null;
    return { choice, ln };
  }

  lines.forEach((raw, i) => {
    const ln = i + 1;
    const line = raw.replace(/(^|\s)#.*$/, '').trim();
    if (!line) return;

    const pm = /^([A-Za-z_]\w*)\s*\|(.*)$/.exec(line);
    if (pm) {
      if (!cur) { err(ln, 'Music lines go inside a pattern. Add a "pattern NAME" line above this one.'); return; }
      const parts = pm[2].split('|').map(s => s.trim());
      while (parts.length && parts[parts.length - 1] === '') parts.pop();
      const bars = [];
      parts.forEach((b, k) => {
        if (b === '') err(ln, `Empty bar ${k + 1} in "${pm[1]}". Use _ for a silent bar.`);
        else bars.push(b);
      });
      (cur.raw[pm[1]] = cur.raw[pm[1]] || []).push({ bars, ln });
      if (!cur.voiceOrder.includes(pm[1])) cur.voiceOrder.push(pm[1]);
      return;
    }

    const words = line.split(/\s+/);
    const kw = words[0].toLowerCase();
    const restStr = line.slice(words[0].length).trim();
    const target = cur ? cur.opts : song;

    switch (kw) {
      case 'title': song.title = restStr || song.title; break;
      case 'composer': case 'by': song.composer = restStr; break;
      case 'about': song.about = restStr; break;
      case 'tempo': target.tempo = num(restStr, 20, 400, 120); break;
      case 'beats': target.beats = Math.round(num(restStr, 1, 16, 4)); break;
      case 'steps': target.steps = Math.round(num(restStr, 1, 12, 4)); break;
      case 'swing': target.swing = num(restStr, 0, 0.75, 0); break;
      case 'reverb': song.reverb = num(restStr, 0, 1, 0.3); break;
      case 'eq': { // musicbox: eq NAME band band ... (NAME is a voice, a bed, or mix); names are checked at the end
        const name = words[1];
        if (!name || /=/.test(name)) { err(ln, 'Write eq, then a voice, a bed or mix, then the bands: eq bass peak=80,-4,1.2'); break; }
        const bands = [];
        for (const w of words.slice(2)) { const b = parseEqBand(w); if (typeof b === 'string') err(ln, b); else bands.push(b); }
        if (!words.slice(2).length) err(ln, `eq ${name} has no bands. Example: eq ${name} highshelf=8k,+2`);
        song.eqLines.push({ name, bands, ln });
        break;
      }
      case 'key': { // musicbox
        const k = parseKey(restStr);
        if (!k) err(ln, `Can't read the key "${restStr}". Write a tonic and a mode, like: key D minor, key F# dorian, key Bb major. Modes: ${Object.keys(MODES).join(' ')}.`);
        else target.key = k;
        break;
      }
      case 'voice': parseVoice(words.slice(1), ln); break;
      case 'pattern': {
        const name = words[1];
        if (!name || !NAME_RE.test(name)) { err(ln, 'Pattern names use letters, digits and _ (for example: pattern A2).'); cur = null; return; }
        if (song.patterns[name]) err(ln, `Pattern "${name}" is defined twice; the later one wins.`);
        cur = { name, ln, from: null, opts: {}, raw: {}, voiceOrder: [], mute: new Set() };
        for (let k = 2; k < words.length; k++) {
          const w = words[k];
          if (w.toLowerCase() === 'from') { cur.from = words[++k]; continue; }
          const kv = /^(\w+)=(.+)$/.exec(w);
          if (!kv) { err(ln, `Can't read "${w}" in the pattern line.`); continue; }
          const key = kv[1].toLowerCase();
          if (key === 'tempo') cur.opts.tempo = num(kv[2], 20, 400, 120);
          else if (key === 'beats') cur.opts.beats = Math.round(num(kv[2], 1, 16, 4));
          else if (key === 'steps') cur.opts.steps = Math.round(num(kv[2], 1, 12, 4));
          else if (key === 'swing') cur.opts.swing = num(kv[2], 0, 0.75, 0);
          else err(ln, `Unknown pattern option "${kv[1]}".`);
        }
        song.patterns[name] = cur;
        if (!song.patternOrder.includes(name)) song.patternOrder.push(name);
        break;
      }
      case 'mute':
        if (!cur) err(ln, '"mute" only works inside a pattern.');
        else words.slice(1).forEach(w => cur.mute.add(w));
        break;
      case 'cue': { // musicbox
        cur = null;
        const name = words[1];
        if (!name || !NAME_RE.test(name)) { err(ln, 'Cue names use letters, digits and _ (for example: cue explore).'); curCue = null; break; }
        if (words.length > 2) err(ln, 'A cue line holds only the cue name. Put play, loop and then on the lines below it.');
        if (declaredCues.has(name)) err(ln, `Cue "${name}" is declared twice.`);
        declaredCues.add(name);
        curCue = getCue(name, ln);
        break;
      }
      case 'play': case 'loop': {
        cur = null;
        const cue = curCue || getCue('main', ln);
        const list = kw === 'play' ? cue.play : cue.loop;
        for (const w of tokens(restStr)) { const r = parseItem(w, ln); if (r) list.push(r); }
        break;
      }
      case 'then': { // musicbox
        cur = null;
        const cue = curCue || getCue('main', ln);
        if (!words[1] || words.length > 2) err(ln, 'Write: then CUE (the cue to go to when this one has finished playing).');
        else cue.then = { name: words[1], ln };
        break;
      }
      case 'bed': parseBed(words.slice(1), ln); break; // musicbox
      case 'beds': { // musicbox: which beds sound in this cue, and how loud
        if (!curCue) { err(ln, '"beds" goes in a cue, below its cue line. Without a beds line, a cue plays every bed.'); break; }
        cur = null;
        const sel = {};
        for (const w of words.slice(1)) {
          if (w.toLowerCase() === 'none') continue;
          const m = /^([A-Za-z_]\w*)(?:=(.+))?$/.exec(w);
          if (!m) { err(ln, `Can't read "${w}". Write bed names, optionally with a level: beds sea wind=0.5`); continue; }
          sel[m[1]] = m[2] != null ? num(m[2], 0, 2, 1) : 1;
        }
        curCue.beds = { sel, ln };
        break;
      }
      case 'switch': { // musicbox
        cur = null;
        const [, from, arrow, to, ...rest] = words;
        if (!from || arrow !== '->' || !to) { err(ln, 'Write switches as: switch FROM -> TO [at now|beat|bar|pattern|loop] [via PATTERN] [fade SECONDS]. FROM and TO can be *.'); break; }
        const tr = { from, to, at: 'bar', via: null, fade: null, ln };
        for (let k = 0; k < rest.length; k += 2) {
          const key = rest[k].toLowerCase(), val = rest[k + 1];
          if (val == null) { err(ln, `"${rest[k]}" in the switch line needs a value.`); break; }
          if (key === 'at') {
            if (!AT_VALUES.includes(val.toLowerCase())) err(ln, `"at ${val}": use one of ${AT_VALUES.join(', ')}.`);
            else tr.at = val.toLowerCase();
          } else if (key === 'via') {
            if (val[0] === '{') { err(ln, 'via takes one pattern. A choice in braces only works in play and loop lines.'); break; }
            tr.via = parseRef(val, ln, ' after via');
          }
          else if (key === 'fade') tr.fade = num(val, 0, 30, 0);
          else err(ln, `Unknown switch option "${rest[k]}". Use at, via or fade.`);
        }
        song.transitions.push(tr);
        break;
      }
      default:
        err(ln, `Unknown line "${words[0]}". Lines start with a setting (title, tempo, key, voice, bed, pattern, play, loop, cue, switch…) or a voice name followed by |.`);
    }
  });

  function parseVoice(w, ln) {
    const [name, inst] = w;
    if (!name || !inst) { err(ln, 'Write voices as: voice NAME INSTRUMENT [options]'); return; }
    if (!NAME_RE.test(name)) { err(ln, `Voice name "${name}" should use letters, digits and _.`); return; }
    if (name.toLowerCase() === HARMONY) { err(ln, '"harmony" is the chord line inside patterns, not a voice. Give this voice another name.'); return; }
    const instL = inst.toLowerCase();
    const isDrum = DRUMS.includes(instL);
    if (!isDrum && !MELODIC.includes(instL)) { err(ln, `Unknown instrument "${inst}".`); return; }
    const v = {
      name, inst: instL, drum: isDrum, vol: 0.8, pan: 0, rev: null, trans: 0, glide: 0.07,
      gate: 1, center: 62, bright: 1, att: null, rel: null, layer: 0,
      chance: 1, jitter: 0, arp: null, rate: 1, pool: 'chord', span: 1, human: 1, eq: null, ln // musicbox
    };
    for (const opt of w.slice(2)) {
      const kv = /^(\w+)=(.+)$/.exec(opt);
      if (!kv) { err(ln, `Voice options look like key=value; got "${opt}".`); continue; }
      const k = kv[1].toLowerCase(), val = kv[2];
      switch (k) {
        case 'vol': v.vol = num(val, 0, 2, 0.8); break;
        case 'pan': v.pan = num(val, -1, 1, 0); break;
        case 'rev': v.rev = num(val, 0, 1, 0.2); break;
        case 'trans': v.trans = Math.round(num(val, -48, 48, 0)); break;
        case 'oct': v.trans += 12 * Math.round(num(val, -4, 4, 0)); break;
        case 'glide': v.glide = num(val, 0.005, 2, 0.07); break;
        case 'gate': v.gate = num(val, 0.05, 1, 1); break;
        case 'bright': v.bright = num(val, 0.1, 4, 1); break;
        case 'att': v.att = num(val, 0.001, 4, 0.01); break;
        case 'rel': v.rel = num(val, 0.005, 6, 0.1); break;
        case 'layer': v.layer = Math.round(num(val, 0, 9, 0)); break; // musicbox
        // musicbox: chance and looseness, rolled each time a note comes round
        case 'chance': v.chance = num(val, 0, 1, 1); break;
        case 'jitter': v.jitter = num(val, 0, 1, 0); break;
        case 'human': v.human = num(val, 0, 2, 1); break; // musicbox: player looseness, see synth.js
        case 'low': err(ln, `low= is now an eq line: eq ${name} lowshelf=150,-4 (or a peak= cut at the note that booms).`); break; // musicbox
        // musicbox: arpeggiator for chords ([*], [Dm], C4+E4+G4)
        case 'arp': {
          const a = val.toLowerCase();
          if (!ARPS.includes(a)) err(ln, `arp= takes ${ARPS.join(', ')}; got "${val}".`);
          else if (isDrum) err(ln, `arp= only works on melodic voices; "${name}" is a ${instL}.`);
          else v.arp = a;
          break;
        }
        case 'rate': v.rate = Math.round(num(val, 1, 48, 1)); break;
        case 'span': v.span = Math.round(num(val, 1, 4, 1)); break;
        case 'pool': {
          const pl = val.toLowerCase();
          if (pl !== 'chord' && pl !== 'scale') err(ln, `pool= takes chord or scale; got "${val}".`); else v.pool = pl;
          break;
        }
        case 'center': {
          const m = noteToMidi(val);
          if (m == null) err(ln, `center= needs a note like E4; got "${val}".`); else v.center = m;
          break;
        }
        default: err(ln, `Unknown voice option "${kv[1]}".`);
      }
    }
    if (song.voiceMap[name]) err(ln, `Voice "${name}" is declared twice.`);
    else if (song.bedMap[name]) err(ln, `"${name}" is already a bed. Give the voice another name.`);
    else { song.voiceMap[name] = v; song.voices.push(v); }
  }

  // musicbox: bed NAME INSTRUMENT [vol= pan= rev= layer= bright= swell= note=]
  function parseBed(w, ln) {
    const [name, inst] = w;
    if (!name || !inst) { err(ln, `Write beds as: bed NAME INSTRUMENT [options]. Instruments: ${BEDS.join(' ')}.`); return; }
    if (!NAME_RE.test(name)) { err(ln, `Bed name "${name}" should use letters, digits and _.`); return; }
    const instL = inst.toLowerCase();
    if (!BEDS.includes(instL)) { err(ln, `Unknown bed "${inst}". Beds: ${BEDS.join(' ')}.`); return; }
    const b = { name, inst: instL, vol: 0.8, pan: 0, rev: null, layer: 0, bright: 1, swell: null, note: null, ln };
    for (const opt of w.slice(2)) {
      const kv = /^(\w+)=(.+)$/.exec(opt);
      if (!kv) { err(ln, `Bed options look like key=value; got "${opt}".`); continue; }
      const k = kv[1].toLowerCase(), val = kv[2];
      switch (k) {
        case 'vol': b.vol = num(val, 0, 2, 0.8); break;
        case 'pan': b.pan = num(val, -1, 1, 0); break;
        case 'rev': b.rev = num(val, 0, 1, 0.3); break;
        case 'layer': b.layer = Math.round(num(val, 0, 9, 0)); break;
        case 'bright': b.bright = num(val, 0.1, 4, 1); break;
        case 'swell': b.swell = num(val, 1, 120, 12); break;
        case 'note': {
          const m = noteToMidi(val);
          if (m == null) err(ln, `note= needs a note like A1; got "${val}".`); else b.note = m;
          break;
        }
        default: err(ln, `Unknown bed option "${kv[1]}". Use vol, pan, rev, layer, bright, swell or note.`);
      }
    }
    if (b.inst === 'drone' && b.note == null) err(ln, `A drone needs a pitch: bed ${name} drone note=A1`);
    if (b.inst !== 'drone' && b.note != null) err(ln, `note= only applies to drone beds.`);
    if (song.bedMap[name] || song.voiceMap[name]) err(ln, `"${name}" is already declared.`);
    else { song.bedMap[name] = b; song.beds.push(b); }
  }

  // musicbox: attach eq bands to their voice, bed or the whole mix
  for (const { name, bands, ln } of song.eqLines) {
    const target = name.toLowerCase() === 'mix' ? null : song.voiceMap[name] || song.bedMap[name];
    if (name.toLowerCase() === 'mix') song.mixEq.push(...bands);
    else if (!target) err(ln, `eq names a voice, a bed or mix; there is no "${name}".`);
    else target.eq = (target.eq || []).concat(bands);
  }

  return { song, errors, warnings };
}

// musicbox: one eq band, TYPE=FREQ[,GAIN][,Q], for example peak=80,-4,1.2 or highshelf=8k,+2
const EQ_BANDS = { highpass: ['q'], lowpass: ['q'], notch: ['q'], lowshelf: ['gain'], highshelf: ['gain'], peak: ['gain', 'q'] };
const EQ_Q = { highpass: 0.707, lowpass: 0.707, notch: 2, peak: 1 };
function parseEqBand(w) {
  const kv = /^(\w+)=(.+)$/.exec(w);
  const type = kv && kv[1].toLowerCase(), fields = type && EQ_BANDS[type];
  const usage = 'Bands are highpass=FREQ[,Q] lowpass=FREQ[,Q] lowshelf=FREQ,GAIN highshelf=FREQ,GAIN peak=FREQ,GAIN[,Q] notch=FREQ[,Q]';
  if (!fields) return `Can't read the eq band "${w}". ${usage}, like peak=80,-4,1.2 or highshelf=8k,+2.`;
  const parts = kv[2].split(',');
  const fm = /^(\d+(?:\.\d+)?)(k)?(?:hz)?$/i.exec(parts[0]);
  if (!fm) return `"${parts[0]}" in ${w} isn't a frequency. Write 80, 2.5k or 10k.`;
  const f = parseFloat(fm[1]) * (fm[2] ? 1000 : 1);
  if (f < 20 || f > 20000) return `${w}: the frequency must be between 20 and 20k.`;
  if (parts.length - 1 > fields.length) return `${w} has too many values. ${usage}.`;
  const band = { type, f, gain: 0, q: EQ_Q[type] || 0.707 };
  for (let i = 0; i < fields.length; i++) {
    const s = parts[i + 1];
    if (s == null) { if (fields[i] === 'gain') return `${w} needs a gain in dB, like ${type}=${parts[0]},-3.`; continue; }
    const n = parseFloat(s.replace(/db$/i, ''));
    if (!isFinite(n)) return `"${s}" in ${w} isn't a number.`;
    if (fields[i] === 'gain') { if (n < -24 || n > 24) return `${w}: the gain must be between -24 and +24 dB.`; band.gain = n; }
    else { if (n < 0.1 || n > 20) return `${w}: Q must be between 0.1 and 20.`; band.q = n; }
  }
  return band;
}

/* ------------------------------------------------------- pattern bodies */
function parseMelodicBars(bars, barSteps, voice, ctx) {
  const events = [];
  let last = null;
  const out = [];
  // musicbox: [*] plays whatever the harmony line says at that step
  const starNotes = step => {
    const h = ctx.chordAt(step);
    return h ? chordToMidis(h.sym, voice.center) : null;
  };
  // musicbox: the choices inside {…}; each is a list of notes, and [] is a rest
  const poolAt = (items, step, where) => {
    const out = [];
    for (const it of items) {
      if (it === '.') out.push([]);
      else if (it === 'chord') {
        const ns = starNotes(step);
        if (!ns) { ctx.err(`{chord} in ${where} picks from the current chord, but the pattern has no harmony line at that point.`); continue; }
        ns.forEach(n => out.push([n]));
      } else if (it === 'scale') {
        if (!ctx.key) { ctx.err(`{scale} in ${where} picks from the key, but there's no key. Add a key line (key A minor).`); continue; }
        scaleNotes(ctx.key, voice.center).forEach(n => out.push([n]));
      } else {
        const n = noteToMidi(it);
        if (n == null) { ctx.err(`Can't read "${it}" inside {…} in ${where}. Use notes like A5, . for silence, chord, or scale.`); continue; }
        out.push([n]);
      }
    }
    return out;
  };
  bars.forEach((barSrc, bi) => {
    const start = bi * barSteps;
    const where = `bar ${bi + 1} of "${voice.name}" in pattern ${ctx.pattern}`;
    const trimmed = barSrc.trim();
    if (trimmed === '%') {
      const prev = events.filter(e => e.step >= start - barSteps && e.step < start);
      if (bi === 0) ctx.err(`% in ${where} has no previous bar to repeat.`);
      prev.forEach(e => {
        const c = Object.assign({}, e, { step: e.step + barSteps });
        if (e.star) { c.notes = starNotes(c.step) || []; if (!c.notes.length) return; } // musicbox: follow the harmony
        if (e.items && e.items.includes('chord')) { c.pick = poolAt(e.items, c.step, where); if (!c.pick.some(o => o.length)) return; }
        events.push(c);
      });
      last = events.length ? events[events.length - 1] : null;
      return;
    }
    if (trimmed === '_') { last = null; return; }
    if (trimmed === '=') {
      if (last && last.step + last.len === start) last.len += barSteps;
      else ctx.err(`= in ${where} needs a note sounding right up to the bar line.`);
      return;
    }
    let pos = start;
    for (const tok of tokens(trimmed)) { // musicbox: tokens() keeps {…} together
      let m;
      if (T_HOLD.test(tok) || (m = T_HOLD_N.exec(tok))) {
        const n = m ? +m[1] : tok.length;
        if (m && n < 1) ctx.err(`"${tok}" in ${where} needs a length of at least 1.`);
        if (last && last.step + last.len === pos) last.len += n;
        pos += n;
      } else if ((m = T_REST.exec(tok))) {
        pos += m[1].length + m[2].length;
        last = null;
      } else if ((m = T_REST_N.exec(tok))) {
        if (+m[1] < 1) ctx.err(`"${tok}" in ${where} needs a length of at least 1.`);
        pos += +m[1];
        last = null;
      } else if ((m = T_NOTE.exec(tok))) {
        const head = m[2];
        let notes;
        let star = false;
        if (head === '[*]') {
          star = true;
          notes = starNotes(pos);
          if (!notes) { ctx.err(`[*] in ${where} plays the current chord, but the pattern has no harmony line at that point.`); notes = []; }
        } else if (head[0] === '[') {
          notes = chordToMidis(head.slice(1, -1), voice.center);
          if (!notes) { ctx.err(`Unknown chord "${head}" in ${where}.`); notes = []; }
        } else {
          notes = head.split('+').map(noteToMidi);
        }
        if (m[4] && m[5]) ctx.err(`"${tok}" in ${where} uses both dashes and :N. Use one of them.`);
        if (m[5] && +m[5] < 1) ctx.err(`"${tok}" in ${where} needs a length of at least 1.`);
        const len = m[5] ? Math.max(1, +m[5]) : 1 + m[4].length;
        last = { step: pos, len, notes, vel: velFrom(m[3] + m[6]), glide: m[1] === '~' };
        if (star) last.star = true;
        if (notes.length) events.push(last);
        pos += len;
      } else if ((m = T_PICK.exec(tok))) { // musicbox: {A5 C6 .}:4
        const items = m[1].split(/[\s,]+/).filter(Boolean);
        if (!items.length) ctx.err(`Empty braces in ${where}. Put notes inside, like {A5 C6 D6}.`);
        if (m[3] && m[4]) ctx.err(`"${tok}" in ${where} uses both dashes and :N. Use one of them.`);
        if (m[4] && +m[4] < 1) ctx.err(`"${tok}" in ${where} needs a length of at least 1.`);
        const len = m[4] ? Math.max(1, +m[4]) : 1 + m[3].length;
        const pick = poolAt(items, pos, where);
        last = { step: pos, len, notes: [], pick, items, vel: velFrom(m[2] + m[5]), glide: false };
        if (pick.some(o => o.length)) events.push(last);
        pos += len;
      } else if (tok === '%' || tok === '_' || tok === '=') {
        ctx.err(`"${tok}" must be alone in its bar (${where}).`);
      } else if (tok[0] === '{' || tok.includes('}')) {
        ctx.err(`Can't read "${tok}" in ${where}. Write a choice of notes as {A5 C6 D6}, with the length after the closing brace: {A5 C6 D6}:4.`);
      } else {
        ctx.err(`Can't read "${tok}" in ${where}. Notes look like D5, F#4, Bb3, chords like [Dm] or C4+E4+G4, lengths like D5--- or D5:4.`);
      }
    }
    const used = pos - start;
    if (used !== barSteps) {
      ctx.err(`${where[0].toUpperCase() + where.slice(1)} has ${used} steps; a bar here holds ${barSteps}.`);
      // clip anything spilling into the next bar so later bars stay aligned
      for (const e of events) if (e.step >= start + barSteps) e.len = 0;
      if (last && last.step + last.len > start + barSteps && used > barSteps) last.len = Math.max(1, start + barSteps - last.step);
    }
  });
  for (const e of events) if (e.len > 0) out.push(e);
  return out;
}

function parseDrumBars(bars, barSteps, voice, ctx) {
  const events = [];
  bars.forEach((barSrc, bi) => {
    const start = bi * barSteps;
    const where = `bar ${bi + 1} of "${voice.name}" in pattern ${ctx.pattern}`;
    const s = barSrc.replace(/\s+/g, '');
    if (s === '%') {
      if (bi === 0) ctx.err(`% in ${where} has no previous bar to repeat.`);
      events.filter(e => e.step >= start - barSteps && e.step < start)
        .forEach(e => events.push({ step: e.step + barSteps, len: 1, vel: e.vel }));
      return;
    }
    if (s === '_') return;
    let k = 0;
    for (const ch of s) {
      if (k < barSteps) {
        if (ch === 'x') events.push({ step: start + k, len: 1, vel: 0.8 });
        else if (ch === 'X') events.push({ step: start + k, len: 1, vel: 1.05 });
        else if (ch === 'o') events.push({ step: start + k, len: 1, vel: 0.42 });
        else if (ch !== '.' && ch !== '-') ctx.err(`Drum lanes use x X o and . — found "${ch}" in ${where}.`);
      }
      k++;
    }
    if (k !== barSteps) ctx.err(`${where[0].toUpperCase() + where.slice(1)} has ${k} steps; a bar here holds ${barSteps}.`);
  });
  return events;
}

// musicbox: the arpeggiator. A chord on a voice with arp= becomes one note every `rate`
// steps, in order (up, down, updown) or picked at random. [*] follows chord changes as it goes.
function arpeggiate(events, voice, ctx) {
  const out = [];
  let warned = false;
  for (const e of events) {
    if (!(e.notes.length > 1 || e.star)) { out.push(e); continue; }
    let k = 0;
    for (let s = e.step; s < e.step + e.len; s += voice.rate, k++) {
      let notes = e.notes;
      if (e.star) { const h = ctx.chordAt(s); if (h) notes = chordToMidis(h.sym, voice.center) || notes; }
      if (!notes.length) continue;
      let pool = notes;
      if (voice.pool === 'scale') {
        if (!ctx.key) { if (!warned) ctx.err(`"${voice.name}" has pool=scale, so it needs a key. Add a key line (key A minor).`); warned = true; }
        else { const lo = notes[0]; pool = []; for (let m = lo; m < lo + 12; m++) if (ctx.key.pcs.includes(((m % 12) + 12) % 12)) pool.push(m); }
      }
      const full = [];
      for (let o = 0; o < voice.span; o++) for (const n of pool) full.push(n + 12 * o);
      const n = full.length;
      const len = Math.min(voice.rate, e.step + e.len - s);
      const ne = { step: s, len, notes: [], vel: e.vel, glide: false, arp: voice.arp };
      if (voice.arp === 'random') { ne.pick = full.map(x => [x]); ne.items = null; }
      else {
        const period = Math.max(1, 2 * n - 2);
        const i = voice.arp === 'up' ? k % n : voice.arp === 'down' ? n - 1 - (k % n)
          : (n === 1 ? 0 : (k % period < n ? k % period : period - (k % period)));
        ne.notes = [full[i]];
      }
      out.push(ne);
    }
  }
  return out;
}

// musicbox: join timelines end to end (used for {B C} choices in play and loop lines)
function assemble(tls) {
  const events = [], sections = [];
  let t = 0;
  for (const tl of tls) {
    const so = sections.length;
    for (const sec of tl.sections) sections.push(Object.assign({}, sec, { start: sec.start + t }));
    for (const e of tl.events) events.push(Object.assign({}, e, { t: e.t + t, s: e.s + so }));
    t += tl.dur;
  }
  return { events, sections, dur: t };
}

// musicbox: the harmony line. Each bar holds chord names that either share the bar
// evenly (no lengths) or all carry a length (Dm:12 A7:4 or Dm----------- A7---).
function parseHarmonyBars(bars, barSteps, ctx) {
  const out = [];
  bars.forEach((barSrc, bi) => {
    const start = bi * barSteps;
    const where = `bar ${bi + 1} of the harmony line in pattern ${ctx.pattern}`;
    const s = barSrc.trim();
    if (s === '%' || s === '=') {
      if (bi === 0) { ctx.err(`${s} in ${where} has no previous bar.`); return; }
      if (s === '%') {
        out.filter(h => h.step >= start - barSteps && h.step < start)
          .forEach(h => out.push(Object.assign({}, h, { step: h.step + barSteps })));
      } else {
        const last = out[out.length - 1];
        if (last && last.step + last.len === start) last.len += barSteps;
        else ctx.err(`= in ${where} needs a chord sounding right up to the bar line.`);
      }
      return;
    }
    if (s === '_') return;
    const items = [];
    for (const tok of s.split(/\s+/)) {
      const m = T_HARM.exec(tok);
      if (!m) { ctx.err(`Can't read "${tok}" in ${where}. Write chord names like Dm, G7 or C/E, optionally with a length: Dm:8 or Dm-------.`); continue; }
      const info = chordInfo(m[1]);
      if (!info) { ctx.err(`Unknown chord "${m[1]}" in ${where}.`); continue; }
      if (m[2] && m[3]) ctx.err(`"${tok}" in ${where} uses both dashes and :N. Use one of them.`);
      const sized = !!(m[2] || m[3]);
      items.push({ sym: m[1], info, len: m[3] ? Math.max(1, +m[3]) : 1 + m[2].length, sized });
    }
    if (!items.length) return;
    if (items.every(it => !it.sized)) {
      if (barSteps % items.length) {
        ctx.err(`${where[0].toUpperCase() + where.slice(1)} shares ${barSteps} steps between ${items.length} chords, which doesn't divide evenly. Give each chord a length, like Dm:${Math.floor(barSteps / items.length)}.`);
        return;
      }
      items.forEach(it => { it.len = barSteps / items.length; });
    } else if (items.some(it => !it.sized)) {
      ctx.err(`In ${where}, give every chord a length or none of them.`);
      return;
    } else {
      const used = items.reduce((a, it) => a + it.len, 0);
      if (used !== barSteps) ctx.err(`${where[0].toUpperCase() + where.slice(1)} has ${used} steps; a bar here holds ${barSteps}.`);
    }
    let pos = start;
    for (const it of items) {
      if (pos >= start + barSteps) break;
      out.push({ step: pos, len: Math.min(it.len, start + barSteps - pos), sym: it.sym, root: it.info.root, bass: it.info.bass, pcs: it.info.pcs });
      pos += it.len;
    }
  });
  return out;
}

/* ---------------------------------------------------------------- compile */
function compile(text) {
  const { song, errors, warnings } = parse(text);
  const err = (ln, msg) => errors.push({ line: ln, msg });
  const warn = (ln, msg) => warnings.push({ line: ln, msg });

  const resolved = {};
  function resolve(name, stack) {
    if (resolved[name]) return resolved[name];
    const p = song.patterns[name];
    if (!p) return null;
    let raw = {}, opts = {}, order = [], mute = new Set();
    if (p.from) {
      if (stack.includes(p.from)) { err(p.ln, `Pattern "${name}" builds on itself through "from".`); }
      else {
        const base = resolve(p.from, stack.concat(name));
        if (!base) err(p.ln, `Pattern "${name}" builds on "${p.from}", which doesn't exist.`);
        else { raw = Object.assign({}, base.raw); opts = Object.assign({}, base.opts); order = base.order.slice(); mute = new Set(base.mute); }
      }
    }
    for (const v of p.voiceOrder) { raw[v] = p.raw[v]; mute.delete(v); if (!order.includes(v)) order.push(v); }
    p.mute.forEach(v => mute.add(v));
    Object.assign(opts, p.opts);
    return (resolved[name] = { name, ln: p.ln, raw, opts, order, mute });
  }

  const compiled = {};
  function compilePattern(name) {
    if (compiled[name]) return compiled[name];
    const r = resolve(name, []);
    if (!r) return null;
    const tempo = r.opts.tempo || song.tempo;
    const beats = r.opts.beats || song.beats;
    const steps = r.opts.steps || song.steps;
    const swing = r.opts.swing != null ? r.opts.swing : song.swing;
    const key = r.opts.key || song.key;
    const barSteps = beats * steps;
    const perVoice = {};
    const barCounts = {};
    let nBars = 0;
    // report errors on the specific line that holds the bar
    const ctxFor = lines => {
      const barLine = [];
      lines.forEach(l => l.bars.forEach(() => barLine.push(l.ln)));
      return {
        pattern: name,
        key, // musicbox: for {scale} and pool=scale
        chordAt: () => null,
        err: m => {
          const bm = /bar (\d+)/i.exec(m); // musicbox: /i, so "Bar 5 of …" points at the right line too
          err(bm ? barLine[+bm[1] - 1] || lines[0].ln : lines[0].ln, m);
        }
      };
    };
    // musicbox: read the harmony line first so [*] can look chords up
    let harmony = [];
    if (r.raw[HARMONY] && !r.mute.has(HARMONY)) {
      const lines = r.raw[HARMONY];
      const bars = [].concat(...lines.map(l => l.bars));
      harmony = parseHarmonyBars(bars, barSteps, ctxFor(lines));
      barCounts[HARMONY] = { bars: bars.length, ln: lines[0].ln };
      nBars = Math.max(nBars, bars.length);
    }
    const chordAt = step => harmony.find(h => step >= h.step && step < h.step + h.len) || null;
    for (const vName of r.order) {
      if (vName === HARMONY || r.mute.has(vName)) continue;
      const voice = song.voiceMap[vName];
      const lines = r.raw[vName];
      if (!voice) { err(lines[0].ln, `"${vName}" isn't a voice. Declare it first: voice ${vName} INSTRUMENT`); continue; }
      const bars = [].concat(...lines.map(l => l.bars));
      const ctx = ctxFor(lines);
      ctx.chordAt = chordAt;
      perVoice[vName] = voice.drum ? parseDrumBars(bars, barSteps, voice, ctx) : parseMelodicBars(bars, barSteps, voice, ctx);
      if (voice.arp) perVoice[vName] = arpeggiate(perVoice[vName], voice, ctx); // musicbox
      barCounts[vName] = { bars: bars.length, ln: lines[0].ln };
      nBars = Math.max(nBars, bars.length);
    }
    if (!nBars) err(r.ln, `Pattern "${name}" has no music lines.`);
    // musicbox: a short part is usually a mistake, so say so
    for (const vName in barCounts) {
      const n = barCounts[vName].bars;
      if (n < nBars) warn(barCounts[vName].ln, `"${vName}" has ${n} bar${n === 1 ? '' : 's'} in pattern ${name}, but the pattern is ${nBars} bars long, so it's silent for the last ${nBars - n}. Fill the gap with _ bars if that's intended.`);
    }
    return (compiled[name] = {
      name, ln: r.ln, tempo, beats, steps, swing, key, barSteps, bars: Math.max(1, nBars), perVoice, harmony, barCounts
    });
  }

  const voices = song.voices;
  const vIndex = {};
  voices.forEach((v, i) => { vIndex[v.name] = i; });
  const lastMidi = {};

  function timeline(refs) {
    const events = [], sections = [];
    let t = 0;
    for (const ref of refs) {
      const p = compilePattern(ref.name);
      if (!p) { err(ref.ln, `There's no pattern called "${ref.name}".`); continue; }
      const stepDur = 60 / p.tempo / p.steps;
      const sw = (p.steps % 2 === 0) ? p.swing : 0;
      const timeOf = s => (s + (s % 2 === 1 ? sw : 0)) * stepDur;
      const total = p.bars * p.barSteps;
      for (let rep = 0; rep < ref.times; rep++) {
        const sIdx = sections.length;
        sections.push({
          name: ref.name, trans: ref.trans, start: t, dur: total * stepDur, bars: p.bars,
          barDur: p.barSteps * stepDur, tempo: p.tempo, beats: p.beats, steps: p.steps,
          // musicbox: chord changes, in seconds from the section start, for players and editors
          harmony: p.harmony.map(h => ({ t: timeOf(h.step), d: timeOf(Math.min(total, h.step + h.len)) - timeOf(h.step), sym: transposeChord(h.sym, ref.trans) }))
        });
        const evs = [];
        for (const vName in p.perVoice) {
          const voice = song.voiceMap[vName];
          const vi = vIndex[vName];
          let prev = lastMidi[vi]; // musicbox: a `~` slides from this voice's previous note, even inside the pattern
          for (const e of p.perVoice[vName]) {
            if (e.step >= total) continue;
            const t0 = timeOf(e.step);
            let d = timeOf(Math.min(total, e.step + e.len)) - t0;
            const ev = { t: t + t0, d, v: vi, vel: e.vel, s: sIdx };
            if (!voice.drum) {
              if (e.pick) ev.pick = e.pick.map(o => o.map(n => n + voice.trans + ref.trans)); // musicbox: the player picks one
              else ev.m = e.notes.map(n => n + voice.trans + ref.trans);
              ev.d = Math.max(0.02, d * voice.gate);
              if (e.glide && prev != null) ev.g = prev + 0;
              if (ev.m && ev.m.length) prev = ev.m[ev.m.length - 1];
            }
            evs.push(ev);
          }
        }
        evs.sort((a, b) => a.t - b.t || a.v - b.v);
        for (const ev of evs) { if (ev.m) lastMidi[ev.v] = ev.m[ev.m.length - 1]; events.push(ev); }
        t += total * stepDur;
      }
    }
    return { events, sections, dur: t };
  }

  // musicbox: compile every pattern, so mistakes in ones that aren't played yet still show up
  song.patternOrder.forEach(compilePattern);

  // musicbox: cues. Scores without cue lines get one cue, "main", exactly like Scrimshaw.
  if (!song.cueOrder.length) {
    song.cues.main = {
      name: 'main', play: [], ln: 1, then: null,
      loop: song.patternOrder.map(n => ({ name: n, trans: 0, times: 1, ln: song.patterns[n].ln }))
    };
    song.cueOrder.push('main');
  }
  // musicbox: a play or loop line with {B C} choices compiles each choice once; the player
  // joins one per slot each time round. `intro` and `loop` hold the first choices, for tools.
  function cueParts(items) {
    if (!items.some(it => it.choice)) return { tl: timeline(items), slots: null };
    const cache = new Map();
    const one = r => {
      const k = `${r.name}${r.trans}*${r.times}`;
      if (!cache.has(k)) cache.set(k, timeline([r]));
      return cache.get(k);
    };
    const slots = items.map(it => (it.choice || [it]).map(one));
    return { tl: assemble(slots.map(sl => sl[0])), slots };
  }
  const cues = {};
  for (const name of song.cueOrder) {
    const c = song.cues[name];
    const intro = cueParts(c.play), loop = cueParts(c.loop);
    let beds = null;
    if (c.beds) {
      beds = c.beds.sel;
      for (const b in beds) if (!song.bedMap[b]) err(c.beds.ln, `"${b}" isn't a bed. Declare it with: bed ${b} INSTRUMENT`);
    }
    cues[name] = {
      name, ln: c.ln, intro: intro.tl, loop: loop.tl, then: c.then ? c.then.name : null,
      introSlots: intro.slots, loopSlots: loop.slots, beds
    };
  }
  for (const name of song.cueOrder) {
    const c = song.cues[name], cc = cues[name];
    if (c.then && !cues[c.then.name]) err(c.then.ln, `Cue "${name}" goes on to "${c.then.name}", which isn't a cue.`);
    if (c.then && cc.loop.dur) warn(c.then.ln, `Cue "${name}" loops forever, so its "then" never happens.`);
    if (!cc.intro.dur && !cc.loop.dur && !c.play.length && !c.loop.length) {
      if (song.cueOrder.length === 1 && !song.patternOrder.length) { if (!errors.length) err(1, 'Nothing to play yet. Add a pattern and a loop line.'); }
      else err(c.ln, `Cue "${name}" has nothing to play. Give it a play or loop line.`);
    }
  }
  const defaultCue = cues.main ? 'main' : song.cueOrder[0];

  const transitions = [];
  for (const tr of song.transitions) {
    if (tr.from !== '*' && !cues[tr.from]) err(tr.ln, `"${tr.from}" isn't a cue. Declare it with: cue ${tr.from}`);
    if (tr.to !== '*' && !cues[tr.to]) err(tr.ln, `"${tr.to}" isn't a cue. Declare it with: cue ${tr.to}`);
    transitions.push({ from: tr.from, to: tr.to, at: tr.at, fade: tr.fade, ln: tr.ln, via: tr.via ? timeline([tr.via]) : null, viaName: tr.via ? tr.via.name : null });
  }

  // musicbox: patterns that nothing plays are probably forgotten
  const used = new Set();
  for (const name of song.cueOrder) for (const it of song.cues[name].play.concat(song.cues[name].loop)) for (const r of it.choice || [it]) used.add(r.name);
  for (const tr of song.transitions) if (tr.via) used.add(tr.via.name);
  for (const n of song.patternOrder) if (song.patterns[n].from) used.add(song.patterns[n].from);
  for (const n of song.patternOrder) if (!used.has(n)) warn(song.patterns[n].ln, `Pattern "${n}" is never played. Add it to a play or loop line, or use it as a via.`);

  errors.sort((a, b) => a.line - b.line);
  warnings.sort((a, b) => a.line - b.line);
  return {
    title: song.title, composer: song.composer, about: song.about, tempo: song.tempo,
    beats: song.beats, steps: song.steps, reverb: song.reverb, mixEq: song.mixEq, key: song.key,
    voices, intro: cues[defaultCue].intro, loop: cues[defaultCue].loop,
    cues, cueOrder: song.cueOrder.slice(), defaultCue, transitions, beds: song.beds,
    patterns: compiled, errors, warnings, patternCount: song.patternOrder.length
  };
}
return { parse, compile, noteToMidi, chordToMidis, chordInfo, parseKey, transposeChord, assemble, scaleNotes, MELODIC, DRUMS, BEDS, ARPS, CHORDS, MODES };
})();

M.random = (function () {
'use strict';
// Dice for scores: {…} note choices, chance= and jitter= on voices, and {B C} pattern choices.
// The compiler keeps every choice; the player rolls them each time the music comes round.
// The same seed gives the same music for the same sequence of calls.

const { assemble } = M.score;

/** A seeded random number generator (mulberry32). Returns a function giving numbers in [0, 1). */
function createRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomSeed() { return Math.floor(Math.random() * 2 ** 31); }

/**
 * Roll one compiled event for `voice`. Returns null when it doesn't sound this time, or
 * { ev, dt }: the event to play (with a concrete note list) and how many seconds late to play it.
 */
function realize(ev, voice, rng) {
  if (voice && voice.chance < 1 && rng() >= voice.chance) return null;
  let out = ev;
  if (ev.pick) {
    const choice = ev.pick[Math.floor(rng() * ev.pick.length)];
    if (!choice || !choice.length) return null;
    out = Object.assign({}, ev, { m: choice });
    delete out.pick;
  }
  const dt = voice && voice.jitter > 0 ? rng() * voice.jitter : 0;
  return { ev: out, dt };
}

/** The timeline for one pass through a cue's intro or loop, picking one pattern per {…} slot. */
function pass(cue, kind, rng) {
  const slots = kind === 'intro' ? cue.introSlots : cue.loopSlots;
  if (!slots) return kind === 'intro' ? cue.intro : cue.loop;
  return assemble(slots.map(sl => sl[Math.floor(rng() * sl.length)]));
}
return { createRng, randomSeed, realize, pass };
})();

M.synth = (function () {
'use strict';
// Web Audio synthesizer: every instrument is built from oscillators, noise and
// filters at play time. No samples.
//
// Forked from the Scrimshaw jukebox synth by Simon Willison
// (https://tools.simonwillison.net/scrimshaw-jukebox), Apache License 2.0.
// Modified: converted to an ES module; musicbox extensions are marked "musicbox:".

const { createRng, realize, pass } = M.random; // musicbox

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

/* --------------------------------------------------------------- helpers */
function G(S, v = 0) { const g = S.ctx.createGain(); g.gain.value = v; return g; }
function F(S, type, f, q = 0.7, gainDb) {
  const b = S.ctx.createBiquadFilter(); b.type = type;
  b.frequency.value = clamp(f, 10, S.nyq * 0.95); b.Q.value = q;
  if (gainDb != null) b.gain.value = gainDb;
  return b;
}
function O(S, type, f, t, stop, p, ratio = 1, detune = 0) {
  const o = S.ctx.createOscillator();
  if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
  const ff = clamp(f * ratio, 1, S.nyq * 0.98);
  if (p && p.from) {
    o.frequency.setValueAtTime(clamp(p.from * ratio, 1, S.nyq * 0.98), t);
    o.frequency.exponentialRampToValueAtTime(ff, t + p.glide);
  } else o.frequency.setValueAtTime(ff, t);
  const dc = detune + (p && p.cents ? p.cents : 0); // musicbox: p.cents, the note's own tuning
  if (dc) o.detune.value = dc;
  o.start(t); o.stop(stop);
  return o;
}
// musicbox: louder notes are brighter. p.dyn is the note's written dynamic: 0.8 plain, 1 with !,
// 0.48 with ?. Returns about 1 for a plain note, so a plain note sounds as it did before.
const dynB = p => 0.45 + 0.7 * (p && p.dyn != null ? p.dyn : 0.8);
// sustained envelope; returns time when the voice is silent
function adsr(param, t, d, { a = 0.01, dc = 0.1, s = 1, r = 0.1, peak = 1 }) {
  const tOn = t + a, tOff = Math.max(t + d, tOn + 0.003);
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, tOn);
  if (s < 1) param.setTargetAtTime(peak * s, tOn, Math.max(0.002, dc / 3));
  param.setTargetAtTime(0, tOff, Math.max(0.002, r / 4));
  return tOff + r * 1.8 + 0.03;
}
// struck envelope; optional damping time
function perc(param, t, { a = 0.002, tau = 0.3, peak = 1, damp = null, dampTau = 0.06 }) {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + a);
  param.setTargetAtTime(0, t + a, Math.max(0.002, tau));
  let end = t + a + tau * 7;
  if (damp != null && damp + dampTau * 7 < end) {
    const td = Math.max(damp, t + a + 0.002);
    param.setTargetAtTime(0, td, dampTau);
    end = td + dampTau * 7;
  }
  return end;
}
function partial(S, out, t, f, opt) {
  if (f >= S.nyq * 0.9) return;
  const g = G(S); g.connect(out);
  const end = perc(g.gain, t, opt);
  const o = O(S, opt.type || 'sine', f, t, end);
  if (opt.bend) { o.frequency.setValueAtTime(f * opt.bend, t); o.frequency.setTargetAtTime(f, t, opt.bendTau || 0.02); }
  o.connect(g);
  return end;
}
function noise(S, out, t, { type = 'bandpass', f = 2000, q = 1, a = 0.001, tau = 0.01, peak = 0.1 }) {
  const src = S.ctx.createBufferSource(); src.buffer = S.noise; src.loop = true;
  const fl = F(S, type, f, q);
  const g = G(S);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setTargetAtTime(0, t + a, Math.max(0.001, tau));
  src.connect(fl).connect(g).connect(out);
  src.start(t, Math.random() * (S.noise.duration - 0.5));
  src.stop(t + a + tau * 7 + 0.01);
  return { src, fl, g };
}
function noiseSrc(S, t, stop) {
  const src = S.ctx.createBufferSource(); src.buffer = S.noise; src.loop = true;
  src.start(t, Math.random() * (S.noise.duration - 0.5)); src.stop(stop);
  return src;
}
// musicbox: no two notes have quite the same vibrato: the speed, width and onset vary, and the
// speed rises a little as it starts, as a player's does. `wander` adds a slow random drift of about
// that many cents, since a held pitch is never dead steady. `amp` puts the same wobble into the
// loudness (a flute's vibrato is mostly breath); it returns a gain node to put in the signal path.
function vibrato(S, t, stop, targets, { rate = 5, depth = 10, delay = 0.2, rise = 0.3, wander = 0, amp = 0 }) {
  const lfo = S.ctx.createOscillator();
  const r = rate * (0.9 + Math.random() * 0.2);
  depth *= 0.8 + Math.random() * 0.4;
  delay *= 0.75 + Math.random() * 0.5;
  lfo.frequency.setValueAtTime(r * 0.88, t);
  lfo.frequency.linearRampToValueAtTime(r, t + delay + rise + 0.4);
  const g = G(S);
  g.gain.setValueAtTime(0, t);
  g.gain.setValueAtTime(0, t + delay);
  g.gain.linearRampToValueAtTime(depth, t + delay + rise);
  lfo.connect(g);
  targets.forEach(o => g.connect(o.detune));
  lfo.start(t); lfo.stop(stop);
  if (wander) { const wg = G(S, wander); drift(S, t, stop).connect(wg); targets.forEach(o => wg.connect(o.detune)); }
  if (!amp) return null;
  const trem = G(S, 1), ag = G(S);
  ag.gain.setValueAtTime(0, t);
  ag.gain.setValueAtTime(0, t + delay);
  ag.gain.linearRampToValueAtTime(amp, t + delay + rise);
  lfo.connect(ag).connect(trem.gain);
  return trem;
}
// musicbox: a slow random wobble (mostly 0.5 to 4 Hz) with an RMS of 1 and a seamless loop point,
// shared by every note; each note reads it from a random place at a slightly different speed
function wobble(S) {
  if (S.wobble) return S.wobble;
  const sr = S.ctx.sampleRate, len = sr * 6, fade = Math.floor(sr * 0.5);
  const x = new Float32Array(len + fade), k = 1 - Math.exp(-2 * Math.PI * 2.5 / sr);
  let a = 0, b = 0;
  for (let i = 0; i < x.length + sr; i++) { a += k * ((Math.random() * 2 - 1) - a); b += k * (a - b); if (i >= sr) x[i - sr] = b; }
  const buf = S.ctx.createBuffer(1, len, sr), y = buf.getChannelData(0);
  let mean = 0, ms = 0;
  for (let i = 0; i < len; i++) { y[i] = i < fade ? x[i] * Math.sqrt(i / fade) + x[len + i] * Math.sqrt(1 - i / fade) : x[i]; mean += y[i]; }
  mean /= len;
  for (let i = 0; i < len; i++) { y[i] -= mean; ms += y[i] * y[i]; }
  const g = 1 / Math.sqrt(ms / len || 1);
  for (let i = 0; i < len; i++) y[i] *= g;
  return (S.wobble = buf);
}
function drift(S, t, stop) {
  const src = S.ctx.createBufferSource(); src.buffer = wobble(S); src.loop = true;
  src.playbackRate.value = 0.75 + Math.random() * 0.6;
  src.start(t, Math.random() * (src.buffer.duration - 0.5)); src.stop(stop);
  return src;
}
// musicbox: bow or breath pressure is never quite even; a gain that wobbles by about ±depth
function press(S, t, stop, depth) {
  const g = G(S, 1), wg = G(S, depth);
  drift(S, t, stop).connect(wg).connect(g.gain);
  return g;
}
// musicbox: where player i of n sits in a section, -spread (left) to +spread (right), give or take
function seat(S, i, n, spread) {
  if (!S.ctx.createStereoPanner) return G(S, 1);
  const pn = S.ctx.createStereoPanner();
  pn.pan.value = clamp((n > 1 ? (i / (n - 1)) * 2 - 1 : 0) * spread + (Math.random() - .5) * .1, -1, 1);
  return pn;
}
// musicbox: the pitch starts a little flat and settles, as a player finds the note
function scoop(oscs, t, cents, tau, p) {
  if (p && p.from) return; // already sliding into it
  const c = cents * (0.6 + Math.random() * 0.8);
  for (const o of oscs) { const base = o.detune.value; o.detune.setValueAtTime(base - c, t); o.detune.setTargetAtTime(base, t, tau); }
}
function metal(S, out, t, stop, mult = 1) {
  const sum = G(S, 0.16); sum.connect(out);
  for (const f of [205.3, 304.4, 369.6, 522.7, 540, 800]) O(S, 'square', f * mult, t, stop).connect(sum);
  return sum;
}

/* -------------------------------------------------------------- waveforms */
const WAVES = {
  organ: [1, .8, .5, .42, 0, .25, 0, .2],
  pipe: [1, .55, .32, .4, .08, .18, 0, .2, 0, .07, 0, .06],
  clarinet: [1, .05, .72, .04, .45, .02, .26, 0, .12, 0, .06],
  oboe: [.5, 1, .85, .5, .36, .22, .15, .1, .06],
  bassoon: [.45, 1, .78, .56, .42, .3, .22, .14, .1, .06],
  reed: [1, .55, .45, .32, .3, .22, .18, .13, .11, .08, .06, .05],
  horn: [1, .5, .3, .18, .1, .05]
};
function wave(S, name) {
  if (!S.waves[name]) {
    const h = WAVES[name], n = h.length + 1;
    const re = new Float32Array(n), im = new Float32Array(n);
    h.forEach((a, i) => { im[i + 1] = a; });
    S.waves[name] = S.ctx.createPeriodicWave(re, im);
  }
  return S.waves[name];
}

/* -------------------------------------------- plucked strings (Karplus-Strong) */
function ks(S, f, cfg) {
  const sr = S.ctx.sampleRate;
  const N = Math.max(2, Math.floor(sr / f - cfg.b));
  const key = cfg.id + ':' + N;
  let e = S.ks[key];
  if (!e) {
    const len = Math.floor(sr * cfg.dur);
    const buf = S.ctx.createBuffer(1, len, sr);
    const y = buf.getChannelData(0);
    let lp = 0, mean = 0;
    for (let i = 0; i < N; i++) { lp += (1 - cfg.color) * ((Math.random() * 2 - 1) - lp); y[i] = lp; mean += lp; }
    mean /= N;
    let pk = 1e-6;
    for (let i = 0; i < N; i++) { y[i] -= mean; pk = Math.max(pk, Math.abs(y[i])); }
    for (let i = 0; i < N; i++) y[i] /= pk;
    const b = cfg.b, dk = cfg.decay;
    for (let i = N; i < len; i++) y[i] = dk * ((1 - b) * y[i - N] + b * (i - N - 1 >= 0 ? y[i - N - 1] : 0));
    const fade = Math.floor(len * 0.25);
    for (let i = 0; i < fade; i++) { const k = i / fade; y[len - fade + i] *= (1 - k) * (1 - k); }
    e = S.ks[key] = { buf, f0: sr / (N + b) };
  }
  return e;
}
function pluck(S, out, t, d, f, v, cfg, chain) {
  const e = ks(S, f, cfg);
  const src = S.ctx.createBufferSource(); src.buffer = e.buf;
  const rate = f / e.f0; src.playbackRate.value = rate;
  const g = G(S);
  const end = perc(g.gain, t, { a: 0.001, tau: 50, peak: v, damp: t + d + cfg.hang, dampTau: cfg.dampTau });
  let node = src;
  for (const n of chain) { node.connect(n); node = n; }
  node.connect(g).connect(out);
  src.start(t); src.stop(Math.min(end, t + e.buf.duration / rate));
}

const PLUCK = {
  harp: { id: 'harp', b: .45, decay: .9985, color: .55, dur: 2.8, hang: 1.4, dampTau: .25 },
  guitar: { id: 'gtr', b: .38, decay: .997, color: .4, dur: 1.9, hang: .2, dampTau: .06 },
  banjo: { id: 'banjo', b: .18, decay: .988, color: .05, dur: 1.1, hang: .1, dampTau: .05 },
  harpsichord: { id: 'hpsi', b: .14, decay: .994, color: 0, dur: 1.6, hang: .12, dampTau: .05 },
  pizz: { id: 'pizz', b: .5, decay: .982, color: .6, dur: .8, hang: .15, dampTau: .05 },
  upright: { id: 'upr', b: .5, decay: .996, color: .7, dur: 1.7, hang: .04, dampTau: .07 }
};

/* ----------------------------------- musicbox: piano (additive, one buffer per key) */
// Stiff strings make each partial a little sharp; a hammer struck about a seventh of the way
// along the string weakens the 7th and 8th partials; two strings per key, a fraction of a cent
// apart, beat slowly; higher partials die away first, and the tone decays in two stages.
function pianoTone(S, f) {
  const key = Math.round(12 * Math.log2(f / 440) + 69);
  const id = 'pno:' + key;
  if (S.ks[id]) return S.ks[id];
  const sr = S.ctx.sampleRate, f0 = 440 * Math.pow(2, (key - 69) / 12);
  const dur = clamp(4.6 * Math.pow(262 / f0, 0.45), 1.6, 7);
  const len = Math.floor(sr * dur);
  const buf = S.ctx.createBuffer(1, len, sr), y = buf.getChannelData(0);
  const B = clamp(0.00013 * Math.pow(f0 / 130, 0.75), 0.00005, 0.0025);
  const tau = clamp(1.4 * Math.pow(262 / f0, 0.6), 0.22, 4);
  const top = Math.min(S.nyq * 0.85, 11000);
  let seed = key * 7919 + 13;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let n = 1; n <= 40; n++) {
    const fn = n * f0 * Math.sqrt(1 + B * n * n);
    if (fn > top) break;
    let a = Math.pow(n, -0.95) * (0.18 + 0.82 * Math.abs(Math.sin(Math.PI * n / 7.3)));
    a /= 1 + Math.pow(fn / 3800, 2);
    if (a < 0.004) continue;
    const tn = tau / (1 + 0.2 * (n - 1));
    const strings = n <= 14 ? [-1, 1] : [0];
    const cents = 0.25 + 0.45 * rnd();
    for (const s of strings) {
      const w = 2 * Math.PI * fn * Math.pow(2, s * cents / 1200) / sr;
      const c2 = 2 * Math.cos(w), ph = rnd() * 2 * Math.PI, amp = a / strings.length;
      let y1 = Math.sin(ph - w), y2 = Math.sin(ph - 2 * w);
      const kf = Math.exp(-1 / (sr * tn)), ks2 = Math.exp(-1 / (sr * tn * 4.5));
      let ef = 0.78 * amp, es = 0.22 * amp;
      for (let i = 0; i < len; i++) {
        const x = c2 * y1 - y2; y2 = y1; y1 = x;
        y[i] += x * (ef + es); ef *= kf; es *= ks2;
        if (ef + es < 1e-5) break;
      }
    }
  }
  // the hammer's knock: a short burst of low-passed noise
  let lp = 0;
  const knock = Math.floor(sr * 0.03), kc = clamp(f0 * 4 / sr, 0.02, 0.5);
  for (let i = 0; i < knock; i++) { lp += kc * ((rnd() * 2 - 1) - lp); y[i] += lp * 0.5 * Math.exp(-i / (sr * 0.006)); }
  const att = Math.floor(sr * 0.0015);
  for (let i = 0; i < att; i++) y[i] *= i / att;
  let pw = 0; const win = Math.min(len, Math.floor(sr * 0.3));
  for (let i = 0; i < win; i++) pw += y[i] * y[i];
  const g = 0.3 * Math.pow(262 / f0, 0.12) / Math.sqrt(pw / win + 1e-12);
  const fade = Math.floor(len * 0.25);
  for (let i = 0; i < len; i++) { y[i] *= g; if (i >= len - fade) { const k = (i - len + fade) / fade; y[i] *= (1 - k) * (1 - k); } }
  return (S.ks[id] = { buf, f0 });
}

/* ------------------------------------------------------------ instruments */
// play(S, out, t, dur, freq, vel, p) ; p = {from, glide, bright, att, rel, dyn, cents}
// musicbox: optional per instrument: cents (how far a player's tuning strays, note to note) and
// loose (how much of the human timing and loudness it gets; 0 for plain synths)
const INST = {
  steeldrum: { rev: 0.22, level: 0.66, play(S, out, t, d, f, v, p) {
    const tau = clamp(0.5 * Math.pow(440 / f, 0.45), 0.15, 1.1);
    const lp = F(S, 'lowpass', 5200 * p.bright, 0.5); lp.connect(out);
    const damp = t + d + 0.9;
    [[1, 1, 1, .002], [1.0035, .32, 1.1, .002], [2, .52, .55, .016], [3, .17, .32, .004], [4.07, .06, .18, .002]]
      .forEach(([r, a, tm, at]) => partial(S, lp, t, f * r, { a: at, tau: tau * tm, peak: v * a * 0.5, damp }));
    noise(S, lp, t, { f: 2600, q: .8, tau: .006, peak: v * .05 });
  } },
  marimba: { rev: 0.18, level: 0.5, play(S, out, t, d, f, v, p) {
    const tau = clamp(0.26 * Math.sqrt(330 / f), 0.08, 0.6);
    partial(S, out, t, f, { a: .002, tau, peak: v * .8 });
    partial(S, out, t, f * 3.98, { a: .001, tau: tau * .18, peak: v * .22 * p.bright });
    partial(S, out, t, f * 9.9, { a: .001, tau: tau * .05, peak: v * .05 * p.bright });
    noise(S, out, t, { f: f * 2.5, q: 1.2, tau: .004, peak: v * .06 });
  } },
  vibes: { rev: 0.35, level: 0.4, play(S, out, t, d, f, v, p) {
    const trem = G(S, 0.82); trem.connect(out);
    const tau = clamp(1.1 * Math.pow(440 / f, 0.3), 0.4, 1.8);
    const end = t + Math.min(tau * 7, d + 2.2);
    const lfo = S.ctx.createOscillator(); lfo.frequency.value = 5.2;
    const lg = G(S, 0.18); lfo.connect(lg).connect(trem.gain); lfo.start(t); lfo.stop(end);
    partial(S, trem, t, f, { a: .002, tau, peak: v * .7, damp: t + d + 1.2, dampTau: .2 });
    partial(S, trem, t, f * 4, { a: .001, tau: .18, peak: v * .14 * p.bright });
    noise(S, trem, t, { f: f * 3, q: 1, tau: .004, peak: v * .03 });
  } },
  celesta: { rev: 0.35, level: 0.63, play(S, out, t, d, f, v, p) {
    const tau = clamp(0.55 * Math.pow(440 / f, 0.3), 0.2, 0.9);
    partial(S, out, t, f, { a: .002, tau, peak: v * .7 });
    partial(S, out, t, f * 2, { a: .001, tau: tau * .4, peak: v * .14 });
    partial(S, out, t, f * 4.02, { a: .001, tau: tau * .12, peak: v * .1 * p.bright * dynB(p) }); // musicbox: dynB
    noise(S, out, t, { f: 5000, q: 1, tau: .003, peak: v * .04 });
  } },
  glock: { rev: 0.35, level: 0.53, play(S, out, t, d, f, v, p) {
    partial(S, out, t, f, { a: .001, tau: .7, peak: v * .6 });
    partial(S, out, t, f * 2.76, { a: .001, tau: .22, peak: v * .25 * p.bright });
    partial(S, out, t, f * 5.4, { a: .001, tau: .07, peak: v * .14 * p.bright });
    partial(S, out, t, f * 8.93, { a: .001, tau: .03, peak: v * .06 * p.bright });
  } },
  xylophone: { rev: 0.2, level: 0.72, play(S, out, t, d, f, v, p) {
    const tau = clamp(0.13 * Math.sqrt(440 / f), 0.05, 0.25);
    partial(S, out, t, f, { a: .001, tau, peak: v * .75 });
    partial(S, out, t, f * 3, { a: .001, tau: tau * .4, peak: v * .35 * p.bright });
    partial(S, out, t, f * 6, { a: .001, tau: tau * .15, peak: v * .1 * p.bright });
    noise(S, out, t, { f: 4000, q: 1, tau: .004, peak: v * .1 });
  } },
  musicbox: { rev: 0.4, level: 0.64, play(S, out, t, d, f, v, p) {
    partial(S, out, t, f, { a: .001, tau: .5, peak: v * .7 });
    partial(S, out, t, f * 3, { a: .001, tau: .12, peak: v * .12 });
    partial(S, out, t, f * 5.2, { a: .001, tau: .05, peak: v * .06 * p.bright });
    noise(S, out, t, { f: 7000, q: 2, tau: .002, peak: v * .05 });
  } },
  bell: { rev: 0.45, level: 0.71, play(S, out, t, d, f, v, p) {
    const damp = t + d + 3;
    [[.5, .35, 3.5], [1, 1, 2.4], [1.19, .55, 1.7], [1.5, .38, 1.4], [2, .45, 1.1], [2.52, .22, .8], [3.01, .16, .55], [4.1, .08, .35]]
      .forEach(([r, a, tau]) => partial(S, out, t, f * r, { a: .002, tau, peak: v * a * .35 * (r > 1.6 ? Math.pow(dynB(p), 1.5) : 1), damp, dampTau: .4 })); // musicbox: dynB
    noise(S, out, t, { f: f * 4, q: 1, tau: .01, peak: v * .05 });
  } },
  piano: { rev: 0.3, level: 1, play(S, out, t, d, f, v, p) { // musicbox
    const e = pianoTone(S, f);
    const src = S.ctx.createBufferSource(); src.buffer = e.buf;
    const rate = f / e.f0;
    if (p.from) {
      src.playbackRate.setValueAtTime(p.from / e.f0, t);
      src.playbackRate.exponentialRampToValueAtTime(rate, t + p.glide);
    } else src.playbackRate.value = rate;
    const vv = clamp(v, 0.05, 1.4);
    const lp = F(S, 'lowpass', clamp(f * 1.5 + (600 + 5600 * vv * vv) * p.bright, 300, 16000), 0.5);
    const g = G(S);
    const dampTau = p.rel ? p.rel / 4 : clamp(0.05 * Math.pow(262 / f, 0.5), 0.025, 0.14);
    const end = perc(g.gain, t, { a: 0.001, tau: 60, peak: v * 0.5, damp: t + d, dampTau });
    src.connect(lp).connect(g).connect(out);
    src.start(t); src.stop(Math.min(end, t + e.buf.duration / rate));
  } },
  organ: { loose: 0.5, rev: 0.15, level: 0.98, play(S, out, t, d, f, v, p) {
    const g = G(S); const lp = F(S, 'lowpass', 5500 * p.bright, 0.5);
    lp.connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .005, r: p.rel || .06, peak: v * .5 });
    const o = O(S, wave(S, 'organ'), f, t, end, p); o.connect(lp);
    vibrato(S, t, end, [o], { rate: 6.3, depth: 5, delay: 0, rise: .05 });
    noise(S, out, t, { type: 'lowpass', f: 2500, q: .5, tau: .002, peak: v * .1 });
  } },
  pipe: { rev: 0.55, level: 1.01, play(S, out, t, d, f, v, p) {
    const g = G(S); const lp = F(S, 'lowpass', 4200 * p.bright, 0.5);
    lp.connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .06, r: p.rel || .28, peak: v * .38 });
    O(S, wave(S, 'pipe'), f, t, end, p).connect(lp);
    const sub = G(S, .45); sub.connect(lp); O(S, 'sine', f, t, end, p, .5).connect(sub);
    noise(S, out, t, { f: f * 3, q: 2, a: .01, tau: .02, peak: v * .04 });
  } },
  strings: { rev: 0.4, level: 2.57, cents: 2, body(S, out) { // musicbox: the violin family's body
    const body = F(S, 'peaking', 2600, 1.2, 3), body2 = F(S, 'peaking', 320, 1.4, 2.5);
    body.connect(body2).connect(out);
    return body;
  }, play(S, out, t, d, f, v, p) {
    // musicbox: a section of four players across the stereo field, each a few cents from the others,
    // each with their own vibrato and coming in a moment apart
    const g = G(S); const lp = F(S, 'lowpass', Math.min(9000, (1300 + f * 2.6) * p.bright * dynB(p)), 0.6);
    const end = adsr(g.gain, t, d, { a: p.att || .16, dc: .3, s: .9, r: p.rel || .38, peak: v * .5 });
    lp.connect(press(S, t, end, .04)).connect(g).connect(out);
    for (let i = 0; i < 4; i++) {
      const o = O(S, 'sawtooth', f, t, end, p, 1, (Math.random() * 2 - 1) * 9);
      const og = G(S); og.gain.setValueAtTime(0, t); og.gain.setTargetAtTime(.19, t + Math.random() * .035, .015);
      o.connect(og).connect(seat(S, i, 4, .5)).connect(lp);
      scoop([o], t, 10, .05, p);
      vibrato(S, t, end, [o], { rate: 5.3, depth: 8, delay: .15, rise: .4, wander: 3 });
    }
  } },
  pad: { rev: 0.5, level: 2.18, loose: 0.5, play(S, out, t, d, f, v, p) {
    const g = G(S); const lp = F(S, 'lowpass', (600 + f * 1.4) * p.bright, 0.9);
    lp.connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .5, r: p.rel || 1.0, peak: v * .45 });
    [-12, 0, 11].forEach(c => { const og = G(S, .24); O(S, 'sawtooth', f, t, end, p, 1, c).connect(og).connect(lp); });
  } },
  choir: { rev: 0.5, level: 2.02, cents: 2, body(S, out, vo, onStop) { return vowel(S, out, vo, [[730, 7, 1], [1090, 8, .55], [2440, 10, .25]], onStop); }, play: choirVoice },
  voices: { rev: 0.5, level: 2.01, cents: 2, body(S, out, vo, onStop) { return vowel(S, out, vo, [[380, 6, 1], [820, 8, .35], [2500, 10, .1]], onStop); }, play: choirVoice },
  brass: { rev: 0.25, level: 0.72, cents: 2, play(S, out, t, d, f, v, p) {
    // musicbox: three players, each lipping up to the note from a little below and a moment apart;
    // louder notes open the filter further, so a forte is brassy and a piano is mellow
    const g = G(S); const lp = F(S, 'lowpass', f, 1.3);
    lp.connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .03, dc: .2, s: .85, r: p.rel || .12, peak: v * .42 });
    const pk = Math.min(11000, (f * 5 + 700) * p.bright * (0.19 + 0.9 * (p.dyn != null ? p.dyn : 0.8)));
    lp.frequency.setValueAtTime(f * 1.1, t);
    lp.frequency.linearRampToValueAtTime(pk, t + .06);
    lp.frequency.setTargetAtTime(f * 1.2 + (pk - f) * .5, t + .06, .2);
    for (let i = 0; i < 3; i++) {
      const o = O(S, 'sawtooth', f, t, end, p, 1, (Math.random() * 2 - 1) * 7);
      const og = G(S); og.gain.setValueAtTime(0, t); og.gain.setTargetAtTime(.82, t + Math.random() * .02, .006);
      o.connect(og).connect(seat(S, i, 3, .35)).connect(lp);
      scoop([o], t, 22, .025, p);
      vibrato(S, t, end, [o], { rate: 5.2, depth: 5, delay: .35, rise: .3, wander: 2 });
    }
  } },
  trumpet: { cents: 4, rev: 0.25, level: 1.17, play(S, out, t, d, f, v, p) {
    const g = G(S); const lp = F(S, 'lowpass', f, 1.6);
    const pk2 = F(S, 'peaking', 1400, 1, 5);
    lp.connect(pk2).connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .02, dc: .15, s: .8, r: p.rel || .09, peak: v * .4 });
    const pk = Math.min(12000, (f * 7 + 900) * p.bright * (0.5 + 0.5 * v));
    lp.frequency.setValueAtTime(f * 1.5, t);
    lp.frequency.linearRampToValueAtTime(pk, t + .04);
    lp.frequency.setTargetAtTime(f * 2 + (pk - f) * .45, t + .04, .15);
    const o = O(S, 'sawtooth', f, t, end, p); o.connect(lp);
    scoop([o], t, 20, .025, p); // musicbox
    vibrato(S, t, end, [o], { rate: 5.6, depth: 11, delay: .25, rise: .25, wander: 3 });
  } },
  horn: { rev: 0.4, level: 0.7, cents: 4, play(S, out, t, d, f, v, p) {
    // musicbox: the lips slur up onto the note with a short buzz, the tone flares and settles,
    // and louder notes are much brassier
    const g = G(S); const lp = F(S, 'lowpass', f * 2, 0.8);
    const end = adsr(g.gain, t, d, { a: p.att || .06, dc: .3, s: .9, r: p.rel || .2, peak: v * .5 });
    const db = dynB(p), top = Math.min(7000, (f * 3 + 300) * p.bright * db * db);
    lp.frequency.setValueAtTime(f * 1.1, t);
    lp.frequency.linearRampToValueAtTime(Math.min(8000, top * 1.3), t + .07);
    lp.frequency.setTargetAtTime(top, t + .07, .15);
    const o1 = O(S, 'sawtooth', f, t, end, p); const g1 = G(S, .5); o1.connect(g1).connect(lp);
    const o2 = O(S, wave(S, 'horn'), f, t, end, p, 1, 4); o2.connect(lp);
    scoop([o1, o2], t, 26, .03, p);
    const trem = vibrato(S, t, end, [o1, o2], { rate: 4.8, depth: 4, delay: .4, rise: .4, wander: 3, amp: .02 });
    lp.connect(trem).connect(press(S, t, end, .03)).connect(g).connect(out);
    noise(S, out, t, { f: Math.min(f * 4, 6000), q: 1.2, a: .004, tau: .02, peak: v * .05 * db });
  } },
  tuba: { cents: 3, rev: 0.2, level: 0.7, play(S, out, t, d, f, v, p) {
    const g = G(S); const lp = F(S, 'lowpass', (f * 3 + 150) * p.bright, 1.0);
    lp.connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .035, dc: .2, s: .8, r: p.rel || .1, peak: v * .55 });
    O(S, 'sawtooth', f, t, end, p).connect(lp);
    const sg = G(S, .5); O(S, 'sine', f, t, end, p).connect(sg).connect(lp);
  } },
  flute: { rev: 0.38, level: 1.18, cents: 4, play(S, out, t, d, f, v, p) {
    // musicbox: nearly a sine, with harmonics that grow with the dynamic. Each note starts with a
    // puff of air and a flicker of the octave above (the "chiff"), breath runs through it, and the
    // vibrato is mostly in the breath
    const g = G(S), sum = G(S, 1);
    const end = adsr(g.gain, t, d, { a: p.att || .06, dc: .15, s: .85, r: p.rel || .1, peak: v * .48 });
    const b = p.bright * dynB(p);
    const o1 = O(S, 'sine', f, t, end, p); const g1 = G(S, .78); o1.connect(g1).connect(sum);
    const o2 = O(S, 'sine', f, t, end, p, 2); const g2 = G(S); o2.connect(g2).connect(sum);
    g2.gain.setValueAtTime(.34 * b, t); g2.gain.setTargetAtTime(.12 * b, t + .02, .04);
    const o3 = O(S, 'sine', f, t, end, p, 3); const g3 = G(S, .05 * b * b); o3.connect(g3).connect(sum);
    const o4 = O(S, 'sine', f, t, end, p, 4); const g4 = G(S, .018 * b * b); o4.connect(g4).connect(sum);
    const os = [o1, o2, o3, o4];
    scoop(os, t, 10, .025, p);
    const trem = vibrato(S, t, end, os, { rate: 5, depth: 8, delay: .22, rise: .35, wander: 3, amp: .1 });
    sum.connect(trem).connect(press(S, t, end, .04)).connect(g).connect(out);
    // breath
    const n = noiseSrc(S, t, end); const hp = F(S, 'bandpass', Math.min(f * 2.2, 9000), 0.7); const ng = G(S);
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(v * .07, t + .02);
    ng.gain.setTargetAtTime(v * .016, t + .02, .05); ng.gain.setTargetAtTime(0, Math.max(t + d, t + .04), .03);
    n.connect(hp).connect(ng).connect(out);
  } },
  clarinet: { rev: 0.3, level: 1.16, cents: 3, play(S, out, t, d, f, v, p) {
    // musicbox: the reed speaks dull and opens up, louder notes are brighter, and breath runs
    // under the tone. Little vibrato, as a classical player would, but never quite still
    const g = G(S);
    const top = Math.min(9000, (700 + 2300 * dynB(p)) * p.bright);
    const lp = F(S, 'lowpass', top, 0.6);
    lp.frequency.setValueAtTime(clamp(f * 1.5, 300, top), t); lp.frequency.setTargetAtTime(top, t, .03);
    const end = adsr(g.gain, t, d, { a: p.att || .035, dc: .2, s: .9, r: p.rel || .08, peak: v * .42 });
    const o = O(S, wave(S, 'clarinet'), f, t, end, p); o.connect(lp);
    scoop([o], t, 8, .02, p);
    const trem = vibrato(S, t, end, [o], { rate: 4.6, depth: 4, delay: .45, rise: .4, wander: 3, amp: .015 });
    lp.connect(trem).connect(press(S, t, end, .035)).connect(g).connect(out);
    noise(S, out, t, { f: f * 3, q: 1, a: .01, tau: .02, peak: v * .02 });
    const n = noiseSrc(S, t, end); const nb = F(S, 'bandpass', Math.min(f * 3, 8000), 1); const ng = G(S);
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(v * .006, t + .03);
    ng.gain.setTargetAtTime(0, Math.max(t + d, t + .04), .03);
    n.connect(nb).connect(ng).connect(out);
  } },
  oboe: { cents: 3, rev: 0.3, level: 1.98, play(S, out, t, d, f, v, p) {
    const g = G(S); const lp = F(S, 'lowpass', Math.min(9000, 3800 * p.bright), 0.6);
    lp.connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .03, dc: .2, s: .9, r: p.rel || .08, peak: v * .36 });
    const o = O(S, wave(S, 'oboe'), f, t, end, p); o.connect(lp);
    scoop([o], t, 10, .025, p); // musicbox
    vibrato(S, t, end, [o], { rate: 5.5, depth: 8, delay: .25, rise: .3, wander: 3 });
  } },
  bassoon: { cents: 3, rev: 0.25, level: 1.72, play(S, out, t, d, f, v, p) {
    const g = G(S); const lp = F(S, 'lowpass', Math.min(6000, 1700 * p.bright), 0.7);
    lp.connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .04, dc: .2, s: .85, r: p.rel || .08, peak: v * .45 });
    const o = O(S, wave(S, 'bassoon'), f, t, end, p); o.connect(lp);
    scoop([o], t, 10, .025, p); // musicbox
    vibrato(S, t, end, [o], { rate: 5, depth: 5, delay: .35, rise: .3, wander: 3 });
  } },
  accordion: { rev: 0.22, level: 2.06, play(S, out, t, d, f, v, p) {
    const g = G(S); const lp = F(S, 'lowpass', Math.min(9000, (2600 + f) * p.bright), 0.7);
    lp.connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .025, dc: .2, s: .92, r: p.rel || .07, peak: v * .4 });
    [0, 15, -13].forEach((c, i) => { const og = G(S, i ? .28 : .36); O(S, wave(S, 'reed'), f, t, end, p, 1, c).connect(og).connect(lp); });
  } },
  fiddle: { rev: 0.3, level: 1.32, cents: 4, body(S, out) {
    // musicbox: the resonances of a violin body. The vibrato sweeps each note's harmonics across
    // them, so the tone shimmers as a real violin's does
    const hp = F(S, 'highpass', 180, .7);
    let node = hp;
    for (const [ff, q, db] of [[290, 5, 6], [460, 4, 4], [1100, 2.5, 2], [2500, 1.5, 6], [3500, 2.5, 3]]) { const r = F(S, 'peaking', ff, q, db); node.connect(r); node = r; }
    node.connect(out);
    return hp;
  }, play(S, out, t, d, f, v, p) {
    // musicbox: one bowed string (a sawtooth). Bow noise runs through the note, strongest as the
    // bow bites, and the pitch settles onto the note
    const g = G(S), lp = F(S, 'lowpass', Math.min(10000, 5600 * p.bright * dynB(p)), 0.6);
    const end = adsr(g.gain, t, d, { a: p.att || .07, dc: .25, s: .85, r: p.rel || .16, peak: v * .3 });
    const o = O(S, 'sawtooth', f, t, end, p); o.connect(lp);
    scoop([o], t, 16, .03, p);
    const trem = vibrato(S, t, end, [o], { rate: 5.8, depth: 14, delay: .18, rise: .25, wander: 3, amp: .03 });
    lp.connect(trem).connect(press(S, t, end, .06)).connect(g).connect(out);
    const n = noiseSrc(S, t, end); const nb = F(S, 'bandpass', clamp(f * 4, 1800, 8000), .5); const ng = G(S);
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(v * .06, t + .012);
    ng.gain.setTargetAtTime(v * .014, t + .012, .04); ng.gain.setTargetAtTime(0, Math.max(t + d, t + .05), .04);
    n.connect(nb).connect(ng).connect(out);
  } },
  harp: { rev: 0.45, level: 1.07, play(S, out, t, d, f, v, p) {
    pluck(S, out, t, d, f, v * .55, PLUCK.harp, [F(S, 'lowpass', 3500 * p.bright * dynB(p), .5)]); // musicbox: dynB
    partial(S, out, t, f, { a: .003, tau: .9, peak: v * .12 });
  } },
  guitar: { rev: 0.25, level: 1.53, play(S, out, t, d, f, v, p) {
    pluck(S, out, t, d, f, v * .55, PLUCK.guitar, [F(S, 'lowpass', 4200 * p.bright * dynB(p), .5), F(S, 'peaking', 220, 1, 3)]);
  } },
  banjo: { rev: 0.18, level: 1.18, play(S, out, t, d, f, v, p) {
    pluck(S, out, t, d, f, v * .5, PLUCK.banjo, [F(S, 'highpass', 250, .5), F(S, 'peaking', 2500, 1.5, 5)]);
  } },
  harpsichord: { rev: 0.3, level: 1.74, play(S, out, t, d, f, v, p) {
    const hp = F(S, 'highpass', 180, .5);
    pluck(S, out, t, d, f, v * .42, PLUCK.harpsichord, [hp]);
    pluck(S, out, t, d, f * 2, v * .16 * p.bright, PLUCK.harpsichord, [F(S, 'highpass', 400, .5)]);
  } },
  pizz: { rev: 0.35, level: 1.21, play(S, out, t, d, f, v, p) {
    pluck(S, out, t, d, f, v * .6, PLUCK.pizz, [F(S, 'lowpass', 2400 * p.bright * dynB(p), .6)]); // musicbox: dynB
    partial(S, out, t, f, { a: .002, tau: .12, peak: v * .18 });
  } },
  upright: { rev: 0.15, level: 0.72, play(S, out, t, d, f, v, p) {
    pluck(S, out, t, d, f, v * .5, PLUCK.upright, [F(S, 'lowpass', 1400 * p.bright * dynB(p), .6)]);
    partial(S, out, t, f, { a: .004, tau: .5, peak: v * .45, damp: t + d + .04, dampTau: .07 });
    noise(S, out, t, { type: 'lowpass', f: 900, q: .5, tau: .01, peak: v * .12 });
  } },
  fretless: { cents: 3, rev: 0.12, level: 0.69, play(S, out, t, d, f, v, p) {
    // musicbox: the string's harmonics (a sawtooth) through a filter that opens as the finger plucks
    // and settles around the 4th harmonic, with the fretless "mwah", a resonance near the 3rd. A
    // high-pass that follows the note trims the fundamental: a real bass's weight is in its 2nd to
    // 5th harmonics; a sine-heavy bass booms on a subwoofer and sounds thin in the upper bass.
    const g = G(S), hp = F(S, 'highpass', f * 1.2, .7), lp = F(S, 'lowpass', 300, .7), lp2 = F(S, 'lowpass', 300, .7), mwah = F(S, 'peaking', f * 2.5 + 120, 1.5, 2.5);
    hp.connect(lp).connect(lp2).connect(mwah).connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .012, dc: .6, s: .72, r: p.rel || .08, peak: v * .6 });
    const db = dynB(p), top = Math.min(4000, (f * 5 + 250) * p.bright * db), rest = Math.min(2500, (f * 3 + 120) * p.bright * db);
    for (const l of [lp, lp2]) { // two stages: a steep slope above the 4th harmonic
      l.frequency.setValueAtTime(f * 2 + 100, t);
      l.frequency.linearRampToValueAtTime(top, t + .02);
      l.frequency.setTargetAtTime(rest, t + .02, .25);
    }
    const o1 = O(S, 'sawtooth', f, t, end, p); o1.connect(hp);
    // a fretless player slides into some notes; a soft thump of the finger on the string
    scoop([o1], t, Math.random() < .3 ? 35 : 6, .04, p);
    vibrato(S, t, end, [o1], { rate: 4.5, depth: 6, delay: .3, rise: .4, wander: 2 });
    noise(S, out, t, { type: 'lowpass', f: 700, q: .7, tau: .012, peak: v * .1 });
  } },
  synbass: { loose: 0.3, rev: 0.08, level: 0.76, play(S, out, t, d, f, v, p) {
    const g = G(S); const lp = F(S, 'lowpass', 300, 5);
    lp.connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .003, dc: .35, s: .55, r: p.rel || .06, peak: v * .5 });
    lp.frequency.setValueAtTime(Math.min(5000, 2600 * p.bright * v), t);
    lp.frequency.setTargetAtTime(f * 2 + 80, t, .07);
    O(S, 'sawtooth', f, t, end, p).connect(lp);
    const sq = G(S, .5); O(S, 'square', f, t, end, p, 1, -6).connect(sq).connect(lp);
  } },
  timpani: { rev: 0.45, level: 0.53, play(S, out, t, d, f, v, p) {
    const damp = t + Math.max(d, .15) + .5;
    partial(S, out, t, f, { a: .004, tau: .55, peak: v * .85, bend: 1.035, bendTau: .05, damp, dampTau: .15 });
    partial(S, out, t, f * 1.505, { a: .003, tau: .35, peak: v * .32, damp, dampTau: .15 });
    partial(S, out, t, f * 1.99, { a: .003, tau: .25, peak: v * .2, damp, dampTau: .15 });
    partial(S, out, t, f * 2.44, { a: .002, tau: .15, peak: v * .1 });
    noise(S, out, t, { type: 'lowpass', f: 500 * dynB(p), q: .7, tau: .03, peak: v * .5 }); // musicbox: dynB
  } },
  chip: { loose: 0, rev: 0.15, level: 1.17, play(S, out, t, d, f, v, p) {
    const g = G(S); const lp = F(S, 'lowpass', 6000 * p.bright, .5); lp.connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .003, dc: .1, s: .8, r: p.rel || .04, peak: v * .3 });
    const o = O(S, 'square', f, t, end, p); o.connect(lp);
    vibrato(S, t, end, [o], { rate: 6, depth: 12, delay: .25, rise: .1 });
  } }
};
['sine', 'square', 'saw', 'triangle'].forEach(w => {
  INST[w] = { loose: 0, rev: 0.2, level: ({ sine: 0.94, triangle: 1.15, square: 0.78, saw: 1.35 })[w], play(S, out, t, d, f, v, p) {
    const g = G(S); const lp = F(S, 'lowpass', 8000 * p.bright, .5); lp.connect(g).connect(out);
    const end = adsr(g.gain, t, d, { a: p.att || .008, dc: .2, s: .85, r: p.rel || .08, peak: v * .4 });
    O(S, w === 'saw' ? 'sawtooth' : w, f, t, end, p).connect(lp);
  } };
});

// musicbox: the vowel, once per voice: formant filters that sway a little, as a choir's vowel does
function vowel(S, out, vo, formants, onStop) {
  const into = G(S, 1), t = S.ctx.currentTime;
  const sway = S.ctx.createOscillator(); sway.frequency.value = .15 + Math.random() * .2; sway.start(t);
  if (onStop) onStop(() => sway.stop());
  for (const [ff, q, a] of formants) {
    const fc = ff * (vo.bright > 1 ? 1.1 : 1), bp = F(S, 'bandpass', fc, q), fg = G(S, a);
    const sg = G(S, fc * .03); sway.connect(sg).connect(bp.frequency);
    into.connect(bp).connect(fg).connect(out);
  }
  return into;
}
// musicbox: three singers per note, each a few cents from the others, finding the note from a
// little below, coming in a moment apart, each with their own vibrato; breath through the vowel
function choirVoice(S, out, t, d, f, v, p) {
  const g = G(S); g.connect(out);
  const end = adsr(g.gain, t, d, { a: p.att || .28, dc: .3, s: .95, r: p.rel || .6, peak: v * 1.6 });
  for (let i = 0; i < 3; i++) {
    const o = O(S, 'sawtooth', f, t, end, p, 1, (Math.random() * 2 - 1) * 10);
    const og = G(S); og.gain.setValueAtTime(0, t); og.gain.setTargetAtTime(.41, t + Math.random() * .06, .03);
    o.connect(og).connect(seat(S, i, 3, .45)).connect(g);
    scoop([o], t, 14, .05, p);
    vibrato(S, t, end, [o], { rate: 5.1, depth: 11, delay: .2, rise: .5, wander: 4 });
  }
  const n = noiseSrc(S, t, end); const ng = G(S, v * .1); n.connect(ng).connect(g);
}

/* ----------------------------------------------------------------- drums */
const DRUM = {
  kick: { rev: 0.05, level: 0.95, hit(S, out, t, v) {
    const g = G(S); g.connect(out);
    const end = perc(g.gain, t, { a: .003, tau: .13, peak: v * 1.0 });
    const o = O(S, 'sine', 150, t, end); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(46, t + .11);
    o.connect(g);
    noise(S, out, t, { type: 'lowpass', f: 3000, q: .5, tau: .003, peak: v * .28 });
  } },
  snare: { rev: 0.25, level: 1.12, hit(S, out, t, v) {
    noise(S, out, t, { type: 'highpass', f: 1100, q: .5, tau: .055, peak: v * .6 });
    noise(S, out, t, { type: 'bandpass', f: 4500, q: .8, tau: .03, peak: v * .25 });
    partial(S, out, t, 185, { type: 'triangle', a: .001, tau: .035, peak: v * .5, bend: 1.25, bendTau: .02 });
  } },
  rim: { rev: 0.2, level: 1.66, hit(S, out, t, v) {
    partial(S, out, t, 1650, { a: .001, tau: .007, peak: v * .5 });
    partial(S, out, t, 520, { a: .001, tau: .016, peak: v * .4 });
    noise(S, out, t, { f: 3200, q: 2, tau: .008, peak: v * .55 });
  } },
  hat: { rev: 0.1, level: 0.79, hit(S, out, t, v) { cymbal(S, out, t, v, .02, 7500, .5); } },
  ohat: { rev: 0.15, level: 0.56, hit(S, out, t, v) { cymbal(S, out, t, v, .13, 7000, .45); } },
  ride: { rev: 0.25, level: 1.65, hit(S, out, t, v) {
    const g = G(S); const bp = F(S, 'bandpass', 5500, .8); bp.connect(g).connect(out);
    const end = perc(g.gain, t, { a: .001, tau: .38, peak: v * .5 });
    metal(S, bp, t, end, 1.5);
    noise(S, out, t, { type: 'highpass', f: 8000, q: .5, tau: .2, peak: v * .07 });
  } },
  crash: { rev: 0.3, level: 0.75, hit(S, out, t, v) {
    noise(S, out, t, { type: 'highpass', f: 3500, q: .5, a: .002, tau: .55, peak: v * .4 });
    const g = G(S); const bp = F(S, 'bandpass', 4500, .7); bp.connect(g).connect(out);
    const end = perc(g.gain, t, { a: .002, tau: .45, peak: v * .35 });
    metal(S, bp, t, end, 1.1);
  } },
  shaker: { rev: 0.1, level: 1.21, hit(S, out, t, v) { noise(S, out, t, { f: 6500, q: 1.4, a: .012, tau: .025, peak: v * .55 }); } },
  tamb: { rev: 0.15, level: 0.76, hit(S, out, t, v) {
    noise(S, out, t, { type: 'highpass', f: 6500, q: .7, a: .002, tau: .05, peak: v * .45 });
    noise(S, out, t + .013, { f: 9000, q: 2, a: .001, tau: .06, peak: v * .25 });
  } },
  conga: { rev: 0.18, level: 0.84, hit(S, out, t, v) { hand(S, out, t, v, 340, .11); } },
  tumba: { rev: 0.18, level: 0.76, hit(S, out, t, v) { hand(S, out, t, v, 235, .15); } },
  bongo: { rev: 0.15, level: 0.91, hit(S, out, t, v) { hand(S, out, t, v, 520, .055); } },
  bongolo: { rev: 0.15, level: 0.82, hit(S, out, t, v) { hand(S, out, t, v, 395, .07); } },
  clave: { rev: 0.25, level: 0.83, hit(S, out, t, v) {
    partial(S, out, t, 2450, { a: .001, tau: .022, peak: v * .6 });
    noise(S, out, t, { f: 2450, q: 8, tau: .01, peak: v * .2 });
  } },
  block: { rev: 0.25, level: 0.98, hit(S, out, t, v) {
    partial(S, out, t, 880, { a: .001, tau: .028, peak: v * .6 });
    partial(S, out, t, 1460, { a: .001, tau: .014, peak: v * .25 });
    noise(S, out, t, { f: 900, q: 6, tau: .015, peak: v * .25 });
  } },
  cowbell: { rev: 0.2, level: 0.54, hit(S, out, t, v) {
    const g = G(S); const bp = F(S, 'bandpass', 820, 1.6); bp.connect(g).connect(out);
    const end = perc(g.gain, t, { a: .001, tau: .085, peak: v * .7 });
    O(S, 'square', 545, t, end).connect(bp); O(S, 'square', 815, t, end).connect(bp);
  } },
  guiro: { rev: 0.15, level: 3.85, hit(S, out, t, v) {
    for (let i = 0; i < 10; i++) noise(S, out, t + i * .016, { f: 2900, q: 2, tau: .004, peak: v * .32 * (.55 + .45 * i / 9) });
  } },
  tomlo: { rev: 0.25, level: 0.74, hit(S, out, t, v) { tom(S, out, t, v, 92); } },
  tommid: { rev: 0.25, level: 0.79, hit(S, out, t, v) { tom(S, out, t, v, 132); } },
  tomhi: { rev: 0.25, level: 0.83, hit(S, out, t, v) { tom(S, out, t, v, 182); } },
  bodhran: { rev: 0.2, level: 0.76, hit(S, out, t, v) {
    partial(S, out, t, 78, { a: .003, tau: .13, peak: v * .9, bend: 1.5, bendTau: .02 });
    partial(S, out, t, 128, { a: .002, tau: .05, peak: v * .25 });
    noise(S, out, t, { f: 420, q: 1, tau: .025, peak: v * .4 });
  } },
  timbale: { rev: 0.25, level: 0.74, hit(S, out, t, v) {
    partial(S, out, t, 430, { a: .001, tau: .2, peak: v * .5, bend: 1.08 });
    partial(S, out, t, 655, { a: .001, tau: .12, peak: v * .25 });
    noise(S, out, t, { type: 'highpass', f: 2000, q: .5, tau: .03, peak: v * .35 });
  } },
  tri: { rev: 0.4, level: 0.44, hit(S, out, t, v) {
    partial(S, out, t, 2650, { a: .001, tau: .7, peak: v * .22 });
    partial(S, out, t, 4140, { a: .001, tau: .4, peak: v * .1 });
    partial(S, out, t, 6320, { a: .001, tau: .22, peak: v * .07 });
  } },
  clap: { rev: 0.3, level: 3.57, hit(S, out, t, v) {
    [0, .011, .022].forEach(o => noise(S, out, t + o, { f: 1300, q: 1, tau: .006, peak: v * .5 }));
    noise(S, out, t + .03, { f: 1200, q: .8, tau: .07, peak: v * .4 });
  } },
  gong: { rev: 0.6, level: 0.46, hit(S, out, t, v) {
    [[1, 1, 4], [1.48, .7, 3.2], [1.97, .6, 2.6], [2.34, .5, 2.2], [2.9, .35, 1.6], [3.6, .3, 1.3], [4.4, .2, 1]]
      .forEach(([r, a, tau], i) => partial(S, out, t, 72 * r, { a: i ? .25 : .02, tau, peak: v * a * .4 }));
    noise(S, out, t, { type: 'lowpass', f: 2000, q: .5, tau: .4, peak: v * .12 });
  } },
  thunder: { rev: 0.5, level: 2.38, hit(S, out, t, v) {
    const n = noiseSrc(S, t, t + 9); const lp = F(S, 'lowpass', 220, .5); const g = G(S);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * 1.2, t + .35);
    g.gain.setTargetAtTime(v * .5, t + .35, .4); g.gain.setTargetAtTime(0, t + 1.6, 1.2);
    lp.frequency.setValueAtTime(600, t); lp.frequency.setTargetAtTime(160, t + .2, .8);
    n.connect(lp).connect(g).connect(out);
    noise(S, out, t + .05, { type: 'lowpass', f: 1400, q: .5, a: .01, tau: .2, peak: v * .35 });
  } },
  surf: { rev: 0.5, level: 1.42, hit(S, out, t, v) {
    const n = noiseSrc(S, t, t + 7); const lp = F(S, 'lowpass', 300, .4); const g = G(S);
    lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(1500, t + 1.5); lp.frequency.linearRampToValueAtTime(450, t + 4.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v * .55, t + 1.5); g.gain.setTargetAtTime(0, t + 1.6, .9);
    n.connect(lp).connect(g).connect(out);
  } }
};
function cymbal(S, out, t, v, tau, hpf, pk) {
  const g = G(S); const hp = F(S, 'highpass', hpf, .6); const pkf = F(S, 'peaking', 10000, 1, 4);
  hp.connect(pkf).connect(g).connect(out);
  const end = perc(g.gain, t, { a: .001, tau, peak: v * pk });
  const n = noiseSrc(S, t, end); n.connect(hp);
  metal(S, hp, t, end, 1.0);
}
function hand(S, out, t, v, f, tau) {
  const slap = v > 0.95;
  partial(S, out, t, f, { a: .002, tau: slap ? tau * .6 : tau, peak: v * .8, bend: 1.12, bendTau: .012 });
  partial(S, out, t, f * 1.52, { a: .001, tau: tau * .3, peak: v * .15 });
  noise(S, out, t, { f: slap ? 2600 : 1600, q: 1, tau: slap ? .02 : .008, peak: v * (slap ? .5 : .18) });
}
function tom(S, out, t, v, f) {
  partial(S, out, t, f, { a: .002, tau: .2, peak: v * .85, bend: 1.55, bendTau: .025 });
  partial(S, out, t, f * 1.6, { a: .001, tau: .06, peak: v * .15 });
  noise(S, out, t, { type: 'lowpass', f: 1600, q: .5, tau: .02, peak: v * .2 });
}

/* ------------------------------------------------------------------ beds */
// musicbox: beds are continuous sounds that run under every cue. Each one starts silent;
// the player sets the level of `input`. `swell` is the seconds per slow rise and fall.

// brown noise with a seamless loop point (the end crossfades into the start)
function brown(S) {
  if (S.brown) return S.brown;
  const sr = S.ctx.sampleRate, len = sr * 8, fade = Math.floor(sr * 0.5);
  const x = new Float32Array(len + fade);
  let last = 0;
  for (let i = 0; i < x.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; x[i] = last * 3.5; }
  const buf = S.ctx.createBuffer(1, len, sr), y = buf.getChannelData(0);
  for (let i = 0; i < len; i++) y[i] = i < fade ? x[i] * Math.sqrt(i / fade) + x[len + i] * Math.sqrt(1 - i / fade) : x[i];
  return (S.brown = buf);
}
function loopSrc(S, buf, t) {
  const src = S.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  src.start(t, Math.random() * (buf.duration - 0.5));
  return src;
}
// a slow sine wobble added to `param`
function lfo(S, rate, depth, param, t, phase = 0) {
  const o = S.ctx.createOscillator(); o.frequency.value = rate;
  const g = G(S, depth); o.connect(g).connect(param);
  o.start(t + phase / rate);
  return o;
}
const BED = {
  sea: { rev: 0.35, level: 0.85, swell: 12, make(S, out, t, p) {
    const src = loopSrc(S, brown(S), t);
    const lp = F(S, 'lowpass', 380 * p.bright, 0.5);
    const g = G(S, 0.6);
    src.connect(lp).connect(g).connect(out);
    // the swell: louder and brighter together, like a wave coming in
    return [src, lfo(S, 1 / p.swell, 0.4, g.gain, t), lfo(S, 1 / p.swell, 170 * p.bright, lp.frequency, t)];
  } },
  wind: { rev: 0.4, level: 1.7, swell: 9, make(S, out, t, p) {
    const src = loopSrc(S, S.noise, t);
    const bp = F(S, 'bandpass', 650 * p.bright, 1.1);
    const g = G(S, 0.55);
    src.connect(bp).connect(g).connect(out);
    return [src, lfo(S, 1 / p.swell, 380 * p.bright, bp.frequency, t), lfo(S, 1.7 / p.swell, 0.35, g.gain, t, 0.3),
      lfo(S, 0.31, 60 * p.bright, bp.frequency, t)];
  } },
  rain: { rev: 0.3, level: 0.47, swell: 15, make(S, out, t, p) {
    const src = loopSrc(S, S.noise, t);
    const hp = F(S, 'highpass', 1400, 0.5), lp = F(S, 'lowpass', 6000 * p.bright, 0.5);
    const g = G(S, 0.75);
    src.connect(hp).connect(lp).connect(g).connect(out);
    const body = loopSrc(S, brown(S), t); const bg = G(S, 0.35);
    body.connect(F(S, 'lowpass', 450, 0.5)).connect(bg).connect(out);
    return [src, body, lfo(S, 1 / p.swell, 0.2, g.gain, t)];
  } },
  drone: { rev: 0.5, level: 0.38, swell: 16, make(S, out, t, p) {
    const f = mtof(p.note);
    const lp = F(S, 'lowpass', (220 + f * 1.6) * p.bright, 0.8);
    const g = G(S, 0.65);
    lp.connect(g).connect(out);
    const srcs = [];
    // musicbox: the sine an octave down only when it is above 40 Hz; lower, it is rumble, not pitch
    const subR = f * 0.5 >= 40 ? 0.5 : 1, subA = f * 0.5 >= 40 ? 0.45 : 0.3;
    for (const [type, ratio, detune, amp] of [['sawtooth', 1, -7, 0.22], ['sawtooth', 1, 7, 0.22], ['triangle', 2, 3, 0.18], ['sine', subR, 0, subA]]) {
      const o = S.ctx.createOscillator(); o.type = type;
      o.frequency.value = clamp(f * ratio, 1, S.nyq * 0.9); o.detune.value = detune;
      const og = G(S, amp); o.connect(og).connect(lp); o.start(t); srcs.push(o);
    }
    srcs.push(lfo(S, 1 / p.swell, (120 + f * 0.8) * p.bright, lp.frequency, t), lfo(S, 0.6 / p.swell, 0.25, g.gain, t, 0.25));
    return srcs;
  } }
};

/* ----------------------------------------------------------------- engine */
// musicbox: parametric eq. A band is { type, f, gain, q }: highpass, lowpass, lowshelf, highshelf,
// peak or notch, the filters a DAW's eq uses. Returns the first and last filter, or null.
const EQ_TYPE = { highpass: 'highpass', lowpass: 'lowpass', lowshelf: 'lowshelf', highshelf: 'highshelf', peak: 'peaking', notch: 'notch' };
function eqChain(S, bands) {
  if (!bands || !bands.length) return null;
  const fs = bands.map(b => F(S, EQ_TYPE[b.type], b.f, b.q, b.gain || 0));
  for (let i = 1; i < fs.length; i++) fs[i - 1].connect(fs[i]);
  return [fs[0], fs[fs.length - 1]];
}
function makeIR(ctx, seconds, decayPow) {
  const sr = ctx.sampleRate, len = Math.floor(sr * seconds);
  const buf = ctx.createBuffer(2, len, sr);
  const pre = Math.floor(sr * 0.012);
  for (let ch = 0; ch < 2; ch++) {
    const y = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const x = (i - pre) / (len - pre);
      const a = 0.9 - 0.75 * x; // darker as it decays
      lp += a * ((Math.random() * 2 - 1) - lp);
      y[i] = lp * Math.pow(1 - x, decayPow);
    }
    // a few early reflections
    for (const [ms, amp] of [[11, .6], [19, .4], [27, .32], [37, .22], [53, .15]]) {
      const k = Math.floor(sr * (ms + ch * 2.3) / 1000); if (k < len) y[k] += amp * (Math.random() < .5 ? -1 : 1);
    }
  }
  return buf;
}

function createSynth(ctx, dest, opts = {}) {
  const S = { ctx, nyq: ctx.sampleRate / 2, waves: {}, ks: {} };
  const nlen = ctx.sampleRate * 3;
  S.noise = ctx.createBuffer(1, nlen, ctx.sampleRate);
  const nd = S.noise.getChannelData(0); for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;

  const master = G(S, 0.72);
  // musicbox: mastering. A subsonic filter first: below about 32 Hz there is nothing musical, only
  // rumble that costs headroom and makes small subwoofers boom. Then the score's mix eq (eq mix ...).
  // Scrimshaw had a fixed +2 dB low shelf at 180 Hz and -2.5 dB high shelf at 7.5 kHz here, to warm
  // and soften raw oscillators; the instruments do that themselves now, so the master is neutral.
  const sub1 = F(S, 'highpass', 32, .54), sub2 = F(S, 'highpass', 32, 1.31);
  const mixIn = G(S, 1), mixOut = G(S, 1); mixIn.connect(mixOut);
  let mixKey = '[]', mixNodes = null;
  const setMixEq = bands => {
    const key = JSON.stringify(bands || []); if (key === mixKey) return; mixKey = key;
    mixIn.disconnect(); if (mixNodes) mixNodes[1].disconnect();
    mixNodes = eqChain(S, bands);
    if (mixNodes) { mixIn.connect(mixNodes[0]); mixNodes[1].connect(mixOut); } else mixIn.connect(mixOut);
  };
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -15; comp.knee.value = 10; comp.ratio.value = 3.2; comp.attack.value = 0.006; comp.release.value = 0.22;
  const out = G(S, 1);
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.1;
  if (opts.raw) {
    // measurement chain: rough K-weighting, no compression
    master.connect(F(S, 'highpass', 60, .7)).connect(F(S, 'highshelf', 1500, .7, 4)).connect(out).connect(dest);
  } else { master.connect(sub1).connect(sub2).connect(mixIn); mixOut.connect(comp).connect(limiter).connect(out).connect(dest); }
  const analyser = ctx.createAnalyser(); analyser.fftSize = 1024; out.connect(analyser);

  const verb = ctx.createConvolver(); verb.buffer = makeIR(ctx, 2.8, 3.4);
  const verbIn = F(S, 'highpass', 220, .6);
  const verbRet = G(S, 0.9);
  verbIn.connect(verb).connect(verbRet).connect(master);

  return {
    S, master, out, analyser, verbRet, comp, limiter, // musicbox: comp and limiter, for meters
    // a session bus lets "stop" silence everything already scheduled
    // build plucked-string buffers ahead of time, a few at a time
    warm(song, budgetMs = 12) {
      const todo = [];
      song.voices.forEach((v, vi) => {
        const cfg = PLUCK[v.inst] || (v.inst === 'piano' ? 'piano' : null); if (!cfg) return; // musicbox: piano
        const seen = new Set();
        // musicbox: warm every cue and transition, not just the default cue
        const tls = song.cues
          ? Object.values(song.cues).flatMap(c => [c.intro, c.loop, ...[].concat(...(c.introSlots || []), ...(c.loopSlots || []))])
            .concat((song.transitions || []).filter(x => x.via).map(x => x.via))
          : [song.intro, song.loop];
        for (const tl of tls) for (const e of tl.events) if (e.v === vi) for (const m of (e.m || e.pick.flat())) { // musicbox: every choice
          if (seen.has(m)) continue; seen.add(m);
          todo.push([mtof(m), cfg]);
          if (v.inst === 'harpsichord') todo.push([mtof(m) * 2, cfg]);
        }
      });
      let i = 0;
      const step = () => {
        const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        while (i < todo.length && (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0 < budgetMs) { if (todo[i][1] === 'piano') pianoTone(S, todo[i][0]); else ks(S, todo[i][0], todo[i][1]); i++; }
        if (i < todo.length) setTimeout(step, 15);
      };
      step();
    },
    // musicbox: a bed: a continuous sound with its own level, starting silent
    bed(b, song) {
      const def = BED[b.inst];
      const input = G(S, 0);
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const eqc = eqChain(S, b.eq), post = eqc ? (input.connect(eqc[0]), eqc[1]) : input; // musicbox: the bed's eq
      if (pan) { pan.pan.value = b.pan || 0; post.connect(pan).connect(master); } else post.connect(master);
      const send = G(S, b.rev != null ? b.rev : def.rev); post.connect(send).connect(verbIn);
      const t = ctx.currentTime + 0.02;
      const srcs = def.make(S, input, t, { bright: b.bright || 1, swell: b.swell || def.swell, note: b.note });
      let stopped = false;
      return {
        input, level: def.level,
        stop(fade = 1, at = null) {
          if (stopped) return; stopped = true;
          const t0 = Math.max(ctx.currentTime, at == null ? 0 : at);
          input.gain.cancelScheduledValues(t0);
          input.gain.setTargetAtTime(0, t0, Math.max(0.01, fade / 3));
          const end = t0 + Math.max(0.05, fade) * 2 + 0.1;
          for (const s of srcs) { try { s.stop(end); } catch (e) { } }
          setTimeout(() => { try { input.disconnect(); send.disconnect(); } catch (e) { } }, (end - ctx.currentTime) * 1000 + 500);
        }
      };
    },
    session(song) {
      if (Object.keys(S.ks).length > 160) S.ks = {};
      const bus = G(S, 1); bus.connect(master);
      const sendBus = G(S, 1); sendBus.connect(verbIn);
      verbRet.gain.setValueAtTime(0.25 + 1.6 * (song.reverb != null ? song.reverb : 0.3), ctx.currentTime);
      setMixEq(song.mixEq); // musicbox: the score's mix eq
      const stops = []; // musicbox: cleanups for voice bodies
      const ch = song.voices.map(v => {
        const def = v.drum ? DRUM[v.inst] : INST[v.inst];
        const input = G(S, v.vol * def.level);
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        // musicbox: the voice's eq, before the pan and the reverb send
        const eqc = eqChain(S, v.eq), post = eqc ? (input.connect(eqc[0]), eqc[1]) : input;
        if (pan) { pan.pan.value = v.pan; post.connect(pan).connect(bus); } else post.connect(bus);
        const send = G(S, v.rev != null ? v.rev : def.rev); post.connect(send).connect(sendBus);
        // musicbox: an instrument's body (a violin's resonances, a choir's vowel) is built once per
        // voice, and every note plays into it
        const into = def.body ? def.body(S, input, v, fn => stops.push(fn)) : input;
        return { v, def, input, into };
      });
      return {
        bus, sendBus, ch,
        play(ev, t) {
          const c = ch[ev.v]; if (!c) return;
          try {
            // musicbox: players are not machines. Each note lands a few milliseconds either side
            // of the beat and a little louder or softer, and on instruments a player tunes as they
            // go, a few cents off. The voice's human= scales this; human=0 plays exactly as written.
            const hu = (c.v.human != null ? c.v.human : 1) * (c.def.loose != null ? c.def.loose : 1);
            const wob = () => hu * (Math.random() + Math.random() - 1);
            if (c.v.drum) { c.def.hit(S, c.input, t + wob() * .004, ev.vel * (1 + wob() * .1)); return; }
            const n = ev.m.length, dyn = ev.vel * (1 + wob() * .08), vs = dyn / Math.sqrt(n);
            ev.m.forEach((m, i) => {
              const p = { bright: c.v.bright, att: c.v.att, rel: c.v.rel, glide: c.v.glide, dyn,
                from: (ev.g != null && i === n - 1) ? mtof(ev.g) : null, cents: wob() * (c.def.cents || 0) };
              c.def.play(S, c.into, t + wob() * .008, ev.d, mtof(m), vs * (1 + wob() * .05), p);
            });
          } catch (e) { /* keep the music going if one note fails */ }
        },
        stop(fade = 0.06) {
          const now = ctx.currentTime;
          bus.gain.cancelScheduledValues(now); bus.gain.setTargetAtTime(0, now, fade);
          sendBus.gain.cancelScheduledValues(now); sendBus.gain.setTargetAtTime(0, now, fade);
          // musicbox: wait for long fades before disconnecting
          setTimeout(() => { try { bus.disconnect(); sendBus.disconnect(); } catch (e) { } stops.forEach(fn => { try { fn(); } catch (e) { } }); }, 1500 + fade * 5000);
        }
      };
    }
  };
}

// render a compiled song offline, scheduling in small chunks like the live player
async function renderOffline(song, seconds, sampleRate = 44100, opts = {}) { // musicbox: opts.seed, opts.cue
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const syn = createSynth(ctx, ctx.destination, opts);
  const sess = syn.session(song);
  // musicbox: roll the dice like the player does (opts.seed), and add the beds
  const rng = createRng(opts.seed != null ? opts.seed : 1);
  const cue = song.cues ? song.cues[opts.cue || song.defaultCue] : { intro: song.intro, loop: song.loop };
  const all = [];
  const add = (tl, off) => { for (const e of tl.events) { const r = realize(e, song.voices[e.v], rng); if (r) all.push([r.ev, e.t + r.dt + off + 0.05]); } };
  const intro = pass(cue, 'intro', rng);
  add(intro, 0);
  let off = intro.dur;
  while (cue.loop.dur > 0 && off < seconds) { const tl = pass(cue, 'loop', rng); add(tl, off); off += tl.dur; }
  all.sort((a, b) => a[1] - b[1]);
  for (const b of song.beds || []) {
    const sel = cue.beds ? (cue.beds[b.name] || 0) : 1;
    if (!sel) continue;
    const node = syn.bed(b, song);
    node.input.gain.setValueAtTime(sel * b.vol * node.level, 0);
  }
  const chunk = opts.chunk || 0.25;
  let idx = 0;
  const feed = (until) => { while (idx < all.length && all[idx][1] < until) { if (all[idx][1] < seconds) sess.play(all[idx][0], all[idx][1]); idx++; } };
  feed(chunk * 2);
  for (let t = chunk; t < seconds - chunk; t += chunk) {
    const tt = t;
    ctx.suspend(tt).then(() => { feed(tt + chunk * 2); ctx.resume(); });
  }
  return ctx.startRendering();
}
return { createSynth, renderOffline, INST, DRUM, BED, mtof };
})();

M.player = (function () {
'use strict';
// Runtime music player for browser games.
//
//   const music = new MusicPlayer();
//   music.load(scoreText);                 // throws if the score has errors
//   button.onclick = () => music.play('explore');   // first play must follow a user gesture
//   music.goto('combat');                  // switches on the next bar (or as the score's switch line says)
//   music.setIntensity(2);                 // fades layers in and out, keeping everything in sync
//   music.on('cue', ({ cue }) => ...);     // fires when a cue becomes audible
//
// Scheduling: notes are queued on the AudioContext a short lookahead in advance. A cue
// switch happens on a musical boundary after everything already queued, so nothing has to
// be cancelled: the old cue stops at the boundary and fades over `fade` seconds while the
// new cue starts exactly on it. Each switch opens a new synth session (its own bus), which
// is what lets the old music fade independently.
//
// Random parts ({…} notes, chance=, jitter=, {B C} pattern choices) are rolled here, as notes
// are queued, from a seeded generator: play(cue, { seed }) repeats the same music.
// Beds (sea, wind, rain, drone) belong to the player, not to a run: they keep going across
// cue switches and only change level.

const { compile } = M.score;
const { createSynth } = M.synth;
const { createRng, randomSeed, realize, pass } = M.random;

const AT = ['now', 'beat', 'bar', 'pattern', 'loop'];

// Seconds from the start of timeline `tl` to the first `at` boundary at or after `t`.
// Never later than the end of the timeline.
function boundaryAfter(tl, t, at) {
  if (at === 'now') return Math.max(0, Math.min(t, tl.dur));
  if (at === 'loop') return tl.dur;
  const eps = 1e-6;
  for (const s of tl.sections) {
    const end = s.start + s.dur;
    if (end <= t + eps) continue;
    if (at === 'pattern') return end;
    const unit = at === 'beat' ? s.barDur / s.beats : s.barDur;
    const k = Math.max(0, Math.ceil((t - s.start) / unit - eps));
    return Math.min(s.start + k * unit, end);
  }
  return tl.dur;
}

const DEFAULTS = {
  lookahead: 0.3,        // seconds of notes queued ahead while the tab is visible
  hiddenLookahead: 1.6,  // background tabs only get timer ticks about once a second
  interval: 25,          // scheduler tick, ms
  volume: 0.8,
  intensity: 9,          // plays every layer until the game says otherwise
  layerFade: 1,          // seconds for setIntensity fades
  switchFade: 0.3,       // seconds the old cue takes to fade after a switch, unless the score says otherwise
  bedFade: 2,            // seconds beds take to fade in, and at least this long to change level on a switch
  seed: null,            // a number for repeatable dice; null picks a new seed on every play()
  autoTick: true         // false: call tick() yourself (tests, custom loops)
};

class MusicPlayer {
  constructor(opts = {}) {
    this.opts = Object.assign({}, DEFAULTS, opts);
    this.ctx = opts.context || null;
    this.ownsContext = !opts.context;
    this.destination = opts.destination || null;
    this.syn = opts.synth || null;
    this.song = null;
    this.intensity = this.opts.intensity;
    this.muted = new Set();
    this.seg = null;          // the segment being scheduled now
    this.history = [];        // recent segments, for `state` while the lookahead runs ahead
    this.runs = new Set();    // runs whose synth sessions are still connected
    this.runCount = 0;
    this.target = null;       // the cue we're playing, or heading to
    this.until = 0;           // everything up to this AudioContext time is queued
    this.timer = null;
    this.listeners = {};
    this.notices = [];
    this.warmed = new WeakSet();
    this.seed = null;
    this.rng = createRng(1);
    this.beds = new Map();    // bed name -> { key, def, node }
    this.bedCue = null;       // the cue whose bed levels are set
  }

  static compile(text) { return compile(text); }

  /** Load a score (text or a compile() result). Throws an Error with `.errors` if it has errors. */
  load(source) {
    const song = typeof source === 'string' ? compile(source) : source;
    if (song.errors && song.errors.length) {
      const e = new Error('The score has errors:\n' + song.errors.map(x => `  line ${x.line}: ${x.msg}`).join('\n'));
      e.errors = song.errors;
      throw e;
    }
    this.song = song;
    if (this.syn) this.warm(song);
    return song;
  }

  get cues() { return this.song ? this.song.cueOrder.slice() : []; }
  get layers() { return this.song ? Math.max(0, ...this.song.voices.map(v => v.layer || 0), ...(this.song.beds || []).map(b => b.layer || 0)) : 0; }

  /** Create and resume the AudioContext. Call it from a click or key handler the first time. */
  unlock() {
    this.ensureContext();
    return this.ctx.state === 'running' ? Promise.resolve() : this.ctx.resume();
  }

  /** Start a cue from its beginning, cutting whatever is playing. */
  play(cue, opts = {}) {
    if (!this.song) throw new Error('Load a score before playing it.');
    const name = cue || this.song.defaultCue;
    this.checkCue(name);
    this.ensureContext();
    if (this.ctx.state !== 'running' && this.ctx.resume) this.ctx.resume();
    if (opts.intensity != null) this.intensity = opts.intensity;
    this.seed = opts.seed != null ? opts.seed : this.opts.seed != null ? this.opts.seed : randomSeed();
    this.rng = createRng(this.seed);
    if (this.seg) this.halt(0.08);
    const item = this.cueStart(this.newRun(), name);
    if (!item) return;
    this.target = name;
    this.until = this.ctx.currentTime;
    this.begin(item, this.ctx.currentTime + 0.1, null);
    if (this.opts.autoTick && !this.timer) this.timer = setInterval(() => this.tick(), this.opts.interval);
    this.tick();
  }

  /**
   * Move to another cue on a musical boundary. Options override the score's switch line:
   *   at: 'now' | 'beat' | 'bar' | 'pattern' | 'loop'   (default: the switch line, else 'bar')
   *   fade: seconds for the old cue to fade out          (default: the switch line, else 0.3)
   *   via: false to skip the switch line's transition pattern
   *   restart: true to restart the cue even if it's already the one playing
   */
  goto(cue, opts = {}) {
    if (!this.song) throw new Error('Load a score before switching cues.');
    this.checkCue(cue);
    if (!this.seg) return this.play(cue, opts);
    if (cue === this.target && !opts.restart) return;
    const seg = this.seg;
    const from = seg.cue;
    const rule = this.findRule(from, cue);
    const at = opts.at || (rule && rule.at) || 'bar';
    if (!AT.includes(at)) throw new Error(`at must be one of ${AT.join(', ')}`);
    const fade = opts.fade != null ? opts.fade : (rule && rule.fade != null ? rule.fade : this.opts.switchFade);
    const via = opts.via === false ? null : (rule && rule.via && rule.via.dur ? rule.via : null);
    const run = this.newRun();
    const target = this.cueStart(run, cue);
    if (!target) return;
    seg.cut = this.boundaryTime(at);
    seg.next = via ? { kind: 'via', cue, tl: via, run, after: target } : target;
    seg.fadeOut = fade;
    this.target = cue;
  }

  /** Layers with layer <= n play. Fades over `fade` seconds, starting now or on the next `at` boundary. Same value: no-op. */
  setIntensity(n, opts = {}) {
    if (n === this.intensity) return; // safe to call every frame
    this.intensity = n;
    if (!this.ctx || !this.syn) return;
    const fade = opts.fade != null ? opts.fade : this.opts.layerFade;
    const t = opts.at ? this.boundaryTime(opts.at) : null;
    for (const run of this.runs) this.applyGains(run, fade, t);
    this.levelBeds(this.bedCue, t, fade);
  }

  /** Silence a voice or a bed by name, or bring it back. */
  mute(voice, on = true) {
    if (on) this.muted.add(voice); else this.muted.delete(voice);
    if (this.ctx && this.syn) for (const run of this.runs) this.applyGains(run, 0.03, null);
    this.levelBeds(this.bedCue, null, 0.1);
  }

  setVolume(v) {
    this.opts.volume = v;
    if (this.syn) this.syn.out.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** Fade everything out over `fade` seconds and stop. */
  stop(fade = 0.5) {
    if (!this.ctx) return;
    this.halt(fade);
    this.stopBeds(fade);
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  close() {
    this.stop(0);
    if (this.ownsContext && this.ctx && this.ctx.close) this.ctx.close();
    this.ctx = null; this.syn = null;
  }

  /** Subscribe to 'cue' {cue}, 'pattern' {cue, part, pattern, bars} or 'end' {}. Returns an unsubscribe function. */
  on(type, fn) {
    (this.listeners[type] = this.listeners[type] || new Set()).add(fn);
    return () => this.listeners[type].delete(fn);
  }

  /** What is audible right now. */
  get state() {
    const base = { playing: !!this.seg, cue: null, target: this.target, part: null, pattern: null, bar: 0, beat: 0, chord: null, intensity: this.intensity, seed: this.seed };
    if (!this.ctx || !this.seg) return base;
    const now = this.ctx.currentTime;
    for (const seg of [this.seg, ...this.history.slice().reverse()]) {
      const end = Math.min(seg.t0 + seg.tl.dur, seg.cut);
      if (now < seg.t0 || now >= end) continue;
      const rel = now - seg.t0;
      const secs = seg.tl.sections;
      const sec = secs.find(s => rel >= s.start && rel < s.start + s.dur) || secs[secs.length - 1];
      if (!sec) break;
      const inSec = rel - sec.start;
      const h = (sec.harmony || []).find(x => inSec >= x.t && inSec < x.t + x.d);
      return Object.assign(base, {
        cue: seg.cue, part: seg.kind, pattern: sec.name,
        bar: Math.min(sec.bars, Math.floor(inSec / sec.barDur) + 1),
        beat: Math.floor((inSec % sec.barDur) / (sec.barDur / sec.beats)) + 1,
        chord: h ? h.sym : null
      });
    }
    return base;
  }

  /* --------------------------------------------------------------- internals */

  ensureContext() {
    if (!this.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) throw new Error('This browser has no Web Audio.');
      this.ctx = new AC({ latencyHint: 'playback' });
    }
    if (!this.syn) {
      this.syn = createSynth(this.ctx, this.destination || this.ctx.destination);
      this.syn.out.gain.value = this.opts.volume;
    }
    if (this.song) this.warm(this.song);
    return this.ctx;
  }

  warm(song) {
    if (this.warmed.has(song) || !this.syn || !this.syn.warm) return;
    this.warmed.add(song);
    this.syn.warm(song);
  }

  checkCue(name) {
    if (!this.song.cues[name]) throw new Error(`No cue called "${name}". Cues: ${this.song.cueOrder.join(', ')}`);
  }

  findRule(from, to) {
    const ts = this.song.transitions || [];
    // most specific first: calm -> fight, * -> fight, calm -> *, * -> *
    return ts.find(t => t.from === from && t.to === to) || ts.find(t => t.from === '*' && t.to === to)
      || ts.find(t => t.from === from && t.to === '*') || ts.find(t => t.from === '*' && t.to === '*') || null;
  }

  newRun() { return { id: ++this.runCount, song: this.song, sess: null }; }

  cueStart(run, name, depth = 0) {
    const c = run.song.cues[name];
    if (!c || depth > 8) return null;
    if (c.intro.dur) return { kind: 'intro', cue: name, tl: pass(c, 'intro', this.rng), run };
    if (c.loop.dur) return { kind: 'loop', cue: name, tl: pass(c, 'loop', this.rng), run };
    if (c.then) return this.cueStart(run, c.then, depth + 1);
    return null;
  }

  follow(seg) {
    const c = seg.run.song.cues[seg.cue];
    if (seg.kind === 'loop') return { kind: 'loop', cue: seg.cue, tl: pass(c, 'loop', this.rng), run: seg.run };
    if (seg.kind === 'intro') {
      if (c.loop.dur) return { kind: 'loop', cue: seg.cue, tl: pass(c, 'loop', this.rng), run: seg.run };
      if (c.then) return this.cueStart(seg.run, c.then);
    }
    return null;
  }

  // The first `at` boundary after everything already queued.
  boundaryTime(at) {
    const tmin = Math.max(this.until, this.ctx.currentTime) + 0.001;
    const seg = this.seg;
    if (!seg || at === 'now') return tmin;
    const end = Math.min(seg.t0 + seg.tl.dur, seg.cut);
    if (tmin >= end) return end;
    return Math.min(end, seg.t0 + boundaryAfter(seg.tl, tmin - seg.t0, at));
  }

  tick() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.flushNotices(now);
    if (!this.seg) return;
    const hidden = typeof document !== 'undefined' && document.hidden;
    const horizon = now + (hidden ? this.opts.hiddenLookahead : this.opts.lookahead);
    let guard = 0;
    while (this.seg && guard++ < 20000) {
      const seg = this.seg, evs = seg.tl.events;
      if (seg.i < evs.length) {
        const t = seg.t0 + evs[seg.i].t;
        if (t < seg.cut) {
          if (t > horizon) break;
          if (t >= now - 0.03) {
            const ev = evs[seg.i];
            const r = realize(ev, seg.run.song.voices[ev.v], this.rng); // musicbox: roll the dice
            if (r) seg.run.sess.play(r.ev, Math.max(t + r.dt, now + 0.005));
          }
          seg.i++;
          continue;
        }
      }
      const end = Math.min(seg.t0 + seg.tl.dur, seg.cut);
      if (end > horizon) break;
      this.advance(seg, end);
    }
    this.until = Math.max(this.until, horizon);
  }

  advance(seg, end) {
    const item = seg.next || this.follow(seg);
    if (!seg.next && item) this.target = item.cue; // a "then" moved us on
    this.history.push(seg);
    if (this.history.length > 4) this.history.shift();
    if (!item) {
      this.seg = null;
      this.notify(end, 'end', {});
      this.disposeLater(seg.run, end + 8);
      this.stopBeds(this.opts.bedFade, end);
      return;
    }
    this.begin(item, end, seg);
  }

  begin(item, t0, prev) {
    const run = item.run;
    if (!run.sess) this.openRun(run);
    const seg = { kind: item.kind, cue: item.cue, tl: item.tl, run, t0, i: 0, cut: Infinity, next: item.after || null, fadeOut: 0 };
    this.seg = seg;
    if (seg.kind !== 'via' && (!prev || prev.run !== run || prev.cue !== seg.cue || prev.kind === 'via')) this.notify(t0, 'cue', { cue: seg.cue }, seg);
    if (!prev || prev.cue !== seg.cue || prev.run !== run) this.syncBeds(run.song, seg.cue, t0, Math.max(this.opts.bedFade / 2, prev ? prev.fadeOut : this.opts.bedFade));
    for (const s of seg.tl.sections) this.notify(t0 + s.start, 'pattern', { cue: seg.cue, part: seg.kind, pattern: s.name, bars: s.bars }, seg);
    if (prev && prev.run !== run) {
      this.fadeOut(prev.run, t0, prev.fadeOut);
      this.disposeLater(prev.run, t0 + prev.fadeOut * 2 + 1);
    }
  }

  openRun(run) {
    run.sess = this.syn.session(run.song);
    this.runs.add(run);
    this.applyGains(run, 0, null);
  }

  fadeOut(run, at, fade) {
    const tau = Math.max(0.005, fade / 3);
    for (const g of [run.sess.bus.gain, run.sess.sendBus.gain]) g.setTargetAtTime(0, at, tau);
  }

  disposeLater(run, at) {
    const ms = Math.max(0, at - this.ctx.currentTime) * 1000 + 3000; // let release and reverb tails finish
    setTimeout(() => {
      try { run.sess.bus.disconnect(); run.sess.sendBus.disconnect(); } catch (e) { /* already gone */ }
      this.runs.delete(run);
    }, ms);
  }

  halt(fade) {
    for (const run of this.runs) if (run.sess) run.sess.stop(Math.max(0.005, fade / 3));
    this.runs.clear();
    this.seg = null;
    this.target = null;
    this.notices = [];
  }

  levelOf(run, vi) {
    const v = run.song.voices[vi], c = run.sess.ch[vi];
    const on = (v.layer || 0) <= this.intensity && !this.muted.has(v.name);
    return on ? v.vol * c.def.level : 0;
  }

  applyGains(run, fade, at) {
    if (!run.sess) return;
    const now = this.ctx.currentTime;
    run.sess.ch.forEach((c, vi) => {
      const g = c.input.gain, lvl = this.levelOf(run, vi);
      g.cancelScheduledValues(now);
      if (fade <= 0 && at == null) { g.setValueAtTime(lvl, now); return; }
      g.setValueAtTime(g.value, now);
      g.setTargetAtTime(lvl, at == null ? now : Math.max(now, at), Math.max(0.01, fade / 3));
    });
  }

  /* beds */

  // Start the beds `song` declares (keeping ones that haven't changed), stop the rest, and set
  // their levels for `cue` from time `t`, fading over `fade` seconds.
  syncBeds(song, cue, t, fade) {
    if (!this.syn || !this.syn.bed) return;
    const defs = song.beds || [];
    const keep = new Set();
    for (const def of defs) {
      const key = JSON.stringify(Object.assign({}, def, { ln: 0 }));
      const cur = this.beds.get(def.name);
      if (cur && cur.key === key) { cur.def = def; keep.add(def.name); continue; }
      if (cur) cur.node.stop(fade, t);
      this.beds.set(def.name, { key, def, node: this.syn.bed(def, song) });
      keep.add(def.name);
    }
    for (const [name, b] of this.beds) if (!keep.has(name)) { b.node.stop(fade, t); this.beds.delete(name); }
    this.bedSong = song;
    this.levelBeds(cue, t, fade);
  }

  bedLevel(b, cue) {
    const c = cue && this.bedSong && this.bedSong.cues[cue];
    const sel = c && c.beds ? (c.beds[b.def.name] || 0) : 1;
    const on = (b.def.layer || 0) <= this.intensity && !this.muted.has(b.def.name);
    return on ? sel * b.def.vol * b.node.level : 0;
  }

  levelBeds(cue, at, fade) {
    if (!this.ctx || !this.beds.size) return;
    this.bedCue = cue;
    const now = this.ctx.currentTime, t = at == null ? now : Math.max(now, at);
    for (const b of this.beds.values()) {
      const g = b.node.input.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(this.bedLevel(b, cue), t, Math.max(0.01, fade / 3));
    }
  }

  stopBeds(fade, at = null) {
    for (const b of this.beds.values()) b.node.stop(fade, at);
    this.beds.clear();
    this.bedCue = null;
  }

  notify(time, type, detail, seg = null) { this.notices.push({ time, type, detail, seg }); }

  flushNotices(now) {
    if (!this.notices.length) return;
    const due = this.notices.filter(n => n.time <= now).sort((a, b) => a.time - b.time);
    if (!due.length) return;
    this.notices = this.notices.filter(n => n.time > now);
    for (const n of due) {
      if (n.seg && n.time >= n.seg.cut) continue; // cut off by a switch before it was heard
      const set = this.listeners[n.type];
      if (set) for (const fn of set) { try { fn(n.detail); } catch (e) { console.error(e); } }
    }
  }
}
return { compile, AT, boundaryAfter, MusicPlayer };
})();

globalThis.Musicbox = { MusicPlayer: M.player.MusicPlayer, compile: M.score.compile, createSynth: M.synth.createSynth, version: "e371a2c" };
})();
