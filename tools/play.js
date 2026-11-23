/* Play Brinelight as text, one command at a time: for a person in a terminal, or a coding agent playtesting the game.
   It drives the same engine as the page and shows what a screen shows, in words: card texts, intents, statuses,
   the Swell, choices. The run is saved after every command, so each command is its own process.

     node tools/play.js new [seed]        start an expedition in the Shallows, as a first-time player
     node tools/play.js                   show the current screen (also: look)
     node tools/play.js help              the commands for this screen
     node tools/play.js rules [tab]       How to Play, as the game shows it (basics, tide, keywords, map, controls)
     node tools/play.js <command...>      do something, then show the screen
     node tools/play.js "play 1 2; play 3; end"   several moves at once (stops at the first that fails); card numbers
                                          are the hand as listed before the chain

   --dir DIR keeps the run somewhere else (default: .play/ in the repo, git-ignored). Every command and its output is
   appended to DIR/log.txt, so a playtest can be read back afterwards. */
'use strict';
const fs = require('fs');
const path = require('path');
const { load } = require('./bot');

const { BL, E } = load();
require('../js/version.js');

/* ---------------- arguments and saving ---------------- */
const argv = process.argv.slice(2);
let dir = path.join(__dirname, '..', '.play');
const di = argv.indexOf('--dir');
if (di >= 0) { dir = path.resolve(argv[di + 1]); argv.splice(di, 2); }
fs.mkdirSync(dir, { recursive: true });
const SAVE = path.join(dir, 'run.json');
const LOG = path.join(dir, 'log.txt');

const out = [];
const say = (...l) => out.push(...l);
const strip = (s) => String(s == null ? '' : s).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/&times;/g, 'x').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#9733;/g, '*').replace(/&rarr;/g, '->').replace(/&larr;/g, '<-');

function readRun() {
  try { return JSON.parse(fs.readFileSync(SAVE, 'utf8')); } catch (e) { return null; }
}
function writeRun(run) {
  if (run.combat) run.combat.fx = [];
  fs.writeFileSync(SAVE, JSON.stringify(run));
}

/* ---------------- words ---------------- */
const NODE_NAME = { fight: 'Skirmish', elite: 'Dread (elite)', rest: 'Sheltered Cove (rest)', shop: "Barnaby's Shop", event: 'Fog (unknown)', treasure: 'Wreck (treasure)', toll: 'Toll bell (pay to pass)', boss: 'Boss', pocket: 'A lesser bell (air: choose one)' };
const TYPE_LABEL = { attack: 'Attack', skill: 'Skill', rite: 'Rite', status: 'Status', curse: 'Curse' };
const plainFmt = { d: (n) => String(n), tide: null, ward: null };

function cardLine(run, card, inCombat) {
  const d = BL.CARDS[card.id];
  const cost = E.cost(card, inCombat ? run.combat : null);
  const v = inCombat ? E.playVals(run, card) : E.vals(card);
  const tg = inCombat ? E.targets(run.combat) : [];
  const aim = tg.length === 1 ? tg[0] : null; // the game counts the aimed creature's Soaked; with one creature it is that one
  const fmt = inCombat ? { d: (n) => String(E.attackValue(run.combat.player, aim, n)), tide: run.combat.tide, ward: run.combat.player.ward } : plainFmt;
  return `${E.cardName(card)} [${cost == null ? '-' : cost}] ${TYPE_LABEL[d.type]}: ${strip(d.text(v, fmt))}`;
}
const pseudo = (id) => ({ uid: 0, id, up: 0 });
// statuses that are on or off, as the page shows them with no number (a Grok run read "In its Bell 1" as a counter)
const NO_COUNT = ['submerged', 'shell', 'belled', 'echo', 'fullbelly'];
function statusLine(o) {
  return Object.keys(o.st).filter((k) => o.st[k]).map((k) => {
    const s = BL.STATUSES[k];
    return s ? `${s.name}${NO_COUNT.indexOf(k) >= 0 ? '' : ' ' + o.st[k]} (${strip(s.desc(o.st[k]))})` : `${k} ${o.st[k]}`;
  }).join('; ');
}
const bossName = (run) => { const B = E.band(run); return run.heartHome && E.lastLevel(run) && B.finalBoss ? B.finalBoss : B.boss; };

function hud(run) {
  const ks = run.keepsakes.map((k) => `${BL.KEEPSAKES[k].name} (Roil ${BL.KEEPSAKES[k].charge})`).join(', ') || 'none';
  const tonics = run.tonics.map((t, i) => (t ? `${i + 1}: ${BL.TONICS[t].name}` : `${i + 1}: empty`)).join(', ');
  const roil = E.roil(run);
  const kit = E.kitIds(run).map((id) => BL.KIT[id].name).join(', ');
  say(`${E.LEVELS[run.level || 0].name}, landing ${run.floor} of ${E.mapRows(run) + 1}. HP ${run.hp}/${run.maxHp}. Pearls ${run.pearls}. Deck ${run.deck.length} cards.`,
    `Keepsakes: ${ks}. Roil ${E.charge(run)} of your Hold ${E.hold(run)}${roil.steps ? ` (Roiled ${roil.steps} step${roil.steps > 1 ? 's' : ''}: ${[roil.seep && `${roil.seep} Seep`, roil.thrash && `Thrash ${roil.thrash}`, roil.minnows && `${roil.minnows} Bell Minnow${roil.minnows > 1 ? 's' : ''}`].filter(Boolean).join(', ')} each fight)` : ', Calm'}.`,
    `Tonics: ${tonics}.${kit ? ` Kit: ${kit}.` : ''}`);
}

/* What happened since the last command, from the fight's effect queue. */
function fxLines(run) {
  const c = run.combat;
  if (!c || !c.fx || !c.fx.length) return [];
  const who = (u) => (u === 'p' ? 'You' : (c.enemies.find((e) => e.uid === u) || { name: 'it' }).name);
  const lines = [];
  let tide = 0;
  c.fx.forEach((f) => {
    switch (f.t) {
      case 'turn': lines.push(`-- Your turn ${f.turn} --`); break;
      case 'play': { const card = [].concat(c.discard, c.sunk, c.hand, c.rites || [], c.draw).find((x) => x && x.uid === f.uid); lines.push(`You play ${card ? E.cardName(card) : 'a card'}${f.target ? ` at ${who(f.target)}` : ''}.`); break; }
      case 'act': lines.push(`${who(f.who)} uses ${f.name}.`); break;
      case 'phase': lines.push(`${who(f.who)}: ${strip(f.text)}`); break;
      case 'dmg': lines.push(`${who(f.who)} ${f.who === 'p' ? 'lose' : 'loses'} ${f.n} HP${f.blocked ? ` (${f.blocked} blocked by Ward)` : ''}${f.brine ? ' to Brine' : ''}.`); break;
      case 'heal': lines.push(`${who(f.who)} ${f.who === 'p' ? 'heal' : 'heals'} ${f.n}.`); break;
      case 'die': lines.push(`${who(f.who)} dies.`); break;
      case 'summon': lines.push(`${who(f.who)} appears.`); break;
      case 'rise': lines.push(`${who(f.who)} rises: ${strip(f.text)}.`); break;
      case 'status': if (BL.STATUSES[f.key]) lines.push(`${who(f.who)}: ${BL.STATUSES[f.key].name} ${f.n > 0 ? '+' : ''}${f.n}.`); break;
      case 'crest': lines.push(`CREST! ${f.n} damage to every enemy${f.chain > 1 ? ` (Crest ${f.chain} this turn)` : ''}.`); break;
      case 'low': lines.push(`STRAND! Every enemy loses its Ward${f.light ? `, you gain ${f.light} Light` : ''}.`); break;
      case 'thrash': lines.push(`Thrash: the Roiled aether hits you for ${f.n}.`); break;
      case 'swallow': lines.push(`${who(f.who)} swallows your ${f.name}.`); break;
      case 'submerge': lines.push(`${who(f.who)} sinks out of reach.`); break;
      case 'burst': lines.push(`${who(f.who)} bursts for ${f.n}.`); break;
      case 'ks': if (BL.KEEPSAKES[f.k]) lines.push(`(${BL.KEEPSAKES[f.k].name} acts: ${strip(BL.KEEPSAKES[f.k].desc).replace(/\.$/, '')}.)`); break;
      case 'echo': lines.push(`Echo: ${f.name} again.`); break;
      case 'swellact': lines.push(`You ${f.kind === 'bail' ? 'Bail (Ebb 1)' : 'Stir (Surge 1)'} for 1 Light.`); break;
      case 'tide': tide += f.d; lines.push(`Swell ${f.d > 0 ? '+' : ''}${f.d}${f.undertow ? ' (the undertow)' : ''}.`); break;
      case 'light': lines.push(`+${f.n} Light.`); break;
      case 'kit': { const id = E.kitIds(run).find((x) => BL.KIT[x].place === f.k) || (f.k === 'bell' ? E.bell(run) : null); if (id && BL.KIT[id]) lines.push(`(Your ${BL.KIT[id].name} acts${f.k === 'bell' ? `: ${strip(E.kitDesc(id, run)).replace(/\.$/, '')}` : ''}.)`); break; }
      case 'roil': lines.push(`The aether is Roiled: ${[f.seep && `${f.seep} Seep in your deck`, f.thrash && `Thrash ${f.thrash}`, f.minnows && `${f.minnows} Bell Minnows`].filter(Boolean).join(', ')}.`); break;
      default: break;
    }
  });
  c.fx = [];
  return lines;
}

/* ---------------- screens ---------------- */
function showCombat(run) {
  const c = run.combat;
  hud(run);
  say('', `FIGHT (${c.kind}), turn ${c.turn}. Light ${c.light}/${c.maxLight}. Swell ${c.tide} (0 = Strand, 6 = Crest). Draw pile ${c.draw.length}, discard ${c.discard.length}${c.sunk.length ? `, sunk ${c.sunk.length}` : ''}.`);
  const sw = E.canSwellAct(run);
  say(`You: ${run.hp}/${run.maxHp} HP${c.player.ward ? `, Ward ${c.player.ward}` : ''}${statusLine(c.player) ? '. ' + statusLine(c.player) : ''}${c.echo ? `. Echo ${c.echo}: your next card is played twice` : ''}.`);
  say(`Bail/Stir (1 Light: Ebb 1 / Surge 1): ${sw.ok ? 'available' : sw.reason}${!sw.ok && E.canSwellAct(run, 'bail').ok ? ', but a Bail is free now: it makes your first Strand' : ''}.`);
  say('', 'Enemies:');
  const tg = E.targets(c);
  c.enemies.forEach((e) => {
    if (e.dead) return;
    const info = E.intentInfo(run, e);
    const n = tg.indexOf(e);
    say(`  ${n >= 0 ? `[${n + 1}]` : '[-]'} ${e.name}: ${e.hp}/${e.maxHp} HP${e.ward ? `, Ward ${e.ward}` : ''}${statusLine(e) ? '. ' + statusLine(e) : ''}${e.roil ? '. (Followed your Roil.)' : ''}`);
    if (info) say(`      Intends ${info.name}: ${info.parts.join('. ')}.`);
  });
  const incoming = E.alive(c).reduce((a, e) => { const i = E.intentInfo(run, e); return a + (i ? i.dmg * (i.hits || 0) : 0); }, 0);
  say(`  Incoming attack damage: ${incoming} before your Ward.`);
  say('', 'Hand:');
  const json = E.previewJSON(run);
  c.hand.forEach((card, i) => {
    const p = E.playable(run, card);
    const d = BL.CARDS[card.id];
    let badge = '';
    if (p.ok && d.type !== 'status' && d.type !== 'curse') {
      const ts = E.needsTarget(card) ? tg.map((e) => e.uid) : [null];
      let best = null;
      ts.forEach((t) => { const r = E.preview(run, card.uid, t, json); if (r && (!best || (r.won && !best.won) || r.kills > best.kills)) best = r; });
      if (best) badge = [best.won ? 'VICTORY' : best.kills ? `LETHAL${best.kills > 1 ? 'x' + best.kills : ''}` : '', best.crests ? `CREST${best.crests > 1 ? 'x' + best.crests : ''}` : best.lows ? 'STRAND' : ''].filter(Boolean).join(' ');
    }
    say(`  ${i + 1}. ${cardLine(run, card, true)}${E.needsTarget(card) ? ' (targets an enemy)' : ''}${p.ok ? '' : ` -- can't play: ${p.reason}`}${badge ? `  <${badge}>` : ''}`);
  });
}

function showMap(run) {
  hud(run);
  const av = E.availableNodes(run);
  const rows = E.mapRows(run);
  const lv = run.level || 0;
  const clue = E.bosunClue(run);
  const job = E.hesterJobAhead(run);
  const item = BL.HESTER_JOBS[lv];
  say('', `MAP: ${E.LEVELS[lv].name}. ${bossName(run)} waits on landing ${rows + 1}, the last.${!E.lastLevel(run) && E.deepestReachable(run) === lv ? ' Below it the stair runs under the sea, and you have nothing to dive in: this pin is as deep as this expedition can go.' : ''}`);
  if (job) say(item.brief, `Bring the find home after clearing this depth for ${item.pay} Salvage.`);
  E.hesterCargo(run).forEach((j) => say(`For Hester: ${j.name} (${j.pay} Salvage on a safe return).`));
  const marker = (n) => job && E.hesterStop(run, n) ? ` (Hester: ${item.marker})` : '';
  for (let r = rows - 1; r >= 0; r--) {
    const nodes = run.map.grid[r].filter(Boolean).map((n) => {
      const here = run.pos && run.pos.row === r && run.pos.col === n.col ? ' (YOU WERE HERE)' : '';
      const nx = r < rows - 1 && n.next.length ? ` -> ${n.next.map((c2) => 'col ' + c2).join(', ')}` : '';
      return `col ${n.col}: ${NODE_NAME[n.type]}${marker(n)}${here}${nx}`;
    });
    say(`  Landing ${r + 1}: ${nodes.join(' | ')}`);
  }
  say('', av.length ? 'You can go to:' : 'Nowhere left to go.');
  av.forEach((n, i) => say(`  ${i + 1}. ${n.type === 'boss' ? `${bossName(run)} (the pin, a boss)` : NODE_NAME[n.type]}, landing ${n.row + 1}${n.type === 'boss' ? '' : ', col ' + n.col}${clue?.node === n ? `. Bosun warns of the ${clue.name}.` : ''}${marker(n)}`));
}

function showReward(run) {
  const rw = run.rewards;
  hud(run);
  say('', `REWARDS: +${rw.pearls} Pearls${(rw.bonuses || []).length ? ` (including ${rw.bonuses.map((b) => `${b.name} +${b.pearls}`).join(', ')})` : ''}${rw.roilPay ? `, Roiled +${rw.roilPay}` : ''}.`);
  // a Dread's one pick (v0.40.0): a card from three or its keepsake, not both
  const one = rw.oneOf && !rw.keepsake && !rw.cardTaken && !rw.keepsakeLeft;
  if (one) say(`A Dread's pick: take ONE of these, a card or the keepsake. Taking one closes the other. 'leave' turns both down for +${E.DECLINE_SCORE.eliteCard} score.`);
  else if (rw.oneOf) say(rw.keepsake ? `You took the ${BL.KEEPSAKES[rw.keepsake].name} (so no card).` : rw.cardTaken && rw.keepsakeLeft ? 'You turned both down.' : 'You took a card (so no keepsake).');
  if (rw.oneOf && !one) { /* already said */ } else if (rw.keepsakeChoices && rw.keepsakeChoices.length) {
    if (rw.keepsake) say(`Keepsake: you took the ${BL.KEEPSAKES[rw.keepsake].name}.`);
    else if (rw.keepsakeLeft) say('Keepsakes: you left them.');
    else {
      say(one ? 'The keepsake (keepsake 1):' : `Keepsakes (take 1, or leave them for +${E.DECLINE_SCORE.keepsake} score):`);
      rw.keepsakeChoices.forEach((k, i) => say(`  ${i + 1}. ${BL.KEEPSAKES[k].name} (Roil ${BL.KEEPSAKES[k].charge}): ${strip(BL.KEEPSAKES[k].desc)}${roilAfter(run, k)}`));
    }
  } else if (rw.keepsake) say(`Keepsake: ${BL.KEEPSAKES[rw.keepsake].name}: ${strip(BL.KEEPSAKES[rw.keepsake].desc)}`);
  if (rw.tonic) say(`Tonic: ${BL.TONICS[rw.tonic].name}: ${strip(BL.TONICS[rw.tonic].desc)} ${rw.tonicTaken ? '(taken)' : run.tonics.indexOf(null) < 0 ? '(your slots are full)' : `(take it, or leave it for +${E.DECLINE_SCORE.tonic} score)`}`);
  if (rw.cards && rw.cards.length && !(rw.oneOf && !one)) {
    if (rw.cardTaken) say('Card: done.');
    else {
      say(one ? 'Or a card (card <number>):' : `Cards (take 1, or skip for +${E.DECLINE_SCORE.card} score):`);
      rw.cards.forEach((it, i) => say(`  ${i + 1}. ${rw.opening ? `${E.OPENING_REWARD_LABELS[i]} · ` : ''}${cardLine(run, { uid: 0, id: it.id, up: it.up })} (${BL.CARDS[it.id].rarity}${it.up ? ', already upgraded' : ''})`));
    }
  }
}
/* As the game's keepsake tiles say it: the Roil after taking it, and what a Roiled aether would add to every fight. */
function roilAfter(run, k) {
  const rf = E.roil(run, k);
  const words = [rf.seep && `${rf.seep} Seep`, rf.thrash && `Thrash ${rf.thrash}`, rf.minnows && `${rf.minnows} Bell Minnow${rf.minnows > 1 ? 's' : ''}`].filter(Boolean).join(', ');
  return ` [then ${E.charge(run, k)}/${E.hold(run)}${rf.steps ? `: Roiled ${rf.steps} step${rf.steps > 1 ? 's' : ''}, every fight gets ${words}` : ', Calm'}]`;
}

function showShop(run) {
  const s = run.shop;
  hud(run);
  say('', "BARNABY'S SHOP. Cards:");
  s.cards.forEach((it, i) => say(`  ${i + 1}. ${it.sold ? '(sold) ' : ''}${cardLine(run, pseudo(it.id))} (${BL.CARDS[it.id].rarity}) -- ${E.price(run, it.base)} Pearls${it.sale ? ' (on sale)' : ''}`));
  say('Keepsakes:');
  s.keepsakes.forEach((it, i) => say(`  ${i + 1}. ${it.sold ? '(sold) ' : ''}${BL.KEEPSAKES[it.id].name} (Roil ${BL.KEEPSAKES[it.id].charge}): ${strip(BL.KEEPSAKES[it.id].desc)} -- ${E.price(run, it.base)} Pearls${it.sold ? '' : roilAfter(run, it.id)}`));
  say('Tonics:');
  s.tonics.forEach((it, i) => say(`  ${i + 1}. ${it.sold ? '(sold) ' : ''}${BL.TONICS[it.id].name}: ${strip(BL.TONICS[it.id].desc)} -- ${E.price(run, it.base)} Pearls`));
  say(`Remove a card from your deck: ${s.removed ? 'done' : `${E.freeRemoval && E.freeRemoval(run) ? 'free' : E.removePrice(run) + ' Pearls'}`}.`);
}

function showRest(run) {
  hud(run);
  if (E.stairOpen(run)) {
    const picks = E.stairPicks(run);
    say('', run.pocket ? `UNDER A LESSER BELL: air. Choose ${picks} of these:` : `THE STAIR DOWN: choose ${picks} of these:`);
    const words = {
      rest: `Rest deeply: heal ${E.stairRestAmount(run)} HP.`, refit: 'Refit: upgrade a card.', shed: 'Shed: remove a card, free.',
      flask: `Fill flasks: a random tonic into up to ${E.STAIR_FLASKS} empty slots.`, cache: "The keepers' cache: 1 of 3 cards, uncommon or rare.",
      sea: `Give a keepsake to the sea: heal ${E.SEA_HEAL} HP for each fight you won while carrying it (never more than a Cove's rest), and upgrade a card. ${seaList(run)}`, fog: 'Swim out into the dark (a Fog event).',
      hester: 'Recover the lamplighter’s tag for Hester.',
    };
    E.stairOptions(run).forEach((id) => { const why = E.stairWhy(run, id); say(`  ${id}: ${words[id]}${why ? ` -- ${why === 'done' ? 'done' : why === 'full' ? 'no picks left' : why}` : ''}`); });
    if (E.stairState(run).cache) say(`  Cache cards: ${E.stairState(run).cache.map((id, i) => `${i + 1}. ${cardLine(run, pseudo(id))}`).join(' | ')}`);
  } else {
    say('', `SHELTERED COVE. ${run.restDone ? 'Done here.' : 'Choose one:'}`);
    if (!run.restDone) {
      say(`  rest: heal ${E.restAmount(run)} HP.`, '  refit <deck number> [1|2]: choose a refit (see deck).',
        `  sea <keepsake number> <deck number> [1|2]: give a keepsake to the sea: heal ${E.SEA_HEAL} HP for each fight you won while carrying it (never more than a Cove's rest, ${E.restAmount(run)}), and upgrade a card. ${seaList(run)}`);
    }
  }
  if (run.restMsg) say(strip(run.restMsg));
}

const seaList = (run) => (run.keepsakes.length ? `(${run.keepsakes.map((k, i) => `${i + 1}. ${BL.KEEPSAKES[k].name}: carried ${E.carried(run, k)} fight${E.carried(run, k) === 1 ? '' : 's'}, pays ${E.seaHeal(run, k)} HP`).join('; ')})` : '(You carry no keepsake.)');

function showTreasure(run) {
  const t = run.treasure;
  hud(run);
  say('', "A WRECK'S LAST CARGO. A sea chest, half buried, banded in iron gone green.");
  if (!t.opened) { say("  (Pry it open: 'open'.)"); return; }
  say(`  ${t.pearls} Pearls.`);
  if (t.choices && t.choices.length) {
    if (t.keepsake) say(`  You took the ${BL.KEEPSAKES[t.keepsake].name}.`);
    else if (t.keepsakeLeft) say('  You left the keepsakes.');
    else {
      say(`  ${t.choices.length === 1 ? 'A keepsake glints' : `${['Two', 'Three', 'Four'][t.choices.length - 2] || t.choices.length} keepsakes glint`} in the chest. Take one, or leave them for +${E.DECLINE_SCORE.keepsake} score:`);
      t.choices.forEach((k, i) => say(`  ${i + 1}. ${BL.KEEPSAKES[k].name} (Roil ${BL.KEEPSAKES[k].charge}): ${strip(BL.KEEPSAKES[k].desc)}${roilAfter(run, k)}`));
    }
  } else if (t.keepsake) say(`  Keepsake: ${BL.KEEPSAKES[t.keepsake].name}: ${strip(BL.KEEPSAKES[t.keepsake].desc)}`);
}

function showToll(run) {
  const t = run.toll, c = E.tollOf(run), T = BL.TOLL;
  hud(run);
  say('', T.title.toUpperCase() + '.');
  if (t.paid) { say(T.ways[t.paid].paid, "  ('continue')"); return; }
  say(T.text);
  E.TOLL_WAYS.forEach((w) => { const ok = E.tollCan(run, w); say(`  pay ${w}: ${T.ways[w].label}. ${T.ways[w].desc(c)}${ok === true ? '' : ` -- not available: ${ok}`}`); });
}

function showEvent(run) {
  const ev = E.eventDef(run);
  const st = run.event;
  hud(run);
  say('', `FOG: ${ev.title}`);
  if (st.stage === 'choose') {
    say(strip(typeof ev.text === 'function' ? ev.text(run) : ev.text));
    E.eventOptions(run).forEach((o, i) => {
      const ok = E.optionAvailable(run, o);
      say(`  ${i + 1}. ${o.label}: ${strip(o.desc)}${o.decline ? ` +${E.DECLINE_SCORE.event} score.` : ''}${ok === true ? '' : ` -- not available: ${strip(ok)}`}`);
    });
  } else {
    say(strip(st.text));
    if (st.outcome) say(strip(st.outcome));
    const n = st.next;
    if (n && !st.resolved) {
      if (n.pick) say(`Now choose a card from your deck to ${n.pick} (pick <deck number>${n.pick === 'upgrade' ? ' [1|2]' : ''}; see 'deck').`);
      else if (n.cards) { say(`Choose a card, or skip for +${E.DECLINE_SCORE.eventCard} score:`); n.cards.forEach((id, i) => say(`  ${i + 1}. ${cardLine(run, pseudo(id))}`)); }
      else if (n.fight) say('A fight is coming (continue).');
    } else say('(continue)');
  }
}

function showPin(run) {
  const B = E.band(run), lv = run.level || 0, next = E.LEVELS[lv + 1];
  hud(run);
  say('', 'THE PIN IS BROKEN.', strip(B.pin));
  if (E.canGoDeeper(run)) say(`  deeper: go down the stair into ${next.the}, with your deck, keepsakes and HP. The stair down comes first: two of six. Each landing there scores ${next.landing}.${E.deepestReachable(run) === lv + 1 && lv + 1 < E.LEVELS.length - 1 ? ' Below it the stair runs under the sea, and you have nothing to dive in: its pin is as deep as this expedition can go.' : ''}`);
  else if (next) say(`  (You cannot go deeper: ${next.the} needs the ${BL.KIT[next.needs].name}.)`);
  say('  home: end the expedition here and keep what you carry. Each HP you have left adds 5 to the score.');
  E.hesterCargo(run).forEach((j) => say(`  Bring Hester the ${j.name.toLowerCase()} for ${j.pay} Salvage. A fall loses it.`));
}

function showEnd(run) {
  const won = run.screen === 'victory';
  say(won ? 'THE EXPEDITION IS OVER: you came home.' : 'THE EXPEDITION IS OVER: you fell.');
  try {
    const sp = E.scoreParts(run, won);
    sp.parts.forEach((p) => say(`  ${p.label}${p.n != null && p.each ? ` (${p.n} x ${p.each})` : p.n ? ` (${p.n})` : ''}: +${p.pts}`));
    say(`  Score: ${E.score(run, won)}`);
  } catch (e) { /* the score needs nothing more */ }
  if (run.retryLost) say('  The rematch cost your carried keepsakes, tonics, score and its Salvage.');
  (run.hesterPaid || []).forEach((j) => say(`  ${j.name} returned: +${j.pay} Salvage from Hester.`));
  if (!won) E.hesterCargo(run).forEach((j) => say(`  ${j.name} lost below. Hester will mark the way again.`));
  say(`Fights ${run.stats.fights}, cards played ${run.stats.cardsPlayed}, damage dealt ${run.stats.dmgDealt}, taken ${run.stats.dmgTaken}, Crests ${run.stats.crests}, Strands ${run.stats.lows}.`);
}

function show(run) {
  switch (run.screen) {
    case 'combat': return showCombat(run);
    case 'map': return showMap(run);
    case 'reward': return showReward(run);
    case 'shop': return showShop(run);
    case 'rest': return showRest(run);
    case 'treasure': return showTreasure(run);
    case 'toll': return showToll(run);
    case 'event': return showEvent(run);
    case 'pin': return showPin(run);
    case 'lastchance': return say(`ONE LAST BREATH. 'retry' starts the boss again at ${E.FINAL_RETRY_HP * 100}% HP and costs your keepsakes, tonics and score. 'fall' ends the expedition.`);
    default: return showEnd(run);
  }
}

const HELP = {
  any: ["deck: your deck with card texts (numbers are for 'refit', 'remove', 'pick' and so on)", 'info <name>: look up a card, keepsake, tonic, creature, status or keyword', 'rules [basics|tide|keywords|map|controls]: How to Play', 'look: show this screen again'],
  combat: ['play <hand number> [enemy number]: play a card (an enemy number when it targets one; with one enemy you can leave it out)', 'several moves in one go: "play 1 2; play 3; end" (all card and enemy numbers are from the screen you are looking at, before any of these moves, even after a card is played or an enemy dies; stops at the first that fails)', 'end: end your turn', 'bail: spend 1 Light to Ebb 1', 'stir: spend 1 Light to Surge 1', 'tonic <slot> [enemy number]: drink a tonic', 'piles: what is in your draw, discard and sunk piles'],
  map: ['go <number>: go to one of the stops listed', 'tonic <slot>: drink a tonic (only some work outside a fight)', 'drop <keepsake number>: drop a keepsake for good'],
  reward: ['card <number> / skip: take a card, or skip it', 'keepsake <number> / leave: take a keepsake, or leave them', 'tonic: take the tonic', 'continue: back to the map (what you have not taken is left)'],
  shop: ['buy card|keepsake|tonic <number>', 'remove <deck number>: pay to remove a card', 'continue: leave the shop'],
  rest: ['rest', 'refit <deck number> [1|2]', 'sea <keepsake number> <deck number> [1|2]', 'continue: go on'],
  stair: ['rest', 'refit <deck number> [1|2]', 'shed <deck number>', 'flask', 'cache (look), then cache <number> (take)', 'sea <keepsake number> <deck number> [1|2]', 'fog (under a lesser bell)', 'hester (at the marked lesser bell)', 'continue: go on'],
  treasure: ['open', 'keepsake <number> / leave', 'continue'],
  toll: ['pay hp|pearls|barnacle: pay the toll one way', 'continue (once paid)'],
  event: ['choose <number>', 'pick <deck number> [1|2] (use a refit number when upgrading)', 'card <number> / skip (when it offers cards)', 'continue'],
  pin: ['deeper (when you can)', 'home'],
  lastchance: ['retry', 'fall'],
};
function help(run) {
  const s = run ? (E.stairOpen(run) ? 'stair' : run.screen) : null;
  say('Commands here:', ...(HELP[s] || ['new [seed]: start an expedition']).map((l) => '  ' + l), 'Anywhere:', ...HELP.any.map((l) => '  ' + l));
  if (['rest', 'stair', 'event'].includes(s)) say("Refit 1 is the standard +. See 'deck' for both refits.");
}

/* ---------------- lookups ---------------- */
function info(run, q) {
  const k = q.toLowerCase().trim().replace(/^the /, '');
  const hit = (o) => o && (o.name || '').toLowerCase().replace(/^the /, '') === k;
  const found = [];
  Object.keys(BL.CARDS).forEach((id) => {
    const base = pseudo(id);
    if (!hit(BL.CARDS[id]) && id !== k && !hit(BL.CARDS[id].refit)) return;
    found.push('Card: ' + cardLine(run, base) + ` (${BL.CARDS[id].rarity})`, ...refitLines(run, base));
  });
  Object.keys(BL.KEEPSAKES).forEach((id) => { if (hit(BL.KEEPSAKES[id])) found.push(`Keepsake: ${BL.KEEPSAKES[id].name} (Roil ${BL.KEEPSAKES[id].charge}): ${strip(BL.KEEPSAKES[id].desc)}`); });
  Object.keys(BL.TONICS).forEach((id) => { if (hit(BL.TONICS[id])) found.push(`Tonic: ${BL.TONICS[id].name}: ${strip(BL.TONICS[id].desc)}`); });
  Object.keys(BL.STATUSES).forEach((id) => { const st = BL.STATUSES[id]; if (hit(st) && st.kind !== 'rite') found.push(`Status: ${st.name}: ${strip(st.desc('N'))}`); });
  Object.keys(BL.KEYWORDS).forEach((w) => { if (w.toLowerCase() === k) found.push(`${w}: ${strip(BL.KEYWORDS[w])}`); });
  Object.keys(BL.KIT).forEach((id) => { if (hit(BL.KIT[id])) found.push(`Kit: ${BL.KIT[id].name}: ${strip(E.kitDesc(id, run))}`); });
  const c = run && run.combat;
  if (run && !(c && E.alive(c).some((e) => e.name.toLowerCase() === k))) {
    if (bossName(run).toLowerCase().replace(/^the /, '') === k) found.push(`${bossName(run)}: the boss on this level's last landing. You learn its moves in the fight.`);
  }
  if (c) E.alive(c).forEach((e) => { if (e.name.toLowerCase() === k) { const i = E.intentInfo(run, e); found.push(`${e.name}: ${e.hp}/${e.maxHp} HP${e.ward ? `, Ward ${e.ward}` : ''}. ${i ? `Intends ${i.name}: ${i.parts.join('. ')}.` : ''} ${statusLine(e)}`); } });
  say(found.length ? found.join('\n') : `Nothing called "${q}".`);
}

const refitLines = (run, card) => E.refits(card).map((up) => `      Refit ${up}: ${cardLine(run, { ...card, up })}`);
function deckList(run) {
  say(`Your deck (${run.deck.length}):`);
  const choosing = run.screen === 'rest' || (run.screen === 'event' && run.event.next?.pick === 'upgrade');
  run.deck.forEach((card, i) => say(`  ${i + 1}. ${cardLine(run, card)}${card.up || E.canUpgrade(card) ? '' : ' (cannot upgrade)'}`, ...(choosing ? refitLines(run, card) : [])));
}
function piles(run) {
  const c = run.combat;
  const list = (cards) => cards.map((x) => E.cardName(x)).sort().join(', ') || 'empty';
  say(`Draw pile (${c.draw.length}, shown in no order): ${list(c.draw)}`, `Discard pile (${c.discard.length}): ${list(c.discard)}`);
  if (c.sunk.length) say(`Sunk (${c.sunk.length}): ${list(c.sunk)}`);
}

/* How to Play comes from the page itself, read once in headless Chrome as a first-time player sees it, then kept. */
async function rules(tab) {
  const file = path.join(dir, 'rules.json');
  let tabs;
  try { tabs = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* first run */ }
  if (tabs?.version !== BL.VERSION) {
    const { serve } = require('./serve');
    const { launch } = require('./cdp');
    const port = 8890 + Math.floor(Math.random() * 90);
    const srv = await serve(port, path.join(__dirname, '..'));
    const page = await launch();
    try {
      await page.viewport(1280, 800);
      await page.goto(`http://127.0.0.1:${port}/`);
      await page.waitFor(`!!window.Brinelight`);
      tabs = { version: BL.VERSION };
      for (const id of ['basics', 'tide', 'keywords', 'map', 'controls']) {
        tabs[id] = await page.eval(`(async () => {
          const B = window.Brinelight;
          if (!document.querySelector('.help')) { const b = document.querySelector('[data-act="help"]'); if (b) b.click(); }
          await new Promise((r) => setTimeout(r, 150));
          const t = document.querySelector('[data-act="helptab"][data-tab="${id}"]'); if (t) t.click();
          await new Promise((r) => setTimeout(r, 150));
          const s = document.querySelector('.help-sec');
          return s ? s.innerText : '';
        })()`);
      }
    } finally {
      await page.close();
      srv.close();
    }
    fs.writeFileSync(file, JSON.stringify(tabs, null, 1));
  }
  const ids = tab ? [tab] : Object.keys(tabs).filter((id) => id !== 'version');
  ids.forEach((id) => say(`== ${id} ==`, tabs[id] || '(no such tab)', ''));
}

const seaWords = (o) => `The ${BL.KEEPSAKES[o.keepsake].name} goes into the sea. You heal ${o.healed} HP${o.card ? ` and ${E.cardName(o.card)} is upgraded` : ''}.`;

/* ---------------- commands ---------------- */
const num = (s) => { const n = parseInt(s, 10); return Number.isFinite(n) ? n - 1 : -1; };
const refitNo = (s) => s == null ? 1 : Number(s);
function deckUid(run, s) { const c = run.deck[num(s)]; return c ? c.uid : null; }
function enemyUid(run, s) {
  const tg = E.targets(run.combat);
  if (s == null) return tg.length === 1 ? tg[0].uid : null;
  // in a chain of moves, enemy numbers are the list as shown before the chain, even after one dies
  if (listedTargets) { const u = listedTargets[num(s)]; return tg.some((e) => e.uid === u) ? u : null; }
  const e = tg[num(s)];
  return e ? e.uid : null;
}

function afterCombatStep(run) {
  const c = run.combat;
  say(...fxLines(run));
  if (c.won) { E.finishCombat(run); say('', 'You win the fight.'); }
  else if (c.lost || run.hp <= 0) { run.screen = E.canRetryFinal(run) ? 'lastchance' : 'defeat'; }
}

function act(run, cmd, args) {
  const s = run.screen;
  const no = (why) => { say(`Can't: ${why}`); return false; };
  if (s === 'lastchance') {
    if (cmd === 'retry') return E.retryFinal(run);
    if (cmd === 'fall') { run.screen = 'defeat'; return true; }
  }
  if (s === 'combat') {
    const c = run.combat;
    if (cmd === 'play') {
      // in a chain of moves, card numbers are the hand as it was listed before the chain (playing renumbers the hand)
      const uid = listedHand ? listedHand[num(args[0])] : (c.hand[num(args[0])] || {}).uid;
      const card = c.hand.find((x) => x.uid === uid);
      if (!card) return no(listedHand && uid != null ? 'that card is no longer in your hand.' : 'no such card in your hand.');
      const p = E.playable(run, card);
      if (!p.ok) return no(p.reason);
      let t = null;
      if (E.needsTarget(card)) { t = enemyUid(run, args[1]); if (!t) return no(listedTargets && args[1] != null ? 'that enemy is gone or out of reach.' : 'say which enemy (play <card> <enemy>).'); }
      if (!E.playCard(run, card.uid, t)) return no('the card did not play.');
      afterCombatStep(run);
      return true;
    }
    if (cmd === 'end') { E.endTurn(run); afterCombatStep(run); return true; }
    if (cmd === 'bail' || cmd === 'stir') { const w = E.canSwellAct(run, cmd); if (!w.ok) return no(w.reason); if (!E.swellAct(run, cmd)) return no('not now.'); afterCombatStep(run); return true; }
    if (cmd === 'tonic') {
      const slot = num(args[0]);
      if (!run.tonics[slot]) return no('no tonic in that slot.');
      const t = args[1] != null ? enemyUid(run, args[1]) : (E.targets(c).length === 1 ? E.targets(c)[0].uid : undefined);
      if (!E.useTonic(run, slot, t)) return no('that tonic cannot be used like that (does it need an enemy number?).');
      afterCombatStep(run);
      return true;
    }
    if (cmd === 'piles') { piles(run); return 'quiet'; }
  }
  if (s === 'map') {
    if (cmd === 'go') { const n = E.availableNodes(run)[num(args[0])]; if (!n) return no('not one of the listed stops.'); E.enterNode(run, n); if (run.combat) say(...fxLines(run)); return true; }
    if (cmd === 'tonic') { const slot = num(args[0]); if (!run.tonics[slot]) return no('no tonic in that slot.'); if (!E.useTonic(run, slot)) return no('that tonic works only in a fight.'); return true; }
    if (cmd === 'drop') { const k = run.keepsakes[num(args[0])]; if (!k || !E.dropKeepsake(run, k)) return no('no such keepsake.'); say(`You drop the ${BL.KEEPSAKES[k].name} for good.`); return true; }
  }
  if (s === 'reward') {
    const rw = run.rewards;
    if (cmd === 'card') { if (rw.cardTaken || !rw.cards[num(args[0])]) return no('no such card.'); E.takeRewardCard(run, num(args[0])); return true; }
    if (cmd === 'skip') { if (rw.cardTaken) return no('done already.'); E.takeRewardCard(run, null); return true; }
    if (cmd === 'keepsake') { const k = (rw.keepsakeChoices || [])[num(args[0])]; if (!k || rw.keepsake || rw.keepsakeLeft) return no('no such keepsake.'); E.takeRewardKeepsake(run, k); return true; }
    if (cmd === 'leave') { if (!E.leaveKeepsakes(run)) return no('nothing to leave.'); return true; }
    if (cmd === 'tonic') { if (!E.takeRewardTonic(run)) return no('no tonic to take, or your slots are full.'); return true; }
    if (cmd === 'continue') {
      if (rw.keepsakeChoices && rw.keepsakeChoices.length && !rw.keepsake && !rw.keepsakeLeft) return no("take a keepsake or 'leave' them first.");
      if (!rw.cardTaken && rw.cards && rw.cards.length) E.takeRewardCard(run, null);
      E.backToMap(run); return true;
    }
  }
  if (s === 'shop') {
    if (cmd === 'buy') {
      const kind = { card: 'cards', cards: 'cards', keepsake: 'keepsakes', keepsakes: 'keepsakes', tonic: 'tonics', tonics: 'tonics' }[args[0]];
      if (!kind) return no('buy card|keepsake|tonic <number>.');
      const it = run.shop[kind][num(args[1])];
      if (!it || it.sold) return no('not for sale.');
      if (run.pearls < E.price(run, it.base)) return no('not enough Pearls.');
      if (kind === 'tonics' && run.tonics.indexOf(null) < 0) return no('your tonic slots are full.');
      if (!E.buy(run, kind, num(args[1]))) return no('it did not sell.');
      return true;
    }
    if (cmd === 'remove') { const uid = deckUid(run, args[0]); if (!uid || !E.buyRemoval(run, uid)) return no('cannot remove that (Pearls, or done already).'); return true; }
    if (cmd === 'continue' || cmd === 'leave') { E.backToMap(run); return true; }
  }
  if (s === 'rest') {
    if (cmd === 'sea') {
      const k = run.keepsakes[num(args[0])];
      const uid = deckUid(run, args[1]), up = refitNo(args[2]);
      if (!k) return no('which keepsake?');
      if (args[1] != null && !uid) return no('which card?');
      const o = E.stairOpen(run) ? E.stairDo(run, 'sea', { k, uid }, up) : E.giveToSea(run, k, uid, up);
      if (!o) return no('the sea cannot take that now, or the refit is unavailable.');
      run.restMsg = seaWords(o);
      say(run.restMsg);
      return true;
    }
    if (E.stairOpen(run)) {
      if (cmd === 'hester') { const o = E.stairDo(run, cmd); if (!o) return no('nothing to recover here.'); say(o.job.found); return true; }
      if (['rest', 'flask', 'fog'].includes(cmd)) { const o = E.stairDo(run, cmd); if (!o) return no(E.stairWhy(run, cmd) || 'not here.'); if (o.healed) say(`Healed ${o.healed}.`); if (run.screen === 'event') say('You swim out into the dark.'); return true; }
      if (cmd === 'refit' || cmd === 'shed') { const uid = deckUid(run, args[0]); if (!uid) return no('say which card (see deck).'); const o = E.stairDo(run, cmd, uid, refitNo(args[1])); if (!o) return no(E.stairWhy(run, cmd) || 'that card or refit is unavailable.'); say(cmd === 'refit' ? `${E.cardName(o.card)} is upgraded.` : `${E.cardName(o.card)} is gone from your deck.`); return true; }
      if (cmd === 'cache') {
        if (args[0] == null) { E.stairCache(run); return true; }
        const o = E.stairDo(run, 'cache', num(args[0])); if (!o) return no(E.stairWhy(run, 'cache') || 'no such card.'); say(`${E.cardName(o.card)} joins your deck.`); return true;
      }
    } else {
      if (cmd === 'rest') { if (run.restDone) return no('done already.'); const h = E.rest(run); run.restMsg = `You sleep beside the lantern and wake mended. Healed ${h} HP.`; return true; }
      if (cmd === 'refit') {
        if (run.restDone) return no('done already.');
        const card = E.refitAtCove(run, deckUid(run, args[0]), refitNo(args[1]));
        if (!card) return no('that card or refit is unavailable.');
        run.restMsg = `${E.cardName(card)} is ready.`;
        say(run.restMsg);
        return true;
      }
    }
    if (cmd === 'continue' || cmd === 'leave') { run.restMsg = null; E.backToMap(run); return true; }
  }
  if (s === 'treasure') {
    const t = run.treasure;
    if (cmd === 'open') { E.openTreasure(run); return true; }
    if (cmd === 'keepsake') { const k = (t.choices || [])[num(args[0])]; if (!k || t.keepsake || t.keepsakeLeft) return no('no such keepsake.'); E.takeTreasureKeepsake(run, k); return true; }
    if (cmd === 'leave') { if (!E.leaveKeepsakes(run)) return no('nothing to leave.'); return true; }
    if (cmd === 'continue') { if (!t.opened) E.openTreasure(run); if (t.choices && t.choices.length && !t.keepsake && !t.keepsakeLeft) return no("take a keepsake or 'leave' them first."); E.backToMap(run); return true; }
  }
  if (s === 'toll') {
    if (cmd === 'pay') { if (!E.payToll(run, args[0])) return no(run.toll.paid ? 'paid already.' : 'say hp, pearls or barnacle (and one you can pay).'); return true; }
    if (cmd === 'continue') { if (!run.toll.paid) return no('pay the toll first.'); E.backToMap(run); return true; }
  }
  if (s === 'event') {
    const st = run.event;
    if (cmd === 'choose' && st.stage === 'choose') { if (!E.chooseEventOption(run, num(args[0]))) return no('that option is not available.'); return true; }
    const n = st.next;
    if (cmd === 'pick' && n && n.pick && !st.resolved) {
      const uid = deckUid(run, args[0]);
      const card = run.deck.find((x) => x.uid === uid);
      if (!card) return no('say which card (see deck).');
      if (n.pick === 'remove') { E.removeCard(run, uid); st.outcome = `${E.cardName(card)} is gone from your deck.`; }
      if (n.pick === 'duplicate') { E.duplicateCard(run, uid); st.outcome = `A second ${E.cardName(card)} joins your deck.`; }
      if (n.pick === 'upgrade') { if (!E.upgradeCard(run, uid, refitNo(args[1]))) return no('that refit is unavailable.'); st.outcome = `${E.cardName(card)} is upgraded.`; }
      st.resolved = true; return true;
    }
    if ((cmd === 'card' || cmd === 'skip') && n && n.cards && !st.resolved) {
      const id = cmd === 'skip' ? null : n.cards[num(args[0])];
      if (cmd === 'card' && !id) return no('no such card.');
      E.takeEventCard(run, id); st.outcome = id ? `${BL.CARDS[id].name} joins your deck.` : 'You leave the cards where they are.';
      st.resolved = true; return true;
    }
    if (cmd === 'continue' && st.stage === 'result') {
      if (n && n.fight) { run.event = null; E.startCombat(run, n.fight, null, { bonusPearls: n.bonusPearls || 0 }); say(...fxLines(run)); return true; }
      if (n && !st.resolved && (n.pick === 'remove' || n.pick === 'upgrade') && !(n.pick === 'remove' ? run.deck.length : E.upgradeable(run).length)) st.resolved = true;
      if (n && !st.resolved && (n.pick || n.cards)) return no(n.pick ? 'pick a card from your deck first.' : "take a card or 'skip' first.");
      E.backToMap(run); return true;
    }
  }
  if (s === 'pin') {
    if (cmd === 'deeper') { if (!E.goDeeper(run)) return no('you cannot go deeper.'); E.offerHesterJob(run, run); return true; }
    if (cmd === 'home') { E.goHome(run); return true; }
  }
  return no(`'${[cmd].concat(args).join(' ')}' does nothing here. Try 'help'.`);
}

let listedHand = null, listedTargets = null;

/* ---------------- main ---------------- */
async function main() {
  const [cmd = 'look', ...args] = argv.map((a) => a.toLowerCase());
  let run = readRun();
  const raw = argv.join(' ') || 'look';
  if (cmd === 'new') {
    const hesterDone = run?.hesterDone || !!run?.hesterPay;
    run = E.newRun(args[0] != null ? +args[0] >>> 0 : undefined, 0);
    run.hesterDone = E.migrateMeta({ hesterDone }).hesterDone;
    E.offerHesterJob(run, run);
    say(...BL.STORY.opening.map((o) => strip(o.text)), '', `(Seed ${run.seed}. Type 'help' for commands, 'rules' for How to Play.)`, '');
    show(run);
  } else if (cmd === 'rules') {
    await rules(args[0]);
  } else if (!run) {
    say("No expedition yet. Start one with 'new'.");
  } else if (cmd === 'look') show(run);
  else if (cmd === 'help') help(run);
  else if (cmd === 'deck') deckList(run);
  else if (cmd === 'info') info(run, argv.slice(1).join(' '));
  else if (run.screen === 'victory' || run.screen === 'defeat') { showEnd(run); say("Start a new one with 'new'."); }
  else {
    // several moves at once, split by ';' ("play 1 2; play 3; end"): what each did, then the screen once at the end.
    // It stops at the first move that fails, or when the screen changes under it (a fight won or lost).
    const steps = argv.join(' ').toLowerCase().split(';').map((x) => x.trim().split(/\s+/).filter(Boolean)).filter((x) => x.length);
    let ok = false;
    if (steps.length > 1 && run.combat) { listedHand = run.combat.hand.map((x) => x.uid); listedTargets = E.targets(run.combat).map((e) => e.uid); }
    for (let i = 0; i < steps.length; i++) {
      const screen = run.screen;
      if (steps.length > 1) say(`> ${steps[i].join(' ')}`);
      const r = act(run, steps[i][0], steps[i].slice(1));
      if (r !== true) { if (i < steps.length - 1) say(`(Stopped here; ${steps.length - 1 - i} more not done.)`); break; }
      ok = true;
      if (steps[i][0] === 'end') listedHand = listedTargets = null; // a new turn deals a new hand: number from the hand as it is now
      if (run.screen !== screen && i < steps.length - 1) { say(`(The screen changed to ${run.screen}; ${steps.length - 1 - i} more not done.)`); break; }
    }
    if (ok) {
      if (run.screen === 'victory') {
        const meta = { ...E.newMeta(), hesterDone: run.hesterDone };
        run.hesterPaid = E.deliverHesterJobs(meta, run);
        run.hesterDone = meta.hesterDone;
      }
      say(''); show(run);
    }
  }
  if (run) writeRun(run);
  const text = out.join('\n');
  console.log(text);
  fs.appendFileSync(LOG, `\n> ${raw}\n${text}\n`);
}
main().catch((e) => { console.error(e.stack || e); process.exit(1); });
