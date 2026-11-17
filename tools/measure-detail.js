/* Difficulty and length in one table: like tools/measure.js (same spec files, same bot, one process per job), but
   each row also says how long the expeditions that bring the Heart home are, and how close they come to falling.

     node tools/measure-detail.js my-spec.js [--seeds N] [--workers N]

   A spec exports { seeds, rows }; a row has name, kit (default ['suit']), level, bring, currents, heartHome, deepest,
   bot (options for tools/bot.js) and setup(E, BL, bot) as in tools/measure.js. Columns:
     Heart, pin1, pin2, pin3  as in measure.js (pin 2 and 3 are shares of the pin before)
     heart-run                for expeditions that bring the Heart home: combat turns, cards played, the lowest HP share
                              on the way, and the share of them that fell below 25% of Max HP at some point
     turns to clear           combat turns spent in each level, by expeditions that broke its pin
     t/fight                  turns per won fight: Skirmishes in the Shallows and Dark Water, Dreads and pins by level
     deck, up, HPlost         cards in the deck at the end, how many upgraded, HP lost in all
   Made for "harder without making it longer" (v0.41.0); see GAME_NOTES.md. */
'use strict';
const path = require('path');
const { fork } = require('child_process');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const REPO = path.resolve(opt('repo', path.join(__dirname, '..')));
function load() { return require(path.join(REPO, 'tools/bot.js')); }
function job(j) {
  const bot = load();
  const { BL, E } = bot.load();
  const spec = require(path.resolve(j.file));
  const row = spec.rows[j.row];
  if (row.setup) row.setup(E, BL, bot);
  const acc = { n: 0, heart: 0, p1: 0, p2: 0, p3: 0, fights: 0, turns: 0, plays: 0, lvTurns: [0, 0, 0], lvFights: [0, 0, 0], kindTurns: {}, kindN: {}, minHp: 0, deck: 0, close: 0, hpLost: 0, died: [0, 0, 0], steps: 0, upCards: 0, hTurns: 0, hPlays: 0, hMin: 0, clrTurns: [0, 0, 0], clrN: [0, 0, 0] };
  for (let seed = j.from; seed <= j.to; seed++) {
    const run = E.newRun(seed, row.level || 0, row.kit || ['suit'], row.bring || [], row.currents || [], !!row.heartHome, row.deepest || 0);
    let minHp = 1; const lvT = [0, 0, 0]; let plays = 0, turns = 0;
    const opts = Object.assign({}, row.bot);
    for (let i = 0; i < 12000; i++) {
      const s = run.screen;
      let pre = null;
      if (s === 'combat' && run.combat && run.combat.won) pre = { turn: run.combat.turn, kind: run.combat.kind, lv: run.level || 0 };
      const l = bot.step(run, opts);
      if (!l) break;
      acc.steps++;
      if (l === 'play') { acc.plays++; plays++; }
      if (pre) {
        acc.fights++; acc.turns += pre.turn; turns += pre.turn; lvT[pre.lv] += pre.turn; acc.lvTurns[pre.lv] += pre.turn; acc.lvFights[pre.lv]++;
        const k = pre.kind === 'easy' || pre.kind === 'hard' ? 'skirmish' : pre.kind;
        acc.kindTurns[k + pre.lv] = (acc.kindTurns[k + pre.lv] || 0) + pre.turn; acc.kindN[k + pre.lv] = (acc.kindN[k + pre.lv] || 0) + 1;
      }
      if (run.maxHp) minHp = Math.min(minHp, Math.max(0, run.hp) / run.maxHp);
    }
    if (run.screen === 'defeat') { acc.died[run.level || 0]++; }
    acc.n++;
    if (run.screen === 'victory' && run.heart) acc.heart++;
    if (run.cleared.indexOf(0) >= 0) acc.p1++;
    if (run.cleared.indexOf(1) >= 0) acc.p2++;
    if (run.cleared.indexOf(2) >= 0) acc.p3++;
    acc.minHp += minHp; acc.deck += run.deck.length; acc.hpLost += run.stats.dmgTaken;
    acc.upCards += run.deck.filter((c) => c.up).length;
    if (run.heart && minHp < 0.25) acc.close++;
    if (run.heart) { acc.hTurns += turns; acc.hPlays += plays; acc.hMin += minHp; }
    run.cleared.forEach((lv) => { acc.clrTurns[lv] += lvT[lv]; acc.clrN[lv]++; });
  }
  return acc;
}
function merge(a, b) {
  if (!a) return b;
  Object.keys(b).forEach((k) => {
    if (Array.isArray(b[k])) b[k].forEach((v, i) => { a[k][i] += v; });
    else if (typeof b[k] === 'object') Object.keys(b[k]).forEach((kk) => { a[k][kk] = (a[k][kk] || 0) + b[k][kk]; });
    else a[k] += b[k];
  });
  return a;
}
function main() {
  const file = argv[0];
  const spec = require(path.resolve(file));
  const seeds = +opt('seeds', spec.seeds || 1000);
  const workers = Math.max(1, +opt('workers', Math.min(6, require('./measure.js').physicalCores())));
  const parts = Math.max(1, Math.ceil(workers * 2 / spec.rows.length));
  const size = Math.ceil(seeds / parts);
  const jobs = [];
  spec.rows.forEach((r, i) => { for (let f = 1; f <= seeds; f += size) jobs.push({ file, row: i, from: f, to: Math.min(seeds, f + size - 1) }); });
  const sum = spec.rows.map(() => null);
  let next = 0, running = 0; const t0 = Date.now();
  const fin = () => {
    const f = (x, d = 1) => x.toFixed(d);
    console.log('Heart  pin1  pin2  pin3 | heart-run: turns plays minHP close% | turns to clear L0 L1 L2 | t/fight skirm(L0 L1) dread(L0 L1 L2) boss(L0 L1 L2) | deck up HPlost | row');
    spec.rows.forEach((r, i) => {
      const s = sum[i], n = s.n, pc = (a, b) => (b ? 100 * a / b : 0).toFixed(1).padStart(5);
      const kt = (k) => (s.kindN[k] ? (s.kindTurns[k] / s.kindN[k]).toFixed(2) : '  -  ');
      const h = Math.max(1, s.heart);
      console.log(`${pc(s.heart, n)} ${pc(s.p1, n)} ${pc(s.p2, s.p1)} ${pc(s.p3, s.p2)} | ${f(s.hTurns / h).padStart(5)} ${f(s.hPlays / h, 0).padStart(5)} ${f(s.hMin / h, 2)} ${pc(s.close, s.heart)} | ${s.clrTurns.map((t, l) => f(t / Math.max(1, s.clrN[l])).padStart(5)).join(' ')} | ${kt('skirmish0')} ${kt('skirmish1')} | ${kt('elite0')} ${kt('elite1')} ${kt('elite2')} | ${kt('boss0')} ${kt('boss1')} ${kt('boss2')} | ${f(s.deck / n)} ${f(s.upCards / n)} ${f(s.hpLost / n, 0).padStart(5)} | ${r.name}`);
    });
    console.log(`${seeds} seeds, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  };
  const launch = () => {
    while (running < workers && next < jobs.length) {
      const j = jobs[next++]; running++;
      const ch = fork(__filename, ['--job', JSON.stringify(j), '--repo', REPO], { execArgv: ['--max-old-space-size=1024'] });
      ch.on('message', (res) => { sum[j.row] = merge(sum[j.row], res); });
      ch.on('exit', (code) => { running--; if (code) { console.error('job failed', j); process.exit(1); } if (next >= jobs.length && !running) fin(); else launch(); });
    }
  };
  launch();
}
const ji = process.argv.indexOf('--job');
if (ji >= 0) process.send(job(JSON.parse(process.argv[ji + 1])), () => process.exit(0));
else main();
