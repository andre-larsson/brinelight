'use strict';
/* Mateo's hoops (v0.65.0): what each one does to Shield Bash, and how he comes by them. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const bot = require('../tools/bot');
const { load, saveLoad } = bot;
const { BL, E } = load();

const mateo = (seed = 23, level = 0, kit = ['suit']) => E.newRun(seed, level, kit, [], [], true, 2, 0, { keeper: 'mateo' });
/* A fight for Mateo with these hoops fitted and this much Ward. */
function fight(hoops, ward = 10, enc = ['kelp', 'crab'], kit) {
  const r = mateo(23, 0, kit);
  r.hoops = hoops.slice();
  const c = E.startCombat(r, 'easy', enc);
  c.player.ward = ward;
  return { r, c, e: c.enemies[0] };
}

test('every hoop has a name, an icon and words, and Bash without one is as it was', () => {
  for (const [id, h] of Object.entries(BL.HOOPS)) {
    assert.ok(h.name && h.desc && h.art, id);
    assert.ok(fs.existsSync(path.join(__dirname, '../img/icons', h.art + '.webp')), `${id} needs its icon img/icons/${h.art}.webp`);
  }
  const { r, c, e } = fight([]);
  assert.deepEqual(E.bashInfo(r), { cost: 4, free: false, dmg: 6, truss: 0, usesAct: true, brine: 0, again: false });
  const hp = e.hp;
  assert.ok(E.bash(r, e.uid));
  assert.equal(e.hp, hp - 6);
  assert.equal(c.player.ward, 6);
  assert.equal(r.stats.bashes, 1);
  assert.deepEqual(c.fx.filter((f) => f.t === 'bash').map((f) => [f.who, f.cost, f.free]), [[e.uid, 4, false]]);
  assert.ok(!c.fx.some((f) => f.t === 'slash'), 'a Bash has its own effect, not the harpoon\'s slash');
});

test('the Iron Hoop adds 4 damage', () => {
  const { r, c, e } = fight(['iron']);
  const hp = e.hp;
  assert.equal(E.bashDamage(r, e), 10);
  assert.ok(E.bash(r, e.uid));
  assert.equal(e.hp, hp - 10);
  assert.equal(c.player.ward, 6);
});

test('the Truss Hoop adds 1 damage for every 2 Ward left after paying', () => {
  const { r, e } = fight(['truss'], 11);
  assert.equal(E.bashInfo(r).truss, 3); // 11 - 4 = 7 left
  const hp = e.hp;
  assert.ok(E.bash(r, e.uid));
  assert.equal(e.hp, hp - 9);
  const bare = fight(['truss'], 4);
  assert.equal(E.bashDamage(bare.r, bare.e), 6);
  const both = fight(['truss', 'iron'], 12);
  assert.equal(E.bashDamage(both.r, both.e), 6 + 4 + 4);
});

test('the Chime Hoop makes Bash cost no Ward on a turn with a Crest or a Strand', () => {
  const { r, c, e } = fight(['chime'], 0, ['hulk']);
  assert.equal(E.canBash(r).reason, 'Shield Bash needs 4 Ward');
  c.tide = 5;
  c.light = 5;
  r.kit.ditty = 'bailer'; // a second action, so the Stir that Crests leaves one for the Bash
  assert.ok(E.swellAct(r, 'stir'));
  assert.equal(c.turnCrests, 1);
  assert.deepEqual([E.bashInfo(r).cost, E.bashInfo(r).free], [0, true]);
  const hp = e.hp;
  assert.ok(E.bash(r, e.uid));
  assert.equal(e.hp, hp - 6);
  assert.equal(c.player.ward, 0);
  // the next turn it costs Ward again, until the Swell turns
  E.endTurn(r);
  c.player.ward = 9;
  assert.equal(E.bashInfo(r).cost, 4);
  c.tide = 1;
  assert.ok(E.swellAct(r, 'bail'));
  assert.equal(c.turnLows, 1);
  assert.equal(E.bashInfo(r).cost, 0);
  // with the Truss Hoop, all the Ward he holds is Ward left
  const t = fight(['chime', 'truss'], 8);
  t.c.turnCrests = 1;
  assert.equal(E.bashDamage(t.r, t.e), 6 + 4);
});

test('the Bilge Hoop frees Bash from the Bail and Stir actions, still once a turn', () => {
  const { r, c, e } = fight(['bilge']);
  assert.ok(E.swellAct(r, 'stir'));
  assert.ok(!E.canSwellAct(r, 'bail').ok);
  assert.ok(E.bash(r, e.uid), 'a Bash after the turn\'s Stir');
  assert.equal(E.swellActsUsed(c), 1);
  assert.equal(E.canBash(r).reason, 'You have already used Shield Bash this turn');
  E.endTurn(r);
  c.player.ward = 10;
  assert.ok(E.bash(r, e.uid));
  assert.ok(E.swellAct(r, 'bail'), 'and a Bail after the turn\'s Bash');
  // without it, the Bash is the turn's action
  const plain = fight([]);
  assert.ok(E.swellAct(plain.r, 'stir'));
  assert.equal(E.canBash(plain.r).reason, 'Your Bail or Stir actions are used this turn');
});

test('the Herring Hoop puts 3 Brine on the enemy it hits', () => {
  const { r, c, e } = fight(['herring'], 10, ['hulk']);
  assert.ok(E.bash(r, e.uid));
  assert.equal(e.st.brine, 3);
  E.endTurn(r);
  c.player.ward = 10;
  assert.ok(E.bash(r, e.uid));
  assert.equal(e.st.brine, 2 + 3);
  // the Salted Hook adds its 1, as for any Brine the keeper applies
  const hook = fight(['herring'], 10, ['hulk']);
  E.gainKeepsake(hook.r, 'saltedhook');
  assert.ok(E.bash(hook.r, hook.e.uid));
  assert.equal(hook.e.st.brine, 4);
});

test('the Withy Hoop gives the Ward and the Bash back when it finishes an enemy', () => {
  const { r, c } = fight(['withy'], 9, ['kelp', 'crab', 'crab']);
  const [kelp, crab, last] = c.enemies;
  crab.hp = 5; crab.ward = 0;
  last.hp = 6; last.ward = 0;
  assert.ok(E.bashKills(r, crab));
  assert.ok(!E.bashKills(r, kelp));
  assert.ok(E.bash(r, crab.uid));
  assert.ok(crab.dead);
  assert.equal(c.player.ward, 9, 'the 4 Ward come back');
  assert.equal(E.swellActsUsed(c), 0, 'and the action');
  assert.equal(r.stats.bashKills, 1);
  assert.ok(E.canBash(r).ok, 'he can Bash again');
  assert.ok(E.bash(r, last.uid));
  assert.ok(last.dead && E.canBash(r).ok);
  // a Bash that does not finish its enemy is spent as usual
  const hp = kelp.hp;
  assert.ok(E.bash(r, kelp.uid));
  assert.equal(kelp.hp, hp - 6);
  assert.equal(c.player.ward, 5);
  assert.ok(!E.canBash(r).ok);
  assert.ok(!E.swellAct(r, 'stir'));
});

test('a won fight ends cleanly on a Bash with every hoop fitted', () => {
  const { r, c, e } = fight(Object.keys(BL.HOOPS), 10, ['kelp']);
  e.hp = 3; e.ward = 0;
  assert.ok(E.bash(r, e.uid));
  assert.ok(c.won);
  E.finishCombat(r);
  assert.equal(r.screen, 'reward');
});

test('Mateo finds two hoops on each stair down and fits one; Wren finds none', () => {
  const r = mateo(41);
  assert.equal(E.hoopOffer(r), null);
  const rng = () => { r.screen = 'pin'; r.cleared = [r.level || 0]; const before = r.rng; assert.ok(E.goDeeper(r)); return before; };
  rng();
  const offer = E.hoopOffer(r).slice();
  assert.equal(offer.length, 2);
  assert.notEqual(offer[0], offer[1]);
  offer.forEach((id) => assert.ok(BL.HOOPS[id], id));
  assert.deepEqual(E.hoopOffer(saveLoad(r)), offer, 'the same two after a reload');
  const other = Object.keys(BL.HOOPS).find((id) => !offer.includes(id));
  assert.ok(!E.fitHoop(r, other), 'only one of the two offered');
  assert.ok(E.fitHoop(r, offer[1]));
  assert.deepEqual(E.hoops(r), [offer[1]]);
  assert.equal(E.hoopOffer(r), null);
  assert.ok(!E.fitHoop(r, offer[0]), 'one hoop a stair');
  assert.deepEqual(E.hoops(saveLoad(r)), [offer[1]]);
  // the next stair never offers the one he has
  E.backToMap(r);
  rng();
  const second = E.hoopOffer(r);
  assert.equal(second.length, 2);
  assert.ok(!second.includes(offer[1]));
  // the roll is its own: the run's stream is where a run without hoops would have it
  const a = mateo(77), b = mateo(77);
  a.screen = b.screen = 'pin';
  E.goDeeper(a);
  E.rollHoops(b); E.rollHoops(b);
  E.goDeeper(b);
  assert.equal(a.rng, b.rng);
  assert.deepEqual(E.hoopOffer(a), E.hoopOffer(b));
  // over many seeds every hoop turns up
  const seen = new Set();
  for (let seed = 1; seed <= 60; seed++) { const x = mateo(seed); x.screen = 'pin'; E.goDeeper(x); E.hoopOffer(x).forEach((id) => seen.add(id)); }
  assert.equal(seen.size, Object.keys(BL.HOOPS).length);
  const wren = E.newRun(41, 0, ['suit'], [], [], true, 2, 0, { keeper: 'wren' });
  wren.screen = 'pin';
  assert.ok(E.goDeeper(wren));
  assert.equal(E.hoopOffer(wren), null);
  assert.deepEqual(E.hoops(wren), []);
});

test('the bot fits a hoop on the stair and keeps playing', () => {
  for (const seed of [3, 11, 19]) {
    const r = mateo(seed);
    r.screen = 'pin';
    r.cleared = [0];
    E.goDeeper(r);
    const offer = E.hoopOffer(r).slice();
    bot.playRun(r, 4000, {});
    assert.equal(E.hoops(r).length >= 1, true, `seed ${seed}`);
    assert.ok(offer.includes(E.hoops(r)[0]));
    assert.equal(E.hoopOffer(r), null);
    assert.ok(['victory', 'defeat'].includes(r.screen), `seed ${seed} ended on ${r.screen}`);
  }
});

test('the README and the hoops\' own words give the numbers the rules use', () => {
  const readme = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8');
  const H = BL.HOOPS;
  assert.match(readme, new RegExp(`spends ${E.SHIELD_BASH.ward} Ward and 0 Light to deal ${E.SHIELD_BASH.dmg} base damage`));
  assert.match(readme, new RegExp(`Iron Hoop adds ${H.iron.dmg} damage`));
  assert.match(readme, new RegExp(`Truss Hoop adds 1 damage for every ${H.truss.per} Ward left after paying`));
  assert.match(readme, new RegExp(`Herring Hoop applies ${H.herring.brine} Brine`));
  assert.match(readme, /finds two cask hoops and fits one/);
  assert.equal(E.HOOP_CHOICES, 2);
  assert.match(readme, /Opening Bell makes her first Bail or Stir of each fight free/);
  assert.ok(H.iron.desc.includes(`${H.iron.dmg} more damage`));
  assert.ok(H.truss.desc.includes(`every ${H.truss.per} Ward`));
  assert.ok(H.herring.desc.includes(`${H.herring.brine} Brine`));
  Object.keys(H).forEach((id) => assert.ok(readme.includes(H[id].name), `the README names the ${H[id].name}`));
  assert.ok(BL.KEEPERS.mateo.grow && BL.KEEPERS.mateo.desc.includes(`Spend ${E.SHIELD_BASH.ward} Ward to deal ${E.SHIELD_BASH.dmg} damage`));
});

test("Wren's Opening Bell tells the screen when it pays, once a fight", () => {
  assert.equal(BL.KEEPERS.wren.skill, 'Opening Bell');
  const r = E.newRun(10, 0, ['bailer'], [], [], true, 2, 0, { keeper: 'wren', firstRing: true });
  const c = E.startCombat(r, 'easy', ['hulk']);
  c.fx.length = 0;
  assert.ok(E.swellAct(r, 'stir'));
  assert.deepEqual(c.fx.filter((f) => f.t === 'firstring').map((f) => f.kind), ['stir']);
  c.fx.length = 0;
  assert.ok(E.swellAct(r, 'bail'));
  assert.equal(c.fx.filter((f) => f.t === 'firstring').length, 0);
  // a Bail that its own Strand pays for is not the Opening Bell
  const plain = E.newRun(10, 0, null, [], [], false, 0);
  const pc = E.startCombat(plain, 'easy', ['hulk']);
  pc.tide = 1; pc.light = 0; pc.fx.length = 0;
  assert.ok(E.swellAct(plain, 'bail'));
  assert.equal(pc.fx.filter((f) => f.t === 'firstring').length, 0);
});
