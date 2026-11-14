/* Brinelight sound effects, draft 2 (2026-11-14).
   Every sound is synthesized with Web Audio: no files, no dependencies. Not wired into the game yet;
   sound/lab.html plays them.

   const sfx = BL.SFX.create(audioContext, destination);
   sfx.play('hit', { n: 12, pan: 0.4 });   // opts: n (damage, chain length, card count), pan (-1 Wren's side, 1 the creatures'),
                                          // type (a card's type), down (a falling Fury)
   sfx.setDepth(0 | 1 | 2);               // the Shallows, Dark Water, the Belfry: deeper is darker and echoes longer
   sfx.ambience('shallows' | 'dark' | 'belfry' | null, density);   // occasional sounds of the place, or stop

   Tuned sounds use A minor pentatonic (A C D E G), so they sit in the score's keys (A minor, and D minor in fights). */
(function () {
  'use strict';
  const BL = (window.BL = window.BL || {});

  const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  // How each depth sounds. World sounds pass through a low-pass that closes as Wren goes down,
  // and into a reverb that gets longer and darker. Interface clicks skip both.
  const DEPTHS = [
    { lp: 16000, wet: 0.22, ir: 1.6, dark: 0.15, pre: 0.012 }, // the Shallows: open air under the cliffs
    { lp: 4200, wet: 0.34, ir: 3.0, dark: 0.55, pre: 0.025 },  // Dark Water: caves and water held still
    { lp: 2400, wet: 0.44, ir: 4.2, dark: 0.8, pre: 0.04 },    // the Belfry: under the sea
  ];

  // A cast bell's partials: [ratio to the strike note, level, share of the ring time]. The hum an octave down,
  // the minor-third tierce and the quint give a big bell its sound; the low partials ring longest.
  const CAST = [
    [0.5, 0.5, 1], [1, 0.75, 0.6], [1.183, 0.45, 0.5], [1.506, 0.28, 0.4], [2, 0.4, 0.3],
    [2.514, 0.2, 0.2], [2.662, 0.16, 0.18], [3.011, 0.14, 0.14], [4.166, 0.08, 0.1], [5.433, 0.05, 0.07],
  ];
  // A hand-bell: a strong fundamental and a twelfth, like a keeper's bell.
  const HAND = [[1, 1, 1], [2.01, 0.08, 0.5], [3, 0.3, 0.45], [4.17, 0.08, 0.3], [5.43, 0.07, 0.22], [6.8, 0.04, 0.15]];

  // The mix: each sound's level in dB. Set by rendering every sound offline and measuring its loudest 50 ms,
  // aiming for about -24 dB for a blow, -18 for the big moments, -36 to -46 for clicks and the ambience.
  const LEVEL = {
    draw: -2.5, select: 7.5, page: -4, hurt: -1.5, block: 2, ward: 1.5, buff: -5, debuff: -2, kill: -3, die: -5.5, echo: -4.5, danger: -17,
    turn: -4, bell: -10.5, phase: -11, chain: -5, fury: -4, shopbell: -5.5,
    lightgain: -1, douse: -4.5, tide: -6, crest: -8.5, low: -2.5, submerge: -8.5, bail: 6.5, stir: -6,
    coin: -1, tonic: -5.5, keepsake: -7, treasure: -5, step: -2.5, unlock: -8, victory: -8, defeat: -5,
    gull: -4.5, creak: 12, buoy: -12, groan: -12.5, farbell: -15, bubbles: -1, moan: -10, hum: -20,
  };

  function create(ctx, destination) {
    destination = destination || ctx.destination;
    const nyq = ctx.sampleRate * 0.45;

    // ---------------------------------------------------------------- routing
    const master = ctx.createGain();
    master.gain.value = 0.85;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -8; limiter.knee.value = 6; limiter.ratio.value = 10;
    limiter.attack.value = 0.003; limiter.release.value = 0.2;
    limiter.connect(master);
    master.connect(destination);
    const world = ctx.createBiquadFilter();
    world.type = 'lowpass'; world.Q.value = 0.6; world.frequency.value = DEPTHS[0].lp;
    world.connect(limiter);
    const bus = ctx.createGain(); bus.connect(world);
    const uiBus = ctx.createGain(); uiBus.connect(limiter);
    const send = ctx.createGain();
    const verb = ctx.createConvolver();
    const wet = ctx.createGain(); wet.gain.value = DEPTHS[0].wet;
    send.connect(verb); verb.connect(wet); wet.connect(world);

    const irs = {};
    function impulse(d) {
      if (irs[d]) return irs[d];
      const D = DEPTHS[d], rate = ctx.sampleRate, pre = Math.floor(rate * D.pre), len = pre + Math.floor(rate * D.ir);
      const b = ctx.createBuffer(2, len, rate);
      for (let ch = 0; ch < 2; ch++) {
        const x = b.getChannelData(ch);
        let lp = 0;
        for (let i = pre; i < len; i++) {
          const k = (i - pre) / (len - pre);
          // a one-pole low-pass that closes along the tail, so the echo darkens as it dies
          lp += ((Math.random() * 2 - 1) - lp) * Math.max(0.03, 1 - D.dark * (0.35 + 0.65 * k));
          x[i] = lp * Math.exp(-6.9 * k);
        }
      }
      return (irs[d] = b);
    }
    verb.buffer = impulse(0);

    const bufs = {};
    function noiseBuf(kind) {
      if (bufs[kind]) return bufs[kind];
      const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), x = b.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0, amp = 0, env = 0, next = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'pink') { // Paul Kellet's filter
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; x[i] = last * 3.5; }
        else if (kind === 'crackle') { // paper: noise whose level jumps every few milliseconds, so it rustles instead of hissing
          if (i >= next) { amp = Math.pow(Math.random(), 2.5); next = i + Math.floor(ctx.sampleRate * rnd(0.0004, 0.003)); }
          env += (amp - env) * 0.2; x[i] = w * env * 1.8;
        }
        else x[i] = w;
      }
      return (bufs[kind] = b);
    }

    // send a finished sound to the world (or the interface), panned, with some of it into the reverb
    let trim = 1; // the level of the sound being built, from LEVEL; set by play()
    function out(node, t, o) {
      let last = node;
      if (trim !== 1 && !o.into) { const tg = ctx.createGain(); tg.gain.value = trim; last.connect(tg); last = tg; }
      if ((o.pan || o.panTo != null) && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.setValueAtTime(clamp(o.pan || 0, -1, 1), t);
        if (o.panTo != null) p.pan.linearRampToValueAtTime(clamp(o.panTo, -1, 1), t + (o.dur || 0.5));
        last.connect(p); last = p;
      }
      if (o.into) { last.connect(o.into); return; }
      last.connect(o.ui ? uiBus : bus);
      if (o.wet && !o.ui) { const s = ctx.createGain(); s.gain.value = o.wet; last.connect(s); s.connect(send); }
    }
    // a group: several parts sharing one pan and reverb send
    function group(t, o) { const g = ctx.createGain(); out(g, t, o); return g; }
    // a group heard through a filter that moves, f as in filter(): bubbles that darken as they come from deeper
    function through(t, f, o) { const b = filter(t, f); out(b, t, o); return b; }
    // soft clipping: drive a sine into it and it grows the odd harmonics that give a blow its grit
    const curves = {};
    function shaper(k) {
      if (!curves[k]) {
        const n = 1024, c = new Float32Array(n);
        for (let i = 0; i < n; i++) c[i] = Math.tanh(k * ((i / (n - 1)) * 2 - 1)) / Math.tanh(k);
        curves[k] = c;
      }
      const w = ctx.createWaveShaper(); w.curve = curves[k]; w.oversample = '2x';
      return w;
    }

    // silence, up to `vol` over `a` seconds, hold `h`, then an exponential fall that is near silent at `dur`
    function envelope(param, t, vol, a, h, dur) {
      vol = Math.max(vol, 0.001); a = Math.max(a, 0.001); h = h || 0;
      dur = Math.max(dur, a + h + 0.01);
      param.value = 0; // a gain starts at 1, and a source can start a sample before t: that sample would click
      param.setValueAtTime(0, t);
      param.linearRampToValueAtTime(vol, t + a);
      if (h) param.setValueAtTime(vol, t + a + h);
      param.exponentialRampToValueAtTime(0.0005, t + dur);
      param.linearRampToValueAtTime(0, t + dur + 0.02);
      return dur;
    }
    // ramp a frequency param along [[value, seconds after t], ...]
    function glide(param, t, start, o) {
      param.setValueAtTime(start, t);
      if (o.path) o.path.forEach(([v, dt]) => param.exponentialRampToValueAtTime(Math.max(1, v), t + dt));
      else if (o.to) param.exponentialRampToValueAtTime(Math.max(1, o.to), t + (o.sweep || o.glide || o.dur));
    }
    function filter(t, f) {
      const b = ctx.createBiquadFilter();
      b.type = f.type || 'lowpass';
      b.Q.value = f.q == null ? 0.7 : f.q;
      glide(b.frequency, t, Math.min(f.f, nyq), { path: f.path, to: f.to && Math.min(f.to, nyq), sweep: f.sweep });
      return b;
    }
    // an oscillator. o: f, to/glide or path, type, vol, a, h, dur, vib [rate Hz, depth cents], detune, drive, filter, pan, wet, ui, into
    function tone(t, o) {
      if (o.f > nyq) return;
      const s = ctx.createOscillator();
      s.type = o.type || 'sine';
      glide(s.frequency, t, o.f, o);
      if (o.detune) s.detune.value = o.detune;
      const g = ctx.createGain();
      const dur = envelope(g.gain, t, o.vol, o.a == null ? 0.004 : o.a, o.h, o.dur);
      const end = t + dur + 0.05;
      if (o.vib) {
        const l = ctx.createOscillator(), lg = ctx.createGain();
        l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
        l.connect(lg); lg.connect(s.detune); l.start(t); l.stop(end);
      }
      let last = s;
      if (o.drive) { const w = shaper(o.drive); last.connect(w); last = w; }
      if (o.filter) { const f = filter(t, o.filter); last.connect(f); last = f; }
      last.connect(g);
      out(g, t, o);
      s.start(t); s.stop(end);
    }
    // filtered noise. o: color (white, pink, brown, crackle), vol, a, h, dur, filter, am [rate Hz, depth 0-1], pan, panTo, wet, ui, into
    function noise(t, o) {
      const s = ctx.createBufferSource();
      s.buffer = noiseBuf(o.color || 'white'); s.loop = true;
      const g = ctx.createGain();
      const dur = envelope(g.gain, t, o.vol, o.a == null ? 0.004 : o.a, o.h, o.dur);
      const end = t + dur + 0.05;
      let last = s;
      if (o.filter) { const f = filter(t, o.filter); last.connect(f); last = f; }
      last.connect(g);
      let tail = g;
      if (o.am) {
        const ag = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
        ag.gain.value = 1 - o.am[1]; l.frequency.value = o.am[0]; lg.gain.value = o.am[1];
        l.connect(lg); lg.connect(ag.gain); l.start(t); l.stop(end);
        g.connect(ag); tail = ag;
      }
      out(tail, t, Object.assign({}, o, { dur }));
      s.start(t, Math.random() * 1.5); s.stop(end);
    }
    // a struck bell; o: vol, dur (the longest ring), kind ('hand' or a cast bell), bright (0-1 keeps the upper partials), strike, pan, wet, ui
    function bell(t, f, o) {
      const into = group(t, o);
      const bright = o.bright == null ? 1 : o.bright;
      (o.kind === 'hand' ? HAND : CAST).forEach(([r, lv, share]) => {
        const fr = f * r * (1 + rnd(-0.0015, 0.0015));
        const level = o.vol * lv * (r > 1.6 ? bright : 1);
        if (level < 0.001) return;
        const d = Math.max(0.15, o.dur * share);
        tone(t, { f: fr, vol: level, a: 0.002, dur: d, into });
        // a partner a hair sharp makes the low partials beat slowly, the "wah" of a big bell
        if (r <= 1.2 && o.kind !== 'hand') tone(t, { f: fr * 1.0035, vol: level * 0.5, a: 0.002, dur: d * 0.85, into });
      });
      noise(t, { vol: o.vol * (o.strike == null ? 0.2 : o.strike), a: 0.001, dur: 0.035, filter: { type: 'bandpass', f: Math.min(f * 4, 9000), q: 1.2 }, into });
    }

    // ---------------------------------------------------------------- small parts
    function bubbles(t, count, spread, o) {
      const into = group(t, o);
      for (let i = 0; i < count; i++) {
        const k = o.rise ? i / count : Math.random();
        const f = o.lo + (o.hi - o.lo) * (o.rise ? k : Math.random());
        tone(t + (o.rise ? k * spread + rnd(0, spread / count) : rnd(0, spread)), {
          f, to: f * rnd(1.5, 2.3), glide: 0.03, vol: o.vol * rnd(0.6, 1), a: 0.002, dur: rnd(0.04, 0.08), into,
        });
      }
    }
    function gurgle(t, count, spread, o) { // bubbles that fall in pitch: water going down a drain
      const into = group(t, o);
      for (let i = 0; i < count; i++) {
        const f = rnd(o.lo, o.hi);
        tone(t + rnd(0, spread), { f, to: f * rnd(0.45, 0.6), glide: 0.05, vol: o.vol * rnd(0.6, 1), a: 0.003, dur: rnd(0.06, 0.1), into });
      }
    }
    function drops(t, count, spread, o) { // spray falling back: short bright plips, most of them early
      const into = group(t, o);
      for (let i = 0; i < count; i++) {
        const f = rnd(o.lo || 1400, o.hi || 3200);
        tone(t + spread * Math.pow(Math.random(), 1.6), {
          f, to: f * rnd(1.25, 1.7), glide: rnd(0.008, 0.02), vol: o.vol * rnd(0.4, 1), a: 0.001, dur: rnd(0.025, 0.05), pan: rnd(-0.35, 0.35), into,
        });
      }
    }
    function clicks(t, count, spread, o) { // shingle, crackle, fizz: many tiny clicks
      const into = group(t, o);
      for (let i = 0; i < count; i++) {
        noise(t + rnd(0, spread), {
          vol: o.vol * rnd(0.3, 1), a: 0.0005, dur: rnd(0.008, o.long || 0.025),
          filter: { type: 'bandpass', f: rnd(o.lo || 2500, o.hi || 5000), q: 3 }, pan: rnd(-0.5, 0.5), into,
        });
      }
    }
    function shimmer(t, vol, dur, o) {
      noise(t, Object.assign({ vol, a: dur * 0.35, dur, filter: { type: 'highpass', f: 7000 } }, o));
    }
    function creak(t, dur, o) { // a slow saw through a narrow band-pass: wood or rope working under strain
      tone(t, Object.assign({
        type: 'sawtooth', f: rnd(16, 26), path: [[rnd(34, 55), dur * 0.6], [rnd(18, 28), dur]],
        a: 0.06, dur, filter: { type: 'bandpass', f: rnd(800, 1300), q: 7 },
      }, o));
    }
    function splash(t, vol, dur, o) {
      noise(t, Object.assign({ color: 'pink', vol, a: 0.004, dur, filter: { type: 'bandpass', f: 2200, q: 0.9, to: 450, sweep: dur * 0.9 } }, o));
    }

    // ---------------------------------------------------------------- the sounds
    const S = {
      /* cards */
      draw(t, o) { // each card slides off the deck with a papery rasp, then snaps down on the hand
        const n = clamp(o.n || 1, 1, 5);
        let at = t;
        for (let i = 0; i < n; i++) {
          const p = -0.3 + i * 0.12, v = rnd(0.85, 1.15);
          noise(at, { color: 'crackle', vol: 0.16 * v, a: 0.025, dur: 0.085, ui: true, pan: p - 0.15, panTo: p, filter: { type: 'bandpass', f: 1800 * v, q: 0.8, to: 5200 * v, sweep: 0.08 } });
          noise(at + 0.07, { vol: 0.16 * v, a: 0.0008, dur: 0.018, ui: true, pan: p, filter: { type: 'bandpass', f: rnd(3200, 4200), q: 1.4 } });
          tone(at + 0.07, { type: 'triangle', f: rnd(280, 330), to: 160, glide: 0.03, vol: 0.05, a: 0.001, dur: 0.045, ui: true, pan: p });
          at += rnd(0.075, 0.095);
        }
      },
      card(t, o) {
        const type = o.type || 'skill';
        if (type === 'attack') {
          noise(t, { color: 'pink', vol: 0.52, a: 0.06, dur: 0.2, pan: 0.1, wet: 0.1, filter: { type: 'bandpass', f: 500, q: 1.2, to: 3200, sweep: 0.16 } });
          noise(t, { vol: 0.16, a: 0.001, dur: 0.02, filter: { type: 'highpass', f: 3000 } });
        } else if (type === 'rite') {
          [81, 88, 93].forEach((m, i) => tone(t + i * 0.05, { f: midi(m), vol: 0.03, a: 0.01, dur: 0.9, wet: 0.4 }));
          tone(t, { f: midi(45), vol: 0.035, a: 0.15, dur: 1.2, wet: 0.3 });
          shimmer(t, 0.012, 0.8, { wet: 0.3 });
        } else if (type === 'status' || type === 'curse') { // weed and seawater slopped onto the pile
          const v = rnd(0.9, 1.1);
          noise(t, { vol: 0.3, a: 0.0008, dur: 0.02, filter: { type: 'bandpass', f: 1600 * v, q: 0.9 } }); // the slap
          noise(t, { color: 'pink', vol: 0.5, a: 0.002, dur: 0.16, filter: { type: 'lowpass', q: 9, f: 1800 * v, path: [[380 * v, 0.11]] } }); // a ringing filter falling fast: the splotch
          tone(t + 0.01, { type: 'sawtooth', f: 60 * v, vib: [30, 60], vol: 0.08, a: 0.01, dur: 0.22, filter: { type: 'bandpass', q: 7, f: 400, path: [[1100, 0.07], [300, 0.2]] } }); // the squelch
          bubbles(t + 0.06, 4, 0.22, { vol: 0.07, lo: 220, hi: 520 });
          drops(t + 0.05, 5, 0.35, { vol: 0.03, lo: 1100, hi: 2400 });
          if (type === 'curse') tone(t + 0.03, { f: 100, to: 210, glide: 0.09, vol: 0.06, a: 0.004, dur: 0.16 }); // and a big glug
        } else {
          noise(t, { color: 'pink', vol: 0.13, a: 0.05, dur: 0.22, filter: { type: 'bandpass', f: 900, q: 0.8, to: 1800, sweep: 0.2 } });
          tone(t + 0.02, { f: 180, to: 120, glide: 0.1, vol: 0.05, dur: 0.12 });
        }
      },
      select(t) {
        noise(t, { vol: 0.06, a: 0.001, dur: 0.025, ui: true, filter: { type: 'bandpass', f: 2600, q: 2.5 } });
        tone(t, { type: 'triangle', f: 1760 * rnd(0.98, 1.02), vol: 0.025, a: 0.002, dur: 0.05, ui: true });
      },
      page(t) { // a page of the keeper's log: lifted with a crinkle, swept across, laid flat
        clicks(t, 7, 0.12, { vol: 0.05, lo: 2500, hi: 6000, ui: true, pan: 0.3 });
        noise(t + 0.06, { color: 'crackle', vol: 0.12, a: 0.12, dur: 0.38, ui: true, pan: 0.35, panTo: -0.35, filter: { type: 'bandpass', f: 900, q: 0.7, path: [[3800, 0.16], [1400, 0.34]] } });
        noise(t + 0.06, { color: 'pink', vol: 0.09, a: 0.14, dur: 0.36, ui: true, pan: 0.3, panTo: -0.3, filter: { type: 'bandpass', f: 400, q: 0.8, path: [[1400, 0.18], [500, 0.34]] } });
        noise(t + 0.36, { color: 'pink', vol: 0.16, a: 0.002, dur: 0.07, ui: true, pan: -0.3, filter: { type: 'lowpass', f: 2600, to: 700, sweep: 0.05 } }); // the flap
        tone(t + 0.36, { f: 140, to: 80, glide: 0.04, vol: 0.06, a: 0.002, dur: 0.07, ui: true, pan: -0.3 });
        clicks(t + 0.37, 3, 0.06, { vol: 0.03, lo: 3000, hi: 5000, ui: true, pan: -0.3 });
      },

      /* blows */
      hit(t, o) { // Wren's blow lands on a creature: a snap, a gritty punch, a wet smack, and spray falling back
        const n = o.n || 6, big = n >= 15, huge = n >= 25, p = o.pan == null ? 0.3 : o.pan, v = rnd(0.92, 1.08);
        noise(t, { vol: 0.4, a: 0.0005, dur: 0.012, pan: p, filter: { type: 'highpass', f: 2400 } }); // the snap
        noise(t, { vol: 0.3, a: 0.0005, dur: 0.03, pan: p, filter: { type: 'bandpass', f: 900 * v, q: 1.2 } }); // the knock
        tone(t, { f: 240 * v, path: [[90 * v, 0.03], [48 * v, 0.16]], drive: 3, vol: 0.4, a: 0.001, dur: 0.18, pan: p, filter: { type: 'lowpass', f: 2200, to: 400, sweep: 0.12 } }); // the punch
        noise(t + 0.004, { color: 'pink', vol: 0.45, a: 0.002, dur: 0.13, pan: p, wet: 0.12, filter: { type: 'lowpass', q: 6, f: 2600 * v, path: [[500 * v, 0.08]] } }); // the smack
        drops(t + 0.06, big ? 14 : 7, big ? 0.55 : 0.35, { vol: 0.035, pan: p, wet: 0.2 });
        if (big) {
          clicks(t + 0.002, 6, 0.035, { vol: 0.12, lo: 1200, hi: 3000, long: 0.015, pan: p }); // shell giving way
          tone(t, { f: 110, path: [[38, 0.35]], drive: 1.5, vol: 0.4, a: 0.002, dur: huge ? 0.7 : 0.5, pan: p * 0.5 }); // the boom
          splash(t + 0.03, 0.3, huge ? 0.9 : 0.6, { pan: p, wet: 0.3 });
          noise(t + 0.05, { color: 'brown', vol: 0.3, a: 0.02, dur: huge ? 1.2 : 0.8, pan: p, wet: 0.35, filter: { type: 'lowpass', f: 1200, to: 160, sweep: 0.7 } }); // the water heaving back
        }
      },
      hurt(t, o) { // a blow lands on Wren
        const n = o.n || 6, big = n >= 15, p = o.pan == null ? -0.3 : o.pan, v = rnd(0.9, 1.1);
        tone(t, { f: 130 * v, to: 45, glide: 0.2, vol: 0.55, a: 0.002, dur: 0.28, pan: p });
        noise(t, { color: 'pink', vol: 0.3, a: 0.002, dur: 0.25, pan: p, filter: { type: 'lowpass', f: 1600, to: 250, sweep: 0.22 } });
        tone(t, { type: 'sawtooth', f: 75 * v, to: 42, glide: 0.18, vol: 0.12, a: 0.003, dur: 0.22, pan: p, filter: { type: 'lowpass', f: 500 } });
        splash(t + 0.015, 0.12, 0.3, { pan: p, wet: 0.15 });
        if (big) {
          tone(t, { f: 70, to: 30, glide: 0.45, vol: 0.5, a: 0.003, dur: 0.55, pan: p * 0.5 });
          noise(t + 0.02, { color: 'brown', vol: 0.3, a: 0.01, dur: 0.7, pan: p, wet: 0.2, filter: { type: 'lowpass', f: 900, to: 150, sweep: 0.6 } });
        }
      },
      block(t, o) { // a blow glances off Ward
        const p = o.pan == null ? -0.3 : o.pan, v = rnd(0.94, 1.06);
        tone(t, { type: 'triangle', f: 420 * v, to: 300 * v, glide: 0.06, vol: 0.3, a: 0.001, dur: 0.09, pan: p });
        noise(t, { vol: 0.22, a: 0.001, dur: 0.05, pan: p, filter: { type: 'bandpass', f: 1500, q: 2.5 } });
        tone(t + 0.005, { f: 1240 * v, vol: 0.06, a: 0.002, dur: 0.35, pan: p, wet: 0.2 });
        tone(t + 0.005, { f: 1873 * v, vol: 0.035, a: 0.002, dur: 0.25, pan: p, wet: 0.2 });
      },
      ward(t, o) { // bracing: gaining Ward
        const p = o.pan == null ? -0.3 : o.pan;
        noise(t, { color: 'pink', vol: 0.16, a: 0.05, dur: 0.22, pan: p, filter: { type: 'lowpass', f: 300, to: 1200, sweep: 0.12 } });
        tone(t + 0.04, { type: 'triangle', f: midi(62), to: midi(69), glide: 0.12, vol: 0.07, a: 0.01, dur: 0.3, pan: p, wet: 0.2 });
        tone(t + 0.1, { f: midi(81), vol: 0.03, a: 0.005, dur: 0.4, pan: p, wet: 0.3 });
      },
      crack(t, o) { // Ward shattered: a Strand or a Crest strips it
        const p = o.pan == null ? 0.3 : o.pan;
        noise(t, { vol: 0.4, a: 0.001, dur: 0.06, pan: p, filter: { type: 'highpass', f: 1200 } });
        tone(t, { type: 'triangle', f: 240, to: 120, glide: 0.08, vol: 0.2, a: 0.001, dur: 0.12, pan: p });
        for (let i = 0; i < 6; i++) tone(t + 0.02 + rnd(0, 0.25), { f: rnd(2600, 5200), vol: rnd(0.02, 0.05), a: 0.001, dur: rnd(0.04, 0.1), pan: p + rnd(-0.3, 0.3), wet: 0.2 });
      },
      buff(t, o) {
        const p = o.pan || 0;
        tone(t, { f: midi(81), vol: 0.07, a: 0.005, dur: 0.5, wet: 0.3, pan: p });
        tone(t + 0.08, { f: midi(88), vol: 0.06, a: 0.005, dur: 0.7, wet: 0.35, pan: p });
        shimmer(t, 0.025, 0.5, { pan: p });
      },
      debuff(t, o) {
        const p = o.pan || 0;
        tone(t, { type: 'triangle', f: 520, to: 300, glide: 0.35, vol: 0.07, a: 0.01, dur: 0.4, vib: [7, 30], pan: p });
        tone(t, { type: 'triangle', f: 535, to: 290, glide: 0.35, vol: 0.05, a: 0.01, dur: 0.4, pan: p });
        bubbles(t + 0.1, 3, 0.25, { pan: p, vol: 0.04, lo: 250, hi: 500 });
      },
      brine(t, o) { // Brine eats at a creature: a fizz
        const p = o.pan == null ? 0.3 : o.pan;
        clicks(t, 18, 0.45, { vol: 0.05, lo: 4000, hi: 8000, pan: p });
        noise(t, { vol: 0.04, a: 0.05, dur: 0.45, pan: p, filter: { type: 'highpass', f: 5000 } });
        bubbles(t + 0.05, 2, 0.3, { pan: p, vol: 0.05, lo: 200, hi: 320 });
      },
      kill(t, o) { // the blow that finishes a creature: a crunch, a heavy punch, and the stroke rings like struck bronze
        const p = o.pan == null ? 0.3 : o.pan, v = rnd(0.95, 1.05);
        noise(t, { vol: 0.5, a: 0.0005, dur: 0.015, pan: p, filter: { type: 'highpass', f: 2000 } });
        clicks(t + 0.003, 8, 0.05, { vol: 0.14, lo: 900, hi: 3200, long: 0.02, pan: p }); // the shell breaking
        tone(t, { f: 200 * v, path: [[70 * v, 0.04], [36, 0.3]], drive: 2.5, vol: 0.55, a: 0.001, dur: 0.35, pan: p, filter: { type: 'lowpass', f: 1800, to: 200, sweep: 0.25 } });
        noise(t + 0.004, { color: 'pink', vol: 0.4, a: 0.002, dur: 0.2, pan: p, wet: 0.2, filter: { type: 'lowpass', q: 5, f: 3000, path: [[400, 0.15]] } });
        bell(t + 0.005, midi(62), { vol: 0.16, dur: 1.8, bright: 0.8, strike: 0.4, pan: p * 0.6, wet: 0.45 }); // D, the fights' key
        noise(t + 0.02, { vol: 0.12, a: 0.01, dur: 0.4, pan: p, panTo: p * 0.3, wet: 0.3, filter: { type: 'bandpass', f: 3500, q: 1, to: 600, sweep: 0.35 } }); // the air rushing after it
      },
      die(t, o) { // it slumps into the water, the water closes over it with a glug, and bubbles trail up from deeper and deeper
        const p = o.pan == null ? 0.3 : o.pan, v = rnd(0.9, 1.1);
        noise(t + 0.06, { color: 'pink', vol: 0.3, a: 0.01, dur: 0.35, pan: p, wet: 0.25, filter: { type: 'bandpass', f: 2000, q: 0.8, to: 350, sweep: 0.3 } }); // the slump
        noise(t + 0.06, { color: 'pink', vol: 0.35, a: 0.01, dur: 0.4, pan: p, wet: 0.2, filter: { type: 'lowpass', q: 7, f: 1100 * v, path: [[160 * v, 0.35]] } }); // the bloomp
        tone(t + 0.2, { f: 95 * v, to: 200 * v, glide: 0.12, vol: 0.28, a: 0.004, dur: 0.2, pan: p, wet: 0.2 }); // the water closing: one big bubble
        [0.42, 0.6, 0.74, 0.85].forEach((d, i) => { // glugs, quicker and higher as the air runs out
          const f = (150 + i * 30) * rnd(0.9, 1.1) * v;
          tone(t + d, { f, to: f * 1.7, glide: 0.05, vol: 0.16 * (1 - i * 0.18), a: 0.003, dur: 0.1, pan: p, wet: 0.25 });
        });
        noise(t + 0.15, { color: 'brown', vol: 0.3, a: 0.15, dur: 1.4, pan: p, panTo: p * 0.4, wet: 0.35, filter: { type: 'lowpass', f: 900, to: 110, sweep: 1.3 } }); // the swirl
        tone(t + 0.3, { type: 'sawtooth', f: 55 * v, to: 34, glide: 1.1, vol: 0.05, a: 0.2, dur: 1.2, pan: p, wet: 0.3, filter: { type: 'lowpass', f: 260 } }); // its last breath going down
        const deep = through(t, { type: 'lowpass', f: 5000, to: 700, sweep: 1.8 }, { pan: p, wet: 0.35 });
        bubbles(t + 0.5, 10, 1.3, { vol: 0.05, lo: 400, hi: 1100, into: deep });
      },
      echo(t, o) { // a creature's move happens again
        const p = o.pan == null ? 0.3 : o.pan;
        for (let k = 0; k < 4; k++) bell(t + k * 0.22, midi(76), { kind: 'hand', vol: 0.12 * Math.pow(0.5, k), dur: 1.2, bright: 0.5, pan: p + (k % 2 ? 0.25 : -0.25), wet: 0.45 });
      },
      danger(t) { // Wren's HP runs low: her heartbeat
        [0, 0.2, 0.8, 1.0].forEach((d, i) => {
          tone(t + d, { f: i % 2 ? 52 : 62, to: 38, glide: 0.1, vol: i % 2 ? 0.35 : 0.45, a: 0.004, dur: 0.16 });
          noise(t + d, { color: 'brown', vol: 0.12, a: 0.003, dur: 0.08, filter: { type: 'lowpass', f: 160 } });
        });
      },

      /* bells */
      turn(t) { // Your Turn: Wren rings her hand-bell
        bell(t, midi(81), { kind: 'hand', vol: 0.16, dur: 1.8, bright: 0.8, pan: -0.15, wet: 0.3 });
      },
      bell(t) { // the great bell far below: a run starts, a pin appears, the opening pictures
        bell(t, midi(57), { vol: 0.45, dur: 5.5, wet: 0.55, strike: 0.15 });
      },
      phase(t) { // a pin's second phase: the bell cracks
        bell(t, midi(50), { vol: 0.5, dur: 6, wet: 0.5, strike: 0.5 });
        noise(t, { vol: 0.45, a: 0.001, dur: 0.12, filter: { type: 'highpass', f: 900 } });
        for (let i = 0; i < 8; i++) tone(t + rnd(0.01, 0.3), { f: rnd(3000, 7000), vol: rnd(0.015, 0.04), a: 0.001, dur: rnd(0.05, 0.2), pan: rnd(-0.6, 0.6), wet: 0.3 });
        noise(t + 0.05, { color: 'brown', vol: 0.4, a: 0.3, h: 0.5, dur: 3, wet: 0.3, filter: { type: 'lowpass', f: 140 } });
        tone(t, { f: 70, to: 30, glide: 2, vol: 0.35, a: 0.05, dur: 2.5 });
      },
      chain(t, o) { // a Crest or Strand chain: a hand-bell, higher each link
        const m = [76, 81, 84, 88, 93][clamp(o.n || 2, 1, 5) - 1];
        bell(t, midi(m), { kind: 'hand', vol: 0.13, dur: 1.4, wet: 0.35 });
      },
      fury(t, o) { // Tidal Fury rings up the scale, High and Dry (down) rings down it; then a glint of Pearls
        const notes = o.down ? [93, 88, 84, 81, 76, 72] : [69, 72, 76, 81, 84, 88];
        notes.forEach((m, i) => bell(t + i * 0.075, midi(m), { kind: 'hand', vol: 0.1, dur: 1.2, wet: 0.35, pan: (i - 2.5) * 0.12 * (o.down ? -1 : 1) }));
        S.pearl(t + 0.5, {});
      },
      shopbell(t) { // the bell over Barnaby's door
        [0, 0.09, 0.2, 0.33, 0.5].forEach((d, i) => bell(t + d, midi(i % 2 ? 91 : 88), { kind: 'hand', vol: 0.07 * (1 - i * 0.15), dur: 0.9, wet: 0.25 }));
      },

      /* the Lantern's light */
      lightgain(t) {
        noise(t, { color: 'pink', vol: 0.18, a: 0.12, dur: 0.45, pan: -0.2, filter: { type: 'lowpass', f: 250, to: 2200, sweep: 0.25 } });
        tone(t + 0.06, { f: midi(76), vol: 0.06, a: 0.02, dur: 0.6, wet: 0.35, pan: -0.2 });
        tone(t + 0.14, { f: midi(81), vol: 0.06, a: 0.02, dur: 0.9, wet: 0.4, pan: -0.2 });
        shimmer(t + 0.1, 0.025, 0.6, { pan: -0.2 });
      },
      douse(t) { // the lantern doused: water on a flame
        noise(t, { vol: 0.32, a: 0.005, dur: 1.0, pan: -0.2, wet: 0.15, filter: { type: 'bandpass', f: 6000, q: 0.6, to: 1400, sweep: 0.9 } });
        clicks(t, 14, 0.7, { vol: 0.06, pan: -0.2 });
        tone(t, { type: 'triangle', f: 660, to: 180, glide: 0.7, vol: 0.05, a: 0.01, dur: 0.8, pan: -0.2 });
      },
      heartfire(t) { // the Lantern Heart breaks free and burns beside her
        [45, 52, 57, 61, 64].forEach((m, i) => tone(t + i * 0.04, {
          type: 'sawtooth', f: midi(m), vol: 0.05, a: 0.8, h: 0.4, dur: 3.2, detune: rnd(-8, 8), wet: 0.4,
          filter: { type: 'lowpass', f: 300, to: 2400, sweep: 1.2 },
        }));
        bell(t + 0.3, midi(81), { kind: 'hand', vol: 0.12, dur: 2.5, wet: 0.5 });
        noise(t, { color: 'pink', vol: 0.18, a: 0.6, dur: 2.2, wet: 0.3, filter: { type: 'lowpass', f: 400, to: 1500, sweep: 1 } });
        shimmer(t + 0.5, 0.03, 2, {});
      },

      /* water and the Swell */
      tide(t) { // the Swell rises a step
        noise(t, { color: 'pink', vol: 0.2, a: 0.25, dur: 0.75, pan: rnd(-0.2, 0.2), wet: 0.2, filter: { type: 'bandpass', f: 350, q: 0.8, path: [[1100, 0.25], [450, 0.7]] } });
        tone(t, { f: 70, vol: 0.06, a: 0.25, dur: 0.7 });
      },
      crest(t, o) { // the wave breaks over the creatures
        const n = clamp(o.n || 1, 1, 4), s = 1 + (n - 1) * 0.15;
        noise(t, { color: 'brown', vol: 0.35 * s, a: 0.3, dur: 0.5, filter: { type: 'lowpass', f: 250, to: 2000, sweep: 0.3 } });
        noise(t + 0.28, { vol: 0.4 * s, a: 0.01, h: 0.05, dur: 1.4 + n * 0.2, wet: 0.3, filter: { type: 'bandpass', f: 1800, q: 0.5, to: 500, sweep: 1.2 } });
        [-0.5, 0.5].forEach((p) => noise(t + 0.32 + rnd(0, 0.05), { vol: 0.08 * s, a: 0.1, dur: 1.8 + n * 0.2, pan: p, wet: 0.3, filter: { type: 'highpass', f: 4000 } }));
        tone(t + 0.28, { f: 65, to: 32, glide: 0.6, vol: 0.4 * s, a: 0.005, dur: 0.7 });
      },
      low(t) { // a Strand: the water runs off over the stones
        noise(t, { color: 'brown', vol: 0.4, a: 0.05, dur: 1.1, wet: 0.2, filter: { type: 'lowpass', f: 1500, to: 140, sweep: 1.0 } });
        clicks(t + 0.1, 16, 0.8, { vol: 0.05 });
        gurgle(t + 0.2, 5, 0.6, { vol: 0.05, lo: 500, hi: 700 });
      },
      submerge(t, o) { // a creature dives out of reach: a slap of its tail, a bloop, and then everything is muffled under the surface
        const p = o.pan == null ? 0.3 : o.pan, v = rnd(0.9, 1.1);
        noise(t, { color: 'pink', vol: 0.3, a: 0.003, dur: 0.16, pan: p, filter: { type: 'bandpass', f: 2800, q: 0.8, to: 700, sweep: 0.14 } }); // the tail slap
        drops(t + 0.04, 6, 0.25, { vol: 0.03, pan: p, wet: 0.2 });
        tone(t + 0.05, { f: 260 * v, to: 900 * v, glide: 0.06, vol: 0.18, a: 0.002, dur: 0.1, pan: p, wet: 0.2 }); // the bloop
        noise(t + 0.08, { color: 'pink', vol: 0.4, a: 0.04, dur: 0.9, pan: p, panTo: p * 1.6, wet: 0.3, filter: { type: 'lowpass', q: 4, f: 1600, path: [[260, 0.5], [180, 0.85]] } }); // going under
        tone(t + 0.08, { f: 70 * v, to: 42, glide: 0.6, vol: 0.2, a: 0.03, dur: 0.7, pan: p }); // the whump of the water it moves
        const under = through(t, { type: 'lowpass', f: 900, to: 450, sweep: 1.2 }, { pan: p, wet: 0.4 });
        bubbles(t + 0.3, 7, 0.9, { vol: 0.06, lo: 250, hi: 600, rise: true, into: under });
      },
      bail(t) { // the Bailer scoops water and throws it over the side
        noise(t, { color: 'pink', vol: 0.18, a: 0.01, dur: 0.12, filter: { type: 'bandpass', f: 700, q: 1.5 } });
        noise(t + 0.12, { color: 'pink', vol: 0.2, a: 0.08, h: 0.2, dur: 0.75, am: [16, 0.5], pan: 0.3, wet: 0.15, filter: { type: 'bandpass', f: 1400, q: 0.7, to: 900, sweep: 0.6 } });
        splash(t + 0.55, 0.1, 0.4, { pan: 0.5, wet: 0.2 });
      },
      stir(t) { // the Bailer stirs the water up
        noise(t, { color: 'pink', vol: 0.22, a: 0.2, h: 0.2, dur: 0.9, pan: -0.4, panTo: 0.4, wet: 0.2, filter: { type: 'bandpass', f: 600, q: 1.2, path: [[1400, 0.25], [700, 0.5], [1300, 0.75]] } });
        tone(t, { f: 90, to: 120, glide: 0.8, vol: 0.06, a: 0.2, dur: 0.9 });
      },

      /* pearls and things */
      coin(t) { // Pearls click together
        const n = 3 + Math.floor(rnd(0, 2));
        let at = t;
        for (let i = 0; i < n; i++) {
          const f = rnd(3000, 3600);
          tone(at, { f, vol: 0.04, a: 0.0005, dur: 0.06, ui: true });
          tone(at, { f: f * 1.48, vol: 0.02, a: 0.0005, dur: 0.05, ui: true });
          noise(at, { vol: 0.05, a: 0.0005, dur: 0.01, ui: true, filter: { type: 'bandpass', f: 5000, q: 2 } });
          at += rnd(0.04, 0.09);
        }
      },
      pearl(t) { // a Pearl found in a fight
        tone(t, { f: midi(100), vol: 0.04, a: 0.002, dur: 0.2, wet: 0.3 });
        tone(t + 0.06, { f: midi(105), vol: 0.03, a: 0.002, dur: 0.3, wet: 0.3 });
        shimmer(t, 0.02, 0.3, { wet: 0.3 });
      },
      tonic(t) { // a cork, three glugs, and it takes hold
        tone(t, { f: 700, to: 300, glide: 0.04, vol: 0.18, a: 0.001, dur: 0.06 });
        noise(t, { vol: 0.15, a: 0.001, dur: 0.03, filter: { type: 'bandpass', f: 1800, q: 2 } });
        for (let i = 0; i < 3; i++) tone(t + 0.15 + i * 0.13, { f: rnd(220, 280), to: rnd(420, 520), glide: 0.05, vol: 0.12, a: 0.004, dur: 0.09, filter: { type: 'lowpass', f: 900 } });
        tone(t + 0.6, { f: midi(81), to: midi(88), glide: 0.25, vol: 0.04, a: 0.03, dur: 0.6, wet: 0.4 });
      },
      keepsake(t) { // a keepsake taken: a hasp, a warm bell, a glow
        noise(t, { vol: 0.12, a: 0.001, dur: 0.02, ui: true, filter: { type: 'bandpass', f: 2200, q: 3 } });
        tone(t + 0.03, { type: 'triangle', f: 900, to: 700, glide: 0.03, vol: 0.05, a: 0.001, dur: 0.05, ui: true });
        bell(t + 0.05, midi(76), { kind: 'hand', vol: 0.1, dur: 2, ui: true });
        shimmer(t + 0.08, 0.025, 0.9, { ui: true });
      },
      treasure(t) { // a sea chest forced open
        creak(t, 0.6, { vol: 0.1, wet: 0.2 });
        noise(t + 0.6, { vol: 0.15, a: 0.001, dur: 0.03, filter: { type: 'bandpass', f: 1500, q: 2 } });
        tone(t + 0.6, { f: 180, to: 110, glide: 0.06, vol: 0.2, a: 0.001, dur: 0.1 });
        shimmer(t + 0.65, 0.03, 0.9, { wet: 0.3 });
        bell(t + 0.7, midi(81), { kind: 'hand', vol: 0.07, dur: 1.5, wet: 0.4 });
      },
      step(t) { // choosing a landing: two steps on wet stone
        [0, 0.3].forEach((d, i) => {
          const p = i ? 0.1 : -0.1;
          noise(t + d, { color: 'brown', vol: 0.3, a: 0.004, dur: 0.09, pan: p, filter: { type: 'lowpass', f: 700 } });
          noise(t + d + 0.01, { vol: 0.05, a: 0.004, dur: 0.12, pan: p, wet: 0.1, filter: { type: 'bandpass', f: rnd(2000, 3000), q: 1 } });
        });
      },
      unlock(t) { // an achievement: a small peal
        [81, 84, 88, 93].forEach((m, i) => bell(t + i * 0.11, midi(m), { kind: 'hand', vol: 0.09, dur: 1.6, ui: true }));
        shimmer(t + 0.2, 0.03, 1, { ui: true });
      },
      victory(t) { // a fight won: open fifths on the hand-bell, then the water settles
        [69, 76, 81].forEach((m, i) => bell(t + i * 0.14, midi(m), { kind: 'hand', vol: 0.12, dur: 1.8, wet: 0.35 }));
        noise(t + 0.4, { color: 'pink', vol: 0.12, a: 0.3, dur: 1.1, wet: 0.2, filter: { type: 'bandpass', f: 400, q: 0.8, path: [[900, 0.35], [350, 1]] } });
      },
      defeat(t) { // the cold water closes over the lantern
        [76, 72, 69, 64].forEach((m, i) => bell(t + i * 0.32, midi(m), { kind: 'hand', vol: 0.1, dur: 2, wet: 0.4, bright: 0.6 }));
        noise(t + 0.6, { color: 'brown', vol: 0.35, a: 0.8, dur: 2.4, wet: 0.4, filter: { type: 'lowpass', f: 2500, to: 150, sweep: 2.2 } });
        bubbles(t + 1.2, 8, 1.5, { vol: 0.04, lo: 250, hi: 700, rise: true, wet: 0.4 });
      },

      /* the places: one-off sounds the ambience plays now and then */
      gull(t, o) {
        const p = o.pan == null ? rnd(-0.8, 0.8) : o.pan, base = 1050 * rnd(0.9, 1.15), calls = 2 + Math.floor(rnd(0, 3));
        let at = t;
        for (let i = 0; i < calls; i++) {
          const last = i === calls - 1, d = last ? 0.45 : 0.28, f = base * (last ? 0.95 : 1);
          [[2200, 0.05], [3400, 0.025]].forEach(([bp, v]) => tone(at, {
            type: 'sawtooth', f: f * 0.8, path: [[f * 1.25, 0.05], [f * 0.7, d]], vol: v * (last ? 1.1 : 1), a: 0.02, dur: d,
            vib: [28, 40], filter: { type: 'bandpass', f: bp, q: 1.2 }, pan: p, wet: 0.45,
          }));
          at += d + rnd(0.05, 0.12);
        }
      },
      lap(t, o) { // small waves against stone
        const p = o.pan == null ? rnd(-0.6, 0.6) : o.pan;
        noise(t, { color: 'pink', vol: 0.12, a: 0.15, dur: 0.55, pan: p, wet: 0.2, filter: { type: 'bandpass', f: 500, q: 0.8, path: [[900, 0.15], [400, 0.5]] } });
        noise(t + 0.45, { color: 'pink', vol: 0.07, a: 0.12, dur: 0.45, pan: p + 0.1, wet: 0.2, filter: { type: 'bandpass', f: 600, q: 0.8, path: [[1000, 0.12], [450, 0.4]] } });
      },
      creak(t, o) { creak(t, rnd(0.5, 0.9), { vol: 0.06, pan: o.pan == null ? rnd(-0.7, 0.7) : o.pan, wet: 0.3 }); },
      buoy(t, o) { // a bell buoy far out, rocking
        const p = o.pan == null ? rnd(-0.7, 0.7) : o.pan, m = Math.random() < 0.5 ? 67 : 69;
        bell(t, midi(m), { vol: 0.05, dur: 3, bright: 0.5, wet: 0.8, pan: p, strike: 0.05 });
        if (Math.random() < 0.5) bell(t + rnd(1.2, 1.6), midi(m), { vol: 0.035, dur: 3, bright: 0.5, wet: 0.8, pan: p, strike: 0.05 });
      },
      drip(t, o) { // water dripping in a cave
        const n = Math.random() < 0.35 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const f = rnd(700, 1200);
          tone(t + i * rnd(0.3, 0.6), { f, to: f * rnd(1.8, 2.6), glide: 0.035, vol: 0.06, a: 0.001, dur: 0.12, pan: o.pan == null ? rnd(-0.8, 0.8) : o.pan, wet: 0.7 });
        }
      },
      farbell(t, o) { // the Bellwether, far below
        bell(t, midi(45), { vol: 0.1, dur: 5, bright: 0.3, wet: 0.8, pan: o.pan == null ? rnd(-0.3, 0.3) : o.pan, strike: 0.02 });
      },
      groan(t, o) { // something large shifts in the dark
        const p = o.pan == null ? rnd(-0.5, 0.5) : o.pan;
        tone(t, { type: 'sawtooth', f: 48, path: [[60, 1.2], [42, 2.6]], vol: 0.07, a: 0.8, dur: 2.8, vib: [0.8, 25], wet: 0.5, pan: p, filter: { type: 'lowpass', f: 260 } });
        noise(t, { color: 'brown', vol: 0.1, a: 1, dur: 2.8, pan: p, wet: 0.3, filter: { type: 'lowpass', f: 160 } });
      },
      bubbles(t, o) { bubbles(t, 8, 1.2, { rise: true, vol: 0.04, lo: 400, hi: 1100, wet: 0.4, pan: o.pan == null ? rnd(-0.6, 0.6) : o.pan }); },
      moan(t, o) { // a long call from something far off in the water
        const p = o.pan == null ? rnd(-0.6, 0.6) : o.pan;
        tone(t, { type: 'triangle', f: 160, path: [[240, 1.2], [150, 2.6], [110, 3.4]], vol: 0.06, a: 0.6, dur: 3.6, vib: [4, 18], wet: 0.8, pan: p, filter: { type: 'lowpass', f: 900 } });
        tone(t + 0.1, { type: 'triangle', f: 480, path: [[720, 1.2], [450, 2.6], [330, 3.4]], vol: 0.015, a: 0.6, dur: 3.4, vib: [4, 18], wet: 0.8, pan: p, filter: { type: 'lowpass', f: 1400 } });
      },
      hum(t) { // the drowned bell's hum, under everything
        tone(t, { f: 110, vol: 0.07, a: 1.5, h: 1, dur: 5, wet: 0.5 });
        tone(t, { f: 111.2, vol: 0.05, a: 1.5, h: 1, dur: 5, wet: 0.5 });
        tone(t + 0.4, { f: 130.8, vol: 0.02, a: 1.5, h: 0.6, dur: 4.4, wet: 0.5 });
      },
    };

    // ---------------------------------------------------------------- ambience
    const AMBIENCE = {
      shallows: [['gull', 3], ['lap', 3], ['creak', 2], ['buoy', 1]],
      dark: [['drip', 4], ['lap', 1], ['groan', 1], ['farbell', 1]],
      belfry: [['bubbles', 3], ['drip', 1], ['moan', 1], ['hum', 1]],
    };
    let ambTimer = null, ambBand = null;
    function ambience(band, density) {
      clearTimeout(ambTimer);
      ambBand = AMBIENCE[band] ? band : null;
      if (!ambBand) return;
      const list = AMBIENCE[band], total = list.reduce((s, [, w]) => s + w, 0), d = density || 1;
      const next = () => {
        if (ambBand !== band) return;
        let r = Math.random() * total;
        const hit = list.find(([, w]) => (r -= w) < 0) || list[0];
        play(hit[0]);
        ambTimer = setTimeout(next, (rnd(4, 11) * 1000) / d);
      };
      ambTimer = setTimeout(next, (rnd(1, 3) * 1000) / d);
    }

    function setDepth(d) {
      const D = DEPTHS[clamp(d | 0, 0, 2)], t = ctx.currentTime;
      world.frequency.setTargetAtTime(D.lp, t, 0.4);
      wet.gain.setTargetAtTime(D.wet, t, 0.4);
      verb.buffer = impulse(clamp(d | 0, 0, 2));
    }

    // opts may be a number (n) or a boolean (down), as ui.js passes them today
    function play(name, opts) {
      const fn = S[name];
      if (!fn) return false;
      if (typeof opts === 'number') opts = { n: opts };
      else if (typeof opts === 'boolean') opts = { down: opts };
      else opts = opts || {};
      if (ctx.state === 'suspended' && ctx.resume && !ctx.startRendering) ctx.resume().catch(() => {}); // an offline context can't resume
      trim = Math.pow(10, (LEVEL[name] || 0) / 20) * (opts.vol == null ? 1 : opts.vol);
      try { fn(ctx.currentTime + 0.01 + (opts.delay || 0), opts); } finally { trim = 1; }
      return true;
    }

    return { play, setDepth, ambience, names: Object.keys(S), output: master };
  }

  // What each sound is for and when the game would play it. `now` names the sound ui.js plays there today.
  const CATALOG = [
    { group: 'Cards', items: [
      { name: 'draw', opts: { n: 3 }, label: 'Draw (3)', now: 'draw', when: 'Each card rasps off the deck and snaps down; n is how many.' },
      { name: 'card', opts: { type: 'attack' }, label: 'Play an Attack', now: 'card', when: 'A card is played: a whoosh for an Attack.' },
      { name: 'card', opts: { type: 'skill' }, label: 'Play a Skill', now: 'card', when: 'A softer swish for a Skill.' },
      { name: 'card', opts: { type: 'rite' }, label: 'Play a Rite', now: 'card', when: 'A low hum and three glints for a Rite.' },
      { name: 'card', opts: { type: 'status' }, label: 'Play a Status or Curse', now: 'card', when: 'Weed and seawater slopped onto the pile: a slap, a squelch, bubbles and drips.' },
      { name: 'select', label: 'Select', now: 'select', when: 'Picking a card, a target, a menu item.' },
      { name: 'page', label: 'Turn a page', now: 'select', when: 'The next picture of the opening, a page of Story so far: a crinkle, a sweep across, a flap.' },
    ] },
    { group: 'Blows', items: [
      { name: 'hit', opts: { n: 6 }, label: 'Hit (6)', now: 'hit', when: 'Wren\'s blow lands: a snap, a gritty punch, a wet smack, spray. n is the damage.' },
      { name: 'hit', opts: { n: 18 }, label: 'Hit (18)', now: 'hit', when: '15 or more adds a shell giving way, a deep boom and the water heaving back.' },
      { name: 'hurt', opts: { n: 6 }, label: 'Hurt (6)', now: 'hurt', when: 'A blow lands on Wren.' },
      { name: 'hurt', opts: { n: 18 }, label: 'Hurt (18)', now: 'hurt', when: 'A heavy blow lands on Wren.' },
      { name: 'block', label: 'Blocked', now: 'block', when: 'A blow glances off Ward.' },
      { name: 'ward', label: 'Gain Ward', now: 'ward', when: 'Bracing.' },
      { name: 'crack', label: 'Ward cracks', now: 'strand', when: 'A Strand or Crest strips a creature\'s Ward.' },
      { name: 'buff', label: 'Buff', now: 'buff', when: 'Might, Spines and the like.' },
      { name: 'debuff', label: 'Debuff', now: 'debuff', when: 'Soaked, Chilled, Breathless.' },
      { name: 'brine', label: 'Brine', when: 'New: Brine eats at a creature at the start of its turn.' },
      { name: 'kill', label: 'Killing blow', now: 'kill', when: 'A crunch, a heavy punch, and a ring of bronze in D. Played with Sinks.' },
      { name: 'die', label: 'Sinks', now: 'die', when: 'A creature slumps into the water, it closes with a glug, bubbles trail up from deeper.' },
      { name: 'echo', label: 'Echo', now: 'echo', when: 'A creature\'s move happens again.' },
      { name: 'danger', label: 'Low HP', now: 'danger', when: 'Wren\'s heartbeat when her HP runs low.' },
    ] },
    { group: 'Bells', items: [
      { name: 'turn', label: 'Your Turn', now: 'turn', when: 'Wren rings her hand-bell.' },
      { name: 'bell', label: 'The great bell', now: 'bell', when: 'A descent starts, a pin appears, the opening\'s first picture.' },
      { name: 'phase', label: 'The bell cracks', now: 'phase', when: 'A pin\'s second phase.' },
      { name: 'chain', opts: { n: 2 }, label: 'Chain x2', now: 'chain', when: 'A Crest or Strand chain: higher each link.' },
      { name: 'chain', opts: { n: 4 }, label: 'Chain x4', now: 'chain', when: '' },
      { name: 'fury', label: 'Tidal Fury', now: 'fury', when: 'Bells ring up the scale.' },
      { name: 'fury', opts: { down: true }, label: 'High and Dry', now: 'fury', oldOpts: true, when: 'Bells ring down it.' },
      { name: 'shopbell', label: 'Barnaby\'s door', when: 'New: walking into Barnaby\'s.' },
    ] },
    { group: 'Light', items: [
      { name: 'lightgain', label: 'Gain Light', now: 'lightgain', when: 'The flame catches.' },
      { name: 'douse', label: 'Doused', now: 'debuff', when: 'Water on the lantern\'s flame.' },
      { name: 'heartfire', label: 'Heartfire', when: 'New: the Lantern Heart breaks free and burns beside Wren.' },
    ] },
    { group: 'Water and the Swell', items: [
      { name: 'tide', label: 'Swell rises', now: 'tide', when: 'The Swell goes up a step.' },
      { name: 'crest', opts: { n: 1 }, label: 'Crest', now: 'crest', when: 'The wave breaks over the creatures.' },
      { name: 'crest', opts: { n: 3 }, label: 'Crest x3', now: 'crest', when: 'Bigger with each link of a chain.' },
      { name: 'low', label: 'Strand', now: 'low', when: 'The water runs off over the stones.' },
      { name: 'submerge', label: 'Submerged', now: 'tide', when: 'A creature dives out of reach: a tail slap, a bloop, then muffled under the surface.' },
      { name: 'bail', label: 'Bail', now: 'card', when: 'The Bailer throws water over the side.' },
      { name: 'stir', label: 'Stir', now: 'card', when: 'The Bailer stirs the water up.' },
    ] },
    { group: 'Pearls and things', items: [
      { name: 'coin', label: 'Pearls', now: 'coin', when: 'Buying, selling, Pearls on the reward screen.' },
      { name: 'pearl', label: 'A Pearl', now: 'pearl', when: 'A Pearl found in a fight.' },
      { name: 'tonic', label: 'Drink a tonic', now: 'tonic', when: 'A cork, three glugs.' },
      { name: 'keepsake', label: 'Take a keepsake', now: 'coin', when: 'A hasp, a warm bell, a glow.' },
      { name: 'treasure', label: 'Open a chest', now: 'coin', when: 'A creak, a latch, a glint.' },
      { name: 'step', label: 'Choose a landing', now: 'select', when: 'Two steps on wet stone.' },
      { name: 'unlock', label: 'Achievement', now: 'buff', when: 'A small peal.' },
      { name: 'victory', label: 'Fight won', now: 'victory', when: 'Open fifths on the hand-bell.' },
      { name: 'defeat', label: 'The tide takes you', now: 'defeat', when: 'Falling bells, and the water closes over.' },
    ] },
    { group: 'The Shallows', ambience: 'shallows', items: [
      { name: 'gull', label: 'Gulls' }, { name: 'lap', label: 'Waves on stone' }, { name: 'creak', label: 'A rope creaks' }, { name: 'buoy', label: 'A bell buoy' },
    ] },
    { group: 'Dark Water', ambience: 'dark', items: [
      { name: 'drip', label: 'Drip' }, { name: 'groan', label: 'Something shifts' }, { name: 'farbell', label: 'The bell, far below' },
    ] },
    { group: 'The Belfry', ambience: 'belfry', items: [
      { name: 'bubbles', label: 'Bubbles' }, { name: 'moan', label: 'A far call' }, { name: 'hum', label: 'The bell\'s hum' },
    ] },
  ];

  BL.SFX = { create, CATALOG, DEPTHS };
})();
