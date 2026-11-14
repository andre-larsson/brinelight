/* The bot in tools/bot.js: it shops at Barnaby's, drinks tonics, and uses two Swell moves a turn with the Bailer.
   The bot is how balance gets measured (tools/measure.js), so these keep its use of the shop, tonics and the Bailer
   from quietly breaking. Run with: node --test tests/ */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const bot = require('../tools/bot');

const { BL, E } = bot.load();
const { step, playRun, saveLoad, snapshot } = bot;

/* A fight against `enc`, with an empty hand unless `hand` is given and the bell left out, so nothing gets drawn. */
function fight(enc, o = {}) {
  const run = E.newRun(o.seed || 1, 0, o.kit || null);
  if (!o.kit || !o.kit.some((id) => BL.KIT[id].place === 'bell')) run.kit.bell = null;
  if (o.hp) run.hp = o.hp;
  run.tonics = (o.tonics || []).concat([null, null, null]).slice(0, 3);
  E.startCombat(run, o.kind || 'easy', enc);
  const c = run.combat;
  c.discard.push(...c.hand);
  c.hand = (o.hand || []).map((id) => ({ uid: run.nextUid++, id, up: 0 }));
  if (o.tide != null) c.tide = o.tide;
  if (o.light != null) c.light = o.light;
  return { run, c };
}
/* Every enemy attacks with its first move that hits. */
const attack = (c) => E.alive(c).forEach((e) => { e.intent = Object.keys(BL.ENEMIES[e.id].moves).find((k) => BL.ENEMIES[e.id].moves[k].dmg); });
const hush = (c) => E.alive(c).forEach((e) => { e.intent = 'none'; });
/* Barnaby's shop with `pearls` to spend. */
function atShop(pearls, o = {}) {
  const run = E.newRun(o.seed || 9, 0, o.kit || null);
  run.pearls = pearls;
  (o.cards || []).forEach((id) => E.addCard(run, id));
  E.enterNode(run, { row: 2, col: 0, type: 'shop' });
  return run;
}

test('at the shop the bot takes out a curse first, then buys the best keepsake and a tonic', () => {
  const run = atShop(1000, { cards: ['barnacles'] });
  const shopKs = run.shop.keepsakes.map((k) => k.id);
  assert.equal(step(run), 'shop');
  assert.equal(run.screen, 'map');
  assert.ok(!run.deck.some((c) => c.id === 'barnacles'), 'the curse is gone');
  assert.equal(run.deck.filter((c) => c.id === 'brace').length, 4, 'one removal a visit: the curse took it');
  assert.equal(run.keepsakes.length, 1);
  assert.ok(shopKs.includes(run.keepsakes[0]));
  assert.equal(run.keepsakes[0], bot.pickKeepsake(Object.assign(E.newRun(9), { keepsakes: [] }), shopKs));
  assert.ok(run.tonics.some(Boolean), 'a tonic for an empty slot');
  assert.ok(run.pearls < 1000);
});

test('without a curse the bot takes out a starter Brace; with too few Pearls it buys nothing; noShop buys nothing', () => {
  const run = atShop(80);
  step(run);
  assert.equal(run.deck.filter((c) => c.id === 'brace').length, 3);
  assert.equal(run.pearls, 5);
  const poor = atShop(10);
  step(poor);
  assert.equal(poor.pearls, 10);
  assert.equal(poor.deck.length, BL.STARTER_DECK.length);
  const off = atShop(1000);
  step(off, { noShop: true });
  assert.equal(off.pearls, 1000);
  assert.equal(off.deck.length, BL.STARTER_DECK.length);
  assert.ok(!off.keepsakes.length && !off.tonics.some(Boolean));
});

test('the bot drinks a Shell Tonic before ending a turn that would knock Wren down, and not otherwise', () => {
  const { run, c } = fight(['crab'], { hp: 3, tonics: ['shell'] });
  attack(c);
  assert.equal(step(run), 'tonic');
  assert.equal(c.player.ward, 12);
  assert.deepEqual(run.tonics, [null, null, null]);
  const safe = fight(['crab'], { tonics: ['shell'] });
  attack(safe.c);
  assert.equal(step(safe.run), 'end');
  assert.equal(safe.run.tonics[0], 'shell');
  const off = fight(['crab'], { hp: 3, tonics: ['shell'] });
  attack(off.c);
  assert.equal(step(off.run, { noTonics: true }), 'end');
});

test('a tonic that wins the fight is drunk at once', () => {
  const { run, c } = fight(['mite'], { tonics: ['squall'] });
  hush(c);
  c.enemies[0].hp = 10;
  assert.equal(step(run), 'tonic');
  assert.ok(c.won);
});

test('in a pin or Dread fight the bot opens with Brine on the creature with the most HP; in an easy fight it keeps it', () => {
  const { run, c } = fight(['mite', 'crab'], { kind: 'elite', tonics: ['brine'] });
  hush(c);
  assert.equal(step(run), 'tonic');
  const crab = c.enemies.find((e) => e.id === 'crab');
  assert.equal(crab.st.brine, 8);
  const easy = fight(['mite', 'crab'], { tonics: ['brine'] });
  hush(easy.c);
  assert.equal(step(easy.run), 'end');
  assert.equal(easy.run.tonics[0], 'brine');
});

test('with every slot full the bot uses a tonic in any fight, so the next one is not lost', () => {
  const { run, c } = fight(['mite', 'crab'], { tonics: ['ink', 'kelptea', 'shell'] });
  hush(c);
  assert.equal(step(run), 'tonic');
  assert.equal(run.tonics[0], null);
});

test('between fights the bot drinks Kelp Tea at half HP or less', () => {
  const run = E.newRun(5);
  run.tonics = ['kelptea', null, null];
  run.hp = 30;
  step(run);
  assert.equal(run.hp > 30 || run.screen !== 'map', true);
  assert.equal(run.tonics[0], null);
  const well = E.newRun(5);
  well.tonics = ['kelptea', null, null];
  well.hp = 50;
  step(well);
  assert.equal(well.tonics[0], 'kelptea');
});

test('with the Bailer the bot Stirs twice from Swell 4 into a Crest when nothing else is left to play', () => {
  const { run, c } = fight(['crab'], { kit: ['bailer'], tide: 4, light: 2 });
  hush(c);
  const crests = run.stats.crests;
  assert.equal(step(run), 'stir');
  assert.equal(step(run), 'stir');
  assert.equal(run.stats.crests, crests + 1);
  assert.equal(E.swellActsUsed(c), 2);
  // without it, one Stir can't reach the Crest from 4, so the turn ends
  const one = fight(['crab'], { tide: 4, light: 2 });
  hush(one.c);
  assert.equal(step(one.run), 'end');
});

test('with the Bailer the bot Bails twice from Swell 2 before attacking, to strip an enemy\'s Ward', () => {
  const { run, c } = fight(['crab'], { kit: ['bailer'], tide: 2, light: 3, hand: ['jab'] });
  hush(c);
  c.enemies[0].ward = 6;
  assert.equal(step(run), 'bail');
  assert.equal(step(run), 'bail');
  assert.equal(c.enemies[0].ward, 0, 'the Strand stripped it');
  assert.equal(c.light, 2, 'two spent, one back from the Strand');
  assert.equal(step(run), 'play');
  // with nothing to strip it keeps its Light for the Jab
  const bare = fight(['crab'], { kit: ['bailer'], tide: 2, light: 3, hand: ['jab'] });
  hush(bare.c);
  assert.equal(step(bare.run), 'play');
});

test('the bot Stirs into a Crest mid-turn when the wave would kill', () => {
  const { run, c } = fight(['mite'], { tide: 5, light: 3, hand: ['jab'] });
  hush(c);
  c.enemies[0].hp = 1;
  assert.equal(step(run), 'stir');
  assert.ok(c.won);
});

test('whole expeditions with shopping, tonics and the Bailer are deterministic and carry on exactly after a save', () => {
  const kit = ['bailer', 'purse', 'suit']; // one piece a place: the Flask would take the Bailer's
  let shopped = 0, drank = 0, twice = 0;
  const buy = E.buy, use = E.useTonic, act = E.swellAct;
  let live = null;
  E.buy = function (r, ...a) { const ok = buy.call(this, r, ...a); if (ok && r === live) shopped++; return ok; };
  E.useTonic = function (r, ...a) { const ok = use.call(this, r, ...a); if (ok && r === live) drank++; return ok; };
  E.swellAct = function (r, ...a) { const ok = act.call(this, r, ...a); if (ok && r === live && r.combat.swellActN === 2) twice++; return ok; };
  try {
    for (let seed = 1; seed <= 25; seed++) {
      const a = E.newRun(seed, 0, kit);
      live = a;
      const la = playRun(a, 12000);
      live = null;
      const b = E.newRun(seed, 0, kit);
      assert.deepEqual(playRun(b, 12000), la, `seed ${seed}`);
      assert.ok(a.screen === 'victory' || a.screen === 'defeat');
      // stop partway, save and load, carry on: the same run as without the save
      const c = E.newRun(seed, 0, kit);
      for (let i = 0; i < Math.floor(la.length / 2); i++) step(c);
      const d = saveLoad(c);
      playRun(c, 12000);
      playRun(d, 12000);
      assert.equal(snapshot(d), snapshot(c), `seed ${seed} after a save`);
    }
  } finally {
    E.buy = buy; E.useTonic = use; E.swellAct = act;
  }
  assert.ok(shopped > 0, 'bought something at a shop');
  assert.ok(drank > 0, 'drank a tonic');
  assert.ok(twice > 0, 'Bailed or Stirred twice in a turn');
});
