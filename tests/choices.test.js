'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, saveLoad } = require('../tools/bot');
const { BL, E } = load();

function win(run) {
  run.combat.won = true;
  E.finishCombat(run);
}

test('the first Shallows Skirmish offers distinct Surge, Ebb and wildcard cards on every seed', () => {
  const surge = new Set(), ebb = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const run = E.newRun(seed);
    E.enterNode(run, E.availableNodes(run)[0]);
    const ordinary = saveLoad(run);
    ordinary.normalFights++;
    win(run);
    win(ordinary);
    const [a, b, c] = run.rewards.cards;
    assert.ok(run.rewards.opening);
    assert.equal(new Set([a.id, b.id, c.id]).size, 3);
    assert.ok(E.vals(a).surge > 0);
    assert.ok(E.vals(b).ebb > 0);
    assert.ok(ordinary.rewards.cards.some((card) => card.id === c.id), 'wildcard comes from the normal roll');
    assert.equal(run.rng, ordinary.rng, 'the labeled draft does not move other RNG rolls');
    assert.deepEqual(run.rewards, saveLoad(run).rewards);
    assert.equal(ordinary.rewards.opening, false);
    surge.add(a.id);
    ebb.add(b.id);
  }
  assert.ok(surge.size > 1 && ebb.size > 1, 'the choices vary');
  for (const [level, kind] of [[1, 'easy'], [0, 'elite']]) {
    const run = E.newRun(1, level);
    E.startCombat(run, kind);
    win(run);
    assert.equal(run.rewards.opening, false);
  }
});

test('Bosun reveals one reachable Dread at a fork in each walkable depth', () => {
  for (const level of [0, 1]) {
    let paths = 0, doubleDread = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const run = E.newRun(seed, level);
      for (const node of run.map.grid.flat().filter(Boolean)) {
        run.pos = { row: node.row, col: node.col };
        const available = E.availableNodes(run);
        const dreads = available.filter((n) => n.type === 'elite');
        const rng = run.rng;
        const clue = E.bosunClue(run);
        if (available.length < 2 || !dreads.length) {
          assert.equal(clue, null);
          continue;
        }
        paths++;
        assert.ok(dreads.includes(clue.node));
        assert.equal(run.rng, rng);
        const saved = saveLoad(run);
        saved.tonics[0] = 'kelptea';
        assert.ok(E.useTonic(saved, 0));
        assert.deepEqual(E.bosunClue(saved), clue);
        E.enterNode(saved, E.nodeAt(saved, clue.node));
        assert.deepEqual(saved.combat.enc, clue.enc);
        const alternate = dreads.find((n) => n !== clue.node);
        if (alternate) {
          doubleDread++;
          const other = saveLoad(run);
          E.enterNode(other, E.nodeAt(other, alternate));
          assert.notDeepEqual(other.combat.enc, clue.enc);
        }
      }
    }
    assert.ok(paths && doubleDread, 'seeds cover forks with one and multiple Dreads');
  }
  const dive = E.newRun(2, 2, ['suit']);
  assert.ok(E.availableNodes(dive)[0].enc);
  assert.equal(E.bosunClue(dive), null);
});

test('each refittable card has two versions with distinct effects or costs and both can be played', () => {
  for (const id of Object.keys(BL.CARDS)) {
    const run = E.newRun(3);
    run.deck = [];
    const card = E.addCard(run, id);
    const options = E.refits(card);
    if (['status', 'curse'].includes(E.def(card).type)) {
      assert.deepEqual(options, []);
      continue;
    }
    assert.deepEqual(options, [1, 2], id);
    const versions = options.map((up) => {
      const copy = saveLoad(run);
      const refit = E.upgradeCard(copy, card.uid, up);
      assert.ok(refit);
      assert.equal(E.upgradeCard(copy, card.uid, 3 - up), null, 'one refit per copy');
      E.startCombat(copy, 'easy', ['crab'], { noShuffle: true });
      const c = copy.combat;
      assert.ok(E.playCard(copy, card.uid, c.enemies[0].uid), E.cardName(refit));
      return [E.cost(refit), E.def(refit).text(E.vals(refit), { d: String, tide: null, ward: null })];
    });
    assert.notDeepEqual(...versions, id);
  }
});

test('Rising Swell refits trade a stronger hit for an earlier Crest and survive saves and duplication', () => {
  const base = E.newRun(2);
  const card = base.deck.find((c) => c.id === 'swell');
  const preview = (up, tide) => {
    const run = saveLoad(base);
    const refit = E.upgradeCard(run, card.uid, up);
    E.duplicateCard(run, refit.uid);
    assert.equal(E.cardName(run.deck.at(-1)), E.cardName(refit));
    run.deck = [refit];
    E.startCombat(run, 'easy', ['crab'], { noShuffle: true });
    const saved = saveLoad(run);
    saved.combat.tide = tide;
    return E.preview(saved, refit.uid, saved.combat.enemies[0].uid);
  };
  assert.equal(preview(1, 3).damage, 8);
  assert.equal(preview(1, 3).crests, 0);
  assert.equal(preview(2, 3).damage, 11);
  assert.equal(preview(2, 3).crests, 1);
  assert.ok(preview(1, 4).damage > preview(2, 4).damage);
  assert.equal(E.cardName({ id: 'swell', up: true }), 'Rising Swell+');
  const random = E.newRun(2);
  assert.equal(E.upgradeRandom(random, 1), 1);
  assert.equal(random.deck.find((c) => c.up).up, 1);
});

test('Coves, stairs, lesser bells and giving to the sea accept the alternate without spending invalid picks', () => {
  const run = E.newRun(4);
  const [card, next] = run.deck;
  run.screen = 'rest';
  assert.equal(E.refitAtCove(run, card.uid, 3), null);
  assert.equal(E.refitAtCove(run, card.uid, 2).up, 2);
  assert.equal(E.refitAtCove(run, next.uid, 2), null);
  run.restDone = false;
  E.gainKeepsake(run, 'moonshard');
  assert.equal(E.giveToSea(run, 'moonshard', card.uid, 1), null);
  assert.ok(E.has(run, 'moonshard'));
  assert.equal(E.giveToSea(run, 'moonshard', next.uid, 2).card.up, 2);
  for (const place of ['passage', 'pocket']) {
    const run = E.newRun(4);
    run.screen = 'rest';
    run[place] = true;
    assert.equal(E.stairDo(run, 'refit', run.deck[0].uid, 3), null);
    assert.deepEqual(E.stairState(run).picks, []);
    assert.equal(E.stairDo(run, 'refit', run.deck[0].uid, 2).card.up, 2);
    assert.deepEqual(E.stairState(run).picks, ['refit']);
  }
});

test('Hester marks an existing Fog, leaves the usual choices and pays once for a safe return', () => {
  const meta = E.newMeta();
  for (let seed = 1; seed <= 100; seed++) {
    const run = E.newRun(seed);
    E.offerHesterJob(meta, run);
    assert.ok(E.hesterJobAhead(run));
    const fog = E.nodeAt(run, run.hesterJob);
    assert.equal(fog.type, 'event');
    E.enterNode(run, fog);
    const normal = E.eventDef(run).options;
    assert.deepEqual(E.eventOptions(run).slice(0, -1), normal);
    assert.match(E.eventOptions(run).at(-1).label, /Recover the keeper's log/);
  }
  let run = E.newRun(2);
  E.offerHesterJob(meta, run);
  E.enterNode(run, E.nodeAt(run, run.hesterJob));
  const index = E.eventOptions(run).length - 1;
  assert.ok(E.chooseEventOption(run, index));
  assert.equal(E.chooseEventOption(run, index), null);
  run = saveLoad(run);
  assert.ok(run.hesterJob.recovered);
  assert.equal(E.deliverHesterJob(meta, run), 0);
  run.screen = 'defeat';
  assert.equal(E.deliverHesterJob(meta, run), 0);
  assert.equal(meta.hesterDone, false);
  run.screen = 'pin';
  run.cleared = [0];
  assert.ok(E.goDeeper(run));
  assert.ok(run.hesterJob.recovered);
  assert.equal(E.deliverHesterJob(meta, run), 0);
  run.cleared.push(1);
  run.screen = 'pin';
  assert.ok(E.goHome(run));
  assert.equal(E.deliverHesterJob(meta, { ...run, cheated: true }), 0);
  const cheapest = Math.min(...Object.values(BL.KIT).map((g) => g.price).filter((price) => price > 0));
  assert.equal(E.deliverHesterJob(meta, run), cheapest);
  assert.equal(E.deliverHesterJob(meta, run), 0);
  assert.equal(meta.earned, cheapest);
  assert.ok(E.buyKit(meta, 'purse'));
  const next = E.newRun(2);
  E.offerHesterJob(JSON.parse(JSON.stringify(meta)), next);
  assert.equal(next.hesterJob, undefined);
});
