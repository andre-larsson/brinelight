/* Brinelight — game engine: RNG, run state, map generation, combat rules.
   Pure logic, no DOM access, so it can also be driven from Node for testing. */
(function () {
  'use strict';
  const BL = (globalThis.BL = globalThis.BL || {});
  const E = {};

  const MAP_ROWS = 10;
  const MAP_COLS = 5;
  const TIDE_MAX = 6;
  const TIDE_MID = 3;
  const HAND_MAX = 10;
  E.MAP_ROWS = MAP_ROWS;
  E.MAP_COLS = MAP_COLS;
  E.TIDE_MAX = TIDE_MAX;

  /* ---------------- RNG (mulberry32, state kept in the run so saves are deterministic) ---------------- */
  function makeR(holder) {
    const next = () => {
      holder.rng = (holder.rng + 0x6d2b79f5) | 0;
      let t = holder.rng;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      int: (a, b) => a + Math.floor(next() * (b - a + 1)),
      chance: (p) => next() < p,
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      shuffle: (arr) => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
      },
      weighted: (opts) => {
        const total = opts.reduce((s, o) => s + o[1], 0);
        let x = next() * total;
        for (const o of opts) { x -= o[1]; if (x < 0) return o[0]; }
        return opts[opts.length - 1][0];
      },
    };
  }
  E.makeR = makeR;

  /* ---------------- Cards ---------------- */
  E.def = (card) => BL.CARDS[card.id];
  E.vals = (card) => {
    const d = BL.CARDS[card.id];
    return card.up ? Object.assign({}, d.v, d.up) : d.v;
  };
  E.cost = (card, c) => {
    const d = BL.CARDS[card.id];
    let cost = card.up && d.up.cost != null ? d.up.cost : d.cost;
    if (cost != null && c && d.costDown === 'crests') cost = Math.max(0, cost - (c.turnCrests || 0));
    return cost;
  };
  E.cardName = (card) => BL.CARDS[card.id].name + (card.up ? '+' : '');
  E.canUpgrade = (card) => {
    const d = BL.CARDS[card.id];
    return !card.up && d.type !== 'status' && d.type !== 'curse' && Object.keys(d.up).length > 0;
  };
  E.newCard = (run, id, up) => ({ uid: run.nextUid++, id, up: up ? 1 : 0 });
  E.has = (run, k) => run.keepsakes.indexOf(k) >= 0;

  /* ---------------- Kit: mundane gear in five places (BL.KIT_PLACES), one item each ---------------- */
  E.KIT_PLACES = BL.KIT_PLACES.map((p) => p.id);
  /* A full kit: every place, the Bell holding the Brass Tide-Bell unless told otherwise. `kit` can be an
     object { place: id } or a list of ids (each goes to its own place). Unknown ids, ids in the wrong
     place and (when `owned` is given) unowned ones are dropped. */
  E.fitKit = function (kit, owned) {
    const out = {};
    E.KIT_PLACES.forEach((pl) => { out[pl] = null; });
    out.bell = 'tidebell';
    const ok = (id) => !!BL.KIT[id] && (!owned || BL.KIT[id].starter || owned.indexOf(id) >= 0);
    if (Array.isArray(kit)) kit.forEach((id) => { if (ok(id)) out[BL.KIT[id].place] = id; });
    else if (kit) E.KIT_PLACES.forEach((pl) => { const id = kit[pl]; if (ok(id) && BL.KIT[id].place === pl) out[pl] = id; });
    return out;
  };
  /* Everything a run has on: the places, plus kit carried over from an older save (E.migrateRun). */
  E.kitIds = (run) => (run.kit ? E.KIT_PLACES.map((pl) => run.kit[pl]).filter(Boolean).concat(run.kitExtra || []) : []);
  E.hasKit = (run, id) => E.kitIds(run).indexOf(id) >= 0;
  E.bell = (run) => (run.kit && run.kit.bell) || null;

  /* ---------------- Roil, Hold and what a Roiled aether does ----------------
     Every keepsake has a Roil (`charge` in the code and in saves). The aether around you can hold so much
     (the Hold, more at deeper depths) and stay Calm. Past it the aether is Roiled, one step for every
     12 Roil over (or part of 12). The steps climb a ladder of three, round and round:
       step 1, 4, 7...: one more Seep, an unplayable card in the draw pile of each fight;
       step 2, 5, 8...: one more Thrash, damage at the start of each of your turns, which Ward left from the turn
                        before stops;
       step 3, 6:       one more Bell Minnow joins each fight at half health, drawn by the noise (2 at most). */
  /* The Hold at each starting depth. The Shallows held 30 until v0.16.0; 20 leaves room for about one strong keepsake
     and one small one, so a stocked Lazaret doesn't make the first depth easy. */
  E.HOLDS = [20, 35, 40, 45];
  E.SEEP_STEP = 12; // Roil over the Hold for each step: about one keepsake's worth, so each keepsake past the Hold adds about one step (5 until v0.18.0)
  E.MAX_ROIL_MINNOWS = 2;
  E.ROIL_MINNOW_HP = 0.5; // a Minnow that follows the Roil has this share of a Bell Minnow's HP, rounded up
  E.hold = (level) => E.HOLDS[Math.min(Math.max(0, level || 0), E.HOLDS.length - 1)];
  E.chargeOf = (k) => (BL.KEEPSAKES[k] && BL.KEEPSAKES[k].charge) || 0;
  /* The Roil you carry, optionally with one more keepsake (to show what taking it would do). */
  E.charge = (run, extra) => run.keepsakes.reduce((a, k) => a + E.chargeOf(k), 0) + (extra ? E.chargeOf(extra) : 0);
  E.roilSteps = (charge, level) => { const over = charge - E.hold(level); return over > 0 ? Math.ceil(over / E.SEEP_STEP) : 0; };
  E.roilFor = function (charge, level) {
    const s = E.roilSteps(charge, level);
    return { steps: s, seep: Math.ceil(s / 3), thrash: Math.floor((s + 1) / 3), minnows: Math.min(E.MAX_ROIL_MINNOWS, Math.floor(s / 3)) };
  };
  /* What the aether does to this run in every fight, optionally with one more keepsake. */
  E.roil = (run, extra) => (run.tutorial ? E.roilFor(0, 0) : E.roilFor(E.charge(run, extra), run.level));
  E.seepFor = (charge, level) => E.roilFor(charge, level).seep;
  E.seepCount = (run, extra) => E.roil(run, extra).seep;

  /* ---------------- Run ---------------- */
  /* The starting depths. Each uses one band of the Reach (BL.BANDS): its creatures, Fog events and look.
     Dark Water has creatures of its own; Riptide and the Abyss are Dark Water made harder. */
  E.LEVELS = [
    { name: 'Shallows', band: 'shallows', desc: 'The standard descent.' },
    { name: 'Dark Water', band: 'dark', desc: 'Below the Shallows: new creatures in still, black water, and a new boss.' },
    { name: 'Riptide', band: 'dark', desc: "Dark Water's creatures, with 5% more HP, and they hit 10% harder." },
    { name: 'The Abyss', band: 'dark', desc: "Dark Water's creatures, with 10% more HP, and they hit 15% harder. Rests heal less." },
  ];
  E.levelMods = (lv) => ([
    { hp: 1, dmg: 1, rest: 0.3 }, { hp: 1, dmg: 1, rest: 0.3 }, { hp: 1.05, dmg: 1.1, rest: 0.3 }, { hp: 1.1, dmg: 1.15, rest: 0.25 },
  ][lv || 0] || { hp: 1, dmg: 1, rest: 0.3 });
  /* The band a run is in (the tutorial is in the Shallows). */
  E.bandId = (run) => (run && !run.tutorial && E.LEVELS[run.level || 0] && E.LEVELS[run.level || 0].band) || 'shallows';
  E.band = (run) => BL.BANDS[E.bandId(run)];

  E.newRun = function (seed, level, kit, bring) {
    if (seed == null) seed = (Math.random() * 4294967296) >>> 0;
    const run = {
      version: 2,
      level: level || 0,
      seed: seed >>> 0,
      rng: seed >>> 0,
      hp: 70, maxHp: 70, pearls: 75,
      deck: [], keepsakes: [], tonics: [null, null, null], kit: E.fitKit(),
      nextUid: 1, floor: 0, pos: null, screen: 'map',
      combat: null, rewards: null, shop: null, event: null, treasure: null,
      removeCost: 75, seenEvents: [], lastEnc: [], normalFights: 0,
      stats: { fights: 0, elites: 0, cardsPlayed: 0, dmgDealt: 0, dmgTaken: 0, crests: 0, lows: 0, maxChain: 0, maxLowChain: 0, kills: 0, bonuses: 0, declined: 0, declineScore: 0, elapsed: 0, lastTick: Date.now() },
      log: [],
    };
    BL.STARTER_DECK.forEach((id) => run.deck.push(E.newCard(run, id)));
    run.map = genMap(run);
    E.applyKit(run, kit); // after the map, so the same seed gives the same map with any kit
    E.bringKeepsakes(run, bring); // keepsakes from the Lazaret: no randomness either
    return run;
  };

  /* The guided first fight: a fixed deck drawn in order against two weak enemies with scripted moves.
     It is a separate run object that is never saved, so it cannot touch real runs, seeds or scores. */
  E.newTutorialRun = function () {
    const run = E.newRun(1, 0);
    run.tutorial = true;
    run.keepsakes = [];
    run.kit.bell = null; // no bell in the tutorial, so the hands stay fixed
    run.deck = [];
    BL.TUTORIAL.deck.forEach((id) => E.addCard(run, id));
    E.startCombat(run, 'tutorial', BL.TUTORIAL.enc, { noShuffle: true });
    return run;
  };

  E.tick = function (run) {
    const now = Date.now();
    const dt = now - (run.stats.lastTick || now);
    run.stats.elapsed += Math.max(0, Math.min(dt, 60000));
    run.stats.lastTick = now;
  };

  /* ---------------- Map ---------------- */
  function genMap(run) {
    const R = makeR(run);
    const grid = [];
    for (let r = 0; r < MAP_ROWS; r++) grid.push(new Array(MAP_COLS).fill(null));
    const edges = new Set();
    const hasEdge = (r, a, b) => edges.has(r + ',' + a + ',' + b);
    const startCols = [R.int(0, 1), R.int(3, 4), R.int(0, 4), R.int(1, 3), R.int(0, 4)];
    for (let p = 0; p < startCols.length; p++) {
      let c = startCols[p];
      for (let r = 0; r < MAP_ROWS; r++) {
        if (!grid[r][c]) grid[r][c] = { row: r, col: c, type: null, next: [] };
        if (r === MAP_ROWS - 1) break;
        const opts = R.shuffle([c - 1, c, c + 1].filter((x) => x >= 0 && x < MAP_COLS));
        let nc = c;
        for (const o of opts) {
          if (o === c + 1 && hasEdge(r, c + 1, c)) continue; // would cross an existing edge
          if (o === c - 1 && hasEdge(r, c - 1, c)) continue;
          nc = o;
          break;
        }
        edges.add(r + ',' + c + ',' + nc);
        c = nc;
      }
    }
    edges.forEach((key) => {
      const [r, a, b] = key.split(',').map(Number);
      const n = grid[r][a];
      if (n.next.indexOf(b) < 0) n.next.push(b);
    });
    grid.forEach((row) => row.forEach((n) => n && n.next.sort((x, y) => x - y)));

    const parentsOf = (n) => (n.row === 0 ? [] : grid[n.row - 1].filter((p) => p && p.next.indexOf(n.col) >= 0));
    const childrenOf = (n) => (n.row >= MAP_ROWS - 1 ? [] : n.next.map((c) => grid[n.row + 1][c]));
    const special = ['elite', 'rest', 'shop'];

    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        const n = grid[r][c];
        if (!n) continue;
        if (r === 0) { n.type = 'fight'; continue; }
        if (r === MAP_ROWS - 1) { n.type = 'rest'; continue; }
        if (r === 5) { n.type = 'treasure'; continue; }
        let opts = [['fight', 46], ['event', 22]];
        if (r >= 3) opts.push(['elite', 13]);
        if (r >= 3 && r <= 7) opts.push(['rest', 11]);
        if (r >= 2) opts.push(['shop', 9]);
        const ptypes = parentsOf(n).map((p) => p.type);
        opts = opts.filter((o) => !(special.indexOf(o[0]) >= 0 && ptypes.indexOf(o[0]) >= 0));
        n.type = R.weighted(opts);
      }
    }
    // guarantee a minimum of interesting nodes
    const all = [];
    grid.forEach((row) => row.forEach((n) => n && all.push(n)));
    const ensure = (type, minCount, rowMin, rowMax) => {
      let count = all.filter((n) => n.type === type).length;
      let guard = 0;
      while (count < minCount && guard++ < 50) {
        const cands = all.filter((n) => n.type === 'fight' && n.row >= rowMin && n.row <= rowMax &&
          parentsOf(n).every((p) => p.type !== type) && childrenOf(n).every((ch) => ch.type !== type));
        if (!cands.length) break;
        R.pick(cands).type = type;
        count++;
      }
    };
    ensure('shop', 2, 2, 8);
    ensure('elite', 2, 3, 8);
    ensure('rest', 2, 3, 7);
    ensure('event', 3, 1, 8);

    grid.forEach((row) => row.forEach((n) => {
      if (!n) return;
      n.x = (n.col + 0.5) / MAP_COLS + (R.next() - 0.5) * 0.09;
      n.jy = (R.next() - 0.5) * 0.35;
    }));
    return { rows: MAP_ROWS, cols: MAP_COLS, grid, boss: { row: MAP_ROWS, col: 2, type: 'boss', x: 0.5, jy: 0 } };
  }
  E.genMap = genMap;

  E.nodeAt = (run, pos) => (pos.row >= MAP_ROWS ? run.map.boss : run.map.grid[pos.row][pos.col]);

  E.availableNodes = function (run) {
    if (run.screen !== 'map') return [];
    if (!run.pos) return run.map.grid[0].filter(Boolean);
    if (run.pos.row >= MAP_ROWS) return [];
    if (run.pos.row === MAP_ROWS - 1) return [run.map.boss];
    const n = run.map.grid[run.pos.row][run.pos.col];
    return n.next.map((c) => run.map.grid[run.pos.row + 1][c]);
  };

  E.enterNode = function (run, node) {
    run.pos = { row: node.row, col: node.col };
    run.floor = node.row + 1;
    run.visited = run.visited || [];
    run.visited.push(node.row + ',' + node.col);
    switch (node.type) {
      case 'fight': E.startCombat(run, run.normalFights < 3 ? 'easy' : 'hard'); break;
      case 'elite': E.startCombat(run, 'elite'); break;
      case 'boss': E.startCombat(run, 'boss'); break;
      case 'rest': run.screen = 'rest'; run.restDone = false; break;
      case 'shop': genShop(run); run.screen = 'shop'; break;
      case 'treasure': genTreasure(run); run.screen = 'treasure'; break;
      case 'event': E.startEvent(run); break;
    }
  };

  /* Leaving a stop. A reward tonic left behind with a free slot counts as declined. A keepsake pick
     left open is simply lost: the UI asks you to take one or leave them (E.leaveKeepsakes) first. */
  E.backToMap = function (run) {
    const rw = run.rewards;
    if (rw && rw.tonic && !rw.tonicTaken && run.tonics.indexOf(null) >= 0) E.decline(run, 'tonic');
    run.screen = 'map';
    run.combat = null;
    run.rewards = null;
    run.event = null;
    run.shop = null;
    run.treasure = null;
  };

  /* ---------------- Rewards & pools ---------------- */
  function rollRarity(R, kind) {
    const t = kind === 'elite' ? [['common', 45], ['uncommon', 40], ['rare', 15]] : [['common', 60], ['uncommon', 34], ['rare', 6]];
    return R.weighted(t);
  }
  E.rewardCards = function (run, kind, n) {
    const R = makeR(run);
    const out = [];
    let guard = 0;
    while (out.length < (n || 3) && guard++ < 100) {
      const id = R.pick(BL.REWARD_POOL[rollRarity(R, kind)]);
      if (out.indexOf(id) < 0) out.push(id);
    }
    return out;
  };
  E.randomCards = function (run, rarity, n) {
    const R = makeR(run);
    return R.shuffle(BL.REWARD_POOL[rarity].slice()).slice(0, n);
  };
  /* Cards that move the Swell: they Surge, Ebb or shift it. Rarity is rolled as for a fight's reward. */
  E.movesSwell = (id) => { const v = BL.CARDS[id].v || {}; return !!(v.surge || v.ebb || v.shift); };
  E.swellCards = function (run, n) {
    const R = makeR(run);
    const out = [];
    let guard = 0;
    while (out.length < (n || 3) && guard++ < 100) {
      const pool = BL.REWARD_POOL[rollRarity(R, 'normal')].filter(E.movesSwell);
      const id = pool.length ? R.pick(pool) : null;
      if (id && out.indexOf(id) < 0) out.push(id);
    }
    return out;
  };
  /* A creature that follows the keeper into her next fight (the Glimmer Garden). */
  E.addFollower = function (run, id) {
    run.followers = (run.followers || []).concat([id]);
  };
  E.keepsakePool = (run) => Object.keys(BL.KEEPSAKES).filter((k) => !E.has(run, k));
  E.gainKeepsake = function (run, k) {
    if (!k || !BL.KEEPSAKES[k] || E.has(run, k)) return;
    run.keepsakes.push(k);
    if (k === 'biscuit') { run.maxHp += 10; run.hp += 10; }
  };
  /* Drop a keepsake for good, between fights, to bring your Roil down. Scallop Charm takes its 10 Max HP with it. */
  E.dropKeepsake = function (run, k) {
    const i = run.keepsakes.indexOf(k);
    if (i < 0 || run.screen === 'combat') return false;
    run.keepsakes.splice(i, 1);
    if (k === 'biscuit') E.loseMaxHp(run, 10);
    return true;
  };
  /* Turn down a keepsake pick (a Dread's reward, an opened Wreck): it scores like any declined reward. */
  E.leaveKeepsakes = function (run) {
    const src = run.screen === 'reward' ? run.rewards : run.screen === 'treasure' ? run.treasure : null;
    const list = src && (src.keepsakeChoices || src.choices);
    if (!src || src.keepsake || src.keepsakeLeft || !list || !list.length) return false;
    src.keepsakeLeft = true;
    E.decline(run, 'keepsake');
    return true;
  };
  E.gainRandomKeepsake = function (run) {
    const pool = E.keepsakePool(run);
    if (!pool.length) return null;
    const k = makeR(run).pick(pool);
    E.gainKeepsake(run, k);
    return k;
  };
  E.randomTonic = (run) => makeR(run).pick(Object.keys(BL.TONICS));
  E.gainTonic = function (run, t) {
    const slot = run.tonics.indexOf(null);
    if (slot < 0) return false;
    run.tonics[slot] = t;
    return true;
  };
  E.gainRandomTonic = function (run) {
    const t = E.randomTonic(run);
    E.gainTonic(run, t);
    return t;
  };
  E.addCard = function (run, id, up) {
    const c = E.newCard(run, id, up);
    run.deck.push(c);
    return c;
  };
  E.removeCard = function (run, uid) {
    const i = run.deck.findIndex((c) => c.uid === uid);
    if (i >= 0) run.deck.splice(i, 1);
  };
  E.upgradeCard = function (run, uid) {
    const c = run.deck.find((x) => x.uid === uid);
    if (c && E.canUpgrade(c)) c.up = 1;
  };
  E.upgradeable = (run) => run.deck.filter(E.canUpgrade);
  E.duplicateCard = function (run, uid) {
    const c = run.deck.find((x) => x.uid === uid);
    if (c) E.addCard(run, c.id, c.up);
  };
  E.upgradeRandom = function (run, n) {
    const R = makeR(run);
    const cands = R.shuffle(E.upgradeable(run));
    cands.slice(0, n).forEach((c) => { c.up = 1; });
    return Math.min(n, cands.length);
  };
  E.heal = function (run, n) {
    const before = run.hp;
    run.hp = Math.min(run.maxHp, run.hp + n);
    return run.hp - before;
  };
  E.loseHp = function (run, n) {
    run.hp = Math.max(1, run.hp - n); // events never kill
  };
  E.loseMaxHp = function (run, n) {
    run.maxHp = Math.max(10, run.maxHp - n);
    run.hp = Math.min(run.hp, run.maxHp);
  };

  /* ---------------- Rest / shop / treasure / events ---------------- */
  E.restAmount = (run) => Math.floor(run.maxHp * E.levelMods(run.level).rest) + (E.hasKit(run, 'wick') ? 10 : 0);
  E.rest = function (run) {
    const h = E.heal(run, E.restAmount(run));
    run.restDone = true;
    return h;
  };

  E.price = (run, base) => (E.hasKit(run, 'scales') ? Math.round(base * 0.75) : base);

  function genShop(run) {
    const R = makeR(run);
    const pickN = (arr, n) => R.shuffle(arr.slice()).slice(0, n);
    const cards = []
      .concat(pickN(BL.REWARD_POOL.common, 2).map((id) => ({ id, base: R.int(45, 55) })))
      .concat(pickN(BL.REWARD_POOL.uncommon, 2).map((id) => ({ id, base: R.int(70, 85) })))
      .concat(pickN(BL.REWARD_POOL.rare, 1).map((id) => ({ id, base: R.int(140, 160) })));
    const sale = R.int(0, cards.length - 1);
    cards[sale].base = Math.round(cards[sale].base / 2);
    cards[sale].sale = true;
    const ks = pickN(E.keepsakePool(run), 2).map((id) => ({ id, base: R.int(130, 165) }));
    const ts = pickN(Object.keys(BL.TONICS), 2).map((id) => ({ id, base: R.int(45, 60) }));
    run.shop = { cards, keepsakes: ks, tonics: ts, removed: false };
  }
  E.genShop = genShop;

  E.buy = function (run, kind, i) {
    const s = run.shop;
    const item = s[kind][i];
    if (!item || item.sold) return false;
    const p = E.price(run, item.base);
    if (run.pearls < p) return false;
    if (kind === 'tonics' && run.tonics.indexOf(null) < 0) return false;
    run.pearls -= p;
    item.sold = true;
    if (kind === 'cards') E.addCard(run, item.id);
    if (kind === 'keepsakes') E.gainKeepsake(run, item.id);
    if (kind === 'tonics') E.gainTonic(run, item.id);
    return true;
  };
  E.freeRemoval = (run) => E.hasKit(run, 'marker') && !run.markerUsed;
  E.removePrice = (run) => (E.freeRemoval(run) ? 0 : E.price(run, run.removeCost));
  E.buyRemoval = function (run, uid) {
    const p = E.removePrice(run);
    if (run.shop.removed || run.pearls < p) return false;
    run.pearls -= p;
    if (E.freeRemoval(run)) run.markerUsed = true;
    else run.removeCost += 25;
    run.shop.removed = true;
    E.removeCard(run, uid);
    return true;
  };

  function genTreasure(run) {
    const R = makeR(run);
    run.treasure = { opened: false, pearls: R.int(35, 55), keepsake: null, choices: [] };
  }
  E.keepsakeChoices = function (run, n) {
    const R = makeR(run);
    return R.shuffle(E.keepsakePool(run)).slice(0, n);
  };
  E.openTreasure = function (run) {
    const t = run.treasure;
    if (t.opened) return;
    t.opened = true;
    run.pearls += t.pearls;
    t.choices = E.keepsakeChoices(run, 3);
  };
  E.takeTreasureKeepsake = function (run, k) {
    const t = run.treasure;
    if (!t || t.keepsake || t.keepsakeLeft || t.choices.indexOf(k) < 0) return;
    t.keepsake = k;
    E.gainKeepsake(run, k);
  };

  /* The Fog events of the run's band. */
  E.eventPool = (run) => BL.EVENTS.filter((ev) => E.band(run).events.indexOf(ev.id) >= 0);
  E.startEvent = function (run) {
    const R = makeR(run);
    const all = E.eventPool(run);
    let pool = all.filter((ev) => run.seenEvents.indexOf(ev.id) < 0);
    if (!pool.length) pool = all.slice();
    const ev = R.pick(pool);
    run.seenEvents.push(ev.id);
    run.event = { id: ev.id, stage: 'choose', text: null, next: null };
    run.screen = 'event';
  };
  E.eventDef = (run) => BL.EVENTS.find((e) => e.id === run.event.id);
  E.optionAvailable = function (run, opt) {
    if (!opt.cond) return true;
    return opt.cond(run, E);
  };
  E.chooseEventOption = function (run, i) {
    const ev = E.eventDef(run);
    const opt = ev.options[i];
    if (E.optionAvailable(run, opt) !== true) return null;
    const res = opt.act(run, E) || {};
    if (opt.decline) E.decline(run, 'event');
    run.event.stage = 'result';
    run.event.text = res.text || '';
    run.event.next = res.next || null;
    run.event.choice = i;
    return res;
  };

  /* ---------------- Combat ---------------- */
  function pickEncounter(run, kind) {
    const R = makeR(run);
    const pool = E.band(run).enc[kind];
    let cands = pool.filter((enc) => run.lastEnc.indexOf(enc.join('+')) < 0);
    if (!cands.length) cands = pool;
    const enc = R.pick(cands);
    run.lastEnc.push(enc.join('+'));
    if (run.lastEnc.length > 4) run.lastEnc.shift();
    return enc;
  }

  function spawnEnemy(run, c, id, idx) {
    const R = makeR(run);
    const d = BL.ENEMIES[id];
    const hp = Math.round(R.int(d.hp[0], d.hp[1]) * E.levelMods(run.level).hp);
    const e = { uid: 'e' + c.nextEid++, id, name: d.name, hp, maxHp: hp, ward: 0, st: {}, hist: [], mem: {}, intent: null, dead: false, acted: false };
    if (d.init) d.init(e, R, idx || 0);
    c.enemies.push(e);
    chooseIntent(run, c, e);
    return e;
  }

  function chooseIntent(run, c, e) {
    const R = makeR(run);
    const key = BL.ENEMIES[e.id].ai(e, c, R);
    e.intent = key;
    e.hist.push(key);
  }

  E.alive = (c) => c.enemies.filter((e) => !e.dead);
  E.enemyByUid = (c, uid) => c.enemies.find((e) => e.uid === uid && !e.dead);
  /* What you can target or attack: a Submerged enemy is out of reach until it acts or a Strand brings it up. */
  E.reachable = (e) => !e.dead && !(e.st.submerged > 0);
  E.targets = (c) => c.enemies.filter(E.reachable);
  E.targetByUid = (c, uid) => c.enemies.find((e) => e.uid === uid && E.reachable(e));

  E.startCombat = function (run, kind, enc, opts) {
    if (!enc) enc = pickEncounter(run, kind);
    const R = makeR(run);
    const c = {
      kind, enc: enc.slice(), turn: 0, light: 0, maxLight: 3, tide: TIDE_MID,
      draw: [], hand: [], discard: [], sunk: [], rites: [],
      player: { ward: 0, st: {} },
      enemies: [], fx: [], nextEid: 1, won: false, lost: false,
      flags: { hpLost: false }, phase: 'player', bonusPearls: (opts && opts.bonusPearls) || 0,
      turnCrests: 0, turnLows: 0, fightCrests: 0, maxChain: 0, maxLowChain: 0, echo: 0, dmgMul: E.levelMods(run.level).dmg, pearlsWon: 0,
    };
    run.combat = c;
    run.screen = 'combat';
    const pile = run.deck.map((card) => ({ uid: card.uid, id: card.id, up: card.up }));
    // Roil carried past the Hold, for this fight only. Seep never joins the deck.
    const roil = E.roil(run);
    const seep = roil.seep;
    for (let i = 0; i < seep; i++) pile.push(E.newCard(run, 'seep'));
    if (seep) c.seep = seep;
    if (roil.thrash) c.thrash = roil.thrash;
    // noShuffle (tutorial only): draw the deck in order, and refill from the discard pile in a fixed order
    if (opts && opts.noShuffle) { c.noShuffle = true; c.draw = pile.reverse(); } else c.draw = R.shuffle(pile);
    enc.forEach((id, idx) => spawnEnemy(run, c, id, idx));
    // creatures that followed the keeper from a Fog event join her next fight (not the tutorial)
    if (run.followers && run.followers.length && kind !== 'tutorial') {
      run.followers.forEach((id) => { if (c.enemies.length < 5) spawnEnemy(run, c, id, c.enemies.length).follower = true; });
      c.followers = run.followers.length;
      run.followers = [];
    }
    // Bell Minnows that follow the Roil come after the encounter's own enemies
    for (let i = 0; i < roil.minnows; i++) {
      const e = spawnEnemy(run, c, 'minnow', enc.length + i);
      e.roil = true;
      e.hp = e.maxHp = Math.max(1, Math.ceil(e.maxHp * E.ROIL_MINNOW_HP));
    }
    if (roil.minnows) c.roilMinnows = roil.minnows;
    if (E.has(run, 'whaletooth')) c.player.st.might = (c.player.st.might || 0) + 1;
    if (E.has(run, 'barnacleplate')) c.player.st.spines = (c.player.st.spines || 0) + BL.KEEPSAKES.barnacleplate.spines;
    if (E.has(run, 'moonshard')) c.tide = 5;
    if (E.has(run, 'sirenscale')) c.enemies.forEach((e) => { e.st.soaked = (e.st.soaked || 0) + 2; });
    if (E.has(run, 'echoconch')) c.echo = 1;
    if (roil.steps) fx(c, { t: 'roil', seep, thrash: roil.thrash, minnows: roil.minnows });
    if (kind === 'easy' || kind === 'hard') run.normalFights++;
    // before the first turn, so the Gorget's Ward stands against a first Thrash
    if (E.hasKit(run, 'gorget')) gainWard(c, c.player, 4);
    startPlayerTurn(run);
    return c;
  };

  function fx(c, o) { c.fx.push(o); }

  function attackValue(src, tgt, base) {
    let d = base + ((src && src.st.might) || 0);
    if (src && (src.st.chilled || 0) > 0) d = Math.floor(d * 0.75);
    if (tgt && (tgt.st.soaked || 0) > 0) d = Math.floor(d * 1.5);
    return Math.max(0, d);
  }
  E.attackValue = attackValue;

  /* Deal damage to target. `src` = attacker object (for Spines) or null. */
  function dealDamage(run, c, tgt, amount, src, isAttack) {
    if (!tgt || tgt.dead || c.won || c.lost) return 0;
    amount = Math.max(0, Math.floor(amount));
    const isPlayer = tgt === c.player;
    if (isPlayer && run.debugGod) amount = 0; // debug mode (js/debug.js): the keeper takes no damage
    const blocked = Math.min(tgt.ward, amount);
    tgt.ward -= blocked;
    const loss = amount - blocked;
    if (isPlayer) {
      run.hp -= loss;
      run.stats.dmgTaken += loss;
    } else {
      tgt.hp -= loss;
      if (src === c.player || src == null) run.stats.dmgDealt += Math.min(loss, loss + Math.min(0, tgt.hp));
    }
    fx(c, { t: 'dmg', who: isPlayer ? 'p' : tgt.uid, n: loss, blocked, attack: !!isAttack });
    if (isPlayer && loss > 0 && !c.flags.hpLost) {
      c.flags.hpLost = true;
      if (E.has(run, 'inksac')) { fx(c, { t: 'ks', k: 'inksac' }); E.alive(c).forEach((e) => applyStatus(run, c, e, 'chilled', 2, true)); }
    }
    if (isPlayer && run.hp <= 0) {
      run.hp = 0;
      c.lost = true;
      fx(c, { t: 'defeat' });
      return loss;
    }
    if (!isPlayer && tgt.hp <= 0) killEnemy(run, c, tgt);
    // Spines strike back at attackers
    if (isAttack && src && (tgt.st.spines || 0) > 0 && !src.dead && !c.lost) {
      dealDamage(run, c, src, tgt.st.spines, null, false);
    }
    return loss;
  }

  /* An enemy heals (a Glimmer Leech drinking what it took). */
  function healEnemy(c, e, n) {
    const h = Math.min(n, e.maxHp - e.hp);
    if (h <= 0 || e.dead) return 0;
    e.hp += h;
    fx(c, { t: 'heal', who: e.uid, n: h });
    return h;
  }

  /* Whatever an enemy swallowed comes back to the discard pile: when it dies, or when a Pale Gulper retches. */
  function disgorge(c, e) {
    const back = e.mem && e.mem.swallowed;
    if (!back || !back.length) return;
    back.forEach((card) => c.discard.push(card));
    fx(c, { t: 'disgorge', who: e.uid, names: back.map(E.cardName) });
    e.mem.swallowed = [];
    delete e.st.swallowed;
  }

  function killEnemy(run, c, e) {
    e.hp = 0;
    e.dead = true;
    e.ward = 0;
    run.stats.kills = (run.stats.kills || 0) + 1;
    fx(c, { t: 'die', who: e.uid });
    disgorge(c, e);
    const A = api(run, c);
    E.alive(c).forEach((o) => {
      const d = BL.ENEMIES[o.id];
      if (d.onAllyDeath) d.onAllyDeath(o, e, A);
    });
    // when the boss falls, its shoal scatters
    if (BL.ENEMIES[e.id].boss) E.alive(c).forEach((o) => { o.hp = 0; o.dead = true; fx(c, { t: 'die', who: o.uid }); });
    if (E.alive(c).length === 0) {
      c.won = true;
      fx(c, { t: 'victory' });
    }
  }

  function loseHpDirect(run, c, tgt, n) {
    if (tgt === c.player && run.debugGod) return;
    if (n <= 0) return;
    if (tgt === c.player) {
      run.hp -= n;
      run.stats.dmgTaken += n;
      fx(c, { t: 'dmg', who: 'p', n, blocked: 0, brine: true });
      if (!c.flags.hpLost) {
        c.flags.hpLost = true;
        if (E.has(run, 'inksac')) { fx(c, { t: 'ks', k: 'inksac' }); E.alive(c).forEach((e) => applyStatus(run, c, e, 'chilled', 2, true)); }
      }
      if (run.hp <= 0) { run.hp = 0; c.lost = true; fx(c, { t: 'defeat' }); }
    } else {
      tgt.hp -= n;
      run.stats.dmgDealt += n;
      fx(c, { t: 'dmg', who: tgt.uid, n, blocked: 0, brine: true });
      if (tgt.hp <= 0) killEnemy(run, c, tgt);
    }
  }

  function gainWard(c, tgt, n) {
    if (n <= 0) return;
    tgt.ward += n;
    fx(c, { t: 'ward', who: tgt === c.player ? 'p' : tgt.uid, n });
  }

  function applyStatus(run, c, tgt, key, n, fromPlayer) {
    if (!tgt || tgt.dead || n <= 0) return;
    if (key === 'brine' && fromPlayer && tgt !== c.player && E.has(run, 'saltedhook')) n += 1;
    tgt.st[key] = (tgt.st[key] || 0) + n;
    fx(c, { t: 'status', who: tgt === c.player ? 'p' : tgt.uid, key, n });
  }

  function drawCards(run, c, n) {
    const R = makeR(run);
    for (let i = 0; i < n; i++) {
      if (c.hand.length >= HAND_MAX) break;
      if (!c.draw.length) {
        if (!c.discard.length) break;
        c.draw = c.noShuffle ? c.discard.sort((a, b) => b.uid - a.uid) : R.shuffle(c.discard);
        c.discard = [];
        fx(c, { t: 'shuffle' });
      }
      c.hand.push(c.draw.pop());
    }
  }

  /* The bell in your kit pays out when you Crest or Strand (kind: 'crest' or 'low'; the code calls a Strand
     a low or lowWater, and the Swell the tide). Each bell lists what it gives: `crest`, `low`, or `after`
     (from the second Crest or Strand of a turn on). Until v0.18.0 the Flood, Ebb and Cracked Bells drew
     2 cards and did nothing else; a second card is little use without the Light to play it. */
  E.BELLS = {
    tidebell: { crest: { draw: 1 }, low: { draw: 1 } },
    floodbell: { crest: { draw: 1, light: 1 } },
    ebbbell: { low: { draw: 1, ward: 3 } }, // a Strand already gives Light, and 1 more made every free Bail pay
    crackedbell: { after: { draw: 2, light: 1 } },
  };
  E.bellGain = function (bell, kind, chain) { // chain: Crests and Strands so far this turn, this one included
    const b = E.BELLS[bell];
    if (!b) return null;
    return (b.after ? (chain >= 2 ? b.after : null) : b[kind]) || null;
  };
  E.bellDraw = (bell, kind, chain) => { const g = E.bellGain(bell, kind, chain); return (g && g.draw) || 0; };
  function onTideTurn(run, c, kind) {
    const g = E.bellGain(E.bell(run), kind, c.turnCrests + c.turnLows);
    if (!g) return;
    fx(c, { t: 'kit', k: 'bell' });
    if (g.light) { c.light += g.light; fx(c, { t: 'light', n: g.light }); }
    if (g.ward) gainWard(c, c.player, g.ward);
    if (g.draw) drawCards(run, c, g.draw);
  }

  /* Wave damage (Crests and similar): not an attack, but Soaked targets take 50% more. */
  function waveValue(tgt, n) {
    return (tgt.st.soaked || 0) > 0 ? Math.floor(n * 1.5) : n;
  }
  E.waveValue = waveValue;
  E.crestDamage = function (run, c, chain) {
    let dmg = 6 + 3 * Math.max(0, chain - 1) + (E.has(run, 'tidewatch') ? 4 : 0);
    dmg *= 1 + (c.player.st.r_maelstrom || 0);
    return dmg;
  };
  function gainPearls(run, c, n) {
    if (n <= 0) return;
    run.pearls += n;
    c.pearlsWon += n;
    fx(c, { t: 'pearls', n });
  }

  /* Fight-end bonus Pearls for chains: Tidal Fury (2+ Crests in a turn) and High and Dry (2+ Strands). */
  E.chainBonus = (chain) => (chain >= 2 ? 6 * chain : 0);
  /* The bonus a new best chain earns, for the moment it happens (0 when it isn't a new best or nothing pays). */
  function newChainBonus(run, c, chain, best) {
    if (chain < 2 || chain <= best || run.tutorial || c.kind === 'boss') return 0;
    return E.chainBonus(chain);
  }

  /* Crest: the wave breaks. Each extra Crest in the same turn hits 3 harder. */
  function crest(run, c) {
    if (c.won || c.lost) return;
    c.turnCrests++;
    c.fightCrests++;
    const fury = newChainBonus(run, c, c.turnCrests, c.maxChain);
    c.maxChain = Math.max(c.maxChain, c.turnCrests);
    run.stats.maxChain = Math.max(run.stats.maxChain || 0, c.turnCrests);
    const dmg = E.crestDamage(run, c, c.turnCrests);
    run.stats.crests++;
    fx(c, { t: 'crest', n: dmg, chain: c.turnCrests, fury });
    E.alive(c).forEach((e) => dealDamage(run, c, e, waveValue(e, dmg), null, false));
    if (E.hasKit(run, 'net')) { fx(c, { t: 'kit', k: 'ditty' }); gainPearls(run, c, 3); }
    const mem = c.player.st.r_tidalmemory || 0;
    if (mem) { c.light += mem; fx(c, { t: 'light', n: mem }); }
    c.tide = TIDE_MID;
    onTideTurn(run, c, 'crest');
  }
  /* Strand: the water pulls back and strands the enemies. They lose all their Ward, and you gain 1 Light. */
  function lowWater(run, c) {
    if (c.won || c.lost) return;
    c.turnLows++;
    const ebb = newChainBonus(run, c, c.turnLows, c.maxLowChain || 0);
    c.maxLowChain = Math.max(c.maxLowChain || 0, c.turnLows);
    run.stats.lows++;
    run.stats.maxLowChain = Math.max(run.stats.maxLowChain || 0, c.turnLows);
    const stripped = [];
    E.alive(c).forEach((e) => { if (e.ward > 0) { stripped.push({ who: e.uid, n: e.ward }); e.ward = 0; } });
    // stranded, nothing can stay sunk out of reach
    const surfaced = [];
    E.alive(c).forEach((e) => { if (e.st.submerged) { delete e.st.submerged; surfaced.push(e.uid); } });
    c.light += 1;
    fx(c, { t: 'low', chain: c.turnLows, stripped, surfaced, light: 1, ebb });
    if (E.has(run, 'kelpbracelet')) { fx(c, { t: 'ks', k: 'kelpbracelet' }); gainWard(c, c.player, 8); }
    const abyss = (c.player.st.r_abyss || 0) + (E.has(run, 'anchor') ? 4 : 0);
    if (E.has(run, 'anchor')) fx(c, { t: 'ks', k: 'anchor' });
    if (abyss) E.alive(c).forEach((e) => dealDamage(run, c, e, waveValue(e, abyss), null, false));
    c.tide = TIDE_MID;
    onTideTurn(run, c, 'low');
  }
  /* Surge/Ebb carry over: surplus keeps flowing after the reset, so big swells can Crest twice. */
  function surge(run, c, n) {
    if (n <= 0 || c.won || c.lost) return;
    fx(c, { t: 'tide', d: n });
    let left = n;
    let guard = 0;
    while (left > 0 && !c.won && !c.lost && guard++ < 20) {
      const need = TIDE_MAX - c.tide;
      if (left >= need) { left -= need; c.tide = TIDE_MAX; crest(run, c); }
      else { c.tide += left; left = 0; }
    }
    const sd = c.player.st.r_spindrift || 0;
    if (sd && !c.won && !c.lost) {
      const al = E.alive(c);
      if (al.length) {
        const t = makeR(run).pick(al);
        fx(c, { t: 'spray', who: t.uid });
        dealDamage(run, c, t, sd, null, false);
      }
    }
  }
  function ebb(run, c, n) {
    if (n <= 0 || c.won || c.lost) return;
    fx(c, { t: 'tide', d: -n });
    let left = n;
    let guard = 0;
    while (left > 0 && !c.won && !c.lost && guard++ < 20) {
      const need = c.tide;
      if (left >= need) { left -= need; c.tide = 0; lowWater(run, c); }
      else { c.tide -= left; left = 0; }
    }
  }

  /* Bail and Stir: once a turn, without a card, spend 1 Light to move the Swell 1 step. Bail Ebbs 1 and Stir Surges 1.
     A Strand gives 1 Light, so a Bail that makes a Strand pays for itself; a Stir that makes a Crest does not. That
     is on purpose: Strands are the harder end to reach. The tutorial teaches Bail on its third turn. */
  E.SWELL_ACTS = { bail: { name: 'Bail', ebb: 1 }, stir: { name: 'Stir', surge: 1 } };
  E.SWELL_ACT_COST = 1;
  E.canSwellAct = function (run) {
    const c = run.combat;
    if (!c) return { ok: false, reason: 'Not in a fight' };
    if (c.phase !== 'player' || c.won || c.lost) return { ok: false, reason: 'Not your turn' };
    if (c.swellActTurn === c.turn) return { ok: false, reason: 'Once a turn: you have already Bailed or Stirred' };
    if (c.light < E.SWELL_ACT_COST) return { ok: false, reason: 'Not enough Light' };
    return { ok: true };
  };
  E.swellAct = function (run, kind) {
    const act = E.SWELL_ACTS[kind];
    if (!act || !E.canSwellAct(run).ok) return false;
    const c = run.combat;
    c.light -= E.SWELL_ACT_COST;
    c.swellActTurn = c.turn;
    run.stats[kind === 'bail' ? 'bails' : 'stirs'] = (run.stats[kind === 'bail' ? 'bails' : 'stirs'] || 0) + 1;
    fx(c, { t: 'swellact', kind });
    if (act.ebb) ebb(run, c, act.ebb);
    else surge(run, c, act.surge);
    return true;
  };

  /* The API that card and tonic effects use. */
  function api(run, c) {
    const R = makeR(run);
    const P = c.player;
    const A = {
      tide: () => c.tide,
      hit(t, base, hits) {
        hits = hits || 1;
        for (let i = 0; i < hits; i++) {
          if (!t || t.dead || c.lost) break;
          fx(c, { t: 'slash', who: t.uid });
          dealDamage(run, c, t, attackValue(P, t, base), P, true);
        }
      },
      // attacks on ALL or on a random enemy reach only what is in reach (not a Submerged enemy)
      hitAll(base, hits) {
        hits = hits || 1;
        for (let i = 0; i < hits; i++) {
          fx(c, { t: 'sweep' });
          E.targets(c).forEach((e) => dealDamage(run, c, e, attackValue(P, e, base), P, true));
        }
      },
      hitRandom(base, hits) {
        for (let i = 0; i < hits; i++) {
          const al = E.targets(c);
          if (!al.length || c.lost) break;
          const t = R.pick(al);
          fx(c, { t: 'slash', who: t.uid });
          dealDamage(run, c, t, attackValue(P, t, base), P, true);
        }
      },
      wave(n) { E.alive(c).forEach((e) => dealDamage(run, c, e, waveValue(e, n), null, false)); },
      ward: (n) => gainWard(c, P, n),
      wardNow: () => P.ward,
      crestsThisTurn: () => c.turnCrests,
      pearls: (n) => gainPearls(run, c, n),
      echo: (n) => { c.echo += n; },
      surge: (n) => surge(run, c, n),
      ebb: (n) => ebb(run, c, n),
      crest: () => { c.tide = TIDE_MAX; crest(run, c); },
      lowWater: () => { c.tide = 0; lowWater(run, c); },
      drain: () => { if (c.won || c.lost) return; c.tide = 0; fx(c, { t: 'tide', d: -6 }); lowWater(run, c); },
      apply: (t, key, n) => applyStatus(run, c, t, key, n, true),
      applyAll: (key, n) => E.alive(c).forEach((e) => applyStatus(run, c, e, key, n, true)),
      buff: (key, n) => applyStatus(run, c, P, key, n, false),
      rite: (key, n) => applyStatus(run, c, P, key, n, false),
      draw: (n) => drawCards(run, c, n),
      light: (n) => { c.light += n; fx(c, { t: 'light', n }); },
      heal: (n) => { const h = E.heal(run, n); fx(c, { t: 'heal', who: 'p', n: h }); },
      enemyBuff: (e, key, n) => applyStatus(run, c, e, key, n, false),
    };
    return A;
  }

  function startPlayerTurn(run) {
    const c = run.combat;
    if (c.won || c.lost) return;
    c.turn++;
    c.phase = 'player';
    c.turnCrests = 0;
    c.turnLows = 0;
    c.lastPlayed = null;
    const P = c.player;
    // Thrash lands before last turn's Ward washes away, so Ward left over after the enemies stops it
    if (c.thrash) {
      fx(c, { t: 'thrash', n: c.thrash });
      dealDamage(run, c, P, c.thrash, null, false);
      if (c.lost) return;
    }
    if (c.turn > 1) P.ward = 0; // on the first turn the only Ward is the Shell Gorget's, which lasts the turn
    if ((P.st.brine || 0) > 0) {
      loseHpDirect(run, c, P, P.st.brine);
      P.st.brine--;
      if (c.lost) return;
    }
    // a doused lantern starts the turn with less Light
    const doused = P.st.doused || 0;
    delete P.st.doused;
    c.light = Math.max(0, c.maxLight + (E.has(run, 'stormbottle') && c.turn % 3 === 0 ? 1 : 0) - doused);
    if (doused) { c.dousedTurn = c.turn; fx(c, { t: 'doused', n: doused }); }
    drawCards(run, c, 5 + (c.turn === 1 && E.has(run, 'gullfeather') ? 2 : 0));
    if (P.st.r_moonpull) surge(run, c, P.st.r_moonpull);
    fx(c, { t: 'turn', turn: c.turn });
  }

  /* ----- Player actions ----- */
  E.playable = function (run, card) {
    const c = run.combat;
    const d = BL.CARDS[card.id];
    if (!c || c.phase !== 'player' || c.won || c.lost) return { ok: false, reason: 'Not your turn' };
    if (d.unplayable) return { ok: false, reason: 'Unplayable' };
    if (E.cost(card, c) > c.light) return { ok: false, reason: 'Not enough Light' };
    if (d.target === 'enemy' && !E.targets(c).length) return { ok: false, reason: 'Nothing in reach' };
    return { ok: true };
  };

  E.needsTarget = (card) => BL.CARDS[card.id].target === 'enemy';
  /* A card's numbers as it would play right now: the Honed Harpoon adds to the first Harpoon Jab of a fight. */
  E.playVals = function (run, card, harpoon) {
    const v = E.vals(card);
    if (harpoon === undefined) harpoon = card.id === 'jab' && run.combat && !run.combat.jabbed ? (run.kit && run.kit.harpoon) : null;
    return harpoon === 'honed' ? Object.assign({}, v, { dmg: v.dmg + BL.KIT.honed.dmg }) : v;
  };

  E.playCard = function (run, uid, targetUid) {
    const c = run.combat;
    const idx = c.hand.findIndex((x) => x.uid === uid);
    if (idx < 0) return false;
    const card = c.hand[idx];
    const d = BL.CARDS[card.id];
    if (!E.playable(run, card).ok) return false;
    let target = null;
    if (d.target === 'enemy') {
      target = targetUid ? E.enemyByUid(c, targetUid) : null;
      if (target && !E.reachable(target)) return false; // Submerged: out of reach
      if (!target) {
        const al = E.targets(c);
        if (al.length === 1) target = al[0];
        else return false;
      }
    }
    c.light -= E.cost(card, c);
    c.hand.splice(idx, 1);
    run.stats.cardsPlayed++;
    c.lastPlayed = card.uid; // what a Pale Gulper swallows
    fx(c, { t: 'play', uid: card.uid, target: target ? target.uid : null, type: d.type });
    const A = api(run, c);
    const harpoon = card.id === 'jab' && !c.jabbed ? (run.kit && run.kit.harpoon) : null;
    if (card.id === 'jab') c.jabbed = true;
    if (d.play) d.play(A, E.playVals(run, card, harpoon), target);
    if (harpoon === 'barbed' && target && !target.dead && !c.won) { fx(c, { t: 'kit', k: 'harpoon' }); applyStatus(run, c, target, 'brine', BL.KIT.barbed.brine, true); }
    // Echo: the card resolves a second time
    if (c.echo > 0 && !d.givesEcho && d.type !== 'status' && d.type !== 'curse' && !c.won && !c.lost) {
      c.echo--;
      let t2 = target;
      if (d.target === 'enemy' && (!t2 || !E.reachable(t2))) t2 = E.targets(c)[0] || null;
      fx(c, { t: 'echo', name: d.name });
      if (d.target !== 'enemy' || t2) d.play(A, E.vals(card), t2);
    }
    if (d.type === 'rite') {
      c.rites.push(card);
      if (E.has(run, 'coralcrown')) { fx(c, { t: 'ks', k: 'coralcrown' }); gainWard(c, c.player, 5); }
    } else if (d.sink) {
      c.sunk.push(card);
    } else {
      c.discard.push(card);
    }
    return true;
  };

  /* What playing a card would do right now, worked out by playing it on a copy of the state.
     The UI uses it for the CREST / LETHAL / VICTORY / STRAND badges. Pass `json` (the run
     serialized with map/shop/event/rewards/treasure dropped) to reuse one copy for many previews. */
  E.previewJSON = (run) => JSON.stringify(Object.assign({}, run, { map: null, shop: null, event: null, rewards: null, treasure: null, log: [] }), (k, v) => (k === 'fx' ? [] : v));
  E.preview = function (run, uid, targetUid, json) {
    const c = run.combat;
    if (!c || c.phase !== 'player' || c.won || c.lost) return null;
    const r2 = JSON.parse(json || E.previewJSON(run));
    if (!E.playCard(r2, uid, targetUid)) return null;
    const c2 = r2.combat;
    let damage = 0;
    let kills = 0;
    c.enemies.forEach((e, i) => {
      const e2 = c2.enemies[i];
      if (!e2) return;
      damage += Math.max(0, e.hp) - Math.max(0, e2.hp);
      if (e2.dead && !e.dead) kills++;
    });
    // Ward the play's Strands would strip (after the card's own hit has worn some of it down)
    const stripped = (c2.fx || []).reduce((a, f) => a + (f.t === 'low' ? f.stripped.reduce((x, s) => x + s.n, 0) : 0), 0);
    return { crests: c2.turnCrests - c.turnCrests, lows: c2.turnLows - c.turnLows, chain: c2.turnCrests, kills, won: c2.won, damage, stripped };
  };

  E.useTonic = function (run, slot, targetUid) {
    const t = run.tonics[slot];
    if (!t) return false;
    const td = BL.TONICS[t];
    const c = run.combat;
    if (!c || c.phase !== 'player' || c.won || c.lost) {
      if (td.anywhere && t === 'kelptea') {
        E.heal(run, 15);
        run.tonics[slot] = null;
        return true;
      }
      return false;
    }
    let target = null;
    if (td.target === 'enemy') {
      target = targetUid ? E.enemyByUid(c, targetUid) : null;
      if (target && !E.reachable(target)) return false; // Submerged: out of reach
      if (!target) {
        const al = E.targets(c);
        if (al.length === 1) target = al[0];
        else return false;
      }
    }
    const A = api(run, c);
    run.tonics[slot] = null;
    fx(c, { t: 'tonic', id: t });
    switch (t) {
      case 'kelptea': A.heal(15); break;
      case 'ink': A.apply(target, 'chilled', 3); break;
      case 'squall': A.wave(12); break;
      case 'lampoil': A.light(2); break;
      case 'shell': A.ward(12); break;
      case 'moonwater': A.crest(); break;
      case 'brine': A.apply(target, 'brine', 8); break;
    }
    return true;
  };
  E.discardTonic = function (run, slot) { run.tonics[slot] = null; };

  /* ----- End of turn, split into steps so the UI can animate each enemy ----- */
  E.endTurnStart = function (run) {
    const c = run.combat;
    if (c.phase !== 'player' || c.won || c.lost) return false;
    c.phase = 'enemy';
    const P = c.player;
    if (P.st.r_beam) {
      const al = E.alive(c);
      if (al.length && c.tide > 0) {
        const t = makeR(run).pick(al);
        fx(c, { t: 'beam', who: t.uid });
        dealDamage(run, c, t, P.st.r_beam * c.tide, null, false);
      }
    }
    const keep = [];
    c.hand.forEach((card) => {
      const d = BL.CARDS[card.id];
      if (d.float) keep.push(card);
      else if (d.fade) c.sunk.push(card);
      else c.discard.push(card);
    });
    c.hand = keep;
    // The keeper's Soaked and Chilled wear off after the enemy turn, so a stack the keeper has now
    // also covers the attacks that follow (as the intents show). Stacks enemies add this turn stay.
    c.pDecay = ['soaked', 'chilled'].filter((k) => (P.st[k] || 0) > 0);
    c.enemies.forEach((e) => { e.acted = false; });
    return true;
  };

  function decay(o) {
    ['soaked', 'chilled'].forEach((k) => {
      if (o.st[k] > 0) o.st[k]--;
      if (!o.st[k]) delete o.st[k];
    });
    Object.keys(o.st).forEach((k) => { if (!o.st[k]) delete o.st[k]; });
  }

  E.enemyOrder = (c) => E.alive(c).map((e) => e.uid);

  E.enemyStep = function (run, uid) {
    const c = run.combat;
    if (c.won || c.lost) return false;
    const e = E.enemyByUid(c, uid);
    if (!e) return false;
    e.acted = true;
    if (!e.st.shell) e.ward = 0; // a Shell keeps its Ward from turn to turn
    if (e.st.submerged) delete e.st.submerged; // it comes up to act
    if ((e.st.brine || 0) > 0) {
      loseHpDirect(run, c, e, e.st.brine);
      if (e.dead) { run.stats.brineKills = (run.stats.brineKills || 0) + 1; return true; }
      e.st.brine--;
      if (!e.st.brine) delete e.st.brine;
    }
    enemyAct(run, c, e);
    return true;
  };

  function enemyAct(run, c, e) {
    const d = BL.ENEMIES[e.id];
    const m = d.moves[e.intent];
    if (!m) return;
    const P = c.player;
    fx(c, { t: 'act', who: e.uid, name: m.name, attack: !!m.dmg });
    if (m.phase) fx(c, { t: 'phase', who: e.uid, text: m.phase });
    if (m.dmg && E.moveDamage(c, e, m) > 0) { // a move whose damage falls to 0 (a muffled Wild Peal) doesn't hit at all
      const base = E.moveDamage(c, e, m);
      const hits = m.hits || 1;
      let took = 0;
      for (let i = 0; i < hits; i++) {
        if (c.lost || e.dead) break;
        took += dealDamage(run, c, P, attackValue(e, P, base), e, true);
      }
      if (m.drain && took > 0 && !e.dead) healEnemy(c, e, took);
    }
    if (c.lost || e.dead) return;
    if (m.ward) gainWard(c, e, m.ward);
    if (m.submerge) { e.st.submerged = 1; fx(c, { t: 'submerge', who: e.uid }); }
    if (m.swallow) {
      // it swallows the last card you played this turn, if that card is in the discard pile
      const i = c.lastPlayed != null ? c.discard.findIndex((x) => x.uid === c.lastPlayed) : -1;
      if (i >= 0) {
        const card = c.discard.splice(i, 1)[0];
        e.mem.swallowed = (e.mem.swallowed || []).concat([card]);
        e.st.swallowed = e.mem.swallowed.length;
        fx(c, { t: 'swallow', who: e.uid, name: E.cardName(card) });
      }
    }
    if (m.buff) Object.keys(m.buff).forEach((k) => applyStatus(run, c, e, k, m.buff[k], false));
    if (m.debuff) Object.keys(m.debuff).forEach((k) => applyStatus(run, c, P, k, m.debuff[k], false));
    if (m.addCards) {
      const R = makeR(run);
      for (let i = 0; i < m.addCards.n; i++) {
        const card = E.newCard(run, m.addCards.id);
        if (m.addCards.pile === 'draw') c.draw.splice(R.int(0, c.draw.length), 0, card);
        else c.discard.push(card);
      }
      fx(c, { t: 'addcards', id: m.addCards.id, n: m.addCards.n, pile: m.addCards.pile });
    }
    if (m.tide) {
      if (m.tide < 0) ebb(run, c, -m.tide);
      else surge(run, c, m.tide);
    }
    if (m.tideSet != null && c.tide !== m.tideSet) {
      fx(c, { t: 'tide', d: m.tideSet - c.tide });
      c.tide = m.tideSet;
    }
    if (m.disgorge) disgorge(c, e);
    if (m.summon) {
      m.summon.forEach((id) => {
        if (E.alive(c).length < 5) {
          const s = spawnEnemy(run, c, id, 0); // acts from next turn (not in this turn's order)
          fx(c, { t: 'summon', who: s.uid });
        }
      });
    }
    if (m.after) m.after(e);
  }

  E.endTurnFinish = function (run) {
    const c = run.combat;
    if (c.won || c.lost) return;
    const P = c.player;
    (c.pDecay || []).forEach((k) => { if (P.st[k] > 0) P.st[k]--; });
    Object.keys(P.st).forEach((k) => { if (!P.st[k]) delete P.st[k]; });
    c.pDecay = null;
    E.alive(c).forEach((e) => {
      decay(e);
      if (e.acted) chooseIntent(run, c, e);
      e.acted = false;
    });
    startPlayerTurn(run);
  };

  /* Run the whole enemy phase synchronously (used by tests / simulation). */
  E.endTurn = function (run) {
    if (!E.endTurnStart(run)) return;
    E.enemyOrder(run.combat).forEach((uid) => E.enemyStep(run, uid));
    E.endTurnFinish(run);
  };

  /* A move's damage per hit before Might, Chilled and Soaked. Some moves depend on the fight (the Swell). */
  E.moveDamage = (c, e, m) => Math.round((typeof m.dmg === 'function' ? m.dmg(e, c) : m.dmg) * (c.dmgMul || 1));

  /* Intent as shown to the player. */
  E.intentInfo = function (run, e) {
    const c = run.combat;
    const m = BL.ENEMIES[e.id].moves[e.intent];
    if (!m) return null;
    const info = { name: m.name, kinds: [], dmg: 0, hits: 0, ward: m.ward || 0, parts: [] };
    if (m.dmg) {
      const base = E.moveDamage(c, e, m);
      info.dmg = base > 0 ? attackValue(e, c.player, base) : 0;
      info.hits = m.hits || 1;
      info.kinds.push('attack');
      info.parts.push(`Attack for ${info.dmg}${info.hits > 1 ? ' x' + info.hits : ''}`);
      if (m.drain) info.parts.push('Heal as much HP as the attack takes from you');
      if (m.tip) info.parts.push(m.tip);
    }
    if (m.ward) { info.kinds.push('defend'); info.parts.push(`Gain ${m.ward} Ward`); }
    if (m.submerge) { info.kinds.push('buff'); info.parts.push('Sink out of reach until its next turn: only Crests and waves reach it, and a Strand brings it up'); }
    if (m.swallow) { info.kinds.push('debuff'); info.parts.push('Swallow the last card you play this turn, until it dies'); }
    if (m.buff) {
      info.kinds.push('buff');
      Object.keys(m.buff).forEach((k) => info.parts.push(`Gain ${m.buff[k]} ${BL.STATUSES[k].name}`));
    }
    if (m.debuff) {
      info.kinds.push('debuff');
      Object.keys(m.debuff).forEach((k) => info.parts.push(k === 'doused'
        ? `Douse your lantern: ${m.debuff[k]} less Light next turn`
        : `Apply ${m.debuff[k]} ${BL.STATUSES[k].name}`));
    }
    if (m.addCards) {
      info.kinds.push('debuff');
      info.parts.push(`Shuffle ${m.addCards.n} ${BL.CARDS[m.addCards.id].name} into your draw pile`);
    }
    if (m.tide) { info.kinds.push('debuff'); info.parts.push(m.tide < 0 ? `Drag your Swell down by ${-m.tide}` : `Raise your Swell by ${m.tide}`); }
    if (m.tideSet != null) { info.kinds.push('debuff'); info.parts.push(`Flatten your Swell back to ${m.tideSet}`); }
    if (m.disgorge && e.mem.swallowed && e.mem.swallowed.length) info.parts.push('Bring up the cards it swallowed: they go back to your discard pile');
    if (m.summon) { info.kinds.push('summon'); info.parts.push('Call for help'); }
    return info;
  };

  /* ----- After a fight ----- */
  E.finishCombat = function (run) {
    const c = run.combat;
    if (!c || !c.won) return;
    const R = makeR(run);
    run.stats.fights++;
    if (c.kind === 'elite') run.stats.elites++;
    if (!c.flags.hpLost) run.stats.flawless = (run.stats.flawless || 0) + 1;
    if (c.kind === 'elite' && run.deck.length <= 12) run.stats.leanDread = true;
    if (c.kind === 'boss') {
      run.screen = 'victory';
      run.combat = null;
      return;
    }
    const elite = c.kind === 'elite';
    let pearls = elite ? R.int(30, 40) : R.int(14, 22);
    pearls += c.bonusPearls || 0;
    if (E.hasKit(run, 'pouch')) pearls += 10;
    const bonuses = [];
    if (!c.flags.hpLost) bonuses.push({ name: 'Flawless', desc: 'Won without losing HP', pearls: elite ? 20 : 12 });
    if (c.turn <= (elite ? 4 : 3)) bonuses.push({ name: 'Swift', desc: `Won on turn ${c.turn}`, pearls: elite ? 12 : 8 });
    if (c.maxChain >= 2) bonuses.push({ name: 'Tidal Fury', desc: `${c.maxChain} Crests in a single turn`, pearls: E.chainBonus(c.maxChain) });
    if ((c.maxLowChain || 0) >= 2) bonuses.push({ name: 'High and Dry', desc: `${c.maxLowChain} Strands in a single turn`, pearls: E.chainBonus(c.maxLowChain) });
    bonuses.forEach((b) => { pearls += b.pearls; });
    run.stats.bonuses = (run.stats.bonuses || 0) + bonuses.length;
    run.pearls += pearls;
    // a Dread pays in Pearls and a pick of keepsakes only (until v0.16.0 it also offered a card and often a tonic)
    const upChance = 0.15 + 0.02 * run.floor;
    const cards = elite ? [] : E.rewardCards(run, 'normal').map((id) => ({ id, up: R.chance(upChance) ? 1 : 0 }));
    const rw = { pearls, bonuses, cards, elite, cardTaken: elite, tonic: null, tonicTaken: false, keepsake: null, keepsakeChoices: [] };
    if (!elite && R.chance(0.4)) rw.tonic = E.randomTonic(run);
    if (elite) rw.keepsakeChoices = E.keepsakeChoices(run, 2);
    run.rewards = rw;
    run.combat = null;
    run.screen = 'reward';
  };

  E.takeRewardCard = function (run, i) {
    const rw = run.rewards;
    if (!rw || rw.cardTaken) return;
    rw.cardTaken = true;
    rw.cardTakenIdx = i == null ? -1 : i;
    const pick = i == null ? null : rw.cards[i];
    if (pick) E.addCard(run, pick.id, pick.up);
    else E.decline(run, E.skipCardKind(rw));
  };
  /* A card picked from an event's choice of cards; null skips it. */
  E.takeEventCard = function (run, id) {
    if (id) E.addCard(run, id);
    else E.decline(run, 'eventCard');
  };
  /* Turning down a reward adds to the final score, more for a bigger reward: a fight's card, a Dread's
     card, an event's card pick, an event's Leave / Decline, a tonic left behind with a free slot. */
  E.DECLINE_SCORE = { card: 50, eliteCard: 80, eventCard: 50, event: 50, tonic: 20, keepsake: 80 };
  /* Saves from before the tiers counted 20 a decline and kept only the count. */
  E.declinePoints = (st) => (st.declineScore != null ? st.declineScore : (st.declined || 0) * 20);
  E.decline = function (run, kind) {
    const st = run.stats;
    st.declineScore = E.declinePoints(st) + (E.DECLINE_SCORE[kind] || 0);
    st.declined = (st.declined || 0) + 1;
  };
  /* A Dread's reward has keepsakes on offer (older saves have no elite flag). */
  E.skipCardKind = (rw) => ((rw && (rw.elite != null ? rw.elite : rw.keepsakeChoices && rw.keepsakeChoices.length > 0)) ? 'eliteCard' : 'card');
  E.takeRewardKeepsake = function (run, k) {
    const rw = run.rewards;
    if (!rw || rw.keepsake || rw.keepsakeLeft || rw.keepsakeChoices.indexOf(k) < 0) return;
    rw.keepsake = k;
    E.gainKeepsake(run, k);
  };

  /* Score for the end screen, line by line: what each line counted, its points, and the depth's multiplier.
     `n` is the count shown (null for a flat amount), `each` the points per one. Lines worth nothing are left out. */
  E.scoreParts = function (run, won) {
    const st = run.stats;
    const lines = [
      ['Landings reached', run.floor, 40],
      ['Creatures defeated', st.kills || 0, 12],
      ['Dreads defeated', st.elites || 0, 80],
      ['Crests', st.crests || 0, 6],
      ['Most Crests in one turn', st.maxChain || 0, 30],
      ['Strands', st.lows || 0, 6],
      ['Most Strands in one turn', st.maxLowChain || 0, 30],
      ['Bonuses (Flawless, Swift and chains)', st.bonuses || 0, 15],
      ['Rewards turned down', st.declined || 0, null, E.declinePoints(st)],
    ];
    if (won) lines.push(['The Lantern Heart brought home', null, null, 600], ['HP left', run.hp, 5]);
    const parts = lines.map(([label, n, each, flat]) => ({ label, n, each, pts: flat != null ? flat : n * each })).filter((p) => p.pts > 0);
    const sum = parts.reduce((a, p) => a + p.pts, 0);
    const mult = 1 + 0.25 * (run.level || 0);
    return { parts, sum, mult, total: Math.round(sum * mult) };
  };
  E.score = (run, won) => E.scoreParts(run, won).total;
  E.takeRewardTonic = function (run) {
    const rw = run.rewards;
    if (!rw || !rw.tonic || rw.tonicTaken) return false;
    if (!E.gainTonic(run, rw.tonic)) return false;
    rw.tonicTaken = true;
    return true;
  };

  /* ---------------- Workshop: progression that lasts across runs ----------------
     `meta` is the player's lasting state (the UI keeps it in localStorage):
     { salvage, earned, owned: [kit ids], kit: { place: id }, ach: [achievement ids],
       lazaret: [keepsake ids kept at home], bring: [the ones chosen for the next descent], lazOpen,
       record: { runs, wins, deep } }. */
  E.SALVAGE_PER_SCORE = 50;
  E.salvageFor = (score) => Math.max(0, Math.floor((score || 0) / E.SALVAGE_PER_SCORE));
  E.newMeta = () => ({ salvage: 0, earned: 0, owned: [], kit: E.fitKit(), ach: [], lazaret: [], bring: [], lazOpen: false, record: E.newRecord() });
  /* The logbook: finished runs, counted since v0.13.0. `deep` is the deepest landing reached: { level, floor }. */
  E.newRecord = () => ({ runs: 0, wins: 0, deep: null });
  E.recordRun = function (meta, run, won) {
    if (!run || run.tutorial) return meta.record;
    const r = meta.record;
    r.runs++;
    if (won) r.wins++;
    const lv = run.level || 0, fl = run.floor || 0;
    if (!r.deep || lv > r.deep.level || (lv === r.deep.level && fl > r.deep.floor)) r.deep = { level: lv, floor: fl };
    return r;
  };
  E.ownsKit = (meta, id) => !!BL.KIT[id] && (!!BL.KIT[id].starter || meta.owned.indexOf(id) >= 0);
  E.kitUnlocked = (meta, id) => { const g = BL.KIT[id]; return !!g && (!g.unlock || meta.ach.indexOf(g.unlock) >= 0); };
  E.buyKit = function (meta, id) {
    const g = BL.KIT[id];
    if (!g || E.ownsKit(meta, id) || !E.kitUnlocked(meta, id) || meta.salvage < g.price) return false;
    meta.salvage -= g.price;
    meta.owned.push(id);
    return true;
  };
  /* Put on a piece of owned kit, or take it off again. The Bell always holds a bell: choosing another
     replaces it, and taking a bell off puts the Brass Tide-Bell back. */
  E.equipKit = function (meta, id) {
    if (!E.ownsKit(meta, id)) return false;
    const place = BL.KIT[id].place;
    meta.kit = E.fitKit(meta.kit, meta.owned);
    if (meta.kit[place] !== id) meta.kit[place] = id;
    else meta.kit[place] = place === 'bell' ? 'tidebell' : null;
    return true;
  };
  /* Start-of-run kit effects. The rest are checked where they apply (fights, Crests, the shop, rests). */
  E.applyKit = function (run, kit) {
    run.kit = E.fitKit(kit);
    if (E.hasKit(run, 'cork')) { run.maxHp += 5; run.hp += 5; }
    if (E.hasKit(run, 'purse')) run.pearls += 30;
    if (E.hasKit(run, 'flask')) run.tonics[0] = E.randomTonic(run);
    return run.kit;
  };
  /* Lasting state from before v0.10.0: gear becomes kit (the charts, Storm Lens and Whetstone become
     the bells and the Honed Harpoon), and the old pack becomes the kit you wear. */
  E.migrateMeta = function (m) {
    const owned = [];
    (m.owned || []).forEach((id) => { const to = BL.KIT[id] ? id : BL.OLD_GEAR[id]; if (to && BL.KIT[to] && owned.indexOf(to) < 0) owned.push(to); });
    m.owned = owned;
    const fromPack = !m.kit && Array.isArray(m.packed) ? m.packed.map((id) => BL.OLD_GEAR[id] || id) : null;
    if (fromPack) {
      // first piece in each place wins
      const k = {};
      fromPack.forEach((id) => { if (BL.KIT[id] && !k[BL.KIT[id].place]) k[BL.KIT[id].place] = id; });
      m.kit = k;
    }
    m.kit = E.fitKit(m.kit, owned);
    delete m.packed;
    // the Lazaret (v0.13.0): only real keepsakes, one of each, and you can only bring what is kept there
    const uniq = (list) => (Array.isArray(list) ? list : []).filter((k, i, a) => BL.KEEPSAKES[k] && a.indexOf(k) === i);
    m.lazaret = uniq(m.lazaret);
    m.bring = uniq(m.bring).filter((k) => m.lazaret.indexOf(k) >= 0);
    m.lazOpen = !!m.lazOpen || m.lazaret.length > 0;
    // the logbook (v0.13.0)
    const rec = E.newRecord(), old = m.record && typeof m.record === 'object' ? m.record : {};
    if (old.runs > 0) rec.runs = Math.floor(old.runs);
    if (old.wins > 0) rec.wins = Math.min(rec.runs, Math.floor(old.wins));
    if (old.deep && E.LEVELS[old.deep.level] && old.deep.floor >= 0) rec.deep = { level: old.deep.level, floor: Math.floor(old.deep.floor) };
    m.record = rec;
    return m;
  };
  /* A run saved before v0.10.0: the Tide-Bell keepsake becomes the bell, and the keepsakes and gear that
     are kit now keep working as kit for the rest of that run. */
  E.migrateRun = function (run) {
    if (!run) return run;
    if (!run.kit) {
      const kit = E.fitKit();
      kit.bell = null;
      const extra = [];
      const add = (id) => { if (id && BL.KIT[id] && extra.indexOf(id) < 0) extra.push(id); };
      (run.keepsakes || []).forEach((k) => { const to = BL.RETIRED_KEEPSAKES[k]; if (to === 'tidebell') kit.bell = 'tidebell'; else add(to); });
      (run.gear || []).forEach((g) => { const to = BL.OLD_GEAR[g]; if (to && ['coat', 'pocket', 'ditty'].indexOf(BL.KIT[to].place) >= 0) add(to); });
      run.kit = kit;
      if (extra.length) run.kitExtra = extra;
      delete run.gear;
      delete run.overburden;
    }
    run.keepsakes = (run.keepsakes || []).filter((k) => BL.KEEPSAKES[k]);
    // a fight saved in v0.13.0, when Thrash was called Scour
    if (run.combat && run.combat.scour) { run.combat.thrash = run.combat.scour; delete run.combat.scour; }
    return run;
  };
  E.achievementsMet = (run) => (run.tutorial ? [] : Object.keys(BL.ACHIEVEMENTS).filter((id) => BL.ACHIEVEMENTS[id].met(run)));
  /* Records achievements this run has newly met; returns their ids (also kept on the run for the end screen). */
  E.unlockAchievements = function (meta, run) {
    const fresh = E.achievementsMet(run).filter((id) => meta.ach.indexOf(id) < 0);
    fresh.forEach((id) => meta.ach.push(id));
    if (fresh.length) run.unlocks = (run.unlocks || []).concat(fresh);
    return fresh;
  };
  /* Kit that an achievement unlocks. */
  E.kitFor = (achId) => Object.keys(BL.KIT).filter((id) => BL.KIT[id].unlock === achId);
  E.earnSalvage = function (meta, score) {
    const n = E.salvageFor(score);
    meta.salvage += n;
    meta.earned += n;
    return n;
  };

  /* ---------------- The Lazaret: keepsakes kept between runs ----------------
     The Lazaret is the locked store room at the lighthouse. It opens on the first win. A win puts every
     keepsake Wren carries into it, one of each; a keepsake it already holds becomes Salvage instead.
     Before a descent she chooses any of them to bring, and each one counts toward the Hold as usual.
     When she falls, the keepsakes she found on that descent are lost. The ones in the Lazaret never are. */
  E.lazaretOpen = (meta) => !!meta.lazOpen;
  E.inLazaret = (meta, k) => meta.lazaret.indexOf(k) >= 0;
  /* Choose a kept keepsake for the next descent, or leave it at home again. */
  E.toggleBring = function (meta, k) {
    if (!E.inLazaret(meta, k)) return false;
    const i = meta.bring.indexOf(k);
    if (i < 0) meta.bring.push(k); else meta.bring.splice(i, 1);
    return true;
  };
  E.bringCharge = (meta) => meta.bring.reduce((a, k) => a + E.chargeOf(k), 0);
  /* Start-of-run: the chosen keepsakes are carried from the first landing, and the run remembers which they were. */
  E.bringKeepsakes = function (run, bring) {
    run.brought = [];
    (bring || []).forEach((k) => { if (BL.KEEPSAKES[k] && !E.has(run, k)) { E.gainKeepsake(run, k); run.brought.push(k); } });
    return run.brought;
  };
  E.wasBrought = (run, k) => (run.brought || []).indexOf(k) >= 0;
  /* Keepsakes found on this descent and still carried: what a fall loses. */
  E.foundKeepsakes = (run) => run.keepsakes.filter((k) => !E.wasBrought(run, k));
  E.duplicateSalvage = (k) => Math.ceil(E.chargeOf(k) / 2); // a keepsake the Lazaret already holds is worth half its Roil in Salvage, rounded up
  /* A won run comes home. Returns { opened, kept: [new in the Lazaret], dupes: [turned into Salvage], salvage }. */
  E.storeKeepsakes = function (meta, run) {
    const res = { opened: false, kept: [], dupes: [], salvage: 0 };
    if (!run || run.tutorial || run.screen !== 'victory') return res;
    if (!meta.lazOpen) { meta.lazOpen = true; res.opened = true; }
    run.keepsakes.forEach((k) => {
      if (!BL.KEEPSAKES[k]) return;
      if (!E.inLazaret(meta, k)) { meta.lazaret.push(k); res.kept.push(k); }
      else if (!E.wasBrought(run, k)) { res.dupes.push(k); res.salvage += E.duplicateSalvage(k); }
    });
    meta.salvage += res.salvage;
    meta.earned += res.salvage;
    return res;
  };

  /* ---------------- Story so far ----------------
     Marks are what the player has met. An entry in BL.STORY with `when` opens once its mark is earned.
     E.storyMarks reads them off the run as it stands, so the UI calls it whenever the run changes. */
  E.storyMarks = function (run) {
    const m = [];
    if (!run || run.tutorial) return m;
    (run.seenEvents || []).forEach((id) => m.push('ev:' + id));
    if (run.screen === 'shop') m.push('shop');
    if (run.screen === 'rest') m.push('cove');
    if (run.screen === 'treasure') m.push('wreck');
    if (run.screen === 'defeat') m.push('fell');
    if (run.screen === 'victory') m.push('won:' + (run.level || 0));
    if (run.combat) {
      if (run.combat.kind === 'boss') m.push('boss');
      run.combat.enemies.forEach((e) => { if (m.indexOf('en:' + e.id) < 0) m.push('en:' + e.id); });
    }
    if (run.keepsakes.length) m.push('keepsake');
    if (E.roil(run).steps > 0) m.push('roiled');
    return m;
  };
  E.storyOpen = (entry, marks) => !entry.when || marks.indexOf(entry.when) >= 0;
  /* every entry that can be locked: chapters, then notes */
  E.storyEntries = () => BL.STORY.chapters.concat(BL.STORY.notes);

  BL.E = E;
})();
