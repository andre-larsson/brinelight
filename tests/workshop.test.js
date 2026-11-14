/* Workshop and kit rules: Salvage from score, buying and wearing kit, what each piece does, the
   achievements that unlock kit, keepsake Roil, the Hold and Seep, and carrying old saves over.
   Run with: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, snapshot, playRun } = require('../tools/bot');

const { BL, E } = load();

const metaWith = (o) => Object.assign(E.newMeta(), o);
const fightIn = (run, enc, kind) => { E.startCombat(run, kind || 'easy', enc || ['kelp']); run.combat.fx.length = 0; return run.combat; };
const win = (run) => { const c = run.combat; c.enemies.forEach((e) => { e.dead = true; }); c.won = true; E.finishCombat(run); };
const tough = (c) => c.enemies.forEach((e) => { e.hp = e.maxHp = 500; });
const give = (run, id) => { const card = { uid: run.nextUid++, id, up: 0 }; run.combat.hand.push(card); return card; };
const play = (run, card, target) => E.playCard(run, card.uid, target ? target.uid : undefined);

/* ---------- Salvage ---------- */
test('a finished run earns 1 Salvage per 50 score, rounded down', () => {
  assert.equal(E.SALVAGE_PER_SCORE, 50);
  assert.equal(E.salvageFor(0), 0);
  assert.equal(E.salvageFor(49), 0);
  assert.equal(E.salvageFor(50), 1);
  assert.equal(E.salvageFor(1634), 32);
  const meta = E.newMeta();
  assert.equal(E.earnSalvage(meta, 1634), 32);
  E.earnSalvage(meta, 420);
  assert.equal(meta.salvage, 40);
  assert.equal(meta.earned, 40);
});

/* ---------- Kit: places, buying, wearing ---------- */
test('kit goes in five places, one piece each; the Bell always holds a bell, the Brass Tide-Bell to start', () => {
  assert.deepEqual(E.KIT_PLACES, ['harpoon', 'bell', 'coat', 'pocket', 'ditty']);
  assert.deepEqual(BL.KIT_PLACES.map((p) => p.name), ['Harpoon', 'Bell', 'Coat', 'Pocket', 'Ditty Bag']);
  Object.keys(BL.KIT).forEach((id) => assert.ok(E.KIT_PLACES.includes(BL.KIT[id].place), id));
  assert.deepEqual(E.fitKit(), { harpoon: null, bell: 'tidebell', coat: null, pocket: null, ditty: null });
  // a list puts each piece in its own place; a later piece replaces an earlier one in the same place
  assert.deepEqual(E.fitKit(['honed', 'cork', 'purse', 'flask', 'floodbell']), { harpoon: 'honed', bell: 'floodbell', coat: 'cork', pocket: 'purse', ditty: 'flask' });
  assert.equal(E.fitKit(['cork', 'gorget']).coat, 'gorget');
  // unknown ids, ids in the wrong place and (with an owned list) unowned ones are dropped
  assert.deepEqual(E.fitKit({ coat: 'purse', pocket: 'nope', ditty: 'net' }, ['net']), { harpoon: null, bell: 'tidebell', coat: null, pocket: null, ditty: 'net' });
  assert.equal(E.fitKit({ bell: 'ebbbell' }, []).bell, 'tidebell', 'an unowned bell falls back to the Brass Tide-Bell');
  const run = E.newRun(5);
  assert.equal(E.bell(run), 'tidebell');
  assert.deepEqual(E.kitIds(run), ['tidebell']);
});

test("Wren's picture follows her coat, and every place has a slot on the kit screens", () => {
  const fs = require('fs'), path = require('path');
  // no coat: plain Wren on shore, the plain diving dress underwater
  assert.equal(E.keeperArt(E.fitKit()), 'keeper');
  assert.equal(E.keeperArt(null), 'keeper');
  assert.equal(E.keeperArt(E.fitKit(), true), 'keeper_suit');
  assert.equal(E.keeperArt(E.fitKit(['cork'])), 'keeper_cork');
  assert.equal(E.keeperArt(E.fitKit(['gorget'])), 'keeper_gorget');
  // a dress is carried on the open-air levels and worn in the Belfry
  assert.equal(E.keeperArt(E.fitKit(['suit'])), 'keeper_packed');
  assert.equal(E.keeperArt(E.fitKit(['suit']), true), 'keeper_suit');
  assert.equal(E.keeperArt(E.fitKit(['plated']), true), 'keeper_plated');
  // only a dress opens the Belfry, so every coat that does has a picture for it
  Object.keys(BL.KIT).filter((id) => id === 'suit' || BL.KIT[id].as === 'suit').forEach((id) => assert.ok(BL.KIT[id].lookUnder, id + ' has no Belfry picture'));
  Object.keys(BL.KIT).forEach((id) => [BL.KIT[id].look, BL.KIT[id].lookUnder].filter(Boolean).forEach((a) => assert.ok(fs.existsSync(path.join(__dirname, '..', 'img/units', a + '.webp')), `${id}: img/units/${a}.webp is missing`)));
  // each place says which side of Wren its slot is on and where its line points
  BL.KIT_PLACES.forEach((pl) => {
    assert.ok(pl.side === 'left' || pl.side === 'right', pl.id);
    assert.ok(pl.at.length === 2 && pl.at.every((v) => v >= 0 && v <= 1), pl.id);
    assert.ok(pl.id === 'bell' || pl.none, pl.id + ' names its empty slot');
  });
});

test('kit costs Salvage, is bought once, and locked kit waits for its achievement', () => {
  const meta = metaWith({ salvage: 30 });
  assert.equal(E.ownsKit(meta, 'tidebell'), true, 'everyone has the Brass Tide-Bell');
  assert.equal(E.buyKit(meta, 'tidebell'), false);
  assert.equal(E.buyKit(meta, 'cork'), true);
  assert.equal(meta.salvage, 30 - BL.KIT.cork.price);
  assert.deepEqual(meta.owned, ['cork']);
  assert.equal(E.buyKit(meta, 'cork'), false, 'already owned');
  meta.salvage = 100;
  assert.equal(E.kitUnlocked(meta, 'crackedbell'), false);
  assert.equal(E.buyKit(meta, 'crackedbell'), false, 'locked');
  meta.ach.push('threecrests');
  assert.equal(E.buyKit(meta, 'crackedbell'), true);
  const poor = metaWith({ salvage: BL.KIT.flask.price - 1 });
  assert.equal(E.buyKit(poor, 'flask'), false, 'not enough Salvage');
  // every locked piece names a real achievement, and every achievement unlocks something
  Object.values(BL.KIT).forEach((g) => { if (g.unlock) assert.ok(BL.ACHIEVEMENTS[g.unlock], g.name); });
  Object.keys(BL.ACHIEVEMENTS).forEach((a) => assert.ok(E.kitFor(a).length > 0, a));
});

test('wearing kit: a piece replaces whatever is in its place; taking it off empties the place, or puts the Brass Tide-Bell back', () => {
  const meta = metaWith({ owned: ['cork', 'gorget', 'floodbell'] });
  assert.equal(E.equipKit(meta, 'honed'), false, 'not owned');
  assert.equal(E.equipKit(meta, 'cork'), true);
  assert.equal(meta.kit.coat, 'cork');
  E.equipKit(meta, 'gorget');
  assert.equal(meta.kit.coat, 'gorget', 'one piece per place');
  E.equipKit(meta, 'gorget');
  assert.equal(meta.kit.coat, null, 'off again');
  E.equipKit(meta, 'floodbell');
  assert.equal(meta.kit.bell, 'floodbell');
  E.equipKit(meta, 'floodbell');
  assert.equal(meta.kit.bell, 'tidebell', 'never without a bell');
  // the run takes the kit as it is
  E.equipKit(meta, 'cork');
  const run = E.newRun(5, 0, meta.kit);
  assert.deepEqual(run.kit, meta.kit);
});

test('kit changes nothing about the map, and the same seed with the same kit gives the same run', () => {
  const plain = E.newRun(42, 2);
  const kitted = E.newRun(42, 2, ['flask', 'cork', 'purse', 'honed', 'ebbbell']);
  assert.equal(snapshot(plain.map), snapshot(kitted.map));
  const a = E.newRun(42, 1, ['flask', 'gorget', 'crackedbell', 'barbed']);
  const b = E.newRun(42, 1, ['flask', 'gorget', 'crackedbell', 'barbed']);
  assert.deepEqual(playRun(a), playRun(b));
  assert.equal(snapshot(a), snapshot(b));
});

/* ---------- What each piece does ---------- */
test('start-of-run kit: Cork Vest +5 Max HP, Coin Purse +30 Pearls, Spare Flask a tonic', () => {
  const base = E.newRun(7, 2);
  const run = E.newRun(7, 2, ['cork', 'purse', 'flask']);
  assert.equal(run.maxHp, base.maxHp + 5);
  assert.equal(run.hp, base.hp + 5);
  assert.equal(run.pearls, base.pearls + 30);
  assert.ok(BL.TONICS[run.tonics[0]], 'a tonic in the first slot');
  assert.deepEqual(base.tonics, [null, null, null]);
});

test('bells: Brass draws 1 on every Crest and Strand; Flood 1 card and 1 Light on a Crest only; Ebb 1 card and 3 Ward on a Strand only; Cracked nothing on the first each turn, then 2 cards and 1 Light', () => {
  // [bell, first, second] -> [cards drawn, Light gained, Ward gained] for each
  const gains = (bell, first, second) => {
    const run = E.newRun(3, 0, bell ? [bell] : null);
    if (!bell) run.kit.bell = null;
    const c = fightIn(run);
    tough(c);
    const out = [];
    [first, second].forEach((kind) => {
      // a Stir from 5 Crests and a Bail from 1 Strands; each costs 1 Light, the same with or without a bell
      c.light = 5;
      c.player.ward = 0;
      c.swellActTurn = null;
      c.tide = kind === 'crest' ? 5 : 1;
      const n = c.hand.length;
      E.swellAct(run, kind === 'crest' ? 'stir' : 'bail');
      out.push([c.hand.length - n, c.light, c.player.ward]);
    });
    return out;
  };
  // each wave against the same wave with no bell: what the bell adds
  const base = (first, second) => gains(null, first, second);
  const added = (bell, first, second) => gains(bell, first, second).map((g, i) => g.map((x, j) => x - base(first, second)[i][j]));
  assert.deepEqual(added('tidebell', 'crest', 'low'), [[1, 0, 0], [1, 0, 0]]);
  assert.deepEqual(added('floodbell', 'crest', 'low'), [[1, 1, 0], [0, 0, 0]]);
  assert.deepEqual(added('ebbbell', 'crest', 'low'), [[0, 0, 0], [1, 0, 3]]);
  assert.deepEqual(added('crackedbell', 'crest', 'low'), [[0, 0, 0], [2, 1, 0]]);
  assert.deepEqual(added('crackedbell', 'low', 'crest'), [[0, 0, 0], [2, 1, 0]]);
  // the Cracked Bell counts each turn afresh
  const run = E.newRun(3, 0, ['crackedbell']);
  const c = fightIn(run);
  tough(c);
  c.enemies.forEach((e) => { e.intent = 'none'; });
  c.tide = 4;
  play(run, give(run, 'swell'), c.enemies[0]);
  E.endTurn(run);
  const n = c.hand.length;
  c.tide = 4;
  play(run, give(run, 'swell'), c.enemies[0]);
  assert.equal(c.hand.length, n, 'the first Crest of the new turn draws nothing');
});

test('harpoons: the Honed Harpoon adds 2 damage to the first Harpoon Jab of each fight; the Barbed Harpoon makes it apply 1 Brine', () => {
  assert.equal(BL.KIT.honed.dmg, 2);
  assert.equal(BL.KIT.barbed.brine, 1);
  const jabs = (kit, keepsakes) => {
    const run = E.newRun(3, 0, kit);
    if (keepsakes) run.keepsakes = keepsakes;
    const c = fightIn(run);
    tough(c);
    const e = c.enemies[0];
    const out = [];
    for (let i = 0; i < 2; i++) {
      const card = give(run, 'jab');
      if (i === 0) out.push(E.playVals(run, card).dmg);
      const hp = e.hp;
      play(run, card, e);
      out.push(hp - e.hp, e.st.brine || 0);
    }
    return out;
  };
  // [shown damage, 1st Jab damage, Brine after, 2nd Jab damage, Brine after]
  assert.deepEqual(jabs([]), [6, 6, 0, 6, 0]);
  assert.deepEqual(jabs(['honed']), [8, 8, 0, 6, 0]);
  assert.deepEqual(jabs(['barbed']), [6, 6, 1, 6, 1]);
  assert.deepEqual(jabs(['barbed'], ['saltedhook']), [6, 6, 2, 6, 2], 'Salted Hook adds to it');
  // a new fight brings a new first Jab
  const run = E.newRun(3, 0, ['honed']);
  fightIn(run); tough(run.combat);
  play(run, give(run, 'jab'), run.combat.enemies[0]);
  win(run);
  const c2 = fightIn(run);
  assert.equal(E.playVals(run, give(run, 'jab')).dmg, 8);
  assert.ok(c2);
});

test('Shell Gorget: start each fight with 4 Ward, which washes away on your next turn like any Ward', () => {
  const c = fightIn(E.newRun(3, 0, ['gorget']));
  assert.equal(c.turn, 1);
  assert.equal(c.player.ward, 4);
  assert.equal(fightIn(E.newRun(3, 0)).player.ward, 0);
});

test("Pocket and Ditty Bag: Gleaner's Pouch +10 Pearls a fight, Pearl Scales 25% off at Barnaby's, Gleaning Net +3 Pearls a Crest, Spare Wick rests heal 10 more", () => {
  const pearlsAfter = (kit) => { const run = E.newRun(3, 0, kit); fightIn(run); win(run); return run.rewards.pearls; };
  assert.equal(pearlsAfter(['pouch']), pearlsAfter([]) + 10);
  const shop = (kit) => { const run = E.newRun(9, 0, kit); E.enterNode(run, { row: 2, col: 0, type: 'shop' }); return E.price(run, run.shop.cards[0].base); };
  const full = shop([]);
  assert.equal(shop(['scales']), Math.round(full * 0.75));
  const run = E.newRun(3, 0, ['net']);
  const c = fightIn(run);
  tough(c);
  const p = run.pearls;
  c.tide = 4;
  play(run, give(run, 'swell'), c.enemies[0]);
  assert.equal(run.pearls, p + 3);
  const rest = (kit) => { const r = E.newRun(3, 0, kit); return E.restAmount(r); };
  assert.equal(rest(['wick']), rest([]) + 10);
});

test("Barnaby's Marker: the first removal at Barnaby's in a run is free and doesn't raise the next price", () => {
  const run = E.newRun(3, 0, ['marker']);
  run.pearls = 200;
  run.shop = { removed: false };
  assert.equal(E.removePrice(run), 0);
  assert.equal(E.buyRemoval(run, run.deck[0].uid), true);
  assert.equal(run.pearls, 200);
  assert.equal(run.removeCost, 75);
  run.shop = { removed: false };
  assert.equal(E.removePrice(run), 75);
  E.buyRemoval(run, run.deck[0].uid);
  assert.equal(run.pearls, 125);
  assert.equal(E.removePrice(E.newRun(3, 0)), 75);
});

/* ---------- Achievements ---------- */
test('achievements: double and triple Crest, double Strand, 3 flawless fights, a Dread, a lean Dread, a Brine kill', () => {
  const run = E.newRun(9, 0);
  assert.deepEqual(E.achievementsMet(run), []);
  run.stats.maxChain = 2;
  run.stats.maxLowChain = 2;
  assert.deepEqual(E.achievementsMet(run), ['twocrests', 'twolows']);
  run.stats.maxChain = 3;
  assert.ok(E.achievementsMet(run).includes('threecrests'));
  // flawless fights are counted by the engine
  const r2 = E.newRun(9, 0);
  for (let i = 0; i < 3; i++) { fightIn(r2); win(r2); r2.screen = 'map'; }
  assert.equal(r2.stats.flawless, 3);
  assert.ok(E.achievementsMet(r2).includes('untouched'));
  const r3 = E.newRun(9, 0);
  fightIn(r3); r3.combat.flags.hpLost = true; win(r3);
  assert.equal(r3.stats.flawless || 0, 0);
  // a Dread, with a lean deck and with a fat one
  const lean = E.newRun(9, 0);
  fightIn(lean, ['hulk'], 'elite'); win(lean);
  assert.deepEqual(E.achievementsMet(lean).filter((a) => a === 'dreadhunter' || a === 'travellight'), ['dreadhunter', 'travellight']);
  const fat = E.newRun(9, 0);
  ['jab', 'jab', 'jab'].forEach((id) => E.addCard(fat, id));
  fightIn(fat, ['hulk'], 'elite'); win(fat);
  assert.ok(E.achievementsMet(fat).includes('dreadhunter'));
  assert.ok(!E.achievementsMet(fat).includes('travellight'));
  // an enemy that dies to Brine at the start of its turn
  const br = E.newRun(9, 0);
  const c = fightIn(br, ['kelp', 'crab']);
  c.enemies[0].hp = 2;
  c.enemies[0].st.brine = 3;
  E.endTurn(br);
  assert.equal(br.stats.brineKills, 1);
  assert.ok(E.achievementsMet(br).includes('pickled'));
});

test('achievements unlock once, are kept on the run for the end screen, and never come from the tutorial', () => {
  const meta = E.newMeta();
  const run = E.newRun(9, 0);
  run.stats.maxChain = 2;
  assert.deepEqual(E.unlockAchievements(meta, run), ['twocrests']);
  assert.deepEqual(E.unlockAchievements(meta, run), []);
  assert.deepEqual(meta.ach, ['twocrests']);
  assert.deepEqual(run.unlocks, ['twocrests']);
  assert.deepEqual(E.kitFor('twocrests'), ['floodbell']);
  assert.deepEqual(E.kitFor('twolows'), ['ebbbell']);
  assert.deepEqual(E.kitFor('threecrests'), ['crackedbell']);
  const tut = E.newTutorialRun();
  tut.stats.maxChain = 3;
  assert.deepEqual(E.achievementsMet(tut), []);
  assert.deepEqual(E.unlockAchievements(E.newMeta(), tut), []);
  assert.equal(E.bell(tut), null, 'no bell in the tutorial');
});

/* ---------- Roil, the Hold and a Roiled aether ---------- */
test('the Hold starts at 20 Roil and grows by 10 for each deeper level ever reached; every 12 Roil over (or part of 12) is one step', () => {
  assert.equal(E.hold(), 20);
  assert.deepEqual([0, 1, 2].map(E.holdAt), [20, 30, 40]);
  assert.equal(E.SEEP_STEP, 12);
  assert.deepEqual([20, 21, 32, 33, 44, 45].map((ch) => E.roilSteps(ch)), [0, 1, 1, 2, 2, 3]);
  assert.deepEqual([30, 31, 43].map((ch) => E.roilSteps(ch, 30)), [0, 1, 2]);
  const run = E.newRun(5);
  run.keepsakes = ['whaletooth', 'stormbottle'];
  assert.equal(E.hold(run), 20);
  assert.equal(E.charge(run), BL.KEEPSAKES.whaletooth.charge + BL.KEEPSAKES.stormbottle.charge);
  assert.deepEqual(E.roil(run), E.roilFor(E.charge(run), 20));
  // what taking one more would do
  assert.equal(E.charge(run, 'tidewatch'), E.charge(run) + BL.KEEPSAKES.tidewatch.charge);
  assert.deepEqual(E.roil(run, 'tidewatch'), E.roilFor(E.charge(run) + BL.KEEPSAKES.tidewatch.charge, 20));
  // someone who has reached Dark Water starts every expedition with a Hold of 30, even in the Shallows
  const vet = E.newRun(5, 0, null, [], [], false, 1);
  vet.keepsakes = ['whaletooth', 'stormbottle'];
  assert.equal(E.hold(vet), 30);
  assert.equal(E.roil(vet).steps, 1);
  // the tutorial is never Roiled
  const tut = E.newTutorialRun();
  tut.keepsakes = Object.keys(BL.KEEPSAKES);
  assert.equal(E.roil(tut).steps, 0);
});

test('a Roiled aether climbs a ladder: a Seep, then Thrash, then a Bell Minnow, then round again (2 Minnows at most)', () => {
  const at = (steps) => { const r = E.roilFor(E.hold() + 12 * steps); return [r.seep, r.thrash, r.minnows]; };
  assert.deepEqual(E.roilFor(E.hold()), { steps: 0, seep: 0, thrash: 0, minnows: 0 });
  assert.deepEqual(at(1), [1, 0, 0]);
  assert.deepEqual(at(2), [1, 1, 0]);
  assert.deepEqual(at(3), [1, 1, 1]);
  assert.deepEqual(at(4), [2, 1, 1]);
  assert.deepEqual(at(5), [2, 2, 1]);
  assert.deepEqual(at(6), [2, 2, 2]);
  assert.deepEqual(at(7), [3, 2, 2]);
  assert.deepEqual(at(9), [3, 3, 2], 'never more than 2 Bell Minnows');
  assert.equal(E.MAX_ROIL_MINNOWS, 2);
  assert.equal(E.seepFor(E.hold() + 4 * 12), 2);
});

test('Seep: shuffled into the draw pile at the start of each fight, unplayable, and gone after the fight', () => {
  const run = E.newRun(5);
  run.keepsakes = ['whaletooth', 'stormbottle', 'anchor', 'echoconch']; // 19 + 18 + 18 + 17 = 72: 5 steps past a Hold of 20
  assert.deepEqual(E.roil(run), { steps: 5, seep: 2, thrash: 2, minnows: 1 });
  const deck = run.deck.length;
  const c = fightIn(run);
  const all = c.hand.concat(c.draw);
  assert.equal(all.length, deck + 2);
  const seep = all.filter((card) => card.id === 'seep');
  assert.equal(seep.length, 2);
  assert.equal(c.seep, 2);
  assert.equal(E.playable(run, seep[0]).ok, false);
  assert.equal(run.deck.length, deck, 'never joins the deck');
  assert.ok(!run.deck.some((card) => card.id === 'seep'));
  win(run);
  assert.equal(run.deck.length, deck);
  // within the Hold, nothing is added
  const light = E.newRun(5);
  light.keepsakes = ['whaletooth'];
  const lc = fightIn(light);
  assert.equal(lc.hand.concat(lc.draw).filter((x) => x.id === 'seep').length, 0);
  assert.equal(lc.thrash, undefined);
  assert.equal(lc.enemies.length, 1);
});

test('Thrash: at the start of each of your turns, take that much damage; Ward left from the turn before stops it', () => {
  const quiet = (c) => c.enemies.forEach((e) => { e.intent = Object.keys(BL.ENEMIES[e.id].moves).find((k) => { const m = BL.ENEMIES[e.id].moves[k]; return !m.dmg && !m.debuff; }) || e.intent; });
  const run = E.newRun(5);
  run.keepsakes = ['whaletooth', 'stormbottle']; // 19 + 18 = 37: 2 steps, so 1 Seep and Thrash 1
  assert.equal(E.roil(run).thrash, 1);
  const hp0 = run.hp;
  const c = fightIn(run, ['crab']);
  tough(c);
  assert.equal(c.thrash, 1);
  assert.equal(run.hp, hp0 - 1, 'the first turn of a fight: 1 damage, with no Ward up yet');
  assert.equal(c.flags.hpLost, true, 'so the fight is no longer Flawless');
  const hp = run.hp;
  // end the turn with enough Ward for the enemies' attacks and `left` over
  const incoming = (cc, r) => E.alive(cc).reduce((n, e) => { const i = E.intentInfo(r, e); return n + (i && i.dmg ? i.dmg * i.hits : 0); }, 0);
  const turnEnd = (left) => { run.hp = hp; quiet(c); c.player.ward = incoming(c, run) + left; E.endTurn(run); return hp - run.hp; };
  assert.equal(turnEnd(0), 1, 'no Ward left after the enemies: 1 damage');
  assert.equal(turnEnd(3), 0, 'Ward left over stops it');
  assert.equal(c.player.ward, 0, 'and what is left of the Ward still washes away');
  assert.deepEqual(c.fx.filter((f) => f.t === 'dmg' && f.who === 'p').pop(), { t: 'dmg', who: 'p', n: 0, blocked: 1, attack: false });
  assert.equal(turnEnd(0), 1, 'and it comes every turn');
  // Thrash 2 is 2 damage a turn, and 1 Ward stops half of it
  const two = E.newRun(5);
  two.keepsakes = ['whaletooth', 'stormbottle', 'anchor', 'echoconch']; // 72: 5 steps, so Thrash 2
  assert.equal(E.roil(two).thrash, 2);
  const hp2 = two.hp;
  const c2 = fightIn(two, ['crab']);
  tough(c2);
  c2.enemies.splice(1); // leave only the crab: the Minnow would bite
  assert.equal(two.hp, hp2 - 2);
  quiet(c2); c2.player.ward = incoming(c2, two) + 1; E.endTurn(two);
  assert.equal(two.hp, hp2 - 3);
  // at 1 HP it ends the run
  two.hp = 1;
  quiet(c2);
  c2.player.ward = incoming(c2, two);
  E.endTurn(two);
  assert.equal(c2.lost, true);
  assert.equal(two.hp, 0);
});

test("Thrash and the Shell Gorget: the Gorget's Ward is up before the first turn, so it stops the first Thrash", () => {
  const run = E.newRun(5, 0, ['gorget']);
  run.keepsakes = ['whaletooth', 'stormbottle']; // Thrash 1
  const hp = run.hp;
  const c = fightIn(run, ['crab']);
  assert.equal(run.hp, hp);
  assert.equal(c.player.ward, 3, '1 of its 4 Ward went to the Thrash');
  assert.equal(c.flags.hpLost, false, 'a stopped Thrash keeps the fight Flawless');
  // a Calm run never has Thrash
  assert.equal(fightIn(E.newRun(5)).thrash, undefined);
});

test('Bell Minnows follow a Roiled aether into every fight, after the encounter\'s own enemies', () => {
  const calm = E.newRun(5);
  const cc = fightIn(calm, ['crab', 'jelly'], 'hard');
  const run = E.newRun(5);
  run.keepsakes = ['whaletooth', 'stormbottle', 'anchor']; // 55: 3 steps, so 1 Bell Minnow
  const c = fightIn(run, ['crab', 'jelly'], 'hard');
  assert.deepEqual(c.enemies.map((e) => e.id), ['crab', 'jelly', 'minnow']);
  assert.equal(c.roilMinnows, 1);
  assert.equal(c.enemies[2].roil, true);
  assert.ok(c.enemies[2].intent, 'it has an intent like any enemy');
  // at half a Bell Minnow's health (11 to 13), rounded up
  assert.equal(E.ROIL_MINNOW_HP, 0.5);
  assert.ok(c.enemies[2].maxHp >= 6 && c.enemies[2].maxHp <= 7, 'half health: ' + c.enemies[2].maxHp);
  assert.equal(c.enemies[2].hp, c.enemies[2].maxHp);
  assert.deepEqual(cc.enemies.map((e) => e.id), ['crab', 'jelly'], 'a Calm run meets only the encounter');
  // the fight is not won until the Minnow is dead too
  c.enemies.slice(0, 2).forEach((e) => { e.dead = true; e.hp = 0; });
  assert.equal(E.alive(c).length, 1);
  // 6 steps and more: 2 Minnows, in the boss fight too
  const six = E.newRun(5);
  six.keepsakes = ['whaletooth', 'stormbottle', 'anchor', 'echoconch', 'sirenscale']; // 89: 6 steps
  assert.equal(E.roil(six).minnows, 2);
  assert.deepEqual(fightIn(six, ['bell'], 'boss').enemies.map((e) => e.id), ['bell', 'minnow', 'minnow']);
});

test('dropping a keepsake: between fights only, for good; Scallop Charm takes its 10 Max HP with it', () => {
  const run = E.newRun(5);
  E.gainKeepsake(run, 'biscuit');
  E.gainKeepsake(run, 'whaletooth');
  assert.equal(run.maxHp, 80);
  fightIn(run);
  assert.equal(E.dropKeepsake(run, 'whaletooth'), false, 'not during a fight');
  win(run);
  E.backToMap(run);
  assert.equal(E.dropKeepsake(run, 'whaletooth'), true);
  assert.deepEqual(run.keepsakes, ['biscuit']);
  assert.equal(E.dropKeepsake(run, 'whaletooth'), false, 'already gone');
  E.dropKeepsake(run, 'biscuit');
  assert.equal(run.maxHp, 70);
  assert.ok(run.hp <= run.maxHp);
});

/* ---------- Saves from before v0.10.0 ---------- */
test('old lasting state carries over: gear becomes kit, and the pack becomes what you wear', () => {
  const m = E.migrateMeta({ salvage: 9, earned: 40, owned: ['purse', 'floodchart', 'stormlens', 'whetstone', 'nope'], packed: ['whetstone', 'purse', 'floodchart'], ach: ['twocrests'] });
  assert.deepEqual(m.owned, ['purse', 'floodbell', 'crackedbell', 'honed']);
  assert.deepEqual(m.kit, { harpoon: 'honed', bell: 'floodbell', coat: null, pocket: 'purse', ditty: null });
  assert.equal(m.packed, undefined);
  assert.equal(m.salvage, 9);
  // new state passes through unchanged
  const n = E.migrateMeta({ salvage: 0, earned: 0, owned: ['cork'], kit: { coat: 'cork' }, ach: [] });
  assert.equal(n.kit.coat, 'cork');
  assert.equal(n.kit.bell, 'tidebell');
});
