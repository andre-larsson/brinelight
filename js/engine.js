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

  /* ---------------- Run ---------------- */
  E.LEVELS = [
    { name: 'Shallows', desc: 'The standard descent.' },
    { name: 'Dark Water', desc: 'Enemies have 10% more HP.' },
    { name: 'Riptide', desc: 'Enemies have 15% more HP and hit 10% harder.' },
    { name: 'The Abyss', desc: 'Enemies have 20% more HP and hit 15% harder. Rests heal less.' },
  ];
  E.levelMods = (lv) => ([
    { hp: 1, dmg: 1, rest: 0.3 }, { hp: 1.1, dmg: 1, rest: 0.3 }, { hp: 1.15, dmg: 1.1, rest: 0.3 }, { hp: 1.2, dmg: 1.15, rest: 0.25 },
  ][lv || 0] || { hp: 1, dmg: 1, rest: 0.3 });

  E.newRun = function (seed, level) {
    if (seed == null) seed = (Math.random() * 4294967296) >>> 0;
    const run = {
      version: 2,
      level: level || 0,
      seed: seed >>> 0,
      rng: seed >>> 0,
      hp: 70, maxHp: 70, pearls: 75,
      deck: [], keepsakes: ['tidebell'], tonics: [null, null, null],
      nextUid: 1, floor: 0, pos: null, screen: 'map',
      combat: null, rewards: null, shop: null, event: null, treasure: null,
      removeCost: 75, seenEvents: [], lastEnc: [], normalFights: 0,
      stats: { fights: 0, elites: 0, cardsPlayed: 0, dmgDealt: 0, dmgTaken: 0, crests: 0, lows: 0, maxChain: 0, maxLowChain: 0, kills: 0, bonuses: 0, declined: 0, elapsed: 0, lastTick: Date.now() },
      log: [],
    };
    BL.STARTER_DECK.forEach((id) => run.deck.push(E.newCard(run, id)));
    run.map = genMap(run);
    return run;
  };

  /* The guided first fight: a fixed deck drawn in order against two weak enemies with scripted moves.
     It is a separate run object that is never saved, so it cannot touch real runs, seeds or scores. */
  E.newTutorialRun = function () {
    const run = E.newRun(1, 0);
    run.tutorial = true;
    run.keepsakes = [];
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

  /* The UI won't leave a keepsake pick (Dread reward, opened Wreck) until one is taken. If some
     other path leaves it unchosen, one of the offered keepsakes is taken at random rather than
     lost. Returns its id, or null. A reward tonic left behind with a free slot counts as declined. */
  E.backToMap = function (run) {
    const pick = (src, list) => {
      if (!src || src.keepsake || !list || !list.length) return null;
      const k = makeR(run).pick(list);
      src.keepsake = k;
      E.gainKeepsake(run, k);
      return k;
    };
    const auto = pick(run.rewards, run.rewards && run.rewards.keepsakeChoices) || pick(run.treasure, run.treasure && run.treasure.choices);
    const rw = run.rewards;
    if (rw && rw.tonic && !rw.tonicTaken && run.tonics.indexOf(null) >= 0) E.decline(run);
    run.screen = 'map';
    run.combat = null;
    run.rewards = null;
    run.event = null;
    run.shop = null;
    run.treasure = null;
    return auto;
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
  E.keepsakePool = (run) => Object.keys(BL.KEEPSAKES).filter((k) => !BL.KEEPSAKES[k].starter && !E.has(run, k));
  E.gainKeepsake = function (run, k) {
    if (!k || E.has(run, k)) return;
    run.keepsakes.push(k);
    if (k === 'biscuit') { run.maxHp += 10; run.hp += 10; }
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
  E.restAmount = (run) => Math.floor(run.maxHp * E.levelMods(run.level).rest) + (E.has(run, 'sparewick') ? 10 : 0);
  E.rest = function (run) {
    const h = E.heal(run, E.restAmount(run));
    run.restDone = true;
    return h;
  };

  E.price = (run, base) => (E.has(run, 'doubloon') ? Math.round(base * 0.75) : base);

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
  E.removePrice = (run) => E.price(run, run.removeCost);
  E.buyRemoval = function (run, uid) {
    const p = E.removePrice(run);
    if (run.shop.removed || run.pearls < p) return false;
    run.pearls -= p;
    run.removeCost += 25;
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
    if (!t || t.keepsake || t.choices.indexOf(k) < 0) return;
    t.keepsake = k;
    E.gainKeepsake(run, k);
  };

  E.startEvent = function (run) {
    const R = makeR(run);
    let pool = BL.EVENTS.filter((ev) => run.seenEvents.indexOf(ev.id) < 0);
    if (!pool.length) pool = BL.EVENTS.slice();
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
    if (opt.decline) E.decline(run);
    run.event.stage = 'result';
    run.event.text = res.text || '';
    run.event.next = res.next || null;
    run.event.choice = i;
    return res;
  };

  /* ---------------- Combat ---------------- */
  function pickEncounter(run, kind) {
    const R = makeR(run);
    const pool = BL.ENCOUNTERS[kind];
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
    // noShuffle (tutorial only): draw the deck in order, and refill from the discard pile in a fixed order
    if (opts && opts.noShuffle) { c.noShuffle = true; c.draw = pile.reverse(); } else c.draw = R.shuffle(pile);
    enc.forEach((id, idx) => spawnEnemy(run, c, id, idx));
    if (E.has(run, 'whaletooth')) c.player.st.might = (c.player.st.might || 0) + 1;
    if (E.has(run, 'barnacleplate')) c.player.st.spines = (c.player.st.spines || 0) + 3;
    if (E.has(run, 'moonshard')) c.tide = 5;
    if (E.has(run, 'sirenscale')) c.enemies.forEach((e) => { e.st.soaked = (e.st.soaked || 0) + 2; });
    if (E.has(run, 'echoconch')) c.echo = 1;
    if (kind === 'easy' || kind === 'hard') run.normalFights++;
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

  function killEnemy(run, c, e) {
    e.hp = 0;
    e.dead = true;
    e.ward = 0;
    run.stats.kills = (run.stats.kills || 0) + 1;
    fx(c, { t: 'die', who: e.uid });
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

  function onTideTurn(run, c) {
    if (E.has(run, 'tidebell')) { fx(c, { t: 'ks', k: 'tidebell' }); drawCards(run, c, 1); }
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

  /* Fight-end bonus Pearls for chains: Tidal Fury (2+ Crests in a turn) and Deep Ebb (2+ Low Waters). */
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
    if (E.has(run, 'pearlstrand')) { fx(c, { t: 'ks', k: 'pearlstrand' }); gainPearls(run, c, 3); }
    const mem = c.player.st.r_tidalmemory || 0;
    if (mem) { c.light += mem; fx(c, { t: 'light', n: mem }); }
    c.tide = TIDE_MID;
    onTideTurn(run, c);
  }
  /* Low Water: the sea pulls back and strands the enemies. They lose all their Ward, and you gain 1 Light. */
  function lowWater(run, c) {
    if (c.won || c.lost) return;
    c.turnLows++;
    const ebb = newChainBonus(run, c, c.turnLows, c.maxLowChain || 0);
    c.maxLowChain = Math.max(c.maxLowChain || 0, c.turnLows);
    run.stats.lows++;
    run.stats.maxLowChain = Math.max(run.stats.maxLowChain || 0, c.turnLows);
    const stripped = [];
    E.alive(c).forEach((e) => { if (e.ward > 0) { stripped.push({ who: e.uid, n: e.ward }); e.ward = 0; } });
    c.light += 1;
    fx(c, { t: 'low', chain: c.turnLows, stripped, light: 1, ebb });
    if (E.has(run, 'kelpbracelet')) { fx(c, { t: 'ks', k: 'kelpbracelet' }); gainWard(c, c.player, 8); }
    const abyss = (c.player.st.r_abyss || 0) + (E.has(run, 'anchor') ? 4 : 0);
    if (E.has(run, 'anchor')) fx(c, { t: 'ks', k: 'anchor' });
    if (abyss) E.alive(c).forEach((e) => dealDamage(run, c, e, waveValue(e, abyss), null, false));
    c.tide = TIDE_MID;
    onTideTurn(run, c);
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
      hitAll(base, hits) {
        hits = hits || 1;
        for (let i = 0; i < hits; i++) {
          fx(c, { t: 'sweep' });
          E.alive(c).forEach((e) => dealDamage(run, c, e, attackValue(P, e, base), P, true));
        }
      },
      hitRandom(base, hits) {
        for (let i = 0; i < hits; i++) {
          const al = E.alive(c);
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
    const P = c.player;
    P.ward = 0;
    if ((P.st.brine || 0) > 0) {
      loseHpDirect(run, c, P, P.st.brine);
      P.st.brine--;
      if (c.lost) return;
    }
    c.light = c.maxLight + (E.has(run, 'stormbottle') && c.turn % 3 === 0 ? 1 : 0);
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
    return { ok: true };
  };

  E.needsTarget = (card) => BL.CARDS[card.id].target === 'enemy';

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
      if (!target) {
        const al = E.alive(c);
        if (al.length === 1) target = al[0];
        else return false;
      }
    }
    c.light -= E.cost(card, c);
    c.hand.splice(idx, 1);
    run.stats.cardsPlayed++;
    fx(c, { t: 'play', uid: card.uid, target: target ? target.uid : null, type: d.type });
    const A = api(run, c);
    if (d.play) d.play(A, E.vals(card), target);
    // Echo: the card resolves a second time
    if (c.echo > 0 && !d.givesEcho && d.type !== 'status' && d.type !== 'curse' && !c.won && !c.lost) {
      c.echo--;
      let t2 = target;
      if (d.target === 'enemy' && (!t2 || t2.dead)) t2 = E.alive(c)[0] || null;
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
     The UI uses it for the CREST / LETHAL / VICTORY / LOW WATER badges. Pass `json` (the run
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
    // Ward the play's Low Waters would strip (after the card's own hit has worn some of it down)
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
      if (!target) {
        const al = E.alive(c);
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
    e.ward = 0;
    if ((e.st.brine || 0) > 0) {
      loseHpDirect(run, c, e, e.st.brine);
      if (e.dead) return true;
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
    if (m.dmg) {
      const base = Math.round((typeof m.dmg === 'function' ? m.dmg(e) : m.dmg) * (c.dmgMul || 1));
      const hits = m.hits || 1;
      for (let i = 0; i < hits; i++) {
        if (c.lost || e.dead) break;
        dealDamage(run, c, P, attackValue(e, P, base), e, true);
      }
    }
    if (c.lost || e.dead) return;
    if (m.ward) gainWard(c, e, m.ward);
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

  /* Intent as shown to the player. */
  E.intentInfo = function (run, e) {
    const c = run.combat;
    const m = BL.ENEMIES[e.id].moves[e.intent];
    if (!m) return null;
    const info = { name: m.name, kinds: [], dmg: 0, hits: 0, ward: m.ward || 0, parts: [] };
    if (m.dmg) {
      const base = Math.round((typeof m.dmg === 'function' ? m.dmg(e) : m.dmg) * (c.dmgMul || 1));
      info.dmg = attackValue(e, c.player, base);
      info.hits = m.hits || 1;
      info.kinds.push('attack');
      info.parts.push(`Attack for ${info.dmg}${info.hits > 1 ? ' x' + info.hits : ''}`);
    }
    if (m.ward) { info.kinds.push('defend'); info.parts.push(`Gain ${m.ward} Ward`); }
    if (m.buff) {
      info.kinds.push('buff');
      Object.keys(m.buff).forEach((k) => info.parts.push(`Gain ${m.buff[k]} ${BL.STATUSES[k].name}`));
    }
    if (m.debuff) {
      info.kinds.push('debuff');
      Object.keys(m.debuff).forEach((k) => info.parts.push(`Apply ${m.debuff[k]} ${BL.STATUSES[k].name}`));
    }
    if (m.addCards) {
      info.kinds.push('debuff');
      info.parts.push(`Shuffle ${m.addCards.n} ${BL.CARDS[m.addCards.id].name} into your draw pile`);
    }
    if (m.tide) { info.kinds.push('debuff'); info.parts.push(m.tide < 0 ? `Drag your Tide down by ${-m.tide}` : `Raise your Tide by ${m.tide}`); }
    if (m.tideSet != null) { info.kinds.push('debuff'); info.parts.push(`Calm your Tide back to ${m.tideSet}`); }
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
    if (c.kind === 'boss') {
      run.screen = 'victory';
      run.combat = null;
      return;
    }
    const elite = c.kind === 'elite';
    let pearls = elite ? R.int(30, 40) : R.int(14, 22);
    pearls += c.bonusPearls || 0;
    if (E.has(run, 'pearlearring')) pearls += 10;
    const bonuses = [];
    if (!c.flags.hpLost) bonuses.push({ name: 'Flawless', desc: 'Won without losing HP', pearls: elite ? 20 : 12 });
    if (c.turn <= (elite ? 4 : 3)) bonuses.push({ name: 'Swift', desc: `Won on turn ${c.turn}`, pearls: elite ? 12 : 8 });
    if (c.maxChain >= 2) bonuses.push({ name: 'Tidal Fury', desc: `${c.maxChain} Crests in a single turn`, pearls: E.chainBonus(c.maxChain) });
    if ((c.maxLowChain || 0) >= 2) bonuses.push({ name: 'Deep Ebb', desc: `${c.maxLowChain} Low Waters in a single turn`, pearls: E.chainBonus(c.maxLowChain) });
    bonuses.forEach((b) => { pearls += b.pearls; });
    run.stats.bonuses = (run.stats.bonuses || 0) + bonuses.length;
    run.pearls += pearls;
    const upChance = elite ? 0.3 : 0.15 + 0.02 * run.floor;
    const cards = E.rewardCards(run, elite ? 'elite' : 'normal').map((id) => ({ id, up: R.chance(upChance) ? 1 : 0 }));
    const rw = { pearls, bonuses, cards, cardTaken: false, tonic: null, tonicTaken: false, keepsake: null, keepsakeChoices: [] };
    if (R.chance(elite ? 0.6 : 0.4)) rw.tonic = E.randomTonic(run);
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
    else E.decline(run);
  };
  /* A card picked from an event's choice of cards; null skips it. */
  E.takeEventCard = function (run, id) {
    if (id) E.addCard(run, id);
    else E.decline(run);
  };
  /* Turning down a reward (a card, a tonic with a free slot, an event's Leave) adds to the final score. */
  E.DECLINE_SCORE = 20;
  E.decline = function (run) { run.stats.declined = (run.stats.declined || 0) + 1; };
  E.takeRewardKeepsake = function (run, k) {
    const rw = run.rewards;
    if (!rw || rw.keepsake || rw.keepsakeChoices.indexOf(k) < 0) return;
    rw.keepsake = k;
    E.gainKeepsake(run, k);
  };

  /* Score for the end screen. */
  E.score = function (run, won) {
    const st = run.stats;
    let s = run.floor * 40 + (st.kills || 0) * 12 + st.elites * 80 + st.crests * 6 + (st.maxChain || 0) * 30 + (st.lows || 0) * 6 + (st.maxLowChain || 0) * 30 + (st.bonuses || 0) * 15 + (st.declined || 0) * E.DECLINE_SCORE;
    if (won) s += 600 + run.hp * 5;
    return Math.round(s * (1 + 0.25 * (run.level || 0)));
  };
  E.takeRewardTonic = function (run) {
    const rw = run.rewards;
    if (!rw || !rw.tonic || rw.tonicTaken) return false;
    if (!E.gainTonic(run, rw.tonic)) return false;
    rw.tonicTaken = true;
    return true;
  };

  BL.E = E;
})();
