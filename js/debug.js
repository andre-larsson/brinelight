/* Brinelight — debug and cheat mode, for testing.
   Turn it on with ?debug in the address (it stays on in this browser), and off with ?debug=0 or from
   the panel. When it's on, a DEBUG tab sits at the left edge, and the ` key opens the panel too.
   With Cheats count as real runs off, cheats mark a run (run.cheated): it keeps no best score, opens no currents, opens
   no story and puts nothing in the Lazaret. It still earns Salvage and achievements, so the Workshop can
   be tested; the panel can reset them.
   Two switches are kept for this browser (OPT_KEY), so they last from run to run:
   - skip: every fight is won the moment it starts, to walk through a whole expedition quickly;
   - count (on by default): cheats do not mark the run, so it opens currents, story and the Lazaret like a real one. */
(function () {
  'use strict';
  const KEY = 'brinelight.debug.v1';
  const get = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const set = (on) => { try { if (on) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) { /* ignore */ } };
  const q = /[?&]debug(=([^&]*))?/.exec(location.search);
  if (q) set(q[2] !== '0');
  if (!get()) return;

  const B = () => window.Brinelight;
  const BL = window.BL;
  const OPT_KEY = 'brinelight.debugopts.v1';
  const opts = { skip: false, count: true };
  try { const o = JSON.parse(localStorage.getItem(OPT_KEY) || '{}'); opts.skip = !!o.skip; if (typeof o.count === 'boolean') opts.count = o.count; } catch (e) { /* ignore */ }
  const saveOpts = () => { try { localStorage.setItem(OPT_KEY, JSON.stringify(opts)); } catch (e) { /* ignore */ } };

  /* Achievements reached on purpose: the stat each one checks. Unlocked after the next won fight. */
  const MEET = {
    twocrests: (r) => { r.stats.maxChain = Math.max(r.stats.maxChain || 0, 2); },
    twolows: (r) => { r.stats.maxLowChain = Math.max(r.stats.maxLowChain || 0, 2); },
    threecrests: (r) => { r.stats.maxChain = Math.max(r.stats.maxChain || 0, 3); },
    untouched: (r) => { r.stats.flawless = Math.max(r.stats.flawless || 0, 3); },
    dreadhunter: (r) => { r.stats.elites = Math.max(r.stats.elites || 0, 1); },
    travellight: (r) => { r.stats.leanDread = true; },
    pickled: (r) => { r.stats.brineKills = Math.max(r.stats.brineKills || 0, 1); },
    bothends: (r) => { r.stats.bothEnds = true; },
    closecall: (r) => { r.stats.closeCall = true; },
    outofbell: (r) => { if (r.cleared.indexOf(0) < 0) r.cleared.push(0); },
    stillwater: (r) => { [0, 1].forEach((lv) => { if (r.cleared.indexOf(lv) < 0) r.cleared.push(lv); }); },
  };
  const GO = [['fight', 'Fight'], ['elite', 'Dread'], ['boss', 'Boss'], ['shop', 'Shop'], ['event', 'Fog'], ['treasure', 'Wreck'], ['toll', 'Toll'], ['rest', 'Cove']];

  function addMissing(list, ids) {
    ids.forEach((id) => { if (!list.includes(id)) list.push(id); });
  }

  const GRANTS = {
    allcostumes({ E, meta }) {
      const lockedOutfits = Object.keys(BL.OUTFITS).filter((id) => !E.outfitOpen(meta, id));
      addMissing(meta.debugOutfits, lockedOutfits);
      // A debug grant has its own confirmation. The shore notices describe real homecomings.
      E.tellFeatures(meta, lockedOutfits.map((id) => 'outfit:' + id));
      return 'All costumes are available in Pack.';
    },
    allach({ meta }) { addMissing(meta.ach, Object.keys(BL.ACHIEVEMENTS)); },
    allkit({ meta }) { addMissing(meta.owned, Object.keys(BL.KIT).filter((id) => !BL.KIT[id].starter)); },
    hearts({ meta: { record } }) {
      record.hearts = Math.max(1, record.hearts || 0);
      record.wins = Math.max(record.wins, record.hearts);
      record.runs = Math.max(record.runs, record.wins);
    },
    allstory({ E, story, saveStory }) {
      addMissing(story.marks, E.storyEntries().map((entry) => entry.when).filter(Boolean));
      saveStory();
    },
    allmusic({ meta, juke, jukeDepths }) {
      // depth:0 identifies an explicit grant even for songs that have a story gate.
      addMissing(meta.heard, juke.map(([kind, key]) => kind + ':' + key));
      addMissing(meta.heard, jukeDepths.map((_, i) => 'depth:' + i));
      return 'Every piece of music counts as heard';
    },
    alllaz({ meta }) {
      addMissing(meta.lazaret, Object.keys(BL.KEEPSAKES));
      meta.lazOpen = true;
    },
  };

  function unlockAll(b) {
    const { E, meta } = b;
    const lockedFeatures = E.FEATURES.filter((id) => !E.featureOpen(meta, id));
    Object.values(GRANTS).forEach((grant) => grant(b));
    addMissing(meta.keepers, Object.keys(BL.KEEPERS).filter((id) => id !== 'wren'));
    meta.keeperNote = null;
    meta.reached = E.LEVELS.length - 1;
    meta.holdUp = E.HOLD_UP.prices.length;
    E.tellFeatures(meta, lockedFeatures);
  }

  const btn = (act, label, extra = '', variant = '') => `<button class="btn small${variant ? ' ' + variant : ''}" data-dbg="${act}"${extra}>${label}</button>`;
  const pair = (name, label, entries, act, button) => `<div class="dbg-pair"><select class="dbg-sel" data-dbg-sel="${name}" aria-label="${label}">${entries.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>${btn(act, button)}</div>`;
  const sorted = (obj) => Object.keys(obj).map((k) => [k, obj[k].name]).sort((a, b) => a[1].localeCompare(b[1]));

  function panelHTML() {
    const { E, run, meta, ui } = B();
    const live = run && !run.tutorial;
    const c = live && run.screen === 'combat' ? run.combat : null;
    const fighting = c && !c.won && !c.lost && c.phase === 'player' && !ui.busy;
    const sec = (title, inner, { wide = false, info = '' } = {}) =>
      `<section class="dbg-sec${wide ? ' dbg-wide' : ''}"><h3>${title}</h3>${info ? `<p class="dbg-info">${info}</p>` : ''}<div class="dbg-row">${inner}</div></section>`;
    let html = '';
    if (fighting) {
      const steps = [0, 1, 2, 3, 4, 5, 6].map((n) => btn('tide', String(n), ` data-n="${n}" aria-pressed="${c.tide === n}"`)).join('');
      html += sec('Combat', btn('win', 'Win the fight') + btn('lose', 'Lose the fight') + btn('light', '+3 Light') + btn('draw', 'Draw 3') +
        `<div class="dbg-swell" role="group" aria-label="Set Swell"><b>Swell</b><div class="dbg-steps">${steps}</div></div>`, { wide: true });
    }
    if (live && (!c || c.won || c.lost)) {
      const next = E.LEVELS[(run.level || 0) + 1];
      html += sec('Go to', GO.map(([type, title]) => btn('go', title, ` data-type="${type}"`)).join('') +
        (next ? btn('deeper', `Down to ${next.name}`) : ''), { wide: true });
    }

    const keepers = Object.keys(BL.KEEPERS);
    const unlockedKeepers = keepers.filter((id) => E.keeperOpen(meta, id)).length;
    html += sec('Unlocks', `<div class="dbg-unlock-actions">${btn('unlockall', 'Unlock all', '', 'primary')}${btn('allcostumes', 'Unlock all costumes')}</div>`,
      { wide: true, info: `${unlockedKeepers}/${keepers.length} keepers · ${E.unlockedOutfits(meta).length}/${Object.keys(BL.OUTFITS).length} costumes` });
    html += sec('Playtest',
      btn('skip', `Skip fights: ${opts.skip ? 'On' : 'Off'}`, ` aria-pressed="${opts.skip}"`) +
      btn('count', `Cheats count as real runs: ${opts.count ? 'On' : 'Off'}`, ` aria-pressed="${opts.count}"`),
      { info: 'Counted runs keep scores, story and finds.' });
    if (live) {
      html += sec('Expedition',
        btn('pearls', '+100 Pearls') + btn('heal', 'Heal to full') + btn('maxhp', '+10 Max HP') +
        btn('god', `God mode: ${run.debugGod ? 'On' : 'Off'}`),
        { info: `Seed ${run.seed} · landing ${run.floor}${run.cheated ? ' · cheated' : ''}` });
      html += sec('Inventory',
        pair('card', 'Card', sorted(BL.CARDS), 'addcard', 'Add card') +
        pair('ks', 'Keepsake', sorted(BL.KEEPSAKES), 'addks', 'Add keepsake') +
        pair('tonic', 'Tonic', sorted(BL.TONICS), 'addtonic', 'Add tonic') +
        // Mateo's hoops (v0.65.0): fit any of them now, or take them all off
        (E.keeperId(run) === 'mateo' ? pair('hoop', 'Hoop', sorted(BL.HOOPS).filter(([id]) => !E.hasHoop(run, id)), 'addhoop', 'Fit hoop') + (E.hoops(run).length ? btn('nohoops', 'Take the hoops off') : '') : ''));
    }
    html += sec('Workshop and Lazaret',
      btn('salvage', '+100 Salvage') + btn('allkit', 'Own all kit') + btn('alllaz', 'Fill the Lazaret'),
      { info: `${meta.salvage} Salvage · ${meta.owned.length}/${Object.keys(BL.KIT).length - 1} kit` });
    html += sec('Story and depth',
      btn('hearts', 'The Heart is home (currents, finals)') + btn('reached', 'Reveal next depth') + btn('allstory', 'Unlock all story'),
      { info: E.heartIsHome(meta) ? 'The Heart is home' : 'The Heart is still below' });
    html += sec('Achievements', btn('allach', 'Unlock all achievements') +
      (live ? pair('ach', 'Achievement', Object.keys(MEET).map((id) => [id, BL.ACHIEVEMENTS[id].name]), 'meet', 'Meet in this run') : ''),
      { info: `${meta.ach.length}/${Object.keys(BL.ACHIEVEMENTS).length} unlocked` });
    html += sec('Music', btn('allmusic', 'Hear all music (Jukebox)'));
    return html + sec('Saved progress', btn('resetall', 'Reset everything', '', 'danger'));
  }

  function open(focus, scrollTop = 0) {
    const b = B();
    b.openOverlay(b.modal('Debug', `<div class="dbg">${panelHTML()}</div>`, '<button class="btn ghost" data-dbg="off">Turn Debug off</button><button class="btn primary" data-act="close">Close</button>', 'dbg-modal'), { focus });
    document.querySelector('.dbg-modal .modal-body').scrollTop = scrollTop;
  }

  function cheat(fn) {
    const b = B(), run = b.run;
    if (run && !run.tutorial && !opts.count) run.cheated = true;
    fn(b, run);
    if (run && run.screen !== 'combat') b.save();
  }

  /* Win the fight in front of you: every enemy dies and the rewards follow. */
  const winFight = () => cheat((bb, r) => { const c = r.combat; c.enemies.forEach((e) => { e.hp = 0; e.dead = true; }); c.won = true; bb.closeOverlay(true); bb.onVictory(); });
  /* Skip fights: checked a few times a second. It waits for the player's turn, and for any open
     window (a first-time hint, this panel) to be closed, then wins the fight. */
  function skipTick() {
    if (!opts.skip) return;
    const b = B(), run = b && b.run;
    if (!run || run.tutorial || run.screen !== 'combat' || b.ui.busy) return;
    const c = run.combat, ov = document.getElementById('overlay');
    if (!c || c.won || c.lost || c.phase !== 'player' || (ov && !ov.hidden)) return;
    winFight();
  }
  setInterval(skipTick, 250);
  const tabText = () => (opts.skip ? 'DEBUG · SKIPPING FIGHTS' : 'DEBUG');

  function act(name, el) {
    const b = B(), run = b.run, meta = b.meta;
    const val = (k) => { const s = document.querySelector(`[data-dbg-sel="${k}"]`); return s ? s.value : null; };
    const scrollTop = el.closest('.modal-body')?.scrollTop || 0;
    const focus = `[data-dbg="${name}"]` + (el.dataset.n ? `[data-n="${el.dataset.n}"]` : '');
    const reopen = () => { b.render(); open(focus, scrollTop); };
    if (Object.hasOwn(GRANTS, name)) {
      const text = GRANTS[name](b);
      b.saveMeta();
      if (text) b.toast(text);
      return reopen();
    }
    switch (name) {
      case 'skip': opts.skip = !opts.skip; saveOpts(); tab.textContent = tabText(); return reopen();
      case 'count':
        opts.count = !opts.count;
        saveOpts();
        if (opts.count && run && run.cheated) { delete run.cheated; if (run.screen !== 'combat') b.save(); }
        return reopen();
      case 'salvage': meta.salvage += 100; meta.earned += 100; b.saveMeta(); return reopen();
      case 'reached': meta.reached = Math.min(b.E.LEVELS.length - 1, (meta.reached || 0) + 1); b.saveMeta(); b.toast(`Reached ${b.E.LEVELS[meta.reached].name}: Hold ${b.E.metaHold(meta)}`); return reopen();
      case 'unlockall':
        unlockAll(b);
        b.saveMeta();
        b.toast('All unlocks granted. Choose a keeper and outfit in Pack.');
        return reopen();
      case 'resetall':
        if (!window.confirm('Erase all Brinelight progress in this browser (save, best score, Workshop, Lazaret, Logbook, story, tutorial, hints)? Debug mode stays on.')) return;
        try { Object.keys(localStorage).filter((k) => k.indexOf('brinelight.') === 0 && k !== KEY).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
        location.href = location.pathname;
        return;
      case 'off': set(false); location.href = location.pathname; return;
      case 'pearls': cheat((bb, r) => { r.pearls += 100; }); return reopen();
      case 'heal': cheat((bb, r) => { r.hp = r.maxHp; }); return reopen();
      case 'maxhp': cheat((bb, r) => { r.maxHp += 10; r.hp += 10; }); return reopen();
      case 'god': cheat((bb, r) => { r.debugGod = !r.debugGod; }); return reopen();
      case 'addcard': cheat((bb, r) => { const card = bb.E.addCard(r, val('card')); if (r.combat && card) r.combat.hand.push({ uid: card.uid, id: card.id, up: card.up }); }); return reopen();
      case 'addks': cheat((bb, r) => { bb.E.gainKeepsake(r, val('ks')); }); return reopen();
      case 'addtonic': cheat((bb, r) => { if (!bb.E.gainTonic(r, val('tonic'))) bb.toast('Tonic slots full'); }); return reopen();
      case 'addhoop': cheat((bb, r) => { const id = val('hoop'); if (BL.HOOPS[id] && !bb.E.hasHoop(r, id)) r.hoops = bb.E.hoops(r).concat([id]); }); return reopen();
      case 'nohoops': cheat((bb, r) => { r.hoops = []; }); return reopen();
      case 'meet': cheat((bb, r) => { MEET[val('ach')](r); bb.toast('Met: it unlocks after the next won fight, or at the end of the run'); }); return reopen();
      case 'go': {
        // visit a stop of that type without moving on the map
        cheat((bb, r) => {
          const keep = { pos: r.pos, floor: r.floor, visited: (r.visited || []).slice() };
          bb.closeOverlay(true);
          bb.E.backToMap(r);
          bb.E.enterNode(r, { row: 0, col: 0, type: el.dataset.type });
          Object.assign(r, keep);
        });
        b.render();
        return;
      }
      case 'deeper':
        // straight down the next stair, as if the pin had broken (wearing the diving dress if the level needs it)
        cheat((bb, r) => {
          const E = bb.E, next = E.LEVELS[(r.level || 0) + 1];
          if (!next) return;
          if (next.needs && !E.hasKit(r, next.needs)) r.kit[BL.KIT[next.needs].place] = next.needs;
          bb.closeOverlay(true);
          r.combat = null;
          r.screen = 'pin';
          E.goDeeper(r);
        });
        b.save();
        b.render();
        return;
      case 'win': winFight(); return;
      case 'lose':
        cheat((bb, r) => { r.hp = 0; r.combat.lost = true; bb.closeOverlay(true); bb.onDefeat(); });
        return;
      case 'light': cheat((bb, r) => { r.combat.light += 3; }); return reopen();
      case 'draw': cheat((bb, r) => { const c = r.combat; for (let i = 0; i < 3 && c.hand.length < 10; i++) { if (!c.draw.length) c.draw = c.discard.splice(0); const x = c.draw.pop(); if (x) c.hand.push(x); } }); return reopen();
      case 'tide': cheat((bb, r) => { r.combat.tide = +el.dataset.n; }); return reopen();
    }
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-dbg]');
    if (!t) return;
    e.preventDefault();
    if (t.dataset.dbg === 'open') open(); else act(t.dataset.dbg, t);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== '`' || e.target.closest('input, textarea, select')) return;
    e.preventDefault();
    const ov = document.getElementById('overlay');
    if (ov && !ov.hidden && ov.querySelector('.dbg-modal')) B().closeOverlay(true); else open();
  });
  const tab = document.createElement('button');
  tab.className = 'dbg-tab';
  tab.dataset.dbg = 'open';
  tab.textContent = tabText();
  tab.setAttribute('aria-label', 'Open the debug panel');
  document.body.appendChild(tab);
})();
