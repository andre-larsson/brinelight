/* Brinelight — teaching: the guided first fight, and short first-time hints in real runs.
   Both use one "coachmark": a small bubble that points at the real UI element.
   ui.js creates it with BL.Teach(api) and calls its hooks. */
(function () {
  'use strict';
  const BL = (globalThis.BL = globalThis.BL || {});

  BL.Teach = function (api) {
    const { E, $ } = api;
    const KEY_TUTORIAL = 'brinelight.tutorial.v1'; // 'done' | 'skipped'
    const KEY_HINTS = 'brinelight.hints.v1'; // JSON list of hint ids already shown

    const store = {
      get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
      set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
    };
    let seenHints = [];
    try { seenHints = JSON.parse(store.get(KEY_HINTS) || '[]') || []; } catch (e) { seenHints = []; }

    /* ---------------- the coachmark ---------------- */
    const app = $('#app');
    const ring = document.createElement('div');
    ring.className = 'cm-ring';
    ring.hidden = true;
    const box = document.createElement('div');
    box.className = 'coachmark';
    box.setAttribute('role', 'dialog');
    box.hidden = true;
    box.innerHTML = '<div class="cm-arrow"></div><div class="cm-body"></div>';
    app.appendChild(ring);
    app.appendChild(box);
    let shown = null; // { kind: 'tutorial' | 'hint', id, html, anchor() }
    let raf = null;

    const tap = () => (api.ui.lastPointer === 'mouse' ? 'Click' : 'Tap');
    const tapLow = () => tap().toLowerCase();
    const kbd = (s) => (api.ui.lastPointer === 'keyboard' ? `<span class="cm-keys">${s}</span>` : '');

    function anchorEl(a) {
      if (!a) return null;
      const sel = typeof a === 'function' ? a() : a;
      if (!sel) return null;
      const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return r.width || r.height ? el : null;
    }

    function place() {
      raf = null;
      if (!shown) return;
      const run = api.getRun();
      const busy = api.ui.busy || !api.overlayHidden() || (run && run.combat && run.combat.phase !== 'player');
      const hideWhileBusy = shown.kind === 'tutorial' || (run && run.screen === 'combat');
      if (busy && hideWhileBusy) { box.hidden = true; ring.hidden = true; loop(); return; }
      const html = typeof shown.html === 'function' ? shown.html() : shown.html;
      const body = box.querySelector('.cm-body');
      if (body._html !== html) {
        body.innerHTML = html;
        body._html = html;
        const btn = body.querySelector('[data-act="tutnext"], [data-act="hintok"]');
        if (btn && api.ui.lastPointer !== 'touch') setTimeout(() => btn.focus({ preventScroll: true }), 30);
      }
      const el = anchorEl(shown.anchor);
      // a hint belongs to the screen it was shown on
      if (shown.kind === 'hint' && (!el || !run || run.screen !== shown.screen)) { closeHint(); return; }
      box.hidden = false;
      const vw = innerWidth, vh = innerHeight;
      const w = Math.min(360, vw - 16);
      box.style.width = w + 'px';
      const h = box.offsetHeight;
      let left, top, arrowX = null, side = null;
      if (el) {
        const r = el.getBoundingClientRect();
        const pad = 6;
        ring.hidden = false;
        ring.style.left = (r.left - pad) + 'px';
        ring.style.top = (r.top - pad) + 'px';
        ring.style.width = (r.width + pad * 2) + 'px';
        ring.style.height = (r.height + pad * 2) + 'px';
        const cx = r.left + r.width / 2;
        const prefer = shown.side || (r.top + r.height / 2 > vh * 0.55 ? 'above' : 'below');
        const above = r.top - pad - 14 - h;
        const below = r.bottom + pad + 14;
        if (prefer === 'above') side = above >= 6 ? 'above' : 'below';
        else side = below + h <= vh - 6 ? 'below' : 'above';
        top = side === 'above' ? above : below;
        top = Math.max(6, Math.min(vh - h - 6, top));
        left = Math.max(8, Math.min(vw - w - 8, cx - w / 2));
        arrowX = Math.max(18, Math.min(w - 18, cx - left));
      } else {
        ring.hidden = true;
        left = (vw - w) / 2;
        top = Math.max(60, vh * 0.3 - h / 2);
      }
      box.style.left = left + 'px';
      box.style.top = top + 'px';
      box.dataset.side = side || 'none';
      const arrow = box.querySelector('.cm-arrow');
      arrow.hidden = arrowX == null;
      if (arrowX != null) arrow.style.left = arrowX + 'px';
      loop();
    }
    function loop() { if (shown && !raf) raf = requestAnimationFrame(place); }
    function show(s) { shown = s; box.dataset.kind = s.kind; ring.classList.toggle('hint', s.kind === 'hint'); const b = box.querySelector('.cm-body'); b._html = null; place(); }
    function hide() { shown = null; box.hidden = true; ring.hidden = true; if (raf) cancelAnimationFrame(raf); raf = null; }

    /* ---------------- the guided first fight ---------------- */
    const combat = () => { const r = api.getRun(); return r && r.combat; };
    const enemyOf = (id) => { const c = combat(); return c && c.enemies.find((e) => e.id === id && !e.dead); };
    const enemySel = (id, part) => { const e = enemyOf(id); return e ? `.unit.enemy[data-uid="${e.uid}"]${part ? ' ' + part : ''}` : null; };
    const cardOf = (id) => { const c = combat(); return c && c.hand.find((x) => x.id === id); };
    const cardSel = (id) => { const card = cardOf(id); return card ? `#hand .card[data-uid="${card.uid}"]` : null; };
    const selectedId = () => { const c = combat(); const card = c && c.hand.find((x) => x.uid === api.ui.sel); return card ? card.id : null; };
    const handNo = (id) => { const c = combat(); return c ? c.hand.findIndex((x) => x.id === id) + 1 : 1; };
    const NAMES = { tut_mite: 'Barnacle Mite', tut_crab: 'Brine Crab' };

    /* An action step: play `card` (on `target`). Points at the card, then at the target once it is raised. */
    function playStep(id, card, target, intro, after) {
      return {
        id, play: { card, target },
        anchor: () => (target && selectedId() === card ? enemySel(target) : cardSel(card)),
        html: () => {
          const name = BL.CARDS[card].name;
          if (selectedId() === card) {
            return target
              ? `Now ${tapLow()} the <b>${NAMES[target]}</b>.${kbd('← → to aim, Enter to play')}`
              : `${tap()} <b>${name}</b> again to play it${api.ui.lastPointer === 'touch' ? ', or drag it up' : ''}.${kbd('Enter to play')}`;
          }
          return intro() + (after ? ' ' + after() : '') + kbd(`Press ${handNo(card) % 10} to pick ${name}`);
        },
      };
    }

    const STEPS = [
      { id: 'hp', info: true, anchor: '.unit.player .hpbar', side: 'above',
        html: () => 'This is you: <b>70 HP</b>. Enemies have HP too. Bring them all to 0 to win.' },
      playStep('attack', 'jab', 'tut_mite',
        () => `<b>Attack!</b> ${tap()} <b>Harpoon Jab</b>, then ${tapLow()} the <b>Barnacle Mite</b>.`),
      { id: 'light', info: true, anchor: '#orb',
        html: () => 'That cost <b>1 Light</b> (the number on the card). You get <b>3 Light</b> each turn.' },
      { id: 'intent', info: true, anchor: () => enemySel('tut_mite', '.intent'), side: 'below',
        html: () => 'The <b>intent</b> above an enemy is its next move. Both will attack: 4 and 3.' },
      // Harpoon Jab now shows LETHAL on the mite; say why the tutorial leaves it for the wave
      Object.assign(playStep('ward', 'brace', null,
        () => `<b>Block it:</b> play <b>Brace</b> for 5 <b>Ward</b>. Ward stops damage until your next turn.`,
        () => '<span class="cm-aside">The <b>LETHAL</b> tag says a Jab would finish the mite. Leave it: a wave will sweep it away soon.</span>'),
      { why: { card: 'block the hits first' } }),
      Object.assign(playStep('attack2', 'jab', 'tut_crab',
        () => `Last Light: hit the <b>Brine Crab</b> with a <b>Harpoon Jab</b>. The mite can wait for the wave.`),
      { why: { target: 'the mite can wait for the wave' } }),
      { id: 'end', endTurn: true, anchor: '#btn-end',
        html: () => `Out of Light: ${tapLow()} <b>End Turn</b>. Unplayed cards go to the discard pile; next turn you draw 5 new ones.${kbd('Or press E')}` },
      { id: 'enemyward', info: true, anchor: () => enemySel('tut_crab', '.ward-badge') || enemySel('tut_crab', '.hpbar'), side: 'below',
        html: () => 'The crab hardened: <b>4 Ward</b>. Enemy Ward blocks your hits too.' },
      { id: 'tide', info: true, anchor: '#tidebar', side: 'above',
        html: () => 'This is the <b>Swell</b>: the water around the enemies, 0 to 6, starting at 3. <b>Surge</b> raises it; <b>Ebb</b> lowers it.' },
      Object.assign(playStep('surge', 'swell', 'tut_crab',
        () => `Play <b>Rising Swell</b> on the crab: 5 damage and <b>Surge 2</b>.`),
      { why: { card: 'its Surge sets up the wave', target: 'the wave will take the mite' } }),
      playStep('crest', 'shellup', null,
        () => 'At 6 the wave <b>Crests</b>: 6 damage to <b>every</b> enemy. Play <b>Shell Up</b> (Surge 1).'),
      playStep('ebb', 'slack', null,
        () => '<b>Crest!</b> The Swell resets to 3. Now play <b>Slack Water</b> (Ebb 2). At 0 you <b>Strand</b> the enemies: they lose their Ward, and you gain 1 Light.'),
      { id: 'end2', endTurn: true, anchor: '#btn-end',
        html: () => `Swell 1. It stays put between turns. ${tap()} <b>End Turn</b>.${kbd('Or press E')}` },
      { id: 'reshuffle', info: true, anchor: '#pile-draw',
        html: () => 'Your draw pile ran out, so the <b>discard pile was shuffled back in</b>.' },
      playStep('low', 'riptide', 'tut_crab',
        () => `Play <b>Riptide Cut</b> on the crab: Ebb 1 takes the Swell to 0 and <b>Strands</b> them.`),
      playStep('payoff', 'stormsurge', null,
        () => '<b>+1 Light!</b> Now the payoff: extra Surge <b>carries over</b>, and each extra Crest in a turn hits 3 harder. Play <b>Storm Surge</b> (Surge 6) to Crest twice.'),
    ];

    const tut = { active: false, i: 0, resume: false, note: null };

    function stepHTML(s) {
      const body = s.html();
      const n = `<span class="cm-step">${tut.i + 1}/${STEPS.length}</span>`;
      const skip = '<button class="cm-skip" data-act="tutskip">Skip tutorial</button>';
      const next = s.info ? '<button class="btn small primary" data-act="tutnext">Next</button>' : '';
      const note = tut.note ? `<div class="cm-note" role="status">${tut.note}</div>` : '';
      return `<div class="cm-text">${body}</div>${note}<div class="cm-foot">${n}${skip}${next}</div>`;
    }
    function showStep() {
      const s = STEPS[tut.i];
      if (!s) return;
      tut.note = null;
      show({ kind: 'tutorial', id: s.id, anchor: s.anchor, side: s.side, html: () => stepHTML(s) });
    }
    /* A blocked action explains itself inside the bubble the player is already reading. */
    function nudge(msg) {
      if (!tut.active || !shown || shown.kind !== 'tutorial' || !msg) return false;
      tut.note = msg;
      place();
      box.classList.remove('nudge');
      void box.offsetWidth;
      box.classList.add('nudge');
      return true;
    }

    function startTutorial() {
      hide();
      const run = api.getRun();
      // keep a real run safe: save it now and come back to it afterwards
      if (run && !run.tutorial) { api.save(); tut.resume = true; } else tut.resume = false;
      tut.active = true;
      tut.i = 0;
      api.setRun(E.newTutorialRun());
      api.render();
      showStep();
    }
    function endTutorial(finished) {
      tut.active = false;
      hide();
      if (finished || store.get(KEY_TUTORIAL) !== 'done') store.set(KEY_TUTORIAL, finished ? 'done' : 'skipped');
      const back = tut.resume ? api.loadSave() : null;
      api.setRun(back);
      api.render();
    }
    function next() {
      if (!tut.active) return;
      tut.i++;
      if (tut.i >= STEPS.length) { hide(); return; }
      showStep();
    }
    const step = () => (tut.active ? STEPS[tut.i] : null);

    /* Does the tutorial allow this action right now? Returns true, or a short reason. */
    function allows(action, cardId, targetId) {
      const s = step();
      if (!s) return true;
      if (action === 'endturn') return s.endTurn ? true : s.info ? 'Press Next first' : `Play ${BL.CARDS[s.play.card].name} first`;
      if (action === 'play') {
        if (s.info) return 'Press Next first';
        if (s.endTurn) return 'End your turn now';
        const why = s.why || {};
        if (cardId !== s.play.card) return `Play ${BL.CARDS[s.play.card].name} this time${why.card ? ': ' + why.card : ''}.`;
        if (s.play.target && targetId !== s.play.target) return `Aim at the ${NAMES[s.play.target]}${why.target ? ': ' + why.target : ''}.`;
        return true;
      }
      if (action === 'tonic') return 'Not in the tutorial';
      return true;
    }
    function onPlayed(cardId, targetId) {
      const s = step();
      if (s && s.play && s.play.card === cardId && (!s.play.target || s.play.target === targetId)) next();
    }
    function onEndTurn() { const s = step(); if (s && s.endTurn) next(); }
    function onVictory() {
      store.set(KEY_TUTORIAL, 'done');
      hide();
      tut.active = false;
      const body = `<div class="tut-done">
        <p>You won your first fight. The short version:</p>
        <ul>
          <li><b>Attack</b> to bring enemy HP to 0, and <b>Ward</b> up against their intents.</li>
          <li>Each turn: <b>3 Light</b>, <b>5 cards</b>. The discard pile comes back when you run out.</li>
          <li><b>Surge</b> to 6 to <b>Crest</b> (hits every enemy). <b>Ebb</b> to 0 to <b>Strand</b> them (enemies lose their Ward, +1 Light). Save Surge for one big turn: chained Crests hit harder.</li>
        </ul>
        <p class="muted">The full rules are in How to Play, in the menu.</p></div>`;
      const foot = (tut.resume ? '<button class="btn" data-act="tutback">Back to my run</button>' : '<button class="btn" data-act="tutback">Title screen</button>') +
        '<button class="btn primary" data-act="tutstart" autofocus>Start a descent</button>';
      api.openOverlay(api.modal('Tutorial complete', body, foot, 'narrow'), { locked: true });
    }
    /* Enter or Space moves past an info step from anywhere. */
    function onKey(e) {
      const s = step();
      if (!s || !s.info || !api.overlayHidden() || api.ui.busy) return false;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); return true; }
      return false;
    }

    /* ---------------- first-time hints in real runs ---------------- */
    const KW_TEXT = (k) => BL.KEYWORDS[k];
    const HINTS = [
      { id: 'map', when: (r) => r.screen === 'map', anchor: '.node.avail',
        html: () => 'Choose your route. <b>Lit stops</b> are where you can go next, and the legend names every icon. The boss waits at the bottom, deepest down.' },
      { id: 'elite', when: (r) => (r.screen === 'map' && !!document.querySelector('.node.avail.t-elite')) || (r.screen === 'combat' && r.combat.kind === 'elite'),
        anchor: () => document.querySelector('.node.avail.t-elite') || document.querySelector('.unit.enemy .sprite'),
        html: () => 'A <b>Dread</b> is an elite: tougher than a skirmish. Beat it, and you may take 1 of 2 <b>keepsakes</b>.' },
      { id: 'charge', when: (r) => r.screen === 'map' && r.keepsakes.length > 0, anchor: '.hud .charge',
        html: () => `Every keepsake stirs the aether: its <b>Roil</b>. The aether here holds ${E.hold(api.getRun().level)}. Past that it is Roiled, and every fight gets worse: first a <b>Seep</b> (an unplayable card), then <b>Thrash</b> (damage each turn unless you kept Ward), then a Bell Minnow. ${tap()} a keepsake between fights to drop it.` },
      // above the cards, so the keyword legend under them stays readable
      { id: 'reward', when: (r) => r.screen === 'reward' && !r.rewards.cardTaken, anchor: '.reward-cards', side: 'above',
        html: () => 'Add <b>1 card</b> to your deck, or skip. A smaller deck draws its best cards more often. Keywords are explained below the cards.' },
      { id: 'shop', when: (r) => r.screen === 'shop', anchor: '.shop-grid', side: 'above',
        html: () => '<b>Barnaby</b> sells cards, keepsakes and tonics for Pearls. Scrubbing away a weak card makes your best ones come up more often.' },
      { id: 'rest', when: (r) => r.screen === 'rest' && !r.restDone, anchor: '.choice-list',
        html: () => '<b>Rest</b> heals 30% of your max HP. Or <b>refit</b>: upgrade one card for the rest of the run.' },
      { id: 'tonic', when: (r) => r.tonics.some(Boolean) && (r.screen === 'combat' || r.screen === 'map'), anchor: '.hud .tonic-slot',
        html: () => `<b>Tonics</b> are one-use. ${tap()} one to drink it during your turn.` },
      { id: 'tidebell', when: (r) => r.screen === 'combat' && E.bell(r) === 'tidebell' && (r.combat.fightCrests > 0 || r.combat.turnLows > 0), anchor: '.hud .medal[data-k="bell"]',
        html: () => 'Your <b>Brass Tide-Bell</b> draws a card every time you Crest or Strand.' },
      { id: 'lethal', when: (r) => r.screen === 'combat' && !!document.querySelector('.field.danger'), anchor: '.unit.player .incoming',
        html: () => '<b>Red edges</b>: the incoming hit would knock you out. Block it, or take an attacker down.' },
    ];
    // keywords on cards, the first time one is in your hand
    ['Sink', 'Float', 'Rite', 'Echo'].forEach((k) => HINTS.push({
      id: 'kw-' + k,
      when: (r) => r.screen === 'combat' && !!handCardWith(r, k),
      anchor: () => { const card = handCardWith(api.getRun(), k); return card ? `#hand .card[data-uid="${card.uid}"]` : null; },
      html: () => `<b>${k}</b>: ${KW_TEXT(k)}`,
    }));
    // statuses, the first time one shows on anyone
    ['soaked', 'chilled', 'brine', 'might', 'spines', 'grief'].forEach((key) => HINTS.push({
      id: 'st-' + key,
      // only on a living creature: a dead one's badges fade out with it
      when: (r) => r.screen === 'combat' && !!document.querySelector(`.unit:not(.dead):not(.gone) [data-tip$=":${key}"]`),
      anchor: `.unit:not(.dead):not(.gone) [data-tip$=":${key}"]`,
      html: () => `<b>${BL.STATUSES[key].name}</b>: ${statusText(key)} ${api.ui.lastPointer === 'mouse' ? 'Hover' : 'Tap a creature'} to read its effects.`,
    }));
    function statusText(key) {
      const kw = BL.KEYWORDS[BL.STATUSES[key].name];
      return kw || BL.STATUSES[key].desc(1);
    }
    function handCardWith(r, k) {
      const c = r && r.combat;
      if (!c) return null;
      return c.hand.find((card) => {
        const d = BL.CARDS[card.id];
        if (k === 'Echo') return !!d.givesEcho;
        if (k === 'Rite') return d.type === 'rite';
        if (k === 'Sink') return !!d.sink;
        if (k === 'Float') return !!d.float;
        return false;
      });
    }

    function closeHint() { if (shown && shown.kind === 'hint') hide(); }
    /* Called after renders and combat updates: show the first unseen hint that applies. */
    function checkHints() {
      const r = api.getRun();
      if (!r || r.tutorial || tut.active) return;
      if (shown) return;
      if (!api.overlayHidden() || api.ui.busy) return;
      if (r.screen === 'combat' && (r.combat.phase !== 'player' || r.combat.won || r.combat.lost)) return;
      for (const h of HINTS) {
        if (seenHints.indexOf(h.id) >= 0) continue;
        let ok = false;
        try { ok = h.when(r); } catch (e) { ok = false; }
        if (!ok || !anchorEl(h.anchor)) continue;
        seenHints.push(h.id);
        store.set(KEY_HINTS, JSON.stringify(seenHints));
        show({ kind: 'hint', id: h.id, screen: r.screen, anchor: h.anchor, side: h.side, html: () => `<div class="cm-text">${h.html()}</div><div class="cm-foot"><button class="btn small" data-act="hintok">Got it</button></div>` });
        return;
      }
    }

    return {
      get active() { return tut.active; },
      get resume() { return tut.resume; },
      status: () => store.get(KEY_TUTORIAL),
      setStatus: (v) => store.set(KEY_TUTORIAL, v),
      startTutorial, endTutorial, next, allows, nudge, onPlayed, onEndTurn, onVictory, onKey,
      checkHints, closeHint, hide, refresh: place,
      hintShowing: () => !!(shown && shown.kind === 'hint'),
      stepId: () => (tut.active && STEPS[tut.i] ? STEPS[tut.i].id : null),
      /* the current step without its functions, for the UI tests */
      stepSpec: () => { const s = tut.active && STEPS[tut.i]; return s ? { id: s.id, info: !!s.info, endTurn: !!s.endTurn, play: s.play || null } : null; },
      steps: STEPS.map((s) => s.id),
      hintIds: () => HINTS.map((h) => h.id),
    };
  };
})();
