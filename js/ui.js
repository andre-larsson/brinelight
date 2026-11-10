/* Brinelight — rendering, input (mouse, touch, keyboard), animation, sound, saving. */
(function () {
  'use strict';
  const BL = window.BL;
  const E = BL.E;
  const SAVE_KEY = 'brinelight.save.v1';
  const PREF_KEY = 'brinelight.prefs.v1';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const screenEl = $('#screen');
  const overlayEl = $('#overlay');
  const tipEl = $('#tip');
  const fxLayer = $('#fx-layer');
  const toastEl = $('#toast');

  let run = null;
  let Teach = null; // tutorial and first-time hints (js/tutorial.js), created at boot
  const ui = {
    sel: null, target: null, hover: null, busy: false, tonicSel: null, drag: null,
    mapFocus: 0, lastPointer: (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 'touch' : 'mouse', combatRef: null, cw: 140, overlayOnClose: null, overlayLocked: false, tipFor: null,
  };
  let prefs = { sound: true, music: true, fast: false };
  const BEST_KEY = 'brinelight.best.v1';
  const LEVEL_KEY = 'brinelight.maxlevel.v1';
  const getNum = (k) => { try { return +(localStorage.getItem(k) || 0); } catch (e) { return 0; } };
  const setNum = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) { /* ignore */ } };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY) || '{}')); } catch (e) { /* ignore */ }
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ } };

  const wait = (ms) => new Promise((r) => setTimeout(r, prefs.fast ? ms * 0.5 : ms));
  const isTouchUI = () => ui.lastPointer === 'touch' || ui.lastPointer === 'pen';

  /* ================================================================== *
   *  Icons (inline SVG)
   * ================================================================== */
  const svg = (inner, vb) => `<svg viewBox="${vb || '0 0 24 24'}" aria-hidden="true" fill="currentColor">${inner}</svg>`;
  const ICON = {
    heart: svg('<path d="M12 21s-7.6-4.6-9.6-9.4C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.1C19.6 16.4 12 21 12 21z"/>'),
    pearl: svg('<circle cx="12" cy="12" r="8.5" fill="#e9dfcf"/><circle cx="12" cy="12" r="8.5" fill="none" stroke="#a89b85" stroke-width="1"/><circle cx="9" cy="9" r="2.6" fill="#fff" opacity=".85"/>'),
    anchor: svg('<circle cx="12" cy="5" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v13M7 11h10M4 14c1 4 4.5 6 8 6s7-2 8-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    deck: svg('<rect x="7" y="2.5" width="12" height="16" rx="2" opacity=".45"/><rect x="4.5" y="5.5" width="12" height="16" rx="2"/>'),
    discard: svg('<rect x="3" y="5" width="11" height="15" rx="2" opacity=".5"/><path d="M14 8h6m0 0-2.5-2.5M20 8l-2.5 2.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><rect x="8" y="9" width="10" height="13" rx="2"/>'),
    sunk: svg('<path d="M3 8c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 11v9m0 0-3-3m3 3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    menu: svg('<path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
    attack: svg('<path d="M4.5 19.5 16 8" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M13.5 3.5H20.5V10.5L18 8 16.4 9.6 14.4 7.6 16 6z"/><path d="M3 17.5l3.5 3.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
    defend: svg('<path d="M12 2.2 20 5.2v6.2c0 5.4-3.6 9.2-8 10.6-4.4-1.4-8-5.2-8-10.6V5.2z"/>'),
    buff: svg('<path d="M12 3.5 19.5 11H15v9.5H9V11H4.5z"/>'),
    debuff: svg('<path d="M12 20.5 4.5 13H9V3.5h6V13h4.5z"/>'),
    summon: svg('<circle cx="12" cy="12" r="9" opacity=".35"/><path d="M12 7v10M7 12h10" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
    fight: svg('<path d="M5 19 16.5 7.5M19 19 7.5 7.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M14 3.5h6.5V10L18 7.6zM10 3.5H3.5V10L6 7.6z"/>'),
    elite: svg('<path d="M12 2.5a8 8 0 0 0-8 8c0 2.7 1.2 4.6 3 5.7V20h10v-3.8c1.8-1.1 3-3 3-5.7a8 8 0 0 0-8-8z"/><circle cx="9" cy="10.8" r="2" fill="#0b1e2b"/><circle cx="15" cy="10.8" r="2" fill="#0b1e2b"/><path d="M10 16.5h1.2V20H10zM12.8 16.5H14V20h-1.2z" fill="#0b1e2b"/><path d="M4.5 6 2 2.5l4.5 1.8M19.5 6 22 2.5l-4.5 1.8"/>'),
    rest: svg('<rect x="9" y="1.8" width="6" height="2.4" rx="1"/><path d="M7 5.5h10l-1.2 2.3v9.4L17 19.5H7l1.2-2.3V7.8z" opacity=".4"/><path d="M12 8.5c2 2.2 2.8 3.6 2.8 5.1a2.8 2.8 0 0 1-5.6 0c0-1.6 1-3.1 2.8-5.1z"/><rect x="8" y="20" width="8" height="2" rx="1"/>'),
    shop: svg('<path d="M9 2.5h6l-1.6 3.2h-2.8z"/><path d="M8.2 6.6h7.6c3 3 4.2 6.2 4.2 9.2a4.4 4.4 0 0 1-4.4 4.4H8.4A4.4 4.4 0 0 1 4 15.8c0-3 1.2-6.2 4.2-9.2z"/><circle cx="12" cy="14" r="2.6" fill="#0b1e2b"/>'),
    event: svg('<path d="M8.6 8.8a3.6 3.6 0 1 1 5.2 3.2c-1.1.6-1.8 1.3-1.8 2.6v.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><circle cx="12" cy="19.6" r="1.7"/>'),
    treasure: svg('<path d="M3 11h18v9H3z"/><path d="M4 10c0-3.3 2.2-5.5 8-5.5S20 6.7 20 10z" opacity=".75"/><rect x="10.4" y="12" width="3.2" height="4.4" rx=".8" fill="#0b1e2b"/>'),
    boss: svg('<path d="M12 2a1.6 1.6 0 0 1 1.6 1.6v.8A6.2 6.2 0 0 1 18.2 10.4v4.8l2.3 3.2H3.5l2.3-3.2v-4.8a6.2 6.2 0 0 1 4.6-6v-.8A1.6 1.6 0 0 1 12 2z"/><circle cx="12" cy="20.6" r="2"/>'),
    might: svg('<path d="M4.5 19.5 16 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M13.5 3.5H20.5V10.5L18 8 16.4 9.6 14.4 7.6 16 6z"/>'),
    spines: svg('<path d="M12 1.8l2 6.2 6-2.4-3.4 5.4 5.6 3-6.3.6 1.1 6.3-5-4.1-5 4.1 1.1-6.3-6.3-.6 5.6-3L4 5.6 10 8z"/>'),
    soaked: svg('<path d="M12 2.5c3.3 4.3 6.3 7.6 6.3 11.4a6.3 6.3 0 0 1-12.6 0c0-3.8 3-7.1 6.3-11.4z"/>'),
    chilled: svg('<path d="M12 2v20M3.4 7l17.2 10M3.4 17 20.6 7M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'),
    brine: svg('<circle cx="8.5" cy="15" r="4.6"/><circle cx="15.5" cy="7.5" r="3.4"/><circle cx="17.4" cy="16.4" r="2.3"/>'),
    moon: svg('<path d="M15.5 2.5a9.5 9.5 0 1 0 6 16.2A7.8 7.8 0 0 1 15.5 2.5z"/>'),
    shell: svg('<path d="M12 3c5.2 0 9 4 9 9h-3.2a5.8 5.8 0 0 0-5.8-5.8 3.8 3.8 0 0 0-3.8 3.8 2.4 2.4 0 0 0 2.4 2.4V15.6A5.6 5.6 0 0 1 5 10 7 7 0 0 1 12 3z"/><path d="M3 21h18" stroke="currentColor" stroke-width="2"/>'),
    vortex: svg('<path d="M20 12a8 8 0 1 1-8-8M16.5 12A4.5 4.5 0 1 1 12 7.5M13 12a1 1 0 1 1-1-1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
    beam: svg('<path d="M10 9h4l1.5 13h-7z"/><rect x="9.4" y="5" width="5.2" height="3.4" rx="1"/><path d="M15 6.5 22 3v7zM9 6.5 2 3v7z" opacity=".55"/>'),
    bond: svg('<path d="M10 14a4 4 0 0 1 0-5.7l2.3-2.3a4 4 0 0 1 5.7 5.7l-1.2 1.2M14 10a4 4 0 0 1 0 5.7l-2.3 2.3a4 4 0 0 1-5.7-5.7l1.2-1.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
    flame: svg('<path d="M12 2c3.2 4.2 6.2 6.8 6.2 11.2a6.2 6.2 0 0 1-12.4 0c0-3.1 1.6-5.2 3.1-6.7.3 2 1.1 3.1 2.3 3.6C11 7.6 11 5.1 12 2z"/>'),
    wave: svg('<path d="M2 15c2.5-4 5.5-4 8 0s5.5 4 8 0c1-1.6 2.2-2.5 4-2.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M2 9c2.5-4 5.5-4 8 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>'),
    sound: svg('<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
    echo: svg('<path d="M4 12a8 8 0 0 1 8-8M20 12a8 8 0 0 1-8 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M8 12a4 4 0 0 1 4-4M16 12a4 4 0 0 1-4 4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="12" r="1.6"/>'),
    music: svg('<path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.8"/><circle cx="17.5" cy="16" r="2.8"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
  };
  const NODE_ICON = { fight: ICON.fight, elite: ICON.elite, rest: ICON.rest, shop: ICON.shop, event: ICON.event, treasure: ICON.treasure, boss: ICON.boss };
  const SHORT_NAME = { fight: 'Skirmish', elite: 'Dread', rest: 'Cove', shop: 'Shop', event: 'Fog', treasure: 'Wreck', boss: 'Boss' };
  const NODE_NAME = { fight: 'Skirmish', elite: 'Dread (elite)', rest: 'Sheltered Cove (rest)', shop: "Barnaby's Shop", event: 'Fog (unknown)', treasure: 'Wreck (treasure)', boss: 'The Drowned Bellwether' };

  /* ================================================================== *
   *  Sound (tiny WebAudio synth, no files)
   * ================================================================== */
  const Sound = (function () {
    let ctx = null;
    let master = null;
    function ac() {
      if (!ctx) {
        try {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
          master = ctx.createGain();
          master.gain.value = 0.55;
          master.connect(ctx.destination);
        } catch (e) { return null; }
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(f, dur, type, vol, slide, delay) {
      const a = ac(); if (!a) return;
      const t = a.currentTime + (delay || 0);
      const o = a.createOscillator(); const g = a.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    let noiseBuf = null;
    function noise(dur, vol, freq, ftype, slide, delay, q) {
      const a = ac(); if (!a) return;
      if (!noiseBuf) {
        noiseBuf = a.createBuffer(1, a.sampleRate * 1.5, a.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const t = a.currentTime + (delay || 0);
      const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = a.createBiquadFilter(); f.type = ftype || 'lowpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
      if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
      const g = a.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.05, dur / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.05);
    }
    const lib = {
      card: () => noise(0.16, 0.18, 2400, 'bandpass', 900),
      select: () => tone(880, 0.06, 'triangle', 0.05),
      hit: () => { tone(150, 0.18, 'sine', 0.3, 55); noise(0.12, 0.2, 1400, 'lowpass', 300); },
      hurt: () => { tone(110, 0.25, 'sawtooth', 0.12, 50); noise(0.2, 0.25, 900, 'lowpass', 200); },
      block: () => { tone(1250, 0.12, 'triangle', 0.08); tone(1870, 0.1, 'sine', 0.04); },
      ward: () => tone(620, 0.16, 'triangle', 0.07, 900),
      crest: () => { noise(1.1, 0.35, 300, 'bandpass', 1800, 0, 0.8); noise(0.9, 0.25, 2000, 'lowpass', 200, 0.35); },
      low: () => noise(0.9, 0.22, 1500, 'lowpass', 120),
      buff: () => { tone(440, 0.12, 'triangle', 0.08, 660); tone(660, 0.14, 'triangle', 0.06, 880, 0.08); },
      debuff: () => tone(520, 0.25, 'sawtooth', 0.05, 220),
      die: () => { noise(0.5, 0.25, 800, 'lowpass', 90); tone(200, 0.4, 'sine', 0.15, 60); },
      turn: () => { tone(660, 0.9, 'sine', 0.07); tone(990, 0.7, 'sine', 0.035); },
      coin: () => { tone(1320, 0.08, 'square', 0.04); tone(1760, 0.14, 'square', 0.035, null, 0.07); },
      victory: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.5, 'triangle', 0.09, null, i * 0.12)),
      defeat: () => [392, 311, 262, 196].forEach((f, i) => tone(f, 0.7, 'sine', 0.1, null, i * 0.22)),
      bell: () => { tone(196, 2.2, 'sine', 0.2); tone(392, 1.6, 'sine', 0.08); tone(587, 1.2, 'sine', 0.05); },
      tonic: () => { noise(0.25, 0.12, 600, 'bandpass', 2400); tone(700, 0.2, 'sine', 0.05, 1100, 0.1); },
      tide: () => tone(300, 0.18, 'sine', 0.05, 420),
      draw: () => noise(0.07, 0.07, 3000, 'highpass'),
      chain: (n) => { const b = 440 * Math.pow(2, (n || 1) * 3 / 12); tone(b, 0.5, 'triangle', 0.09); tone(b * 1.5, 0.6, 'sine', 0.05, null, 0.06); tone(b * 2, 0.7, 'sine', 0.035, null, 0.12); },
      kill: () => { noise(0.35, 0.3, 2400, 'bandpass', 300, 0, 0.7); tone(330, 0.25, 'triangle', 0.08, 660); },
      echo: () => { tone(660, 0.4, 'sine', 0.07); tone(660, 0.4, 'sine', 0.04, null, 0.18); tone(990, 0.5, 'sine', 0.03, null, 0.3); },
      pearl: () => { tone(1568, 0.09, 'sine', 0.05); tone(2093, 0.16, 'sine', 0.045, null, 0.08); },
      phase: () => { tone(98, 2.5, 'sawtooth', 0.12, 49); noise(1.6, 0.3, 200, 'lowpass', 60); tone(196, 2.4, 'sine', 0.18); },
      danger: () => { tone(220, 0.18, 'square', 0.03); tone(208, 0.18, 'square', 0.03, null, 0.2); },
    };
    return {
      play(name, arg) { if (!prefs.sound) return; try { lib[name] && lib[name](arg); } catch (e) { /* audio unavailable */ } },
      unlock() { if (prefs.sound || prefs.music) ac(); Music.kick(); },
      ctx: () => ac(),
    };
  })();
  const sfx = (n, arg) => Sound.play(n, arg);

  /* ================================================================== *
   *  Music: a small generative score over an ocean bed (WebAudio only)
   * ================================================================== */
  const Music = (function () {
    let ctx = null, out = null, timer = null, mood = null, step = 0, nextT = 0, started = false;
    const MOODS = {
      calm: { chords: [[57, 60, 64], [53, 57, 60], [52, 55, 60], [55, 59, 62]], bar: 4.2, plucks: 2, pulse: 0, scale: [69, 72, 74, 76, 79, 81] },
      fight: { chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]], bar: 2.8, plucks: 3, pulse: 2, scale: [69, 72, 74, 76, 79] },
      boss: { chords: [[50, 53, 57], [49, 52, 55], [46, 50, 53], [45, 49, 52]], bar: 2.6, plucks: 2, pulse: 2, scale: [62, 65, 67, 69, 72] },
      boss2: { chords: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]], bar: 2.0, plucks: 4, pulse: 4, scale: [62, 65, 67, 69, 72, 74] },
    };
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    function ensure() {
      if (out) return true;
      ctx = Sound.ctx();
      if (!ctx) return false;
      out = ctx.createGain();
      out.gain.value = 0;
      out.connect(ctx.destination);
      // ocean bed: looping brown noise, low-passed, slowly swelling
      const len = ctx.sampleRate * 6;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
      const g = ctx.createGain(); g.gain.value = 0.16;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
      const lg = ctx.createGain(); lg.gain.value = 0.11;
      lfo.connect(lg); lg.connect(g.gain); lfo.start();
      src.connect(lp); lp.connect(g); g.connect(out); src.start();
      return true;
    }
    function pad(notes, t, dur, vol) {
      notes.forEach((m) => {
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m);
        const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = hz(m) * 1.004;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(out);
        o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
      });
    }
    function pluck(m, t, vol) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(m);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 2.3);
    }
    function thump(t, vol) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.35);
    }
    function schedule() {
      if (!ctx || !mood) return;
      const M = MOODS[mood];
      while (nextT < ctx.currentTime + 1.2) {
        const ch = M.chords[step % M.chords.length];
        pad(ch, nextT, M.bar * 1.1, 0.018);
        pad([ch[0] - 12], nextT, M.bar, 0.03);
        for (let i = 0; i < M.plucks; i++) {
          if (Math.random() < 0.7) pluck(M.scale[Math.floor(Math.random() * M.scale.length)], nextT + (M.bar / M.plucks) * i + Math.random() * 0.2, 0.035);
        }
        for (let i = 0; i < M.pulse; i++) thump(nextT + (M.bar / M.pulse) * i, 0.12);
        nextT += M.bar;
        step++;
      }
    }
    function fadeTo(v, sec) {
      if (!out) return;
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(v, t + sec);
    }
    return {
      setMood(m) {
        if (mood === m) return;
        mood = m;
        if (started && prefs.music) { step = 0; nextT = Math.max(nextT, ctx.currentTime + 0.1); }
      },
      kick() {
        if (!prefs.music) return;
        if (!ensure()) return;
        if (!started) {
          started = true;
          nextT = ctx.currentTime + 0.2;
          timer = setInterval(schedule, 300);
        }
        fadeTo(0.55, 2.5);
      },
      stop() { fadeTo(0, 0.8); },
    };
  })();

  /* ================================================================== *
   *  Helpers: save/load, toast, tooltip
   * ================================================================== */
  function save() {
    if (!run || run.tutorial) return; // the tutorial is never saved
    if (run.screen === 'victory' || run.screen === 'defeat') { clearSave(); return; }
    if (run.combat && (run.combat.phase !== 'player' || run.combat.won || run.combat.lost)) return;
    try {
      E.tick(run);
      localStorage.setItem(SAVE_KEY, JSON.stringify(run, (k, v) => (k === 'fx' ? [] : v)));
    } catch (e) { /* storage unavailable */ }
  }
  function loadSave() {
    try {
      const s = localStorage.getItem(SAVE_KEY);
      if (!s) return null;
      const r = JSON.parse(s);
      if (!r || r.version !== 2 || !r.map) return null;
      if (r.screen === 'victory' || r.screen === 'defeat') return null;
      r.stats.lastTick = Date.now();
      return r;
    } catch (e) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

  function toast(msg) {
    const d = document.createElement('div');
    d.className = 'toast-msg';
    d.textContent = msg;
    toastEl.appendChild(d);
    while (toastEl.children.length > 3) toastEl.firstChild.remove();
    setTimeout(() => d.remove(), 2300);
  }

  const KW_RE = /\b(Low Water|Surge|Ebb|Ward|Soaked|Chilled|Brine|Sink|Float|Might|Spines|Crest|Light|Tide)\b/g;
  const kwClass = (k) => 'k-' + k.toLowerCase().replace(/\s/g, '');
  function markKeywords(text) {
    return text.replace(KW_RE, (m) => `<span class="kw ${kwClass(m)}">${m}</span>`);
  }
  function keywordsOf(card) {
    const d = BL.CARDS[card.id];
    const plain = d.text(E.vals(card), { d: (n) => n, tide: null }).replace(/<[^>]+>/g, '');
    const found = [];
    (plain.match(KW_RE) || []).forEach((k) => { if (found.indexOf(k) < 0) found.push(k); });
    if (found.indexOf('Surge') >= 0 && found.indexOf('Crest') < 0) found.push('Crest');
    if (found.indexOf('Ebb') >= 0 && found.indexOf('Low Water') < 0) found.push('Low Water');
    if (d.type === 'rite') found.unshift('Rite');
    return found.filter((k) => BL.KEYWORDS[k] && k !== 'Light' && k !== 'Tide');
  }

  function statusTip(o, key) {
    const s = BL.STATUSES[key];
    if (!s) return '';
    return `<b>${s.name} ${o.st[key] > 1 || s.kind !== 'rite' ? o.st[key] : ''}</b><br>${s.desc(o.st[key])}`;
  }
  function tipContent(key) {
    const parts = key.split(':');
    const c = run && run.combat;
    switch (parts[0]) {
      case 'hp': return `<b>Health</b><br>${run.hp} of ${run.maxHp}. If it reaches 0, the run is over.`;
      case 'pearls': return `<b>Pearls</b><br>Spend them at Barnaby's shop.`;
      case 'floor': return `<b>Depth ${run.floor} of ${E.MAP_ROWS + 1}</b><br>The Drowned Bellwether waits at depth ${E.MAP_ROWS + 1}.`;
      case 'ks': { const k = BL.KEEPSAKES[parts[1]]; return `<b>${k.name}</b><br>${k.desc}`; }
      case 'tonic': {
        const t = run.tonics[+parts[1]];
        if (!t) return '<b>Empty tonic slot</b><br>Tonics are found after fights and sold by Barnaby.';
        return `<b>${BL.TONICS[t].name}</b><br>${BL.TONICS[t].desc}<br><span class="muted">Click to use.</span>`;
      }
      case 'light': return `<b>Light: ${c ? c.light : 0}</b><br>${BL.KEYWORDS.Light}`;
      case 'tide': return `<b>Tide: ${c ? c.tide : 3}</b><br>${BL.KEYWORDS.Tide}<div class="tip-row"><b>Crest</b> (at 6): ${BL.KEYWORDS.Crest.split(': ')[1] || BL.KEYWORDS.Crest}</div><div class="tip-row"><b>Low Water</b> (at 0): ${BL.KEYWORDS['Low Water'].split(': ')[1] || BL.KEYWORDS['Low Water']}</div>`;
      case 'kw': return `<b>${parts[1]}</b><br>${BL.KEYWORDS[parts[1]]}`;
      case 'st': {
        const o = parts[1] === 'p' ? c.player : E.enemyByUid(c, parts[1]);
        return o ? statusTip(o, parts[2]) : '';
      }
      case 'ward': return `<b>Ward</b><br>${BL.KEYWORDS.Ward}`;
      case 'echo': return `<b>Echo ${c ? c.echo : ''}</b><br>Your next card is played twice.`;
      case 'incoming': return `<b>Incoming damage</b><br>What the enemies intend to hit you for this turn, after your current Ward.`;
      case 'intent': {
        const e = E.enemyByUid(c, parts[1]);
        if (!e) return '';
        const info = E.intentInfo(run, e);
        return `<b>Intends: ${info.name}</b><br>${info.parts.join('. ')}.`;
      }
      case 'unit': {
        const isP = parts[1] === 'p';
        const o = isP ? c.player : E.enemyByUid(c, parts[1]);
        if (!o) return '';
        let html = `<b>${isP ? 'Wren, the Keeper' : o.name}</b> ${isP ? run.hp + '/' + run.maxHp : o.hp + '/' + o.maxHp} HP`;
        if (o.ward) html += `, ${o.ward} Ward`;
        if (!isP) { const info = E.intentInfo(run, o); if (info) html += `<div class="tip-row"><b>Intends: ${info.name}</b><br>${info.parts.join('. ')}.</div>`; }
        Object.keys(o.st).forEach((k) => { if (o.st[k]) html += `<div class="tip-row">${statusTip(o, k)}</div>`; });
        return html;
      }
      case 'pile': return `<b>${{ draw: 'Draw pile', discard: 'Discard pile', sunk: 'Sunk cards' }[parts[1]]}</b><br>Click to view.`;
      case 'node': return `<b>${NODE_NAME[parts[1]]}</b>`;
    }
    return '';
  }
  function showTip(target, html) {
    if (!html) return hideTip();
    tipEl.innerHTML = html;
    tipEl.hidden = false;
    const r = target.getBoundingClientRect();
    const tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
    let x = r.left + r.width / 2 - tw / 2;
    let y = r.top - th - 8;
    if (y < 6) y = r.bottom + 8;
    x = Math.max(6, Math.min(innerWidth - tw - 6, x));
    y = Math.max(6, Math.min(innerHeight - th - 6, y));
    tipEl.style.left = x + 'px';
    tipEl.style.top = y + 'px';
  }
  function hideTip() { tipEl.hidden = true; ui.tipFor = null; }

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const t = e.target.closest('[data-tip]');
    if (!t) { hideTip(); return; }
    if (ui.drag && ui.drag.moved) return;
    showTip(t, tipContent(t.dataset.tip));
  });
  document.addEventListener('pointerdown', (e) => {
    ui.lastPointer = e.pointerType || 'mouse';
    Sound.unlock();
    if (e.pointerType !== 'mouse' && !e.target.closest('[data-tip]')) hideTip();
  }, true);

  /* ================================================================== *
   *  Cards
   * ================================================================== */
  function combatFmt(target) {
    const c = run.combat;
    return {
      tide: c.tide,
      ward: c.player.ward,
      d: (base) => {
        const v = E.attackValue(c.player, target || null, base);
        if (v > base) return `<span class="num-up">${v}</span>`;
        if (v < base) return `<span class="num-down">${v}</span>`;
        return String(v);
      },
    };
  }
  const plainFmt = { d: (n) => String(n), tide: null, ward: null };
  const TYPE_LABEL = { attack: 'Attack', skill: 'Skill', rite: 'Rite', status: 'Status', curse: 'Curse' };

  function cardInner(card, inCombat, target) {
    const d = BL.CARDS[card.id];
    const cost = E.cost(card, inCombat ? run.combat : null);
    const text = markKeywords(d.text(E.vals(card), inCombat ? combatFmt(target) : plainFmt));
    const baseCost = d.cost;
    const long = text.replace(/<[^>]+>/g, '').length > 58;
    return `<div class="frame"><div class="c-art" style="background-image:url(img/cards/${d.art}.webp)"></div>` +
      `<div class="c-name"><span>${E.cardName(card)}</span></div><div class="c-type">${TYPE_LABEL[d.type]}</div>` +
      `<div class="c-text${long ? ' long' : ''}"><div>${text}</div></div></div>` +
      `<div class="c-cost${cost == null ? ' none' : ''}${cost != null && cost < baseCost ? ' changed' : ''}">${cost == null ? '' : cost}</div>`;
  }
  function cardClass(card) {
    const d = BL.CARDS[card.id];
    return `card t-${d.type} r-${d.rarity}${card.up ? ' up' : ''}`;
  }
  function cardLabel(card) {
    const d = BL.CARDS[card.id];
    const cost = E.cost(card);
    const t = d.text(E.vals(card), plainFmt).replace(/<[^>]+>/g, '');
    return `${E.cardName(card)}, ${TYPE_LABEL[d.type]}${cost != null ? ', costs ' + cost : ''}. ${t}`;
  }
  function staticCard(card, extra, attrs) {
    return `<div class="${cardClass(card)} static ${extra || ''}" ${attrs || ''} aria-label="${cardLabel(card).replace(/"/g, '&quot;')}">${cardInner(card, false)}</div>`;
  }
  const pseudo = (id, up) => ({ uid: -1, id, up: up ? 1 : 0 });
  function sortDeck(cards) {
    const order = { attack: 0, skill: 1, rite: 2, status: 3, curse: 4 };
    return cards.slice().sort((a, b) => {
      const da = BL.CARDS[a.id], db = BL.CARDS[b.id];
      return order[da.type] - order[db.type] || da.name.localeCompare(db.name) || b.up - a.up;
    });
  }

  /* ================================================================== *
   *  Overlays (modals)
   * ================================================================== */
  function openOverlay(html, opts) {
    opts = opts || {};
    hideTip();
    overlayEl.innerHTML = html;
    overlayEl.hidden = false;
    ui.overlayOnClose = opts.onClose || null;
    ui.overlayLocked = !!opts.locked;
    const f = overlayEl.querySelector('[autofocus]') || overlayEl.querySelector('button, [tabindex="0"]');
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 30);
  }
  function closeOverlay(force) {
    if (overlayEl.hidden) return;
    if (ui.overlayLocked && !force) return;
    overlayEl.hidden = true;
    overlayEl.innerHTML = '';
    const cb = ui.overlayOnClose;
    ui.overlayOnClose = null;
    ui.overlayLocked = false;
    if (cb) cb();
  }
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeOverlay();
  });

  function modal(title, body, foot, cls) {
    return `<div class="modal ${cls || ''}" role="dialog" aria-modal="true" aria-label="${title}">` +
      `<div class="modal-head"><h2>${title}</h2>${foot === false ? '' : `<button class="icon-btn" data-act="close" aria-label="Close">${ICON.close}</button>`}</div>` +
      `<div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ''}</div>`;
  }

  function showDeck(mode, onPick) {
    mode = mode || 'view';
    let cards = sortDeck(run.deck);
    if (mode === 'upgrade') cards = cards.filter(E.canUpgrade);
    if (mode === 'duplicate') cards = cards.filter((c) => BL.CARDS[c.id].type !== 'curse');
    const titles = { view: `Your Deck (${run.deck.length})`, upgrade: 'Choose a card to upgrade', remove: 'Choose a card to remove', shopremove: 'Choose a card to remove', duplicate: 'Choose a card to duplicate' };
    const gcw = Math.max(96, Math.min(132, (innerWidth - 60) / 3.3));
    const grid = `<div class="card-grid" style="--gcw:${gcw}px">` + cards.map((c, i) =>
      staticCard(c, mode === 'view' ? '' : 'choice', `tabindex="0" role="button" data-act="deckpick" data-uid="${c.uid}" data-i="${i}"`)).join('') + '</div>';
    const hint = mode === 'view' ? '<p class="muted" style="margin:0 0 12px">Starting deck plus everything you have collected. Click a card to see its upgrade.</p>' : '';
    const locked = mode === 'remove' || mode === 'upgrade' || mode === 'duplicate';
    openOverlay(modal(titles[mode], hint + (cards.length ? grid : '<p>No cards.</p>'), locked ? null : '<button class="btn" data-act="close">Close</button>'), { locked: locked && !!onPick && !ui.allowCancelPick });
    ui.deckMode = { mode, onPick };
  }

  function deckPick(uid) {
    const m = ui.deckMode;
    if (!m) return;
    const card = run.deck.find((c) => c.uid === uid);
    if (!card) return;
    if (m.mode === 'view') {
      const body = E.canUpgrade(card)
        ? `<div class="compare">${staticCard(card)}<div class="arrow">&#10140;</div>${staticCard(Object.assign({}, card, { up: 1 }))}</div>`
        : `<div class="compare">${staticCard(card)}</div>`;
      const locked = ui.overlayLocked;
      openOverlay(modal(E.cardName(card), body, '<button class="btn" data-act="deckback">Back</button>', 'narrow'), { locked });
      return;
    }
    if (m.mode === 'upgrade') {
      const body = `<div class="compare">${staticCard(card)}<div class="arrow">&#10140;</div>${staticCard(Object.assign({}, card, { up: 1 }))}</div>`;
      openOverlay(modal('Upgrade this card?', body, '<button class="btn" data-act="deckback">Back</button><button class="btn primary" data-act="deckconfirm" autofocus>Upgrade</button>', 'narrow'), { locked: ui.overlayLocked });
      ui.pending = uid;
      return;
    }
    if (m.mode === 'duplicate') {
      const body = `<div class="compare">${staticCard(card)}<div class="arrow">+</div>${staticCard(card)}</div>`;
      openOverlay(modal('Duplicate this card?', body, '<button class="btn" data-act="deckback">Back</button><button class="btn primary" data-act="deckconfirm" autofocus>Duplicate</button>', 'narrow'), { locked: ui.overlayLocked });
      ui.pending = uid;
      return;
    }
    const price = m.mode === 'shopremove' ? ` for ${E.removePrice(run)} Pearls` : '';
    const body = `<div class="compare">${staticCard(card)}</div><p style="text-align:center">This card will be gone from your deck for the rest of the run.</p>`;
    openOverlay(modal(`Remove ${E.cardName(card)}${price}?`, body, '<button class="btn" data-act="deckback">Back</button><button class="btn primary" data-act="deckconfirm" autofocus>Remove</button>', 'narrow'), { locked: ui.overlayLocked });
    ui.pending = uid;
  }

  function showPile(which) {
    const c = run.combat;
    if (!c) return;
    let cards = c[which];
    if (which === 'draw') cards = sortDeck(cards);
    const names = { draw: 'Draw pile', discard: 'Discard pile', sunk: 'Sunk cards' };
    const note = which === 'draw' ? '<p class="muted" style="margin:0 0 12px">Shown in sorted order; the real order is hidden.</p>' : '';
    const gcw = Math.max(96, Math.min(128, (innerWidth - 60) / 3.3));
    const body = note + (cards.length ? `<div class="card-grid" style="--gcw:${gcw}px">${cards.map((x) => staticCard(x)).join('')}</div>` : '<p class="muted">Empty.</p>');
    const tabs = ['draw', 'discard', 'sunk'].map((p) => `<button class="btn small ${p === which ? 'primary' : ''}" data-act="pile" data-pile="${p}">${names[p]} (${c[p].length})</button>`).join('');
    openOverlay(modal(names[which], body, `<div class="pile-tabs">${tabs}</div><button class="btn" data-act="close">Close</button>`));
  }

  function showCardChoice(ids, title, onDone) {
    const body = `<div class="card-row">${ids.map((id, i) => staticCard(pseudo(id), 'choice', `tabindex="0" role="button" data-act="choosecard" data-id="${id}" data-i="${i}"`)).join('')}</div>`;
    ui.cardChoiceDone = onDone;
    openOverlay(modal(title, body, '<button class="btn" data-act="choosecard" data-id="">Skip</button>', ''), { locked: true });
  }

  /* How to Play: a short reference in tabs. The tutorial teaches; this is for looking things up. */
  const HELP_TABS = [['basics', 'Basics'], ['tide', 'The Tide'], ['keywords', 'Keywords'], ['map', 'The map'], ['controls', 'Controls']];
  function helpSection(tab) {
    const kbd = (k) => `<span class="kbd">${k}</span>`;
    const dl = (rows) => `<dl class="help-dl">${rows.map((r) => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>`;
    switch (tab) {
      case 'tide': return `<ul class="help-list">
        <li>A gauge from <b>0 to 6</b>. It starts every fight at 3 and stays put between turns.</li>
        <li><b>Surge</b> raises it. <b>Ebb</b> lowers it.</li>
        <li><b>Crest</b> at 6: 6 damage to <b>every</b> enemy. <b>Low Water</b> at 0: gain 6 Ward. Either way the Tide resets to 3.</li>
        <li><b>Carry-over:</b> extra Surge or Ebb keeps flowing from 3. Surge 6 from 3 Crests twice.</li>
        <li><b>Chains:</b> each extra Crest in a turn hits 3 harder (6, 9, 12...). Each extra Low Water gives 3 more Ward. Save Surge for one big turn.</li>
        <li>Your <b>Tide-Bell</b> draws a card on every Crest and Low Water.</li>
        <li>Badges on your cards say what a card would do right now: ${['CREST', 'LETHAL', 'VICTORY', 'LOW WATER', 'ECHO'].map((b) => `<span class="c-badge ${b.split(' ')[0].toLowerCase()}">${b}</span>`).join(' ')}</li>
      </ul>`;
      case 'keywords': return dl(['Sink', 'Float', 'Rite', 'Echo', 'Might', 'Spines', 'Soaked', 'Chilled', 'Brine'].map((k) => [k, BL.KEYWORDS[k]]));
      case 'map': return `<ul class="help-list">
        <li>Choose a route up to the boss. Lit stops are where you can go next.</li>
      </ul>${dl([
        [`${NODE_ICON.fight} Skirmish`, 'A normal fight.'],
        [`${NODE_ICON.elite} Dread`, 'An elite: harder, and you choose 1 of 2 keepsakes after.'],
        [`${NODE_ICON.event} Fog`, 'An event with choices. Some are gambles.'],
        [`${NODE_ICON.shop} Shop`, 'Barnaby sells cards, keepsakes and tonics, and removes a card for Pearls.'],
        [`${NODE_ICON.rest} Cove`, 'Rest to heal 30% of your max HP, or upgrade a card.'],
        [`${NODE_ICON.treasure} Wreck`, 'Pearls, and 1 of 3 keepsakes.'],
      ])}<ul class="help-list">
        <li>After a fight: Pearls, sometimes a tonic, and 1 of 3 cards (or skip: a small deck draws its best cards more often).</li>
        <li>Bonus Pearls for <b>Flawless</b> (no HP lost), <b>Swift</b> (3 turns or less, 4 for Dreads) and <b>Tidal Fury</b> (2+ Crests in a turn).</li>
        <li><b>Keepsakes</b> last the whole run. <b>Tonics</b> are one-use; they sit in the top bar.</li>
        <li>Beat the boss to unlock a deeper starting depth, with tougher enemies and a higher score multiplier.</li>
      </ul>`;
      case 'controls': return dl([
        ['Mouse', 'Click a card, then click an enemy (or the card again). Or drag a card onto an enemy, or up into the sea. Hover anything for details.'],
        ['Touch', 'Tap a card to raise it, then tap an enemy or the card again. Dragging works too. Tap a creature to read its effects.'],
        ['Keyboard', `${kbd('1')}-${kbd('0')} pick a card, ${kbd('&larr;')} ${kbd('&rarr;')} aim, ${kbd('Enter')} play, ${kbd('Esc')} cancel, ${kbd('E')} end turn, ${kbd('D')} deck, ${kbd('Z')} ${kbd('X')} ${kbd('C')} tonics. On the map: arrows and ${kbd('Enter')}.`],
      ]);
      default: return `<ul class="help-list">
        <li><b>Win a fight</b> by bringing every enemy to 0 HP. If your HP reaches 0, the run is over.</li>
        <li><b>Each turn</b> you get <b>3 Light</b> and draw <b>5 cards</b>. A card costs the Light in its corner.</li>
        <li>The <b>intent</b> above an enemy shows what it will do on its turn. The number is the damage.</li>
        <li><b>Ward</b> blocks damage, then washes away at the start of your next turn. Enemies can have Ward too.</li>
        <li>Played and unplayed cards go to the <b>discard pile</b>. When the draw pile runs out, the discard pile is shuffled back in.</li>
      </ul>`;
    }
  }
  function helpHTML(tab) {
    const tabs = HELP_TABS.map(([id, name]) => `<button class="tab${id === tab ? ' on' : ''}" data-act="helptab" data-tab="${id}" aria-pressed="${id === tab}">${name}</button>`).join('');
    return `<div class="help"><div class="tabs" role="group" aria-label="Sections">${tabs}</div><div class="help-sec">${helpSection(tab)}</div></div>`;
  }
  function showHelp(tab) {
    ui.helpTab = tab || ui.helpTab || 'basics';
    const tutBtn = run && run.tutorial ? '' : '<button class="btn" data-act="tutorial">Play the tutorial</button>';
    openOverlay(modal('How to Play', helpHTML(ui.helpTab), `${tutBtn}<button class="btn primary" data-act="close" autofocus>Got it</button>`, 'help-modal'));
  }

  function showMenu() {
    const body = `<div class="choice-list" style="margin:0 auto">
      <button class="choice" data-act="close"><b>Resume</b><span>Back to the deep.</span></button>
      <button class="choice" data-act="help"><b>How to Play</b><span>Rules, controls and glossary.</span></button>
      ${run && run.tutorial ? '<button class="choice" data-act="tutskip"><b>Leave the tutorial</b><span>You can replay it from the menu or the title screen.</span></button>' : '<button class="choice" data-act="tutorial"><b>Tutorial</b><span>A guided fight that teaches the basics.' + (run ? ' Your run is saved and waits for you.' : '') + '</span></button>'}
      <button class="choice" data-act="togglesound"><b>Sound effects: ${prefs.sound ? 'On' : 'Off'}</b><span>Synthesized hits, waves and bells.</span></button>
      <button class="choice" data-act="togglemusic"><b>Music: ${prefs.music ? 'On' : 'Off'}</b><span>A quiet generative score over the sound of the sea.</span></button>
      <button class="choice" data-act="togglefast"><b>Fast animations: ${prefs.fast ? 'On' : 'Off'}</b><span>Halves the waits between actions.</span></button>
      ${run && !run.tutorial ? '<button class="choice" data-act="totitle"><b>Save and quit to title</b><span>Your run is saved; continue it from the title screen.</span></button>' : ''}
      ${run && !run.tutorial ? '<button class="choice" data-act="abandon"><b>Abandon run</b><span>Give up this descent and start fresh.</span></button>' : ''}
    </div>`;
    openOverlay(modal('Menu', body, null, 'narrow'));
  }

  function showTonic(slot) {
    const t = run.tonics[slot];
    if (!t) return;
    const td = BL.TONICS[t];
    const c = run.combat;
    const canUse = (c && c.phase === 'player' && !ui.busy && !c.won && !c.lost) || (td.anywhere && !c);
    const body = `<div style="display:flex;gap:14px;align-items:center"><div class="medal" style="width:72px;height:72px"><img src="img/icons/${td.art}.webp" alt=""></div><p style="margin:0;font-size:16px">${td.desc}${canUse ? '' : '<br><span class="muted">Usable during your turn in a fight.</span>'}</p></div>`;
    const foot = `<button class="btn" data-act="tonicdiscard" data-slot="${slot}">Discard</button><button class="btn" data-act="close">Cancel</button>` +
      (canUse ? `<button class="btn primary" data-act="tonicuse" data-slot="${slot}" autofocus>Use</button>` : '');
    openOverlay(modal(td.name, body, foot, 'narrow'));
  }

  /* ================================================================== *
   *  HUD
   * ================================================================== */
  function hudHTML() {
    const ks = run.keepsakes.map((k) => `<button class="medal" data-tip="ks:${k}" data-act="ks" data-k="${k}" aria-label="${BL.KEEPSAKES[k].name}: ${BL.KEEPSAKES[k].desc}"><img src="img/icons/${BL.KEEPSAKES[k].art}.webp" alt=""></button>`).join('');
    const ts = run.tonics.map((t, i) => t
      ? `<button class="medal tonic-slot${ui.tonicSel === i ? ' selected' : ''}" data-tip="tonic:${i}" data-act="tonic" data-slot="${i}" aria-label="Tonic: ${BL.TONICS[t].name}"><img src="img/icons/${BL.TONICS[t].art}.webp" alt=""></button>`
      : `<span class="medal empty" data-tip="tonic:${i}" aria-hidden="true"></span>`).join('');
    return `<header class="hud${run.screen === 'combat' ? ' in-combat' : ''}">
      <div class="stat hp" data-tip="hp" aria-label="Health">${ICON.heart}<span>${run.hp}/${run.maxHp}</span></div>
      <div class="stat pearls" data-tip="pearls" aria-label="Pearls">${ICON.pearl}<span>${run.pearls}</span></div>
      <div class="stat floor" data-tip="floor">${ICON.anchor}<span><span class="lbl">Depth </span>${run.floor}/${E.MAP_ROWS + 1}</span></div>
      <div class="hud-break"></div>
      <div class="keepsakes">${ks}</div>
      <div class="tonics">${ts}</div>
      <button class="icon-btn" data-act="deck" aria-label="View deck (D)" title="Deck (D)">${ICON.deck}</button>
      <button class="icon-btn" data-act="menu" aria-label="Menu" title="Menu">${ICON.menu}</button>
    </header>`;
  }
  function updateHud() {
    const h = $('.hud', screenEl);
    if (!h) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = hudHTML();
    const nh = tmp.firstElementChild;
    ['.stat.hp', '.stat.pearls', '.stat.floor', '.tonics'].forEach((sel) => {
      const a = $(sel, h), b = $(sel, nh);
      if (a && b && a.innerHTML !== b.innerHTML) {
        a.innerHTML = b.innerHTML;
        if (sel === '.stat.pearls' || sel === '.stat.hp') anim(a, 'bump', 450);
      }
    });
    const ka = $('.keepsakes', h), kb = $('.keepsakes', nh);
    if (ka && kb && ka.children.length !== kb.children.length) ka.innerHTML = kb.innerHTML;
  }

  /* ================================================================== *
   *  Screens
   * ================================================================== */
  function render() {
    renderScreen();
    if (Teach) Teach.checkHints();
  }
  function renderScreen() {
    hideTip();
    ui.combatRef = null;
    if (!run) Music.setMood('calm');
    else if (run.screen === 'combat' && run.combat) Music.setMood(run.combat.kind === 'boss' ? (run.combat.phase2 ? 'boss2' : 'boss') : 'fight');
    else Music.setMood('calm');
    if (!run) return renderTitle();
    switch (run.screen) {
      case 'map': return renderMap();
      case 'combat': return renderCombat();
      case 'reward': return renderReward();
      case 'rest': return renderRest();
      case 'shop': return renderShop();
      case 'event': return renderEvent();
      case 'treasure': return renderTreasure();
      case 'victory': return renderEnd(true);
      case 'defeat': return renderEnd(false);
    }
  }

  /* ----- Title ----- */
  function renderTitle() {
    const saved = loadSave();
    screenEl.innerHTML = `<div class="title-screen">
      <div class="title-corner"><button class="icon-btn" data-act="menu" aria-label="Settings">${ICON.menu}</button></div>
      <div class="logo">BRINELIGHT</div>
      <p class="tagline">The lighthouse has gone dark. Something below the waves rang a bell, and the Lantern Heart sank with the tide. Take your harpoon and go down after it.</p>
      <div class="title-buttons">
        ${saved ? `<button class="btn primary" data-act="continue" autofocus>Continue (Depth ${saved.floor})</button>` : ''}
        <button class="btn ${saved ? '' : 'primary'}" data-act="newrun" ${saved ? '' : 'autofocus'}>New Descent</button>
        <button class="btn ghost" data-act="tutorial">Tutorial</button>
        <button class="btn ghost" data-act="help">How to Play</button>
      </div>
      ${getNum(BEST_KEY) ? `<div class="title-best">Best score ${getNum(BEST_KEY)}${getNum(LEVEL_KEY) ? ` &middot; ${E.LEVELS[getNum(LEVEL_KEY)].name} unlocked` : ''}</div>` : ''}
      <div class="title-foot">A roguelike deckbuilder &middot; mouse, touch or keyboard</div>
    </div>`;
    const f = $('[autofocus]', screenEl);
    if (f) f.focus({ preventScroll: true });
  }

  function chooseLevelThenStart() {
    const max = Math.min(getNum(LEVEL_KEY), E.LEVELS.length - 1);
    if (max <= 0) return startNewRun(0);
    const body = `<div class="choice-list" style="margin:0 auto">${E.LEVELS.slice(0, max + 1).map((L, i) =>
      `<button class="choice" data-act="startlevel" data-lv="${i}" ${i === max ? 'autofocus' : ''}><b>${i === 0 ? '' : 'Depth ' + i + ': '}${L.name}</b><span>${L.desc}${i ? ` Score x${(1 + 0.25 * i).toFixed(2)}.` : ''}</span></button>`).join('')}</div>`;
    openOverlay(modal('Choose your depth', body, null, 'narrow'));
  }

  function startNewRun(level) {
    clearSave();
    const m = /[?&]seed=(\d+)/.exec(location.search);
    run = E.newRun(m ? +m[1] : undefined, level || 0);
    save();
    render();
    sfx('bell');
  }

  /* New Descent: the first time, offer the guided fight first. */
  function beginNewRun() {
    if (!Teach.status()) {
      openOverlay(modal('First dive?', '<p class="lead-sm">A short guided fight teaches the basics: health, Ward, Light, and the Tide. About 2 minutes.</p>',
        '<button class="btn" data-act="tutorialskip">Skip, start the run</button><button class="btn primary" data-act="tutorial" autofocus>Play the tutorial</button>', 'narrow'));
      return;
    }
    chooseLevelThenStart();
  }

  /* ----- Map ----- */
  function renderMap() {
    const m = run.map;
    const rowH = innerWidth < 600 ? 74 : 84;
    const top = 140;
    const H = top + m.rows * rowH + 70;
    const yOf = (n) => (n.type === 'boss' ? 64 : top + (m.rows - 1 - n.row) * rowH + rowH / 2 + n.jy * rowH * 0.4);
    const avail = E.availableNodes(run);
    const availKey = new Set(avail.map((n) => n.row + ',' + n.col));
    const visited = new Set(run.visited || []);
    const cur = run.pos ? run.pos.row + ',' + run.pos.col : null;
    let lines = '';
    let nodes = '';
    const all = [];
    m.grid.forEach((row) => row.forEach((n) => n && all.push(n)));
    all.forEach((n) => {
      const kids = n.row === m.rows - 1 ? [m.boss] : n.next.map((c) => m.grid[n.row + 1][c]);
      kids.forEach((k) => {
        const walked = visited.has(n.row + ',' + n.col) && (visited.has(k.row + ',' + k.col) || (k.type === 'boss' && run.pos && run.pos.row >= m.rows));
        const open = cur === n.row + ',' + n.col && availKey.has(k.row + ',' + k.col);
        lines += `<path class="${walked ? 'walked' : ''}${open ? ' open' : ''}" d="M${n.x * 100} ${yOf(n)} L${k.x * 100} ${yOf(k)}"/>`;
      });
    });
    const nodeHTML = (n) => {
      const key = n.row + ',' + n.col;
      const isAvail = availKey.has(key);
      const edge = n.x < 0.16 ? ' lbl-l' : n.x > 0.84 ? ' lbl-r' : '';
      const cls = `node t-${n.type}${visited.has(key) ? ' visited' : ''}${key === cur ? ' current' : ''}${isAvail ? ' avail' + edge : ''}`;
      const style = `left:${n.x * 100}%;top:${yOf(n)}px`;
      const label = NODE_NAME[n.type];
      if (isAvail) {
        const idx = avail.findIndex((a) => a.row === n.row && a.col === n.col);
        return `<button class="${cls}" style="${style}" data-act="node" data-row="${n.row}" data-col="${n.col}" data-idx="${idx}" data-tip="node:${n.type}" aria-label="Go to ${label}">${NODE_ICON[n.type]}<span class="node-label">${SHORT_NAME[n.type]}</span></button>`;
      }
      return `<div class="${cls}" style="${style}" data-tip="node:${n.type}" aria-hidden="true">${NODE_ICON[n.type]}</div>`;
    };
    all.forEach((n) => { nodes += nodeHTML(n); });
    nodes += nodeHTML(m.boss);
    nodes += `<div class="map-boss-label" style="left:50%;top:${64 + 50}px">The Drowned Bellwether</div>`;
    const legend = ['fight', 'elite', 'event', 'rest', 'shop', 'treasure'].map((t) => `<span>${NODE_ICON[t]}${NODE_NAME[t].replace(/ \(.*\)/, '')}</span>`).join('');
    const sub = !run.pos ? 'Choose where to begin your descent.' : avail.length ? 'Choose your next stop.' : '';
    screenEl.innerHTML = `<div class="run-screen map-screen">${hudHTML()}<div class="run-body">
      <div class="map-scroll" id="mapscroll"><div class="map-header"><h2>The Drowned Reach</h2><p>${sub}</p></div>
      <div class="map" style="height:${H}px"><svg class="lines" viewBox="0 0 100 ${H}" preserveAspectRatio="none">${lines}</svg>${nodes}</div></div>
      <div class="map-legend">${legend}</div></div></div>`;
    ui.mapFocus = Math.min(ui.mapFocus, Math.max(0, avail.length - 1));
    const sc = $('#mapscroll');
    const focusRow = avail.length ? avail[0] : run.pos ? E.nodeAt(run, run.pos) : null;
    if (sc && focusRow) {
      sc.style.scrollBehavior = 'auto';
      sc.scrollTop = Math.max(0, yOf(focusRow) - sc.clientHeight * 0.55 + 40);
      sc.style.scrollBehavior = '';
    }
    const first = $('.node.avail', screenEl);
    if (first && ui.lastPointer !== 'touch') first.focus({ preventScroll: true });
  }

  function chooseNode(row, col) {
    const avail = E.availableNodes(run);
    const node = avail.find((n) => n.row === row && n.col === col);
    if (!node) return;
    sfx('select');
    E.enterNode(run, node);
    ui.mapFocus = 0;
    save();
    render();
  }

  /* ----- Combat ----- */
  function renderCombat() {
    const c = run.combat;
    screenEl.innerHTML = `<div class="run-screen combat-screen">${hudHTML()}<div class="run-body">
      <div class="field${c.kind === 'boss' ? ' boss' : ''}${c.phase2 ? ' phase2' : ''}" id="field" data-act="field">
        <div class="sea"></div>
        <div class="bubbles" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<span style="left:${(i * 37) % 100}%;--s:${6 + (i * 7) % 12}px;animation-duration:${7 + (i * 5) % 9}s;animation-delay:-${(i * 1.7) % 9}s"></span>`).join('')}</div>
        <div class="vignette" aria-hidden="true"></div>
        <div class="units"><div class="player-zone" id="pz"></div><div class="enemy-zone" id="ez"></div></div>
      </div>
      <div class="tidebar" id="tidebar"></div>
      <div class="dock" id="dock" data-act="dock">
        <div class="dock-left"><div class="light-orb" id="orb" data-tip="light"></div>
          <button class="pile" id="pile-draw" data-act="pile" data-pile="draw" data-tip="pile:draw"></button></div>
        <div class="hand" id="hand" role="list" aria-label="Your hand"></div>
        <div class="dock-right"><button class="btn end-turn" id="btn-end" data-act="endturn">End Turn</button>
          <button class="pile" id="pile-discard" data-act="pile" data-pile="discard" data-tip="pile:discard"></button></div>
      </div></div></div>`;
    ui.combatRef = c;
    ui.sel = null; ui.target = null; ui.hover = null; ui.tonicSel = null;
    $('#pz').innerHTML = `<div class="unit player" data-uid="p" data-tip="unit:p">
        <div class="sprite"><img src="img/units/keeper.webp" alt="Wren, the Keeper"></div>
        <div class="info"><div class="incoming" data-tip="incoming"></div><div class="uname">Wren, the Keeper</div><div class="hpbar"></div><div class="statuses"></div></div></div>`;
    bindHand();
    updateCombat(true);
    const names = c.turn === 1 ? (c.kind === 'boss' ? 'The Drowned Bellwether' : c.kind === 'elite' ? 'Dread: ' + c.enemies[0].name : null) : null;
    if (names) {
      c.fx.length = 0;
      banner(names, 'enemy');
      if (c.kind === 'boss') sfx('bell');
    } else processFx();
  }

  function hpBarHTML(hp, max, ward) {
    const pct = Math.max(0, Math.min(100, (hp / max) * 100));
    return `${ward > 0 ? `<div class="ward-badge" data-tip="ward">${ward}</div>` : ''}<div class="ghost" style="width:${pct}%"></div><div class="fill" style="width:${pct}%"></div><div class="txt">${hp}/${max}</div>`;
  }
  function statusesHTML(o, who) {
    const c = run.combat;
    const echo = who === 'p' && c && c.echo > 0 ? `<span class="st buff echo-chip" data-tip="echo">${ICON.echo}${c.echo > 1 ? c.echo : ''}</span>` : '';
    return echo + Object.keys(o.st).filter((k) => o.st[k] && BL.STATUSES[k]).map((k) => {
      const s = BL.STATUSES[k];
      const n = s.kind === 'rite' && o.st[k] === 1 && k !== 'r_beam' ? '' : o.st[k];
      return `<span class="st ${s.kind}" data-tip="st:${who}:${k}">${ICON[s.icon] || ''}${n}</span>`;
    }).join('');
  }
  function intentHTML(e) {
    const info = E.intentInfo(run, e);
    if (!info) return '';
    const k = info.kinds;
    const main = k.indexOf('attack') >= 0 ? 'attack' : k[0] || 'buff';
    let icons = '';
    if (k.indexOf('attack') >= 0) icons += ICON.attack;
    if (k.indexOf('defend') >= 0) icons += ICON.defend;
    if (k.indexOf('buff') >= 0) icons += ICON.buff;
    if (k.indexOf('debuff') >= 0) icons += ICON.debuff;
    if (k.indexOf('summon') >= 0) icons += ICON.summon;
    const num = info.dmg ? `<span>${info.dmg}${info.hits > 1 ? '&times;' + info.hits : ''}</span>` : '';
    return `<div class="intent ${main}" data-tip="intent:${e.uid}">${icons}${num}</div>`;
  }

  function updateUnitInfo(el, hp, max, ward, o, who) {
    const bar = $('.hpbar', el);
    const prevPct = bar.dataset.pct;
    const pct = Math.max(0, Math.min(100, (hp / max) * 100));
    if (prevPct == null) {
      bar.innerHTML = hpBarHTML(hp, max, ward);
    } else {
      // keep the elements so widths animate
      const fill = $('.fill', bar), ghost = $('.ghost', bar), txt = $('.txt', bar);
      fill.style.width = pct + '%';
      ghost.style.width = pct + '%';
      txt.textContent = `${hp}/${max}`;
      let wb = $('.ward-badge', bar);
      if (ward > 0) {
        if (!wb) { bar.insertAdjacentHTML('afterbegin', `<div class="ward-badge" data-tip="ward">${ward}</div>`); }
        else wb.textContent = ward;
      } else if (wb) wb.remove();
    }
    bar.dataset.pct = pct;
    bar.classList.toggle('warded', ward > 0);
    $('.statuses', el).innerHTML = statusesHTML(o, who);
  }

  function updateCombat(initial) {
    const c = run.combat;
    if (!c || ui.combatRef !== c) return;
    // player
    const pel = $('.unit.player', screenEl);
    updateUnitInfo(pel, run.hp, run.maxHp, c.player.ward, c.player, 'p');
    // enemies
    const ez = $('#ez');
    c.enemies.forEach((e, i) => {
      let el = $(`.unit[data-uid="${e.uid}"]`, ez);
      if (!el) {
        const d = BL.ENEMIES[e.id];
        el = document.createElement('div');
        el.className = `unit enemy${d.flying ? ' flying' : ''}${initial ? '' : ' summoned'}`;
        el.dataset.uid = e.uid;
        el.dataset.act = 'enemy';
        el.dataset.tip = 'unit:' + e.uid;
        el.style.setProperty('--scale', d.scale);
        el.style.setProperty('--delay', (-i * 0.7) + 's');
        el.setAttribute('aria-label', e.name);
        el.innerHTML = `<div class="intent-wrap"></div><div class="sprite"><img src="img/units/${d.art}.webp" alt="${e.name}">
          <svg class="target-reticle" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="#ffb84d" stroke-width="3" stroke-dasharray="10 8"/></svg></div>
          <div class="info"><div class="uname">${e.name}</div><div class="hpbar"></div><div class="statuses"></div></div>`;
        if (e.dead) el.classList.add('gone');
        ez.appendChild(el);
      }
      if (e.dead) {
        if (!el.classList.contains('dead') && !el.classList.contains('gone')) el.classList.add('dead');
        $('.intent-wrap', el).innerHTML = '';
      } else {
        $('.intent-wrap', el).innerHTML = c.phase === 'enemy' && e.acted ? '' : intentHTML(e);
      }
      updateUnitInfo(el, Math.max(0, e.hp), e.maxHp, e.ward, e, e.uid);
      const targetable = !e.dead && ((ui.sel != null && selNeedsTarget()) || ui.tonicSel != null);
      el.classList.toggle('targetable', targetable);
      el.classList.toggle('targeted', targetable && ui.target === e.uid);
    });
    // incoming damage and danger warning
    let incoming = 0;
    E.alive(c).forEach((e) => {
      if (c.phase === 'enemy' && e.acted) return;
      const info = E.intentInfo(run, e);
      if (info && info.dmg) incoming += info.dmg * info.hits;
    });
    const unblocked = Math.max(0, incoming - c.player.ward);
    const inc = $('.incoming', pel);
    if (inc) {
      inc.innerHTML = incoming ? (unblocked ? `${ICON.attack}<span>${unblocked}</span>` : `${ICON.defend}<span>Blocked</span>`) : '';
      inc.className = 'incoming' + (incoming ? (unblocked ? ' hurt' : ' safe') : '');
    }
    const danger = c.phase === 'player' && !c.won && unblocked >= run.hp;
    const fieldEl = $('#field');
    if (danger && !fieldEl.classList.contains('danger')) sfx('danger');
    fieldEl.classList.toggle('danger', danger);
    // tide
    const field = $('#field');
    field.style.setProperty('--tide', c.tide);
    field.classList.toggle('tide-high', c.tide >= 5);
    renderTidebar();
    // light orb & piles
    const orb = $('#orb');
    orb.innerHTML = `${c.light}<small>/${c.maxLight}</small>`;
    orb.classList.toggle('empty', c.light === 0);
    $('#pile-draw').innerHTML = `${ICON.deck}<span>${c.draw.length}</span>`;
    $('#pile-draw').setAttribute('aria-label', `Draw pile, ${c.draw.length} cards`);
    $('#pile-discard').innerHTML = `${ICON.discard}<span>${c.discard.length}</span>${c.sunk.length ? `<span class="muted" style="margin-left:6px" title="Sunk">${ICON.sunk}${c.sunk.length}</span>` : ''}`;
    $('#pile-discard').setAttribute('aria-label', `Discard pile, ${c.discard.length} cards`);
    const endBtn = $('#btn-end');
    endBtn.disabled = ui.busy || c.phase !== 'player';
    endBtn.textContent = c.phase === 'player' ? 'End Turn' : 'Enemy Turn';
    const anyPlayable = c.hand.some((card) => E.playable(run, card).ok);
    endBtn.classList.toggle('nudge', c.phase === 'player' && !ui.busy && !anyPlayable);
    endBtn.classList.toggle('primary', c.phase === 'player' && !ui.busy && !anyPlayable);
    updateHud();
    updateHand();
    if (Teach) Teach.checkHints();
  }

  function renderTidebar() {
    const c = run.combat;
    const tb = $('#tidebar');
    if (!tb) return;
    let preview = null;
    const selCard = ui.sel != null ? c.hand.find((x) => x.uid === ui.sel) : null;
    if (selCard) {
      const v = E.vals(selCard);
      if (v.surge) preview = Math.min(6, c.tide + v.surge);
      else if (v.ebb) preview = Math.max(0, c.tide - v.ebb);
      else if (selCard.id === 'ebbflow') preview = c.tide >= 3 ? Math.min(6, c.tide + v.shift) : Math.max(0, c.tide - v.shift);
      else if (selCard.id === 'tsunami') preview = 0;
    }
    let segs = '';
    for (let i = 0; i <= 6; i++) {
      const cls = ['tb-seg'];
      if (i === 0) cls.push('end-low');
      if (i === 6) cls.push('end-crest');
      if (i <= c.tide && c.tide > 0) cls.push('filled');
      if (i === c.tide) cls.push('now');
      if (preview != null && i === preview && preview !== c.tide) cls.push('preview');
      segs += `<div class="${cls.join(' ')}">${i}</div>`;
    }
    let hint = '';
    if (preview === 6) hint = '<div class="tb-hint">Crest! 6 damage to all</div>';
    else if (preview === 0) hint = '<div class="tb-hint">Low Water! +6 Ward</div>';
    tb.setAttribute('aria-label', `Tide ${c.tide} of 6`);
    tb.innerHTML = `<span class="tb-label low" data-tip="kw:Low Water">Low<span class="long"> Water</span></span>
      <div class="tb-track" data-tip="tide">${segs}${hint}</div>
      <span class="tb-label crest" data-tip="kw:Crest">Crest</span>`;
  }

  /* ----- Hand ----- */
  function cardW() { return ui.cw; }
  function computeSizes() {
    const vw = innerWidth, vh = innerHeight;
    let cw;
    if (vw <= 760) cw = Math.min(112, (vw - 12) / 3.6, vh * 0.15);
    else if (vh < 520) cw = Math.min(96, vh * 0.24, vw * 0.105); // short landscape phones
    else cw = Math.min(158, vh * 0.17, vw * 0.105);
    cw = Math.max(76, Math.round(cw));
    ui.cw = cw;
    document.documentElement.style.setProperty('--cw', cw + 'px');
    // small hand cards switch to fixed, readable text sizes instead of scaling with the card
    document.documentElement.classList.toggle('small-cards', cw < 120);
    layoutHand();
  }

  function handEl() { return $('#hand'); }
  function handCardEl(uid) { const h = handEl(); return h ? $(`.card[data-uid="${uid}"]`, h) : null; }
  function selNeedsTarget() {
    const c = run.combat;
    const card = c && c.hand.find((x) => x.uid === ui.sel);
    return !!(card && E.needsTarget(card));
  }

  /* Simulate playing a card on a copy of the state to show what it would do. */
  function predictAll() {
    const c = run.combat;
    const out = {};
    if (c.phase !== 'player' || c.won || c.lost || ui.busy) return out;
    let json = null;
    c.hand.forEach((card) => {
      if (!E.playable(run, card).ok) return;
      const d = BL.CARDS[card.id];
      if (d.type === 'status' || d.type === 'curse') return;
      if (!json) json = JSON.stringify(Object.assign({}, run, { map: null, shop: null, event: null, rewards: null, treasure: null }), (k, v) => (k === 'fx' ? [] : v));
      const targets = E.needsTarget(card) ? (ui.sel === card.uid && ui.target ? [ui.target] : E.alive(c).map((e) => e.uid)) : [null];
      let best = null;
      targets.forEach((t) => {
        const r2 = JSON.parse(json);
        if (!E.playCard(r2, card.uid, t)) return;
        const c2 = r2.combat;
        const res = {
          crests: c2.turnCrests - c.turnCrests,
          lows: c2.turnLows - c.turnLows,
          kills: c2.enemies.filter((e, i) => e.dead && c.enemies[i] && !c.enemies[i].dead).length,
          won: c2.won,
          chain: c2.turnCrests,
        };
        if (!best || (res.won && !best.won) || res.kills > best.kills) best = res;
      });
      if (best) out[card.uid] = best;
    });
    return out;
  }
  function badgesHTML(p, card) {
    const c = run.combat;
    const b = [];
    if (p) {
      if (p.won) b.push('<span class="c-badge victory">VICTORY</span>');
      else if (p.kills) b.push(`<span class="c-badge lethal">LETHAL${p.kills > 1 ? ' x' + p.kills : ''}</span>`);
      if (p.crests) b.push(`<span class="c-badge crest">CREST${p.chain > 1 ? ' x' + p.chain : ''}</span>`);
      else if (p.lows) b.push('<span class="c-badge low">LOW WATER</span>');
    }
    const d = BL.CARDS[card.id];
    if (c.echo > 0 && !d.givesEcho && d.type !== 'status' && d.type !== 'curse' && b.length < 2) b.push('<span class="c-badge echo">ECHO</span>');
    return b.length ? `<div class="c-badges">${b.slice(0, 2).join('')}</div>` : '';
  }

  function updateHand() {
    const h = handEl();
    const c = run.combat;
    if (!h || !c) return;
    const preds = predictAll();
    const existing = new Map($$('.card', h).map((el) => [el.dataset.uid, el]));
    const fresh = [];
    const tgt = ui.target ? E.enemyByUid(c, ui.target) : null;
    c.hand.forEach((card, i) => {
      const key = String(card.uid);
      let el = existing.get(key);
      if (el) existing.delete(key);
      else {
        el = document.createElement('div');
        el.dataset.uid = key;
        el.tabIndex = 0;
        el.setAttribute('role', 'listitem');
        fresh.push(el);
      }
      const p = E.playable(run, card);
      const t = ui.sel === card.uid ? tgt : null;
      const html = cardInner(card, true, t) + badgesHTML(preds[card.uid], card);
      if (el._html !== html) { el.innerHTML = html; el._html = html; }
      const dragging = ui.drag && ui.drag.moved && !ui.drag.targeted && ui.drag.uid === card.uid;
      el.className = `${cardClass(card)}${p.ok ? ' playable' : ' cant'}${ui.sel === card.uid ? ' selected' : ''}${dragging ? ' dragging' : ''}`;
      el.setAttribute('aria-label', `${i + 1}: ${cardLabel(card)}${p.ok ? '' : ' (' + p.reason + ')'}`);
      if (h.children[i] !== el) h.insertBefore(el, h.children[i] || null);
    });
    existing.forEach((el) => flyTo(el, $('#pile-discard'), 0.25));
    // new cards slide in from the draw pile
    if (fresh.length) {
      const pr = $('#pile-draw').getBoundingClientRect();
      const hr = h.getBoundingClientRect();
      const cw = cardW();
      fresh.forEach((el, k) => {
        el.style.transition = 'none';
        el.style.opacity = '0';
        el.style.transform = `translate(${pr.left + pr.width / 2 - hr.left - cw / 2}px, ${pr.top - hr.top - cw * 0.7}px) scale(.3)`;
        el.style.transitionDelay = (k * 70) + 'ms';
      });
      h.offsetWidth; // reflow
      fresh.forEach((el) => { el.style.transition = ''; el.style.opacity = ''; });
      if (fresh.length) sfx('draw');
      setTimeout(() => fresh.forEach((el) => { el.style.transitionDelay = ''; }), 600 + fresh.length * 70);
    }
    layoutHand();
    renderGlossary();
    renderHandHint();
  }

  function layoutHand() {
    const h = handEl();
    if (!h) return;
    const els = $$('.card', h).filter((el) => !el.classList.contains('dragging'));
    const n = els.length;
    if (!n) return;
    const W = h.clientWidth;
    const cw = cardW();
    const ch = cw * 1.4;
    const step = n > 1 ? Math.min(cw * 1.04, (W - cw) / (n - 1)) : 0;
    const total = cw + step * (n - 1);
    const x0 = (W - total) / 2;
    // how much of each card the next one covers: small cards wrap their text inside the visible part
    h.style.setProperty('--cover', Math.max(0, Math.round(cw - step)) + 'px');
    const fUid = ui.sel != null ? ui.sel : ui.hover;
    const f = els.findIndex((el) => +el.dataset.uid === fUid);
    const hr = h.getBoundingClientRect();
    const mobile = innerWidth <= 760;
    els.forEach((el, i) => {
      const off = i - (n - 1) / 2;
      let rot = n > 1 ? off * (mobile ? Math.min(2, 12 / n) : Math.min(3.5, 22 / n)) : 0;
      let y = off * off * (mobile ? Math.min(1.6, 10 / n) : Math.min(2.6, 16 / n));
      let x = x0 + i * step;
      let s = 1;
      let z = i + 1;
      if (f >= 0 && i !== f && step < cw) {
        const dist = Math.abs(i - f);
        const push = Math.min(cw * 0.45, (cw - step) * 0.75) / dist;
        x += i < f ? -push : push;
      }
      if (i === f) {
        const selected = ui.sel != null;
        s = selected ? (mobile ? 1.6 : 1.35) : 1.28;
        rot = 0;
        y = selected ? -ch * 0.12 - 6 : -10;
        z = 100;
        const sw = cw * s;
        const minX = -hr.left + 6 + sw / 2 - cw / 2;
        const maxX = innerWidth - hr.left - 6 - sw / 2 - cw / 2;
        x = Math.max(minX, Math.min(maxX, x));
      }
      el.style.transform = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${s})`;
      el.style.zIndex = z;
      el._lay = { x, y, s };
    });
  }

  function renderGlossary() {
    const old = $('.glossary', screenEl);
    if (old) old.remove();
    const c = run && run.combat;
    if (!c) return;
    const uid = ui.sel != null ? ui.sel : ui.hover;
    if (uid == null || (ui.drag && ui.drag.moved)) return;
    if (Teach && Teach.active) return; // the tutorial bubble explains instead
    const card = c.hand.find((x) => x.uid === uid);
    const el = handCardEl(uid);
    if (!card || !el || !el._lay) return;
    const kws = keywordsOf(card);
    if (!kws.length) return;
    const g = document.createElement('div');
    g.className = 'glossary';
    g.innerHTML = kws.map((k) => `<div><b>${k}</b>${BL.KEYWORDS[k]}</div>`).join('');
    const h = handEl();
    const hr = h.getBoundingClientRect();
    const cw = cardW();
    const L = el._lay;
    const sw = cw * L.s;
    const sh = cw * 1.4 * L.s;
    const cardLeft = hr.left + L.x + cw / 2 - sw / 2;
    const cardTop = hr.top + L.y + cw * 1.4 - sh;
    const gw = Math.min(230, innerWidth * 0.42);
    g.style.width = gw + 'px';
    let gx = cardLeft + sw + 10;
    if (gx + gw > innerWidth - 6) gx = cardLeft - gw - 10;
    if (gx < 6) gx = 6;
    g.style.left = gx + 'px';
    g.style.top = Math.max(56, cardTop) + 'px';
    g.style.position = 'fixed';
    screenEl.appendChild(g);
    // keep inside the screen vertically
    const gr = g.getBoundingClientRect();
    if (gr.bottom > innerHeight - 6) g.style.top = Math.max(56, innerHeight - 6 - gr.height) + 'px';
  }

  function renderHandHint() {
    $$('.hand-hint', screenEl).forEach((x) => x.remove());
    if (Teach && Teach.active) return; // the tutorial bubble says it instead
    const c = run.combat;
    let msg = null;
    if (ui.tonicSel != null) msg = 'Choose an enemy for the tonic';
    else if (ui.sel != null && !(ui.drag && ui.drag.moved)) {
      const card = c.hand.find((x) => x.uid === ui.sel);
      if (card) {
        const p = E.playable(run, card);
        if (!p.ok) msg = p.reason;
        else if (E.needsTarget(card) && E.alive(c).length > 1) msg = isTouchUI() ? 'Tap an enemy to play' : 'Click an enemy (or use arrow keys + Enter)';
        else msg = isTouchUI() ? 'Tap the card again to play' : 'Click again or press Enter to play';
      }
    }
    if (!msg) return;
    const d = document.createElement('div');
    d.className = 'hand-hint';
    d.textContent = msg;
    $('#field').appendChild(d);
  }

  function select(uid) {
    const c = run.combat;
    if (ui.busy || !c || c.phase !== 'player') return;
    ui.tonicSel = null;
    ui.sel = uid;
    const card = c.hand.find((x) => x.uid === uid);
    if (card && E.needsTarget(card)) {
      const al = E.alive(c);
      if (!al.some((e) => e.uid === ui.target)) ui.target = ui.kbd ? (al[0] && al[0].uid) : null;
      if (al.length === 1) ui.target = al[0].uid;
    } else ui.target = null;
    sfx('select');
    updateCombat();
  }
  function deselect() {
    if (ui.sel == null && ui.tonicSel == null) return;
    ui.sel = null; ui.target = null; ui.tonicSel = null;
    if (run && run.combat) updateCombat();
  }

  function tryPlaySelected(targetUid) {
    const c = run.combat;
    const card = c.hand.find((x) => x.uid === ui.sel);
    if (!card) return;
    const p = E.playable(run, card);
    if (!p.ok) {
      toast(p.reason);
      const el = handCardEl(card.uid);
      if (el) { el.animate([{ marginLeft: '0' }, { marginLeft: '-6px' }, { marginLeft: '6px' }, { marginLeft: '0' }], { duration: 250 }); }
      return;
    }
    if (E.needsTarget(card)) {
      const al = E.alive(c);
      const t = targetUid || ui.target || (al.length === 1 ? al[0].uid : null);
      if (!t) {
        $$('.enemy:not(.dead)', screenEl).forEach((el) => el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 300 }));
        return;
      }
      playCard(card.uid, t);
    } else playCard(card.uid, null);
  }

  async function playCard(uid, targetUid) {
    const c = run.combat;
    if (ui.busy) return;
    const card = c.hand.find((x) => x.uid === uid);
    const tgt = targetUid ? c.enemies.find((e) => e.uid === targetUid) : null;
    const cardId = card && card.id;
    const targetId = tgt ? tgt.id : (card && E.needsTarget(card) && E.alive(c).length === 1 ? E.alive(c)[0].id : null);
    if (Teach.active) {
      const ok = Teach.allows('play', cardId, targetId);
      if (ok !== true) { toast(ok); ui.sel = null; ui.target = null; updateCombat(); return; }
    }
    const el = handCardEl(uid);
    const targetEl = targetUid ? $(`.unit[data-uid="${targetUid}"] .sprite`, screenEl) : null;
    if (!E.playCard(run, uid, targetUid)) return;
    ui.busy = true;
    sfx('card');
    ui.sel = null; ui.target = null; ui.hover = null;
    renderGlossary();
    renderHandHint();
    if (el) flyTo(el, targetEl || $('#field'), 0.45, true);
    await processFx();
    ui.busy = false;
    if (Teach.active) Teach.onPlayed(cardId, targetId);
    updateCombat();
    await afterAction();
  }

  async function afterAction() {
    const c = run.combat;
    if (!c) return;
    if (c.lost) return onDefeat();
    if (c.won) return onVictory();
    save();
  }

  async function onVictory() {
    ui.busy = true;
    sfx('victory');
    await wait(1000);
    ui.busy = false;
    if (run.tutorial) { Teach.onVictory(); return; }
    const boss = run.combat.kind === 'boss';
    E.finishCombat(run);
    if (boss) clearSave(); else save();
    render();
  }
  async function onDefeat() {
    ui.busy = true;
    sfx('defeat');
    await wait(1100);
    ui.busy = false;
    run.screen = 'defeat';
    clearSave();
    render();
  }

  async function endTurn() {
    const c = run.combat;
    if (!c || ui.busy || c.phase !== 'player') return;
    if (Teach.active) {
      const ok = Teach.allows('endturn');
      if (ok !== true) { toast(ok); return; }
      Teach.onEndTurn();
    }
    ui.busy = true;
    ui.sel = null; ui.target = null; ui.hover = null; ui.tonicSel = null;
    E.endTurnStart(run);
    await processFx();
    updateCombat();
    if (c.won) { ui.busy = false; return onVictory(); }
    banner('Enemy Turn', 'enemy');
    await wait(700);
    for (const uid of E.enemyOrder(c)) {
      if (c.won || c.lost) break;
      if (!E.enemyStep(run, uid)) continue;
      await processFx();
      updateCombat();
      await wait(330);
    }
    if (c.lost) { ui.busy = false; return onDefeat(); }
    if (c.won) { ui.busy = false; return onVictory(); }
    E.endTurnFinish(run);
    ui.busy = false;
    if (c.lost) return onDefeat();
    await processFx();
    updateCombat();
    if (c.won) return onVictory();
    save();
  }

  async function useTonic(slot, targetUid) {
    const t = run.tonics[slot];
    if (!t) return;
    const td = BL.TONICS[t];
    const c = run.combat;
    if (!c) {
      if (E.useTonic(run, slot)) { sfx('tonic'); toast(`${td.name}: ${td.desc}`); save(); render(); }
      return;
    }
    if (ui.busy) return;
    if (Teach.active) { toast(Teach.allows('tonic')); return; }
    if (td.target === 'enemy' && !targetUid) {
      const al = E.alive(c);
      if (al.length === 1) targetUid = al[0].uid;
      else {
        ui.sel = null;
        ui.tonicSel = slot;
        ui.target = ui.kbd ? al[0].uid : null;
        updateCombat();
        return;
      }
    }
    if (!E.useTonic(run, slot, targetUid)) return;
    ui.tonicSel = null; ui.target = null;
    ui.busy = true;
    sfx('tonic');
    await processFx();
    ui.busy = false;
    updateCombat();
    await afterAction();
  }

  /* ----- FX ----- */
  function unitEl(who) {
    if (who === 'p') return $('.unit.player .sprite', screenEl);
    return $(`.unit[data-uid="${who}"] .sprite`, screenEl);
  }
  function floatAt(el, text, cls) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'float ' + (cls || '');
    d.textContent = text;
    d.style.left = (r.left + r.width / 2 + (Math.random() * 40 - 20)) + 'px';
    d.style.top = (r.top + r.height * 0.4 + (Math.random() * 20 - 10)) + 'px';
    fxLayer.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  }
  function anim(el, cls, ms) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms || 450);
  }
  function burstAt(el) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.5;
    const ring = document.createElement('div');
    ring.className = 'burst-ring';
    ring.style.left = cx + 'px'; ring.style.top = cy + 'px';
    fxLayer.appendChild(ring);
    setTimeout(() => ring.remove(), 700);
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.className = 'particle' + (i % 3 === 0 ? ' gold' : '');
      const a = (Math.PI * 2 * i) / 18 + Math.random() * 0.3;
      const dist = 60 + Math.random() * 90;
      p.style.left = cx + 'px'; p.style.top = cy + 'px';
      p.style.setProperty('--dx', Math.cos(a) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(a) * dist - 30 + 'px');
      p.style.setProperty('--sz', 5 + Math.random() * 9 + 'px');
      fxLayer.appendChild(p);
      setTimeout(() => p.remove(), 900);
    }
  }
  function slashAt(el, kind) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'slash-fx' + (kind ? ' ' + kind : '');
    d.style.left = (r.left + r.width / 2) + 'px';
    d.style.top = (r.top + r.height * 0.5) + 'px';
    d.style.transform = `translate(-50%,-50%) rotate(${-40 + Math.random() * 30}deg)`;
    fxLayer.appendChild(d);
    setTimeout(() => d.remove(), 350);
  }
  function banner(text, cls) {
    const f = $('#field');
    if (!f) return;
    $$('.banner', f).forEach((b) => b.remove());
    const b = document.createElement('div');
    b.className = 'banner ' + (cls || '');
    b.textContent = text;
    f.appendChild(b);
    setTimeout(() => b.remove(), 1200);
  }
  function flyTo(el, toEl, scale, fade) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cw = cardW(), ch = cw * 1.4;
    el.classList.remove('selected', 'playable');
    el.style.transition = 'none';
    el.style.transform = 'none';
    el.style.left = (r.left + r.width / 2 - cw / 2) + 'px';
    el.style.top = (r.top + r.height / 2 - ch / 2) + 'px';
    el.className += ' card-fly';
    fxLayer.appendChild(el);
    let dx = 0, dy = -80;
    if (toEl) {
      const t = toEl.getBoundingClientRect();
      dx = t.left + t.width / 2 - (r.left + r.width / 2);
      dy = t.top + t.height / 2 - (r.top + r.height / 2);
    }
    const a = el.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) scale(${(1 + scale) / 2})`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: fade ? 0 : 0.2 },
    ], { duration: fade ? 380 : 330, easing: 'cubic-bezier(.3,.7,.4,1)' });
    a.onfinish = () => el.remove();
    setTimeout(() => el.remove(), 800);
  }

  async function processFx() {
    const c = run.combat;
    if (!c) return;
    const list = c.fx.splice(0);
    for (const f of list) {
      switch (f.t) {
        case 'dmg': {
          const el = unitEl(f.who);
          const unit = el && el.closest('.unit');
          if (f.n > 0) {
            floatAt(el, f.n, f.n >= 25 ? 'huge' : f.n >= 15 ? 'big' : '');
            anim(unit, 'hit', 380);
            anim(unit, 'flash-red', 380);
            if (f.who === 'p') { sfx('hurt'); anim($('#field'), 'shake', 420); } else sfx('hit');
            if (f.n >= 15) { anim($('#field'), 'impact', 260); await wait(70); }
          } else if (f.blocked > 0) {
            floatAt(el, 'Blocked', 'blocked');
            sfx('block');
          }
          await wait(f.attack ? 150 : 90);
          break;
        }
        case 'ward': floatAt(unitEl(f.who), '+' + f.n + ' Ward', 'ward'); sfx('ward'); break;
        case 'heal': if (f.n > 0) floatAt(unitEl(f.who), '+' + f.n, 'heal'); break;
        case 'status': {
          const s = BL.STATUSES[f.key];
          if (!s) break;
          floatAt(unitEl(f.who), s.kind === 'rite' ? s.name : `${s.name} +${f.n}`, 'status ' + s.kind);
          sfx(s.kind === 'debuff' ? 'debuff' : 'buff');
          await wait(60);
          break;
        }
        case 'slash': slashAt(unitEl(f.who)); break;
        case 'sweep': $$('.enemy:not(.dead) .sprite', screenEl).forEach(slashAt); break;
        case 'act': {
          const el = unitEl(f.who);
          const unit = el && el.closest('.unit');
          if (unit) {
            floatAt(el, f.name, 'move');
            if (f.attack) anim(unit, 'lunge-left', 420);
          }
          await wait(f.attack ? 260 : 380);
          break;
        }
        case 'crest': {
          const field = $('#field');
          const chain = f.chain || 1;
          if (field) {
            field.style.setProperty('--tide', 6);
            $$('.crest-text', field).forEach((x) => x.remove());
            const w = document.createElement('div'); w.className = 'crest-wave chain-' + Math.min(chain, 4); field.appendChild(w);
            const t = document.createElement('div');
            t.className = 'crest-text chain-' + Math.min(chain, 4);
            t.innerHTML = `<span>CREST${chain > 1 ? ' <b>x' + chain + '</b>' : ''}!</span><small>${f.n} to all</small>`;
            field.appendChild(t);
            setTimeout(() => { w.remove(); t.remove(); }, 1400);
            anim(field, chain > 1 ? 'impact' : 'shake', 420);
          }
          sfx('crest');
          if (chain > 1) sfx('chain', chain);
          await wait(380 + Math.min(chain, 4) * 60);
          break;
        }
        case 'low': {
          const field = $('#field');
          if (field) {
            field.classList.add('drain');
            field.style.setProperty('--tide', 0);
            $$('.crest-text', field).forEach((x) => x.remove());
            const t = document.createElement('div'); t.className = 'crest-text low'; t.innerHTML = `<span>LOW WATER${(f.chain || 1) > 1 ? ' <b>x' + f.chain + '</b>' : ''}</span>`; field.appendChild(t);
            setTimeout(() => { t.remove(); field.classList.remove('drain'); }, 1300);
          }
          sfx('low');
          await wait(420);
          break;
        }
        case 'beam': {
          const to = unitEl(f.who);
          const from = $('.unit.player .sprite', screenEl);
          if (to && from) {
            const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
            const x1 = a.left + a.width * 0.7, y1 = a.top + a.height * 0.2;
            const x2 = b.left + b.width / 2, y2 = b.top + b.height / 2;
            const d = document.createElement('div');
            d.className = 'beam-fx';
            d.style.position = 'fixed';
            d.style.left = x1 + 'px'; d.style.top = y1 + 'px';
            d.style.width = Math.hypot(x2 - x1, y2 - y1) + 'px';
            d.style.transform = `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`;
            fxLayer.appendChild(d);
            setTimeout(() => d.remove(), 700);
          }
          await wait(250);
          break;
        }
        case 'die': {
          const el = unitEl(f.who);
          const unit = el && el.closest('.unit');
          if (el) burstAt(el);
          if (unit) unit.classList.add('dead');
          sfx('kill');
          sfx('die');
          await wait(140);
          break;
        }
        case 'echo': {
          const field = $('#field');
          if (field) {
            const t = document.createElement('div'); t.className = 'echo-text'; t.textContent = 'ECHO!'; field.appendChild(t);
            setTimeout(() => t.remove(), 1000);
          }
          sfx('echo');
          await wait(250);
          break;
        }
        case 'pearls': {
          floatAt(unitEl('p'), `+${f.n} Pearls`, 'pearl');
          sfx('pearl');
          break;
        }
        case 'spray': { const el = unitEl(f.who); slashAt(el, 'spray'); break; }
        case 'phase': {
          const field = $('#field');
          if (field) { field.classList.add('phase2'); anim(field, 'impact', 600); }
          c.phase2 = true;
          banner(f.text || 'The deep stirs', 'enemy big');
          sfx('phase');
          Music.setMood('boss2');
          await wait(900);
          break;
        }
        case 'shuffle': anim($('#pile-draw'), 'pulse', 500); break;
        case 'addcards': toast(`${f.n} ${BL.CARDS[f.id].name} shuffled into your draw pile`); break;
        case 'turn': banner(c.turn === 1 ? 'Your Turn' : `Turn ${c.turn}`); sfx('turn'); break;
        case 'light': { const o = $('#orb'); anim(o, 'pulse', 500); break; }
        case 'ks': { const m = $(`.hud .medal[data-k="${f.k}"]`, screenEl); anim(m, 'flash', 900); break; }
        case 'tide': sfx('tide'); break;
      }
    }
  }

  /* ----- Pointer handling for the hand (tap, click, drag) ----- */
  function bindHand() {
    const h = handEl();
    h.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.card');
      if (!el || ui.busy || e.button > 0) return;
      e.preventDefault();
      hideTip();
      ui.kbd = false;
      ui.drag = { uid: +el.dataset.uid, el, x0: e.clientX, y0: e.clientY, moved: false, pid: e.pointerId, overEnemy: null };
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    h.addEventListener('pointermove', (e) => {
      const d = ui.drag;
      if (!d) {
        if (e.pointerType === 'mouse' && !ui.busy) {
          const el = e.target.closest('.card');
          const uid = el ? +el.dataset.uid : null;
          if (uid !== ui.hover && ui.sel == null) { ui.hover = uid; layoutHand(); renderGlossary(); }
        }
        return;
      }
      if (d.pid !== e.pointerId) return;
      if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > 12) startDrag(d);
      if (d.moved) moveDrag(d, e);
    });
    h.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && !ui.drag && ui.hover != null) { ui.hover = null; layoutHand(); renderGlossary(); }
    });
    const up = (e) => {
      const d = ui.drag;
      if (!d || d.pid !== e.pointerId) return;
      ui.drag = null;
      clearArrow();
      if (d.moved) endDrag(d, e);
      else onCardTap(d.uid);
    };
    h.addEventListener('pointerup', up);
    h.addEventListener('pointercancel', (e) => {
      const d = ui.drag;
      if (!d) return;
      ui.drag = null;
      clearArrow();
      d.el.classList.remove('dragging');
      layoutHand();
    });
    h.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest('.card');
      if (!el) return;
      e.preventDefault();
      e.stopPropagation();
      ui.kbd = true;
      onCardTap(+el.dataset.uid);
    });
  }

  function onCardTap(uid) {
    const c = run.combat;
    if (!c || ui.busy) return;
    if (ui.sel !== uid) { select(uid); return; }
    tryPlaySelected();
  }

  function startDrag(d) {
    const c = run.combat;
    const card = c.hand.find((x) => x.uid === d.uid);
    if (!card || c.phase !== 'player') return;
    const p = E.playable(run, card);
    if (!p.ok) { ui.drag = null; select(d.uid); return; }
    d.moved = true;
    ui.sel = d.uid;
    ui.hover = null;
    d.targeted = E.needsTarget(card);
    if (!d.targeted) {
      d.el.classList.add('dragging');
    }
    updateCombat();
  }
  function moveDrag(d, e) {
    const h = handEl();
    const hr = h.getBoundingClientRect();
    const cw = cardW(), ch = cw * 1.4;
    if (d.targeted) {
      const L = d.el._lay || { x: 0, y: 0, s: 1 };
      const sx = hr.left + L.x + cw / 2;
      const sy = hr.top + L.y + ch - ch * L.s;
      drawArrow(sx, sy, e.clientX, e.clientY);
      const under = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.closest && n.closest('.enemy:not(.dead)'));
      const en = under ? under.closest('.enemy') : null;
      const uid = en ? en.dataset.uid : null;
      if (uid !== ui.target) {
        ui.target = uid;
        $$('.enemy', screenEl).forEach((x) => x.classList.toggle('targeted', x.dataset.uid === uid));
        const card = run.combat.hand.find((x) => x.uid === d.uid);
        const t = uid ? E.enemyByUid(run.combat, uid) : null;
        if (card) { const html = cardInner(card, true, t); d.el.innerHTML = html; d.el._html = html; }
      }
    } else {
      d.el.style.transform = `translate(${e.clientX - hr.left - cw / 2}px, ${e.clientY - hr.top - ch / 2}px) scale(1.08)`;
      const dockTop = $('#dock').getBoundingClientRect().top;
      d.el.classList.toggle('selected', e.clientY < dockTop);
    }
  }
  function endDrag(d, e) {
    d.el.classList.remove('dragging');
    if (d.targeted) {
      if (ui.target) playCard(d.uid, ui.target);
      else { ui.sel = null; updateCombat(); }
    } else {
      const dockTop = $('#dock').getBoundingClientRect().top;
      if (e.clientY < dockTop - 10) playCard(d.uid, null);
      else { ui.sel = null; updateCombat(); }
    }
  }
  function drawArrow(x1, y1, x2, y2) {
    let a = $('#arrow');
    if (!a) {
      a = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      a.id = 'arrow';
      a.innerHTML = '<path/><circle r="9"/>';
      document.body.appendChild(a);
    }
    const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - 60;
    a.querySelector('path').setAttribute('d', `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`);
    const ci = a.querySelector('circle');
    ci.setAttribute('cx', x2); ci.setAttribute('cy', y2);
  }
  function clearArrow() { const a = $('#arrow'); if (a) a.remove(); }

  /* ----- Reward ----- */
  function renderReward() {
    const rw = run.rewards;
    const bonusChips = (rw.bonuses || []).map((b) => `<span class="chip bonus" title="${b.desc}">&#9733; ${b.name} +${b.pearls}</span>`).join('');
    const summary = `<div class="reward-summary"><span class="chip pearls">${ICON.pearl}<b>+${rw.pearls}</b> Pearls</span>${bonusChips}</div>`;
    const extras = [];
    if (rw.keepsake) {
      const k = BL.KEEPSAKES[rw.keepsake];
      extras.push(`<div class="reward-item done"><span class="medal"><img src="img/icons/${k.art}.webp" alt=""></span><div class="grow"><b>${k.name}</b><small>${k.desc}</small></div></div>`);
    }
    if (rw.tonic) {
      const tn = BL.TONICS[rw.tonic];
      const full = run.tonics.indexOf(null) < 0;
      extras.push(`<div class="reward-item${rw.tonicTaken ? ' done' : ''}"><span class="medal"><img src="img/icons/${tn.art}.webp" alt=""></span><div class="grow"><b>Tonic: ${tn.name}</b><small>${tn.desc}</small></div>
        ${rw.tonicTaken ? '<span class="muted">Taken</span>' : `<button class="btn small" data-act="taketonic" ${full ? 'disabled title="Tonic slots full"' : ''}>${full ? 'Slots full' : 'Take'}</button>`}</div>`);
    }
    const ksPanel = rw.keepsakeChoices && rw.keepsakeChoices.length && !rw.keepsake
      ? `<div class="panel"><h3>Choose a keepsake</h3><div class="shop-row">${rw.keepsakeChoices.map((k) => {
        const K = BL.KEEPSAKES[k];
        return `<div class="shop-tile ks-pick" tabindex="0" role="button" data-act="rewardks" data-k="${k}"><span class="medal"><img src="img/icons/${K.art}.webp" alt=""></span><b>${K.name}</b><small>${K.desc}</small></div>`;
      }).join('')}</div></div>` : '';
    const cards = rw.cards.map((rc, i) => staticCard(pseudo(rc.id, rc.up), `choice reveal${BL.CARDS[rc.id].rarity === 'rare' ? ' shine' : ''}${rc.up ? ' shine-up' : ''}${rw.cardTaken ? (rw.cardTakenIdx === i ? ' chosen' : ' dim') : ''}`,
      (rw.cardTaken ? '' : `tabindex="0" role="button" data-act="rewardcard" data-i="${i}"`) + ` style="animation-delay:${i * 0.12}s"`)).join('');
    const cardTitle = rw.cardTaken ? (rw.cardTakenIdx >= 0 ? 'Added to your deck' : 'Card skipped') : 'Choose a card for your deck';
    const buttons = rw.cardTaken
      ? '<button class="btn primary wide" data-act="tomap" autofocus>Continue</button>'
      : '<button class="btn ghost" data-act="rewardcard" data-i="">Skip the card</button>';
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene" style="background-image:url(img/bg/bg_battle.webp)"><div class="scene-inner reward-screen">
      <h1>Victory</h1>
      ${summary}
      ${ksPanel}
      <section class="reward-main"><h2>${cardTitle}</h2><div class="card-row reward-cards">${cards}</div></section>
      ${extras.length ? `<div class="reward-list">${extras.join('')}</div>` : ''}
      <div class="row-buttons">${buttons}</div>
    </div></div></div></div>`;
    const f = $('[autofocus]', screenEl) || $('.card.choice', screenEl);
    if (f && ui.lastPointer !== 'touch') f.focus({ preventScroll: true });
  }

  /* ----- Rest ----- */
  function renderRest() {
    const amt = E.restAmount(run);
    const done = run.restDone;
    const body = done
      ? `<p class="lead">${run.restMsg || 'You gather your strength.'}</p><button class="btn primary" data-act="tomap" autofocus>Continue the descent</button>`
      : `<div class="choice-list">
          <button class="choice" data-act="rest" autofocus><b>Rest by the lantern</b><span>${run.hp >= run.maxHp ? 'You are already at full health.' : `Heal ${Math.min(amt, run.maxHp - run.hp)} HP.`}</span></button>
          <button class="choice" data-act="refit" ${E.upgradeable(run).length ? '' : 'disabled'}><b>Refit your gear</b><span>Upgrade a card in your deck.</span></button>
        </div>`;
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene" style="background-image:url(img/scenes/rest.webp)"><div class="scene-inner">
      <h1>Sheltered Cove</h1>
      <p class="lead">A dry hollow above the tide line. The lantern burns steady here, and for a little while the deep cannot reach you.</p>
      ${body}
    </div></div></div></div>`;
    const f = $('[autofocus]', screenEl);
    if (f) f.focus({ preventScroll: true });
  }

  /* ----- Shop ----- */
  function renderShop() {
    const s = run.shop;
    const priceTag = (base, extra) => {
      const p = E.price(run, base);
      return `<span class="price${run.pearls < p ? ' cant' : ''}">${ICON.pearl}${p}${extra || ''}</span>`;
    };
    const cards = s.cards.map((it, i) => `<div class="shop-item${it.sold ? ' sold' : ''}">
        ${staticCard(pseudo(it.id), 'choice', it.sold ? '' : `tabindex="0" role="button" data-act="buy" data-kind="cards" data-i="${i}"`)}
        <div>${priceTag(it.base)} ${it.sale ? '<span class="sale-tag">SALE</span>' : ''}</div></div>`).join('');
    const tile = (kind, it, i, def) => `<div class="shop-tile${it.sold ? ' sold' : ''}" tabindex="0" role="button" data-act="buy" data-kind="${kind}" data-i="${i}" aria-label="Buy ${def.name}">
        <span class="medal"><img src="img/icons/${def.art}.webp" alt=""></span><b>${def.name}</b><small>${def.desc}</small>${it.sold ? '<span class="muted">Sold</span>' : priceTag(it.base)}</div>`;
    const ks = s.keepsakes.map((it, i) => tile('keepsakes', it, i, BL.KEEPSAKES[it.id])).join('');
    const ts = s.tonics.map((it, i) => tile('tonics', it, i, BL.TONICS[it.id])).join('');
    const rp = E.removePrice(run);
    const remove = `<div class="shop-tile${s.removed ? ' sold' : ''}" tabindex="0" role="button" data-act="shopremove" aria-label="Remove a card">
        <span class="medal" style="display:grid;place-items:center;color:#f1e6cf">${ICON.sunk}</span><b>Scrub a card</b><small>Remove a card from your deck. Once per visit.</small>${s.removed ? '<span class="muted">Done</span>' : `<span class="price${run.pearls < rp ? ' cant' : ''}">${ICON.pearl}${rp}</span>`}</div>`;
    const lines = ['"Pearls for wares, keeper. Fair trades only, no haggling, no biting."', '"Mind the shell. The shop is also my house."', '"Everything here came down with a wreck. Everything still works. Mostly."'];
    const line = lines[(run.floor + run.seed) % lines.length];
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene" style="background-image:url(img/bg/bg_battle.webp)"><div class="scene-inner">
      <div class="trader"><img src="img/units/trader.webp" alt="Barnaby the hermit crab trader"><div class="speech"><b>Barnaby's Drifting Emporium</b><br>${line}</div>
        <button class="btn small" data-act="tomap" style="align-self:flex-start">Leave</button></div>
      <div class="panel"><h3>Cards</h3><div class="shop-grid">${cards}</div></div>
      <div class="panel"><h3>Keepsakes, tonics and services</h3><div class="shop-row">${ks}${ts}${remove}</div></div>
      <button class="btn primary" data-act="tomap">Leave the shop</button>
    </div></div></div></div>`;
  }

  /* ----- Event ----- */
  function renderEvent() {
    const ev = E.eventDef(run);
    const st = run.event;
    let body;
    if (st.stage === 'choose') {
      body = `<div class="choice-list">${ev.options.map((o, i) => {
        const ok = E.optionAvailable(run, o);
        return `<button class="choice" data-act="evopt" data-i="${i}" ${ok === true ? '' : 'disabled'}><b>${o.label}</b><span>${o.desc}</span>${ok === true ? '' : `<span class="reason">${ok}</span>`}</button>`;
      }).join('')}</div>`;
    } else {
      body = `<p class="lead">${st.text}</p><button class="btn primary" data-act="evcontinue" autofocus>Continue</button>`;
    }
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene"><div class="scene-inner">
      <div class="event-art" style="background-image:url(img/scenes/${ev.art}.webp)"></div>
      <h1>${ev.title}</h1>
      ${st.stage === 'choose' ? `<p class="lead">${ev.text}</p>` : ''}
      ${body}
    </div></div></div></div>`;
    const f = $('[autofocus]', screenEl) || $('.choice:not([disabled])', screenEl);
    if (f && ui.lastPointer !== 'touch') f.focus({ preventScroll: true });
    if (st.stage === 'result' && st.next && !st.resolved) resolveEventNext();
  }

  function resolveEventNext() {
    const st = run.event;
    const next = st.next;
    const done = () => { st.resolved = true; save(); updateHud(); };
    if (next.pick === 'remove') {
      if (!run.deck.length) return done();
      ui.allowCancelPick = false;
      showDeck('remove', (uid) => { E.removeCard(run, uid); toast('Card removed'); done(); });
    } else if (next.pick === 'duplicate') {
      ui.allowCancelPick = false;
      showDeck('duplicate', (uid) => { E.duplicateCard(run, uid); toast('Card duplicated'); done(); });
    } else if (next.pick === 'upgrade') {
      if (!E.upgradeable(run).length) return done();
      ui.allowCancelPick = false;
      showDeck('upgrade', (uid) => { E.upgradeCard(run, uid); toast('Card upgraded'); done(); });
    } else if (next.cards) {
      showCardChoice(next.cards, 'Choose a card', (id) => { if (id) { E.addCard(run, id); toast(`${BL.CARDS[id].name} added to your deck`); } done(); });
    } else if (next.fight) {
      st.resolved = true;
      // fight starts when the player presses Continue
    }
  }

  function eventContinue() {
    const st = run.event;
    if (st.next && st.next.fight) {
      const bonus = st.next.bonusPearls || 0;
      run.event = null;
      E.startCombat(run, st.next.fight, null, { bonusPearls: bonus });
      save();
      render();
      return;
    }
    if (st.next && !st.resolved) { resolveEventNext(); return; }
    E.backToMap(run);
    save();
    render();
  }

  /* ----- Treasure ----- */
  function renderTreasure() {
    const t = run.treasure;
    let body;
    if (!t.opened) {
      body = `<p class="lead">A sea chest, half buried, banded in iron gone green. Something inside is still glowing.</p><button class="btn primary" data-act="opentreasure" autofocus>Pry it open</button>`;
    } else {
      const k = t.keepsake ? BL.KEEPSAKES[t.keepsake] : null;
      const choices = !k && t.choices && t.choices.length
        ? `<div class="panel"><h3>Three keepsakes glint in the chest. Take one</h3><div class="shop-row">${t.choices.map((id) => {
          const K = BL.KEEPSAKES[id];
          return `<div class="shop-tile ks-pick" tabindex="0" role="button" data-act="treasureks" data-k="${id}"><span class="medal"><img src="img/icons/${K.art}.webp" alt=""></span><b>${K.name}</b><small>${K.desc}</small></div>`;
        }).join('')}</div></div>` : '';
      body = `<div class="reward-list">
        <div class="reward-item done"><span class="medal" style="display:grid;place-items:center">${ICON.pearl}</span><div class="grow"><b>${t.pearls} Pearls</b></div></div>
        ${k ? `<div class="reward-item done"><span class="medal"><img src="img/icons/${k.art}.webp" alt=""></span><div class="grow"><b>Keepsake: ${k.name}</b><small>${k.desc}</small></div></div>` : ''}
      </div>${choices}<button class="btn ${choices ? '' : 'primary'}" data-act="tomap" ${choices ? '' : 'autofocus'}>${choices ? 'Leave them' : 'Continue'}</button>`;
    }
    screenEl.innerHTML = `<div class="run-screen">${hudHTML()}<div class="run-body"><div class="scene"><div class="scene-inner">
      <div class="chest" style="background-image:url(img/scenes/treasure.webp)"></div>
      <h1>A Wreck's Last Cargo</h1>${body}</div></div></div></div>`;
    const f = $('[autofocus]', screenEl);
    if (f) f.focus({ preventScroll: true });
  }

  /* ----- End screens ----- */
  function fmtTime(ms) {
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  function renderEnd(win) {
    E.tick(run);
    const st = run.stats;
    if (!run.final) {
      const score = E.score(run, win);
      const best = getNum(BEST_KEY);
      const fin = { score, best, newBest: score > best, unlocked: null };
      if (fin.newBest) setNum(BEST_KEY, score);
      if (win) {
        const ml = getNum(LEVEL_KEY);
        if ((run.level || 0) >= ml && ml < E.LEVELS.length - 1) { setNum(LEVEL_KEY, ml + 1); fin.unlocked = E.LEVELS[ml + 1].name; }
      }
      run.final = fin;
    }
    const fin = run.final;
    const stats = [
      ['Depth reached', `${run.floor}/${E.MAP_ROWS + 1}`], ['Fights won', st.fights], ['Dreads slain', st.elites], ['Biggest Crest chain', st.maxChain || 0],
      ['Damage dealt', st.dmgDealt], ['Crests', st.crests], ['Deck size', run.deck.length], ['Time', fmtTime(st.elapsed)],
    ].map((s) => `<div><b>${s[1]}</b><span>${s[0]}</span></div>`).join('');
    const scoreHTML = `<div class="score-box"><span>Score${run.level ? ` (${E.LEVELS[run.level].name})` : ''}</span><b>${fin.score}</b>${fin.newBest ? '<em>New best!</em>' : fin.best ? `<small>Best ${fin.best}</small>` : ''}</div>
      ${fin.unlocked ? `<div class="unlock-box">New depth unlocked: <b>${fin.unlocked}</b>. Choose it when you start your next descent.</div>` : ''}`;
    const title = win ? 'The Lantern Heart rises' : 'The tide takes you';
    const text = win
      ? 'The Bellwether cracks and falls silent. In the wreckage of its bronze, the Lantern Heart still burns. You carry it up through the dark water, and by dawn the great light of Saltmere is turning again.'
      : 'The cold closes over your lantern. Somewhere above, the lighthouse stays dark a little longer. But keepers are stubborn, and the sea gives back what it takes, eventually.';
    screenEl.innerHTML = `<div class="run-screen"><div class="run-body"><div class="scene" style="background-image:url(img/bg/${win ? 'bg_title' : 'bg_boss'}.webp)"><div class="scene-inner" style="padding-top:8vh">
      <h1>${title}</h1><p class="lead">${text}</p>
      ${scoreHTML}
      <div class="stats">${stats}</div>
      <div class="row-buttons"><button class="btn primary" data-act="newrun" autofocus>${win ? 'Dive again' : 'Try again'}</button><button class="btn" data-act="totitle">Title screen</button></div>
    </div></div></div></div>`;
    const f = $('[autofocus]', screenEl);
    if (f) f.focus({ preventScroll: true });
  }

  /* ================================================================== *
   *  Click handling (event delegation)
   * ================================================================== */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    if (t.disabled) return;
    handleAct(act, t, e);
  });

  function handleAct(act, t, e) {
    switch (act) {
      case 'close': closeOverlay(); break;
      case 'tutorial': closeOverlay(true); Teach.startTutorial(); break;
      case 'tutorialskip': Teach.setStatus('skipped'); closeOverlay(true); chooseLevelThenStart(); break;
      case 'tutnext': Teach.next(); break;
      case 'tutskip': closeOverlay(true); Teach.endTutorial(false); break;
      case 'tutback': closeOverlay(true); Teach.endTutorial(true); break;
      case 'tutstart': closeOverlay(true); Teach.endTutorial(true); run = null; render(); handleAct('newrun', t, e); break;
      case 'hintok': Teach.closeHint(); Teach.checkHints(); break;
      case 'newrun':
        if (run && loadSave() && run.screen !== 'victory' && run.screen !== 'defeat') {
          openOverlay(modal('Start a new descent?', '<p>Your current run will be lost.</p>', '<button class="btn" data-act="close">Keep playing</button><button class="btn primary" data-act="confirmnew">Start over</button>', 'narrow'));
        } else if (!run && loadSave()) {
          openOverlay(modal('Start a new descent?', '<p>You have a run in progress. Starting over will erase it.</p>', '<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="confirmnew">Start over</button>', 'narrow'));
        } else beginNewRun();
        break;
      case 'confirmnew': closeOverlay(true); beginNewRun(); break;
      case 'startlevel': closeOverlay(true); startNewRun(+t.dataset.lv); break;
      case 'continue': run = loadSave(); render(); break;
      case 'help': showHelp(); break;
      case 'helptab': ui.helpTab = t.dataset.tab; $('.help', overlayEl).outerHTML = helpHTML(ui.helpTab); { const b = $(`.tab[data-tab="${ui.helpTab}"]`, overlayEl); if (b) b.focus({ preventScroll: true }); } break;
      case 'menu': showMenu(); break;
      case 'togglesound': prefs.sound = !prefs.sound; savePrefs(); showMenu(); break;
      case 'togglefast': prefs.fast = !prefs.fast; savePrefs(); showMenu(); break;
      case 'togglemusic': prefs.music = !prefs.music; savePrefs(); if (prefs.music) Music.kick(); else Music.stop(); showMenu(); break;
      case 'totitle': save(); closeOverlay(true); run = null; render(); break;
      case 'abandon':
        openOverlay(modal('Abandon this run?', '<p>Your progress will be lost.</p>', '<button class="btn" data-act="close">Cancel</button><button class="btn primary" data-act="confirmabandon">Abandon</button>', 'narrow'));
        break;
      case 'confirmabandon': clearSave(); closeOverlay(true); run = null; render(); break;
      case 'deck': if (run) { ui.allowCancelPick = true; showDeck('view'); } break;
      case 'deckpick': deckPick(+t.dataset.uid); break;
      case 'deckback': {
        const m = ui.deckMode;
        const locked = ui.overlayLocked;
        if (m) { const keep = ui.allowCancelPick; showDeck(m.mode, m.onPick); ui.allowCancelPick = keep; if (locked) ui.overlayLocked = true; }
        break;
      }
      case 'deckconfirm': {
        const m = ui.deckMode;
        const uid = ui.pending;
        if (!m || uid == null) break;
        if (m.mode === 'shopremove') {
          if (E.buyRemoval(run, uid)) { sfx('coin'); toast('Card removed'); }
          closeOverlay(true); save(); render();
        } else {
          closeOverlay(true);
          if (m.onPick) m.onPick(uid);
        }
        ui.deckMode = null;
        ui.pending = null;
        break;
      }
      case 'pile': if (run && run.combat) showPile(t.dataset.pile); break;
      case 'ks': if (ui.lastPointer !== 'mouse') showTip(t, tipContent('ks:' + t.dataset.k)); break;
      case 'tonic': {
        const slot = +t.dataset.slot;
        if (ui.tonicSel === slot) { ui.tonicSel = null; updateCombat(); break; }
        showTonic(slot);
        break;
      }
      case 'tonicuse': closeOverlay(true); useTonic(+t.dataset.slot); break;
      case 'tonicdiscard': E.discardTonic(run, +t.dataset.slot); closeOverlay(true); save(); updateHud(); break;
      case 'choosecard': {
        const id = t.dataset.id;
        const cb = ui.cardChoiceDone;
        ui.cardChoiceDone = null;
        closeOverlay(true);
        if (cb) cb(id || null);
        render();
        break;
      }
      case 'node': chooseNode(+t.dataset.row, +t.dataset.col); break;
      case 'endturn': endTurn(); break;
      case 'enemy': onEnemyClick(t, e); break;
      case 'field': onFieldClick(e); break;
      case 'dock': if (e.target === t || e.target.id === 'hand') deselect(); break;
      case 'rewardcard': {
        const i = t.dataset.i === '' ? null : +t.dataset.i;
        const rc = i == null ? null : run.rewards.cards[i];
        E.takeRewardCard(run, i);
        if (rc) { sfx('select'); toast(`${BL.CARDS[rc.id].name}${rc.up ? '+' : ''} added to your deck`); }
        save();
        render();
        break;
      }
      case 'rewardks': {
        E.takeRewardKeepsake(run, t.dataset.k);
        sfx('coin');
        toast(`${BL.KEEPSAKES[t.dataset.k].name} is yours`);
        save();
        render();
        break;
      }
      case 'treasureks': {
        E.takeTreasureKeepsake(run, t.dataset.k);
        sfx('coin');
        save();
        render();
        break;
      }
      case 'taketonic': if (E.takeRewardTonic(run)) { sfx('tonic'); save(); render(); } break;
      case 'tomap': E.backToMap(run); save(); render(); break;
      case 'rest': {
        const h = E.rest(run);
        run.restMsg = `You sleep beside the lantern and wake mended. Healed ${h} HP.`;
        sfx('buff');
        save();
        render();
        break;
      }
      case 'refit':
        ui.allowCancelPick = true;
        showDeck('upgrade', (uid) => {
          E.upgradeCard(run, uid);
          const c = run.deck.find((x) => x.uid === uid);
          run.restDone = true;
          run.restMsg = `You work through the night by lantern light. ${c ? E.cardName(c) : 'Your card'} is ready.`;
          sfx('buff');
          save();
          render();
        });
        break;
      case 'buy': {
        const kind = t.dataset.kind, i = +t.dataset.i;
        const it = run.shop[kind][i];
        if (!it || it.sold) break;
        const p = E.price(run, it.base);
        if (run.pearls < p) { toast('Not enough Pearls'); break; }
        if (kind === 'tonics' && run.tonics.indexOf(null) < 0) { toast('Your tonic slots are full'); break; }
        if (E.buy(run, kind, i)) {
          sfx('coin');
          const name = kind === 'cards' ? BL.CARDS[it.id].name : kind === 'keepsakes' ? BL.KEEPSAKES[it.id].name : BL.TONICS[it.id].name;
          toast(`Bought ${name}`);
          save();
          render();
        }
        break;
      }
      case 'shopremove': {
        if (run.shop.removed) break;
        if (run.pearls < E.removePrice(run)) { toast('Not enough Pearls'); break; }
        ui.allowCancelPick = true;
        showDeck('shopremove', null);
        break;
      }
      case 'evopt': {
        const res = E.chooseEventOption(run, +t.dataset.i);
        if (!res) break;
        sfx('select');
        save();
        render();
        break;
      }
      case 'evcontinue': eventContinue(); break;
      case 'opentreasure': E.openTreasure(run); sfx('coin'); save(); render(); break;
    }
  }

  function onEnemyClick(t, e) {
    const c = run && run.combat;
    if (!c) return;
    e.stopPropagation();
    const uid = t.dataset.uid;
    const en = E.enemyByUid(c, uid);
    if (!en) return;
    if (ui.tonicSel != null) { useTonic(ui.tonicSel, uid); return; }
    if (ui.sel != null) {
      const card = c.hand.find((x) => x.uid === ui.sel);
      if (card && E.needsTarget(card)) { ui.target = uid; tryPlaySelected(uid); }
      else tryPlaySelected();
      return;
    }
    if (ui.lastPointer !== 'mouse') {
      if (ui.tipFor === uid) hideTip();
      else { showTip($('.sprite', t), tipContent('unit:' + uid)); ui.tipFor = uid; }
    }
  }
  function onFieldClick(e) {
    const c = run && run.combat;
    if (!c || e.target.closest('.enemy') || e.target.closest('.player')) {
      if (c && e.target.closest('.player') && ui.lastPointer !== 'mouse') showTip($('.unit.player .sprite'), tipContent('unit:p'));
      return;
    }
    if (ui.tonicSel != null) { ui.tonicSel = null; updateCombat(); return; }
    if (ui.sel != null) {
      const card = c.hand.find((x) => x.uid === ui.sel);
      if (card && !E.needsTarget(card)) tryPlaySelected();
      else deselect();
    }
  }

  /* ================================================================== *
   *  Keyboard
   * ================================================================== */
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    Sound.unlock();
    if (Teach && Teach.onKey(e)) return;
    const k = e.key;
    if (!overlayEl.hidden) {
      if (k === 'Escape') { e.preventDefault(); closeOverlay(); return; }
      // number keys pick cards in a card choice
      if (/^[1-9]$/.test(k)) {
        const opts = $$('[data-act="choosecard"][data-i], [data-act="deckpick"]', overlayEl);
        const o = opts[+k - 1];
        if (o) { e.preventDefault(); o.click(); }
      }
      if ((k === 'Enter' || k === ' ') && document.activeElement && document.activeElement.matches('[role="button"][data-act]')) {
        e.preventDefault(); document.activeElement.click();
      }
      return;
    }
    if (!run) return;
    const active = document.activeElement;
    const onButton = active && active !== document.body && (active.tagName === 'BUTTON' || active.getAttribute('role') === 'button') && !active.closest('#hand');
    if ((k === 'Enter' || k === ' ') && active && active.matches('[role="button"][data-act]')) { e.preventDefault(); active.click(); return; }
    if (k === 'd' || k === 'D') { e.preventDefault(); ui.allowCancelPick = true; showDeck('view'); return; }
    if (run.screen === 'combat') return combatKey(e, onButton);
    if (run.screen === 'map') return mapKey(e);
    if (run.screen === 'reward' && /^[1-3]$/.test(k)) {
      const el = $$('[data-act="rewardcard"][data-i]', screenEl)[+k - 1];
      if (el) { e.preventDefault(); el.click(); }
    }
  });

  function combatKey(e, onButton) {
    const c = run.combat;
    const k = e.key;
    if (!c) return;
    if (k === 'Escape' || k === 'ArrowDown') { e.preventDefault(); deselect(); return; }
    if (ui.busy || c.phase !== 'player') return;
    ui.kbd = true;
    ui.lastPointer = ui.lastPointer === 'touch' ? 'touch' : 'keyboard';
    if (/^[0-9]$/.test(k) || k === 'ArrowLeft' || k === 'ArrowRight') {
      const a = document.activeElement;
      if (a && a !== document.body && a.blur) a.blur();
    }
    if (/^[0-9]$/.test(k)) {
      const idx = k === '0' ? 9 : +k - 1;
      const card = c.hand[idx];
      if (!card) return;
      e.preventDefault();
      if (ui.sel === card.uid) tryPlaySelected();
      else select(card.uid);
      return;
    }
    if (k === 'e' || k === 'E') { e.preventDefault(); endTurn(); return; }
    if (k === 'z' || k === 'x' || k === 'c' || k === 'Z' || k === 'X' || k === 'C') {
      const slot = { z: 0, x: 1, c: 2 }[k.toLowerCase()];
      if (run.tonics[slot]) { e.preventDefault(); showTonic(slot); }
      return;
    }
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault();
      const dir = k === 'ArrowLeft' ? -1 : 1;
      if ((ui.sel != null && selNeedsTarget()) || ui.tonicSel != null) {
        const al = E.alive(c);
        if (!al.length) return;
        let i = al.findIndex((x) => x.uid === ui.target);
        i = i < 0 ? 0 : (i + dir + al.length) % al.length;
        ui.target = al[i].uid;
        updateCombat();
      } else if (c.hand.length) {
        let i = c.hand.findIndex((x) => x.uid === ui.sel);
        i = i < 0 ? (dir > 0 ? 0 : c.hand.length - 1) : (i + dir + c.hand.length) % c.hand.length;
        select(c.hand[i].uid);
      }
      return;
    }
    if (k === 'Enter' || k === ' ' || k === 'ArrowUp') {
      if (onButton && k !== 'ArrowUp') return;
      e.preventDefault();
      if (ui.tonicSel != null) { if (ui.target) useTonic(ui.tonicSel, ui.target); return; }
      if (ui.sel != null) tryPlaySelected();
      else if (k !== 'ArrowUp' && c.hand.length) select(c.hand[0].uid);
    }
  }

  function mapKey(e) {
    const k = e.key;
    const btns = $$('.node.avail', screenEl);
    if (!btns.length) return;
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      const cur = btns.indexOf(document.activeElement);
      const n = cur < 0 ? 0 : (cur + (k === 'ArrowLeft' || k === 'ArrowDown' ? -1 : 1) + btns.length) % btns.length;
      btns[n].focus();
      return;
    }
    if (/^[1-9]$/.test(k) && btns[+k - 1]) { e.preventDefault(); btns[+k - 1].click(); return; }
    if ((k === 'Enter' || k === ' ') && !btns.includes(document.activeElement)) { e.preventDefault(); btns[0].focus(); }
  }

  /* ================================================================== *
   *  Boot
   * ================================================================== */
  window.addEventListener('resize', () => {
    computeSizes();
    if (run && run.screen === 'map') renderMap();
    if (run && run.combat) renderGlossary();
  });
  window.addEventListener('beforeunload', () => save());
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  Teach = BL.Teach({
    E, $, ui, save, loadSave, render, openOverlay, modal,
    getRun: () => run,
    setRun: (r) => { run = r; },
    overlayHidden: () => overlayEl.hidden,
  });
  // tidy up keys from older builds
  try { ['brinelight.seenhelp', 'brinelight.tip1'].forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }

  computeSizes();
  render();

  // exposed for debugging and the UI tests
  window.Brinelight = { get run() { return run; }, set run(r) { run = r; }, render, E, ui, get teach() { return Teach; } };
})();
