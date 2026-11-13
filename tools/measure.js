/* Bot win rates for a list of settings, measured in up to 8 processes at once (--workers 1 for one).

   Each setting (a "row") plays the same seeds with the bot from tools/bot.js. Rows and seeds are
   independent, so they are split into jobs and each job runs in its own process (8 at a time unless --workers says). The numbers are the
   same as playing them one after another; only the wait is shorter.

     node tools/measure.js                      the built-in table: the expedition, each current, and the Roil ladder
     node tools/measure.js my-spec.js           your own rows (see below)
     node tools/measure.js my-spec.js --seeds 300 --workers 8

   A spec file exports { seeds, rows }, or a function (E, BL) => ({ seeds, rows }). Each row:
     name      what to print
     level     the level to start in, 0 = the Shallows (default 0; a real expedition always starts there)
     home      go home after this level's pin (default: always go on down, as far as the kit allows)
     currents  current ids, e.g. ['fed', 'teeth']
     kit       Workshop kit ids to wear, e.g. ['honed', 'gorget']; wear 'suit' to go down into the Belfry
     bring     keepsake ids brought from the Lazaret
     heartHome true: the Heart came home on an earlier expedition, so the Belfry ends with one of its finals
     deepest   the deepest level reached on earlier expeditions (0-2), which sets the Hold (20, 30, 40)
     roil      a fixed penalty for every fight, in place of the run's own Roil: a number of ladder
               steps, or { seep, thrash, minnows }
     setup     (E, BL) => {...}, run once before the row is played: change a constant, patch a rule.
   Rows are built again in every process, so a row must not depend on anything outside the spec file.

   Columns: home % is the share that came home (after the `home` level's pin, or from the Belfry). Then one column
   per pin: pin 1 % broke the Shallows' pin; pin 2 % is the share of those that also broke Dark Water's, and pin 3 %
   the share of those that also won the Belfry's last landing. Last, the HP lost and the landings reached. */
'use strict';
const path = require('path');
const os = require('os');
const { fork } = require('child_process');
const bot = require('./bot.js');

function defaultSpec(E) {
  const rows = [{ name: 'Expedition, wearing the diving dress', kit: ['suit'] }, { name: 'Shallows only, then home', home: 0 },
    { name: 'Expedition after the Heart, diving dress', kit: ['suit'], heartHome: true }];
  Object.keys(E.CURRENTS).forEach((k) => rows.push({ name: `Expedition, diving dress, current: ${E.CURRENTS[k].name}`, kit: ['suit'], currents: [k] }));
  for (let step = 1; step <= 6; step++) {
    const r = E.roilFor(E.hold() + E.SEEP_STEP * step);
    rows.push({ name: `Shallows, ladder step ${step}: ${r.seep} Seep, Thrash ${r.thrash}, ${r.minnows} Bell Minnow${r.minnows === 1 ? '' : 's'}`, roil: step });
  }
  return { seeds: 1000, rows };
}

function loadSpec(file) {
  const { BL, E } = bot.load();
  let spec = file ? require(path.resolve(file)) : defaultSpec;
  if (typeof spec === 'function') spec = spec(E, BL);
  if (!spec || !Array.isArray(spec.rows) || !spec.rows.length) throw new Error('measure: the spec needs a rows array');
  return spec;
}

/* Play seeds `from`..`to` of one row. Runs in a child process, so setup() can change anything. */
function playJob(job) {
  const { BL, E } = bot.load();
  const row = loadSpec(job.file).rows[job.row];
  if (row.setup) row.setup(E, BL);
  if (row.roil != null) {
    const fixed = typeof row.roil === 'number' ? E.roilFor(E.hold() + E.SEEP_STEP * row.roil)
      : Object.assign({ steps: 1, seep: 0, thrash: 0, minnows: 0 }, row.roil);
    E.roil = () => fixed;
  }
  let wins = 0, taken = 0, floors = 0, pin1 = 0, pin2 = 0, pin3 = 0;
  for (let seed = job.from; seed <= job.to; seed++) {
    const run = E.newRun(seed, row.level || 0, row.kit || null, row.bring || [], row.currents || [], !!row.heartHome, row.deepest || 0);
    bot.playRun(run, 12000, { home: row.home });
    if (run.screen === 'victory') wins++;
    if (run.cleared.indexOf(0) >= 0) pin1++;
    if (run.cleared.indexOf(1) >= 0) pin2++;
    if (run.cleared.indexOf(2) >= 0) pin3++;
    taken += run.stats.dmgTaken;
    floors += E.landed(run).reduce((a, b) => a + (b || 0), 0);
  }
  return { wins, taken, floors, pin1, pin2, pin3, n: job.to - job.from + 1 };
}

function main(argv) {
  const opt = (name, def) => { const i = argv.indexOf('--' + name); return i >= 0 ? +argv[i + 1] : def; };
  const file = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--'))) || null;
  const spec = loadSpec(file);
  const seeds = opt('seeds', spec.seeds || 1000);
  // at most 8 processes by default: a full all-core load has hard-reset the development machine (an i9-13900KF)
  const workers = Math.max(1, opt('workers', Math.max(1, Math.min(8, os.cpus().length - 2))));
  // split each row's seeds so that a short list of rows still fills every core
  const parts = Math.max(1, Math.min(8, Math.ceil(workers / spec.rows.length)));
  const size = Math.ceil(seeds / parts);
  const jobs = [];
  spec.rows.forEach((row, r) => { for (let from = 1; from <= seeds; from += size) jobs.push({ file, row: r, from, to: Math.min(seeds, from + size - 1) }); });
  const sum = spec.rows.map(() => ({ wins: 0, taken: 0, floors: 0, pin1: 0, pin2: 0, pin3: 0, n: 0 }));
  const t0 = Date.now();
  let next = 0, running = 0, failed = false;
  const finish = () => {
    console.log(`home %  pin 1 %  pin 2 %  pin 3 %  HP lost  landings  (${seeds} seeds each; pin 2 and 3 are shares of the pin before)`);
    const pc = (a, b) => (b ? (100 * a / b).toFixed(1) : '-').padStart(6);
    spec.rows.forEach((row, r) => {
      const s = sum[r], lv = row.level || 0;
      const p1 = lv <= 0 ? pc(s.pin1, s.n) : '     -';
      const p2 = lv <= 1 ? pc(s.pin2, lv === 1 ? s.n : s.pin1) : '     -';
      const p3 = pc(s.pin3, lv === 2 ? s.n : s.pin2);
      console.log(`${pc(s.wins, s.n)}   ${p1}   ${p2}   ${p3}  ${(s.taken / s.n).toFixed(0).padStart(7)}  ${(s.floors / s.n).toFixed(1).padStart(8)}  ${row.name || 'row ' + (r + 1)}`);
    });
    console.log(`${jobs.length} jobs on ${Math.min(workers, jobs.length)} processes, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  };
  const launch = () => {
    while (!failed && running < workers && next < jobs.length) {
      const job = jobs[next++];
      // a 1 GB heap per job: a runaway job dies on its own instead of filling the machine's memory (Node's default is ~4 GB each)
      const child = fork(__filename, ['--job', JSON.stringify(job)], { execArgv: ['--max-old-space-size=1024'] });
      running++;
      let got = false;
      child.on('message', (res) => { got = true; const s = sum[job.row]; Object.keys(res).forEach((k) => { s[k] += res[k]; }); });
      child.on('exit', (code) => {
        running--;
        if (code !== 0 || !got) { failed = true; process.exitCode = 1; console.error(`measure: the job for row ${job.row + 1} (seeds ${job.from}-${job.to}) failed`); return; }
        if (next >= jobs.length && running === 0) finish(); else launch();
      });
    }
  };
  launch();
}

if (require.main === module) {
  const i = process.argv.indexOf('--job');
  if (i >= 0) process.send(playJob(JSON.parse(process.argv[i + 1])), () => process.exit(0));
  else main(process.argv.slice(2));
}

module.exports = { loadSpec, playJob };
