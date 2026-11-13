/* Brinelight — debug and cheat mode, for testing.
   Turn it on with ?debug in the address (it stays on in this browser), and off with ?debug=0 or from
   the panel. When it's on, a DEBUG tab sits at the left edge, and the ` key opens the panel too.
   Cheats that change a run mark it (run.cheated): such a run keeps no best score, opens no currents, opens
   no story and puts nothing in the Lazaret. It still earns Salvage and achievements, so the Workshop can
   be tested; the panel can reset them.
   Two switches are kept for this browser (OPT_KEY), so they last from run to run:
   - skip: every fight is won the moment it starts, to walk through a whole expedition quickly;
   - count: cheats do not mark the run, so a debug run opens currents, story and the Lazaret like a real one. */
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
  const opts = { skip: false, count: false };
  try { const o = JSON.parse(localStorage.getItem(OPT_KEY) || '{}'); opts.skip = !!o.skip; opts.count = !!o.count; } catch (e) { /* ignore */ }
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
  };
  const GO = [['fight', 'Fight'], ['elite', 'Dread'], ['boss', 'Boss'], ['shop', 'Shop'], ['event', 'Fog'], ['treasure', 'Wreck'], ['rest', 'Cove']];

  const btn = (act, label, extra) => `<button class="btn small" data-dbg="${act}"${extra || ''}>${label}</button>`;
  const select = (name, entries) => `<select class="dbg-sel" data-dbg-sel="${name}" aria-label="${name}">${entries.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>`;
  const sorted = (obj) => Object.keys(obj).map((k) => [k, obj[k].name]).sort((a, b) => a[1].localeCompare(b[1]));

  function panelHTML() {
    const b = B(), run = b.run, meta = b.meta;
    const live = run && !run.tutorial;
    const c = live && run.screen === 'combat' ? run.combat : null;
    const fighting = c && !c.won && !c.lost && c.phase === 'player' && !b.ui.busy;
    const sec = (title, inner) => `<section class="dbg-sec"><h3>${title}</h3><div class="dbg-row">${inner}</div></section>`;
    let html = sec('Playtest <small>kept in this browser</small>',
      btn('skip', `Skip fights: ${opts.skip ? 'On' : 'Off'}`, ` aria-pressed="${opts.skip}"`) + btn('count', `Cheats count as real runs: ${opts.count ? 'On' : 'Off'}`, ` aria-pressed="${opts.count}"`));
    html += sec(`Progress <small>${meta.salvage} Salvage · ${meta.owned.length}/${Object.keys(BL.KIT).length - 1} kit · ${meta.ach.length}/${Object.keys(BL.ACHIEVEMENTS).length} achievements · ${meta.record.hearts || 0} Hearts</small>`,
      btn('salvage', '+100 Salvage') + btn('allach', 'Unlock all achievements') + btn('allkit', 'Own all kit') + btn('hearts', 'Open the currents') + btn('allstory', 'Unlock all story') + btn('alllaz', 'Fill the Lazaret') +
      btn('resetmeta', 'Reset Workshop and Lazaret') + btn('resetall', 'Reset everything'));
    if (live) {
      html += sec(`This run <small>seed ${run.seed} · landing ${run.floor}${run.cheated ? ' · cheated' : ''}</small>`,
        btn('pearls', '+100 Pearls') + btn('heal', 'Heal to full') + btn('maxhp', '+10 Max HP') +
        btn('god', `God mode: ${run.debugGod ? 'On' : 'Off'}`) +
        `<span class="dbg-pair">${select('card', sorted(BL.CARDS))}${btn('addcard', 'Add card')}</span>` +
        `<span class="dbg-pair">${select('ks', sorted(BL.KEEPSAKES))}${btn('addks', 'Add keepsake')}</span>` +
        `<span class="dbg-pair">${select('tonic', sorted(BL.TONICS))}${btn('addtonic', 'Add tonic')}</span>` +
        `<span class="dbg-pair">${select('ach', Object.keys(BL.ACHIEVEMENTS).map((k) => [k, BL.ACHIEVEMENTS[k].name]))}${btn('meet', 'Meet in this run')}</span>`);
      if (!c || c.won || c.lost) html += sec('Go to', GO.map(([t, l]) => btn('go', l, ` data-type="${t}"`)).join(''));
    }
    if (fighting) {
      html += sec('This fight', btn('win', 'Win the fight') + btn('lose', 'Lose the fight') + btn('light', '+3 Light') + btn('draw', 'Draw 3') +
        '<span class="dbg-pair">Swell ' + [0, 1, 2, 3, 4, 5, 6].map((n) => btn('tide', String(n), ` data-n="${n}"`)).join('') + '</span>');
    }
    return html + `<p class="dbg-note"><b>Skip fights</b> wins every fight the moment it starts. Cheats mark the run: it keeps no best score, opens no currents, opens no story and puts nothing in the Lazaret. Turn on <b>Cheats count as real runs</b> to switch that off. Press <span class="kbd">\`</span> to open this panel.</p>`;
  }

  function open() {
    const b = B();
    b.openOverlay(b.modal('Debug', `<div class="dbg">${panelHTML()}</div>`, '<button class="btn" data-dbg="off">Turn debug mode off</button><button class="btn primary" data-act="close">Close</button>', 'narrow dbg-modal'));
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
    const reopen = () => { b.render(); open(); };
    switch (name) {
      case 'skip': opts.skip = !opts.skip; saveOpts(); tab.textContent = tabText(); return reopen();
      case 'count':
        opts.count = !opts.count;
        saveOpts();
        if (opts.count && run && run.cheated) { delete run.cheated; if (run.screen !== 'combat') b.save(); }
        return reopen();
      case 'salvage': meta.salvage += 100; meta.earned += 100; b.saveMeta(); return reopen();
      case 'allach': Object.keys(BL.ACHIEVEMENTS).forEach((a) => { if (meta.ach.indexOf(a) < 0) meta.ach.push(a); }); b.saveMeta(); return reopen();
      case 'allkit': Object.keys(BL.KIT).forEach((g) => { if (!BL.KIT[g].starter && meta.owned.indexOf(g) < 0) meta.owned.push(g); }); b.saveMeta(); return reopen();
      case 'hearts': meta.record.hearts = Math.max(1, meta.record.hearts || 0); meta.record.wins = Math.max(meta.record.wins, meta.record.hearts); meta.record.runs = Math.max(meta.record.runs, meta.record.wins); b.saveMeta(); return reopen();
      case 'allstory': b.E.storyEntries().forEach((en) => { if (en.when && b.story.marks.indexOf(en.when) < 0) b.story.marks.push(en.when); }); b.saveStory(); return reopen();
      case 'alllaz': Object.keys(BL.KEEPSAKES).forEach((k) => { if (meta.lazaret.indexOf(k) < 0) meta.lazaret.push(k); }); meta.lazOpen = true; b.saveMeta(); return reopen();
      case 'resetmeta': Object.assign(meta, b.E.newMeta()); b.saveMeta(); return reopen();
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
