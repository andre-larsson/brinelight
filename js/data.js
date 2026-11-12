/* Brinelight — game data: cards, enemies, encounters, keepsakes, tonics, events. */
(function () {
  'use strict';
  const BL = (globalThis.BL = globalThis.BL || {});

  /* ------------------------------------------------------------------ *
   *  CARDS
   *  text(v, k): v = numbers (base or upgraded), k = formatter
   *    k.d(n)   -> attack damage as shown in combat (Might / Chilled / Soaked applied)
   *    k.tide   -> current Swell in combat (the code calls it tide), or null outside combat
   *  play(A, v, target): A = combat API (see engine.js)
   * ------------------------------------------------------------------ */
  const CARDS = {};
  function card(id, o) {
    o.id = id;
    o.up = o.up || {};
    CARDS[id] = o;
  }

  // ---------- Starter ----------
  card('jab', {
    name: 'Harpoon Jab', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy',
    v: { dmg: 6 }, up: { dmg: 9 }, art: 'c_jab',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage.`,
    play: (A, v, t) => A.hit(t, v.dmg),
  });
  card('brace', {
    name: 'Brace', type: 'skill', rarity: 'starter', cost: 1, target: 'none',
    v: { ward: 5 }, up: { ward: 8 }, art: 'c_brace',
    text: (v) => `Gain ${v.ward} Ward.`,
    play: (A, v) => A.ward(v.ward),
  });
  card('swell', {
    name: 'Rising Swell', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy',
    v: { dmg: 5, surge: 2 }, up: { dmg: 8 }, art: 'c_swell',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Surge ${v.surge}.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.surge(v.surge); },
  });
  card('slack', {
    name: 'Slack Water', type: 'skill', rarity: 'starter', cost: 1, target: 'none',
    v: { ward: 5, ebb: 2 }, up: { ward: 8 }, art: 'c_slack',
    text: (v) => `Gain ${v.ward} Ward. Ebb ${v.ebb}.`,
    play: (A, v) => { A.ward(v.ward); A.ebb(v.ebb); },
  });

  // ---------- Common ----------
  card('breaker', {
    name: 'Breaker', type: 'attack', rarity: 'common', cost: 2, target: 'enemy',
    v: { dmg: 12, surge: 1 }, up: { dmg: 16 }, art: 'c_breaker',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Surge ${v.surge}.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.surge(v.surge); },
  });
  card('spraylash', {
    name: 'Spray Lash', type: 'attack', rarity: 'common', cost: 1, target: 'all',
    v: { dmg: 4, surge: 1 }, up: { dmg: 6 }, art: 'c_spraylash',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage to ALL enemies. Surge ${v.surge}.`,
    play: (A, v) => { A.hitAll(v.dmg); A.surge(v.surge); },
  });
  card('gaff', {
    name: 'Gaff Hook', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    v: { dmg: 5, soak: 1, surge: 1 }, up: { dmg: 7, soak: 2 }, art: 'c_gaff',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Apply ${v.soak} Soaked. Surge ${v.surge}.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.apply(t, 'soaked', v.soak); A.surge(v.surge); },
  });
  card('riptide', {
    name: 'Riptide Cut', type: 'attack', rarity: 'common', cost: 0, target: 'enemy',
    v: { dmg: 3, ebb: 1 }, up: { dmg: 5 }, art: 'c_riptide',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Ebb ${v.ebb}. Draw 1 card.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.ebb(v.ebb); A.draw(1); },
  });
  card('pearldiver', {
    name: 'Pearl Diver', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    v: { dmg: 8, pearls: 10 }, up: { dmg: 11, pearls: 15 }, art: 'c_pearldiver',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. If this kills, gain ${v.pearls} Pearls.`,
    play: (A, v, t) => { A.hit(t, v.dmg); if (t && t.dead) A.pearls(v.pearls); },
  });
  card('shellup', {
    name: 'Shell Up', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    v: { ward: 7, surge: 1 }, up: { ward: 10 }, art: 'c_shellup',
    text: (v) => `Gain ${v.ward} Ward. Surge ${v.surge}.`,
    play: (A, v) => { A.ward(v.ward); A.surge(v.surge); },
  });
  card('kelpsnare', {
    name: 'Kelp Snare', type: 'skill', rarity: 'common', cost: 1, target: 'enemy',
    v: { ward: 5, chill: 1 }, up: { ward: 7, chill: 2 }, art: 'c_kelpsnare',
    text: (v) => `Gain ${v.ward} Ward. Apply ${v.chill} Chilled.`,
    play: (A, v, t) => { A.ward(v.ward); A.apply(t, 'chilled', v.chill); },
  });
  card('tidereading', {
    name: 'Tide Reading', type: 'skill', rarity: 'common', cost: 0, target: 'none',
    v: { draw: 1, surge: 1 }, up: { draw: 2 }, art: 'c_tidereading',
    text: (v) => `Draw ${v.draw} card${v.draw > 1 ? 's' : ''}. Surge ${v.surge}.`,
    play: (A, v) => { A.draw(v.draw); A.surge(v.surge); },
  });
  card('saltspray', {
    name: 'Saltspray', type: 'skill', rarity: 'common', cost: 1, target: 'enemy',
    v: { brine: 5, ebb: 1 }, up: { brine: 7 }, art: 'c_saltspray',
    text: (v) => `Apply ${v.brine} Brine. Ebb ${v.ebb}.`,
    play: (A, v, t) => { A.apply(t, 'brine', v.brine); A.ebb(v.ebb); },
  });
  card('undercurrent', {
    name: 'Undercurrent', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    v: { base: 3, per: 2 }, up: { base: 4, per: 3 }, art: 'c_undercurrent',
    text: (v, k) => {
      const now = k.tide == null ? '' : ` <span class="calc">(${k.d(v.base + v.per * k.tide)})</span>`;
      return `Deal ${v.base} damage, +${v.per} for each Swell.${now}`;
    },
    play: (A, v, t) => A.hit(t, v.base + v.per * A.tide()),
  });
  card('deepguard', {
    name: 'Deep Guard', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    v: { ward: 6, bonus: 5 }, up: { ward: 8, bonus: 7 }, art: 'c_deepguard',
    text: (v) => `Gain ${v.ward} Ward. If the Swell is 2 or lower, gain ${v.bonus} more.`,
    play: (A, v) => A.ward(v.ward + (A.tide() <= 2 ? v.bonus : 0)),
  });
  card('oarflurry', {
    name: 'Oar Flurry', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    v: { dmg: 3, hits: 3 }, up: { dmg: 4 }, art: 'c_oarflurry',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage ${v.hits} times.`,
    play: (A, v, t) => A.hit(t, v.dmg, v.hits),
  });
  card('bilgepump', {
    name: 'Bilge Pump', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    v: { ebb: 2, draw: 2 }, up: { draw: 3 }, art: 'c_bilgepump',
    text: (v) => `Ebb ${v.ebb}. Draw ${v.draw} cards.`,
    play: (A, v) => { A.ebb(v.ebb); A.draw(v.draw); },
  });

  // ---------- Uncommon ----------
  card('roguewave', {
    name: 'Rogue Wave', type: 'attack', rarity: 'uncommon', cost: 2, target: 'all',
    v: { dmg: 9, surge: 2 }, up: { dmg: 12 }, art: 'c_roguewave',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage to ALL enemies. Surge ${v.surge}.`,
    play: (A, v) => { A.hitAll(v.dmg); A.surge(v.surge); },
  });
  card('ebbflow', {
    name: 'Ebb and Flow', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none',
    v: { shift: 2, draw: 1 }, up: { shift: 3 }, art: 'c_ebbflow',
    text: (v) => `If the Swell is 3 or higher, Surge ${v.shift}. Otherwise, Ebb ${v.shift}. Draw ${v.draw} card.`,
    play: (A, v) => { if (A.tide() >= 3) A.surge(v.shift); else A.ebb(v.shift); A.draw(v.draw); },
  });
  card('moonpull', {
    name: 'Moon Pull', type: 'rite', rarity: 'uncommon', cost: 1, target: 'none',
    v: { n: 1 }, up: { cost: 0 }, art: 'c_moonpull',
    text: () => `At the start of each of your turns, Surge 1.`,
    play: (A, v) => A.rite('r_moonpull', v.n),
  });
  card('seawall', {
    name: 'Sea Wall', type: 'skill', rarity: 'uncommon', cost: 2, target: 'none',
    v: { ward: 15, ebb: 1 }, up: { ward: 20 }, art: 'c_seawall',
    text: (v) => `Gain ${v.ward} Ward. Ebb ${v.ebb}.`,
    play: (A, v) => { A.ward(v.ward); A.ebb(v.ebb); },
  });
  card('brinespear', {
    name: 'Brine Spear', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    v: { dmg: 6, brine: 4 }, up: { dmg: 7, brine: 6 }, art: 'c_brinespear',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Apply ${v.brine} Brine.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.apply(t, 'brine', v.brine); },
  });
  card('tidalmemory', {
    name: 'Tidal Memory', type: 'rite', rarity: 'uncommon', cost: 2, target: 'none',
    v: { n: 1 }, up: { cost: 1 }, art: 'c_tidalmemory',
    text: () => `Whenever you Crest, gain 1 Light.`,
    play: (A, v) => A.rite('r_tidalmemory', v.n),
  });
  card('volley', {
    name: 'Harpoon Volley', type: 'attack', rarity: 'uncommon', cost: 1, target: 'random',
    v: { dmg: 3, hits: 4 }, up: { hits: 5 }, art: 'c_volley',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage to a random enemy ${v.hits} times.`,
    play: (A, v) => A.hitRandom(v.dmg, v.hits),
  });
  card('spindrift', {
    name: 'Spindrift', type: 'rite', rarity: 'uncommon', cost: 1, target: 'none',
    v: { n: 3 }, up: { n: 5 }, art: 'c_spindrift',
    text: (v) => `Whenever you Surge, deal ${v.n} damage to a random enemy.`,
    play: (A, v) => A.rite('r_spindrift', v.n),
  });
  card('sirensecho', {
    name: "Siren's Echo", type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', givesEcho: true,
    v: {}, up: { cost: 0 }, art: 'c_sirensecho',
    text: () => `Your next card is played twice.`,
    play: (A) => A.echo(1),
  });
  card('brinebloom', {
    name: 'Brine Bloom', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy',
    v: { add: 0 }, up: { add: 3 }, art: 'c_brinebloom',
    text: (v) => (v.add ? `Apply ${v.add} Brine, then double the target's Brine.` : `Double the target's Brine.`),
    play: (A, v, t) => { if (v.add) A.apply(t, 'brine', v.add); if (t && t.st.brine) A.apply(t, 'brine', t.st.brine); },
  });
  card('abyssalpull', {
    name: 'Abyssal Pull', type: 'rite', rarity: 'uncommon', cost: 1, target: 'none',
    v: { n: 5 }, up: { n: 8 }, art: 'c_abyssalpull',
    text: (v) => `Whenever you Strand, deal ${v.n} damage to ALL enemies.`,
    play: (A, v) => A.rite('r_abyss', v.n),
  });
  card('depthcharge', {
    name: 'Depth Charge', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy',
    v: { dmg: 18, ebb: 3 }, up: { dmg: 24 }, art: 'c_depthcharge',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Ebb ${v.ebb}.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.ebb(v.ebb); },
  });
  card('stormglass', {
    name: 'Storm Glass', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', sink: true,
    v: { light: 2, surge: 2 }, up: { light: 3 }, art: 'c_stormglass',
    text: (v) => `Gain ${v.light} Light. Surge ${v.surge}. Sink.`,
    play: (A, v) => { A.light(v.light); A.surge(v.surge); },
  });
  card('saltward', {
    name: 'Salt Ward', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    v: { ward: 6, brine: 2 }, up: { ward: 8, brine: 3 }, art: 'c_saltward',
    text: (v) => `Gain ${v.ward} Ward. Apply ${v.brine} Brine to ALL enemies.`,
    play: (A, v) => { A.ward(v.ward); A.applyAll('brine', v.brine); },
  });
  card('breakwater', {
    name: 'Breakwater', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    v: {}, up: { cost: 0 }, art: 'c_breakwater',
    text: (v, k) => `Deal damage equal to your Ward.${k.ward == null ? '' : ` <span class="calc">(${k.d(k.ward)})</span>`}`,
    play: (A, v, t) => A.hit(t, A.wardNow()),
  });
  card('driftwood', {
    name: 'Driftwood', type: 'skill', rarity: 'common', cost: 1, target: 'none', float: true,
    v: { ward: 9 }, up: { ward: 12 }, art: 'c_driftwood',
    text: (v) => `Float. Gain ${v.ward} Ward.`,
    play: (A, v) => A.ward(v.ward),
  });
  card('whirlpool', {
    name: 'Whirlpool', type: 'skill', rarity: 'uncommon', cost: 1, target: 'all', sink: true,
    v: { soak: 2, chill: 1, ebb: 1 }, up: { soak: 3, chill: 2 }, art: 'c_whirlpool',
    text: (v) => `Apply ${v.soak} Soaked and ${v.chill} Chilled to ALL enemies. Ebb ${v.ebb}. Sink.`,
    play: (A, v) => { A.applyAll('soaked', v.soak); A.applyAll('chilled', v.chill); A.ebb(v.ebb); },
  });

  // ---------- Rare ----------
  card('leviathan', {
    name: "Leviathan's Call", type: 'attack', rarity: 'rare', cost: 3, target: 'enemy',
    v: { dmg: 28, surge: 3 }, up: { dmg: 36 }, art: 'c_leviathan',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Surge ${v.surge}.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.surge(v.surge); },
  });
  card('maelstrom', {
    name: 'Maelstrom', type: 'rite', rarity: 'rare', cost: 2, target: 'none',
    v: { n: 1 }, up: { cost: 1 }, art: 'c_maelstrom',
    text: () => `Your Crests deal double damage.`,
    play: (A, v) => A.rite('r_maelstrom', v.n),
  });
  card('beam', {
    name: 'Lighthouse Beam', type: 'rite', rarity: 'rare', cost: 2, target: 'none',
    v: { per: 3 }, up: { per: 4 }, art: 'c_beam',
    text: (v) => `At the end of your turn, deal ${v.per} damage for each Swell to a random enemy.`,
    play: (A, v) => A.rite('r_beam', v.per),
  });
  card('tsunami', {
    name: 'Tsunami', type: 'attack', rarity: 'rare', cost: 2, target: 'all',
    v: { per: 3 }, up: { per: 4 }, art: 'c_tsunami',
    text: (v, k) => {
      const now = k.tide == null ? '' : ` <span class="calc">(${v.per * k.tide} each)</span>`;
      return `Deal ${v.per} damage to ALL enemies for each Swell, then Strand.${now}`;
    },
    play: (A, v) => { A.wave(v.per * A.tide()); A.drain(); },
  });
  card('galeheart', {
    name: 'Gale Heart', type: 'rite', rarity: 'rare', cost: 1, target: 'none',
    v: { might: 2 }, up: { might: 3 }, art: 'c_galeheart',
    text: (v) => `Gain ${v.might} Might.`,
    play: (A, v) => A.buff('might', v.might),
  });
  card('toppledtower', {
    name: 'Toppled Tower', type: 'attack', rarity: 'rare', cost: 3, target: 'enemy', costDown: 'crests',
    v: { dmg: 18 }, up: { dmg: 25 }, art: 'c_toppledtower',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Costs 1 less for each Crest you made this turn.`,
    play: (A, v, t) => A.hit(t, v.dmg),
  });
  card('stormsurge', {
    name: 'Storm Surge', type: 'skill', rarity: 'rare', cost: 1, target: 'none', sink: true,
    v: { surge: 6 }, up: { cost: 0 }, art: 'c_stormsurge',
    text: (v) => `Surge ${v.surge}. Sink.`,
    play: (A, v) => A.surge(v.surge),
  });
  card('springtide', {
    name: 'Spring Tide', type: 'skill', rarity: 'rare', cost: 1, target: 'none', sink: true,
    v: {}, up: { cost: 0 }, art: 'c_springtide',
    text: () => `Strand, then Crest. Sink.`,
    play: (A) => { A.lowWater(); A.crest(); },
  });

  // ---------- Status & curse ----------
  card('seaweed', {
    name: 'Seaweed', type: 'status', rarity: 'special', cost: 1, target: 'none', sink: true,
    v: {}, art: 'c_seaweed',
    text: () => `Sink. <i>Tangles your hand.</i>`,
    play: () => {},
  });
  card('fogbank', {
    name: 'Fog Bank', type: 'status', rarity: 'special', cost: null, target: 'none', unplayable: true,
    v: {}, art: 'c_fogbank',
    text: () => `Unplayable.`,
  });
  card('lull', {
    name: 'Lull', type: 'status', rarity: 'special', cost: null, target: 'none', unplayable: true, fade: true,
    v: {}, art: 'c_lull',
    text: () => `Unplayable. Sinks at the end of your turn.`,
  });
  card('barnacles', {
    name: 'Barnacle Growth', type: 'curse', rarity: 'special', cost: null, target: 'none', unplayable: true,
    v: {}, art: 'c_barnacles',
    text: () => `Unplayable. Stays in your deck until you remove it.`,
  });
  /* Seep: Roil carried past your Hold leaves the aether Roiled, and it sheds seawater. Shuffled into the draw pile at the
     start of each fight (never into the deck), so it is gone after the fight. It is the first rung of the ladder in
     E.roilFor (js/engine.js): Seep, then Thrash, then a Bell Minnow, then round again. */
  card('seep', {
    name: 'Seep', type: 'status', rarity: 'special', cost: null, target: 'none', unplayable: true,
    v: {}, art: 'c_seep',
    text: () => `Unplayable. Gone after this fight.`,
  });

  BL.CARDS = CARDS;
  BL.STARTER_DECK = ['jab', 'jab', 'jab', 'jab', 'brace', 'brace', 'brace', 'brace', 'swell', 'slack'];
  BL.REWARD_POOL = {
    common: Object.values(CARDS).filter((c) => c.rarity === 'common').map((c) => c.id),
    uncommon: Object.values(CARDS).filter((c) => c.rarity === 'uncommon').map((c) => c.id),
    rare: Object.values(CARDS).filter((c) => c.rarity === 'rare').map((c) => c.id),
  };

  /* ------------------------------------------------------------------ *
   *  KEYWORDS (glossary used by tooltips)
   * ------------------------------------------------------------------ */
  BL.KEYWORDS = {
    Light: 'Spent to play cards. You refill to 3 Light at the start of each turn.',
    Ward: 'Blocks incoming damage. Ward washes away at the start of your next turn.',
    Surge: 'Raise the Swell. At 6 you Crest; any extra keeps rising from 3, so a big Surge can Crest twice.',
    Ebb: 'Lower the Swell. At 0 you Strand the enemies; any extra keeps falling from 3.',
    Swell: 'The water around the enemies, from 0 to 6. It starts each fight at 3.',
    Crest: 'The wave breaks: deal 6 damage to ALL enemies, +3 for every earlier Crest this turn. Then the Swell resets to 3.',
    Strand: 'The water pulls back and strands the enemies: they lose all their Ward, and you gain 1 Light. Then the Swell resets to 3.',
    Sink: 'After you play it, this card is gone for the rest of the fight.',
    Float: 'Stays in your hand at the end of your turn.',
    Rite: 'Rites stay in effect for the rest of the fight once played.',
    Echo: 'Your next card is played twice.',
    Might: 'Each hit of an attack deals that much more damage.',
    Spines: 'Whenever you are attacked, deal that much damage back.',
    Soaked: 'Takes 50% more damage from attacks and Crests. Wears off by 1 each turn.',
    Chilled: 'Deals 25% less attack damage. Wears off by 1 each turn.',
    Brine: 'Loses that much HP at the start of its turn, then Brine drops by 1.',
    Roil: 'How much a keepsake stirs the aether around it. Every keepsake you carry counts.',
    Hold: 'How much Roil the aether around you holds while it stays Calm. Deeper depths hold more.',
    Seep: 'Seawater shed by a Roiled aether: an unplayable card shuffled into your draw pile at the start of each fight. It is gone after the fight.',
    Thrash: 'A Roiled aether thrashes, and it strikes you through a fight. Thrash 1: at the start of each of your turns, take 1 damage. Ward you still have from the turn before stops it.',
    Roiled: 'You carry more Roil than your Hold. Every 5 Roil over (or part of 5) is one step, and each step adds one thing to every fight: a Seep, then 1 Thrash, then a Bell Minnow at half health, then round again. Never more than 2 Bell Minnows.',
  };

  /* ------------------------------------------------------------------ *
   *  STATUSES (shown on combatants)
   * ------------------------------------------------------------------ */
  BL.STATUSES = {
    might: { name: 'Might', kind: 'buff', icon: 'might', desc: (n) => `Attacks deal +${n} damage per hit.` },
    spines: { name: 'Spines', kind: 'buff', icon: 'spines', desc: (n) => `When attacked, deals ${n} damage back.` },
    soaked: { name: 'Soaked', kind: 'debuff', icon: 'soaked', desc: (n) => `Takes 50% more damage from attacks and Crests for ${n} more turn${n > 1 ? 's' : ''}.` },
    chilled: { name: 'Chilled', kind: 'debuff', icon: 'chilled', desc: (n) => `Deals 25% less attack damage for ${n} more turn${n > 1 ? 's' : ''}.` },
    brine: { name: 'Brine', kind: 'debuff', icon: 'brine', desc: (n) => `Loses ${n} HP at the start of its turn, then Brine drops by 1.` },
    r_moonpull: { name: 'Moon Pull', kind: 'rite', icon: 'moon', desc: (n) => `At the start of your turn, Surge ${n}.` },
    r_tidalmemory: { name: 'Tidal Memory', kind: 'rite', icon: 'shell', desc: (n) => `Whenever you Crest, gain ${n} Light.` },
    r_maelstrom: { name: 'Maelstrom', kind: 'rite', icon: 'vortex', desc: (n) => `Crests deal ${n + 1}x damage.` },
    r_spindrift: { name: 'Spindrift', kind: 'rite', icon: 'wave', desc: (n) => `Whenever you Surge, deal ${n} damage to a random enemy.` },
    r_abyss: { name: 'Abyssal Pull', kind: 'rite', icon: 'anchor', desc: (n) => `Whenever you Strand, deal ${n} damage to ALL enemies.` },
    r_beam: { name: 'Lighthouse Beam', kind: 'rite', icon: 'beam', desc: (n) => `At the end of your turn, deal ${n} damage per Swell to a random enemy.` },
    grief: { name: 'Twin Bond', kind: 'buff', icon: 'bond', desc: () => `When its twin dies, it gains 4 Might.` },
  };

  /* ------------------------------------------------------------------ *
   *  ENEMIES
   *  moves: dmg (number or fn(e)), hits, ward, buff{}, debuff{}, addCards{}, tide, summon[]
   *  ai(e, c, R): returns the next move key. e.hist = previous moves, e.mem = memory
   * ------------------------------------------------------------------ */
  function cycleFrom(list) {
    return (e) => list[((e.mem.offset || 0) + e.hist.length) % list.length];
  }
  function weighted(opts, maxRepeat) {
    // opts: [[key, weight], ...]; never use the same move more than maxRepeat times in a row
    return (e, c, R) => {
      const h = e.hist;
      let pool = opts;
      if (h.length >= maxRepeat) {
        const last = h[h.length - 1];
        let same = true;
        for (let i = 1; i <= maxRepeat; i++) if (h[h.length - i] !== last) same = false;
        if (same) pool = opts.filter((o) => o[0] !== last);
      }
      return R.weighted(pool);
    };
  }

  const ENEMIES = {
    kelp: {
      name: 'Kelp Lurker', hp: [27, 31], art: 'kelp', scale: 1.05,
      moves: {
        lash: { name: 'Lash', dmg: 8 },
        entangle: { name: 'Entangle', dmg: 4, debuff: { chilled: 1 } },
      },
      ai: weighted([['lash', 55], ['entangle', 45]], 2),
    },
    crab: {
      name: 'Brine Crab', hp: [30, 34], art: 'crab', scale: 1.0,
      init: (e, R) => { e.mem.offset = R.int(0, 2); },
      moves: {
        snap: { name: 'Snap', dmg: 8 },
        harden: { name: 'Harden', ward: 9, dmg: 3 },
        pinch: { name: 'Pinch', dmg: 4, hits: 2 },
      },
      ai: cycleFrom(['snap', 'harden', 'pinch']),
    },
    eel: {
      name: 'Lantern Eel', hp: [24, 28], art: 'eel', scale: 1.0,
      init: (e, R) => { e.mem.offset = R.int(0, 1); },
      moves: {
        shock: { name: 'Shock', dmg: 9, debuff: { soaked: 1 } },
        coil: { name: 'Coil', buff: { might: 2 }, ward: 4 },
      },
      ai: cycleFrom(['shock', 'coil']),
    },
    sailor: {
      name: 'Drowned Deckhand', hp: [34, 38], art: 'sailor', scale: 1.08,
      moves: {
        cutlass: { name: 'Cutlass', dmg: 8 },
        bellow: { name: 'Bellow', buff: { might: 2 }, ward: 6 },
      },
      ai: cycleFrom(['cutlass', 'bellow', 'cutlass']),
    },
    jelly: {
      name: 'Gloom Jelly', hp: [16, 20], art: 'jelly', scale: 0.85,
      moves: {
        sting: { name: 'Sting', dmg: 2, debuff: { brine: 2 } },
        pulse: { name: 'Pulse', dmg: 5 },
      },
      ai: weighted([['sting', 45], ['pulse', 55]], 1),
    },
    mite: {
      name: 'Barnacle Mite', hp: [10, 13], art: 'mite', scale: 0.7,
      moves: {
        nibble: { name: 'Nibble', dmg: 5 },
        burrow: { name: 'Burrow', ward: 6 },
      },
      ai: weighted([['nibble', 70], ['burrow', 30]], 1),
    },
    wisp: {
      name: 'Fog Wisp', hp: [22, 26], art: 'wisp', scale: 0.95,
      moves: {
        haze: { name: 'Haze', addCards: { id: 'fogbank', n: 2, pile: 'draw' } },
        touch: { name: 'Cold Touch', dmg: 7 },
      },
      ai: cycleFrom(['haze', 'touch', 'touch']),
    },
    gull: {
      name: 'Salt Gull', hp: [16, 19], art: 'gull', scale: 0.85, flying: true,
      init: (e, R) => { e.mem.offset = R.int(0, 1); },
      moves: {
        flurry: { name: 'Peck Flurry', dmg: 2, hits: 3 },
        dive: { name: 'Dive', dmg: 6 },
      },
      ai: cycleFrom(['flurry', 'dive']),
    },
    // ---------- Elites ----------
    hulk: {
      name: 'Reefback Hulk', hp: [68, 72], art: 'hulk', scale: 1.3, elite: true,
      init: (e) => { e.st.spines = 3; },
      moves: {
        crush: { name: 'Crush', dmg: 11 },
        grind: { name: 'Grind', dmg: 5, hits: 2 },
        rouse: { name: 'Rouse', buff: { might: 2 }, ward: 10 },
      },
      ai: cycleFrom(['crush', 'grind', 'rouse']),
    },
    siren: {
      name: 'Hollow Siren', hp: [64, 68], art: 'siren', scale: 1.2, elite: true,
      moves: {
        lullaby: { name: 'Lullaby', addCards: { id: 'lull', n: 3, pile: 'draw' }, debuff: { chilled: 1 }, tideSet: 3 },
        wail: { name: 'Wail', dmg: 11, debuff: { soaked: 1 } },
        shriek: { name: 'Shriek', dmg: 5, hits: 2 },
      },
      ai: cycleFrom(['lullaby', 'wail', 'shriek', 'wail']),
    },
    angler: {
      name: 'Angler Twin', hp: [31, 34], art: 'angler', scale: 1.0, elite: true,
      init: (e, R, idx) => { e.mem.offset = idx * 2; e.st.grief = 1; },
      moves: {
        bite: { name: 'Bite', dmg: 8 },
        lure: { name: 'Lure', dmg: 3, debuff: { soaked: 1 } },
        glow: { name: 'Glow', buff: { might: 1 }, ward: 6 },
      },
      ai: cycleFrom(['bite', 'lure', 'glow']),
      onAllyDeath: (e, dead, A) => { if (dead.id === 'angler' && e.st.grief) { A.enemyBuff(e, 'might', 4); e.st.grief = 0; } },
    },
    // ---------- Boss ----------
    bell: {
      name: 'The Drowned Bellwether', hp: [160, 160], art: 'bell', scale: 1.55, boss: true,
      moves: {
        ring: { name: 'Ring the Deep', ward: 14, addCards: { id: 'seaweed', n: 2, pile: 'draw' } },
        clapper: { name: 'Clapper Swing', dmg: 7, hits: 2 },
        toll: { name: 'Great Toll', dmg: (e) => 14 + 3 * (e.mem.tolls || 0), after: (e) => { e.mem.tolls = (e.mem.tolls || 0) + 1; } },
        undertow: { name: 'Undertow', dmg: 10, tide: -2, debuff: { chilled: 1 } },
        shoal: { name: 'Call the Shoal', summon: ['minnow', 'minnow'], buff: { might: 1 }, phase: 'The Bell Cracks!' },
      },
      ai: (e) => {
        if (!e.mem.summoned && e.hp <= e.maxHp / 2) { e.mem.summoned = true; return 'shoal'; }
        const seq = ['ring', 'clapper', 'toll', 'undertow', 'clapper', 'toll'];
        e.mem.step = (e.mem.step || 0) + 1;
        return seq[(e.mem.step - 1) % seq.length];
      },
    },
    minnow: {
      name: 'Bell Minnow', hp: [11, 13], art: 'minnow', scale: 0.6,
      moves: {
        bite: { name: 'Bite', dmg: 4 },
        nip: { name: 'Nip', dmg: 2, debuff: { soaked: 1 } },
      },
      ai: weighted([['bite', 60], ['nip', 40]], 2),
    },
    // ---------- Tutorial only (never in a random encounter) ----------
    tut_mite: {
      name: 'Barnacle Mite', hp: [12, 12], art: 'mite', scale: 0.7, tutorial: true,
      moves: { nibble: { name: 'Nibble', dmg: 4 } },
      ai: cycleFrom(['nibble']),
    },
    tut_crab: {
      name: 'Brine Crab', hp: [24, 24], art: 'crab', scale: 1.0, tutorial: true,
      moves: {
        harden: { name: 'Harden', ward: 4, dmg: 3 },
        snap: { name: 'Snap', dmg: 6 },
        pinch: { name: 'Pinch', dmg: 3, hits: 2 },
      },
      ai: cycleFrom(['harden', 'snap', 'pinch']),
    },
  };
  BL.ENEMIES = ENEMIES;

  /* The guided first fight (see js/tutorial.js). Cards are drawn in this order, 5 a turn;
     turn 3 runs out and refills from the discard pile, lowest card first. */
  BL.TUTORIAL = {
    enc: ['tut_mite', 'tut_crab'],
    deck: [
      'jab', 'brace', 'jab', 'brace', 'jab', // turn 1
      'swell', 'shellup', 'slack', 'jab', 'brace', // turn 2
      'riptide', 'stormsurge', 'jab', // turn 3, then the reshuffle
    ],
  };

  BL.ENCOUNTERS = {
    easy: [['kelp'], ['crab'], ['mite', 'mite', 'mite'], ['jelly', 'jelly'], ['eel', 'mite'], ['gull', 'mite']],
    hard: [
      ['sailor', 'gull'], ['crab', 'jelly'], ['wisp', 'eel'], ['crab', 'mite', 'mite'],
      ['kelp', 'kelp'], ['sailor', 'mite'], ['jelly', 'gull', 'jelly'], ['wisp', 'kelp'], ['eel', 'gull'],
    ],
    elite: [['hulk'], ['siren'], ['angler', 'angler']],
    boss: [['bell']],
  };

  /* ------------------------------------------------------------------ *
   *  KEEPSAKES (relics)
   * ------------------------------------------------------------------ */
  /* Every keepsake has a Roil (`charge` in the code). Carrying more Roil than your Hold adds Seep to each
     fight (see E.seepCount). Roil is roughly what the keepsake is worth to the bot in win-rate points.
     The Brass Tide-Bell and the money keepsakes moved to the kit in v0.10.0 (BL.KIT). */
  BL.KEEPSAKES = {
    whaletooth: { name: 'Whale Tooth', art: 'k_whaletooth', charge: 19, desc: 'Start each fight with 1 Might.' },
    barnacleplate: { name: 'Barnacle Plate', art: 'k_barnacleplate', charge: 14, spines: 1, desc: 'Start each fight with Spines 1: every attack on you takes 1 damage back.' },
    tidewatch: { name: 'Tidewatch', art: 'k_tidewatch', charge: 12, desc: 'Your Crests deal 4 more damage.' },
    moonshard: { name: 'Moon Shard', art: 'k_moonshard', charge: 8, desc: 'Start each fight at Swell 5.' },
    kelpbracelet: { name: 'Kelp Bracelet', art: 'k_kelpbracelet', charge: 11, desc: 'Whenever you Strand, gain 8 Ward.' },
    gullfeather: { name: 'Gull Feather', art: 'k_gullfeather', charge: 8, desc: 'Draw 2 extra cards on your first turn of each fight.' },
    biscuit: { name: 'Scallop Charm', art: 'k_biscuit', charge: 12, desc: 'While you carry it, your Max HP is 10 higher. Heals 10 when you pick it up.' },
    stormbottle: { name: 'Storm Bottle', art: 'k_stormbottle', charge: 18, desc: 'Every 3rd turn of a fight, gain 1 extra Light.' },
    sirenscale: { name: 'Whispering Conch', art: 'k_sirenscale', charge: 17, desc: 'Enemies start each fight with 2 Soaked.' },
    coralcrown: { name: 'Coral Branch', art: 'k_coralcrown', charge: 6, desc: 'Whenever you play a Rite, gain 5 Ward.' },
    inksac: { name: "Angler's Lure", art: 'k_inksac', charge: 10, desc: 'The first time you lose HP in a fight, apply 2 Chilled to ALL enemies.' },
    saltedhook: { name: 'Salted Hook', art: 'k_saltedhook', charge: 7, desc: 'Whenever you apply Brine, apply 1 more.' },
    echoconch: { name: 'Conch of Echoes', art: 'k_echoconch', charge: 17, desc: 'The first card you play in each fight is played twice.' },
    anchor: { name: 'Drowned Anchor', art: 'k_anchor', charge: 18, desc: 'A Strand also deals 4 damage to ALL enemies.' },
  };
  /* Keepsakes from before v0.10.0 that are kit now: a saved run carries them over as kit (E.migrateRun). */
  BL.RETIRED_KEEPSAKES = { tidebell: 'tidebell', pearlearring: 'pouch', doubloon: 'scales', pearlstrand: 'net', sparewick: 'wick' };

  /* ------------------------------------------------------------------ *
   *  TONICS (single-use potions)
   * ------------------------------------------------------------------ */
  BL.TONICS = {
    kelptea: { name: 'Kelp Tea', art: 't_kelptea', target: 'none', anywhere: true, desc: 'Heal 15 HP.' },
    ink: { name: 'Squid Ink', art: 't_ink', target: 'enemy', desc: 'Apply 3 Chilled to an enemy.' },
    squall: { name: 'Bottled Squall', art: 't_squall', target: 'none', desc: 'Deal 12 damage to ALL enemies.' },
    lampoil: { name: 'Lamp Oil', art: 't_lampoil', target: 'none', desc: 'Gain 2 Light.' },
    shell: { name: 'Shell Tonic', art: 't_shell', target: 'none', desc: 'Gain 12 Ward.' },
    moonwater: { name: 'Moon Water', art: 't_moonwater', target: 'none', desc: 'Crest right now.' },
    brine: { name: 'Brine Vial', art: 't_brine', target: 'enemy', desc: 'Apply 8 Brine to an enemy.' },
  };

  /* ------------------------------------------------------------------ *
   *  EVENTS ("Fog" nodes)
   *  option.act(run, E) returns { text, next } where next can be:
   *    { pick: 'remove' | 'upgrade' }   -> choose a card from the deck
   *    { cards: [ids] }                 -> choose one of these cards (or skip)
   *    { fight: 'hard' }                -> start a fight
   * ------------------------------------------------------------------ */
  BL.EVENTS = [
    {
      id: 'shrine', title: 'The Sunken Shrine', art: 'ev_shrine',
      text: 'A barnacle-crusted altar to a sea goddess nobody remembers. Her stone hands are still held out, waiting for an offering.',
      options: [
        { label: 'Offer blood', desc: 'Lose 7 HP. Upgrade 2 random cards.',
          act: (r, E) => { E.loseHp(r, 7); const n = E.upgradeRandom(r, 2); return { text: n ? `The water warms. ${n} of your cards feel sharper.` : 'The goddess has nothing left to teach you.' }; } },
        { label: 'Offer pearls', desc: 'Pay 35 Pearls. Remove a card from your deck.', cond: (r) => r.pearls >= 35 || 'Not enough Pearls',
          act: (r) => { r.pearls -= 35; return { text: 'The pearls sink into the stone, and the goddess waits for you to let something go.', next: { pick: 'remove' } }; } },
        { label: 'Leave', desc: 'Walk on.', decline: true, act: () => ({ text: 'You leave the goddess to her waiting.' }) },
      ],
    },
    {
      id: 'wreck', title: 'Wreck of the Gilded Gull', art: 'ev_wreck',
      text: "A merchant ship lies split in a basin the tide has left. The captain's cabin is sealed and something glints inside. Crates lie spilled across the rock, and the hold below is still flooded.",
      options: [
        { label: "Pry open the captain's cabin", desc: 'Gain a random keepsake. Gain the curse Barnacle Growth: an unplayable card that stays in your deck until you remove it.',
          act: (r, E) => { const k = E.gainRandomKeepsake(r); E.addCard(r, 'barnacles'); return { text: k ? `You find the ${BL.KEEPSAKES[k].name}, but barnacles creep onto your hands as you leave.` : 'The cabin is empty, and barnacles creep onto your hands.' }; } },
        { label: 'Salvage the cargo', desc: 'Gain 45 Pearls.', act: (r) => { r.pearls += 45; return { text: 'Water-swollen crates, but a pouch of pearls is still dry inside one of them.' }; } },
        { label: 'Dive into the flooded hold', desc: 'A gamble. Half the time: 150 Pearls. Otherwise something in the dark bites for 12 HP.',
          act: (r, E) => {
            if (E.makeR(r).chance(0.5)) { r.pearls += 150; return { text: 'Your hands find a strongbox wedged under the stairs. It is heavy with pearls. (+150 Pearls)' }; }
            E.loseHp(r, 12); return { text: 'Something long and cold uncoils in the dark and bites before you can kick away. (-12 HP)' };
          } },
        { label: 'Leave', desc: 'Let the dead keep their things.', decline: true, act: () => ({ text: 'You walk on past the wreck.' }) },
      ],
    },
    {
      id: 'witch', title: "The Tide-Witch's Bargain", art: 'ev_witch',
      text: 'A hut on stilts, a crone in a shawl of fishing net. "Rare lessons for a rare price, keeper. Or a brew, for pearls."',
      options: [
        { label: 'Trade your years', desc: 'Lose 7 Max HP. Choose 1 of 3 rare cards.',
          act: (r, E) => { E.loseMaxHp(r, 7); return { text: 'She plucks a few of your years like loose threads, and spreads her cards.', next: { cards: E.randomCards(r, 'rare', 3) } }; } },
        { label: 'Buy a brew', desc: 'Pay 30 Pearls. Gain a random tonic.', cond: (r) => (r.pearls >= 30 ? (r.tonics.includes(null) || 'Tonic slots full') : 'Not enough Pearls'),
          act: (r, E) => { r.pearls -= 30; const t = E.gainRandomTonic(r); return { text: `She corks a bottle of ${BL.TONICS[t].name} and presses it into your hand.` }; } },
        { label: 'Decline', desc: 'Leave politely.', decline: true, act: () => ({ text: '"Another time," she cackles.' }) },
      ],
    },
    {
      id: 'pool', title: 'The Glimmering Pool', art: 'ev_pool',
      text: 'A cave pool glows a gentle turquoise. The water is warm, and the light in it seems to listen.',
      options: [
        { label: 'Drink', desc: 'Heal 20 HP.', act: (r, E) => { const h = E.heal(r, 20); return { text: `Warmth spreads through you. Healed ${h} HP.` }; } },
        { label: 'Bathe your gear', desc: 'Upgrade a card of your choice.', cond: (r, E) => E.upgradeable(r).length > 0 || 'Nothing to upgrade',
          act: () => ({ text: 'You lower your gear into the warm, glowing water.', next: { pick: 'upgrade' } }) },
        { label: 'Gaze at your reflection', desc: 'Lose 5 HP. Duplicate a card in your deck.', cond: (r) => r.deck.some((c) => BL.CARDS[c.id].type !== 'curse') || 'No cards to copy',
          act: (r, E) => { E.loseHp(r, 5); return { text: 'Your reflection reaches up out of the water, holding a card of its own.', next: { pick: 'duplicate' } }; } },
        { label: 'Harvest glowing pearls', desc: 'Lose 5 HP. Gain 30 Pearls.', act: (r, E) => { E.loseHp(r, 5); r.pearls += 30; return { text: 'The pearls bite back, but they are yours.' }; } },
      ],
    },
    {
      id: 'ghost', title: 'The Lost Lamplighter', art: 'ev_ghost',
      text: "A drowned lamplighter waits on a dripping stair, holding a keeper's lantern that has not burned in a hundred years.",
      options: [
        { label: 'Share your light', desc: 'Lose 6 HP. Choose 1 of 3 uncommon cards.',
          act: (r, E) => { E.loseHp(r, 6); return { text: "His lantern flickers to life. In gratitude he shows you an old keeper's trick.", next: { cards: E.randomCards(r, 'uncommon', 3) } }; } },
        { label: 'Ask for guidance', desc: 'Remove a card from your deck.', act: () => ({ text: '"Carry less," he says. "The deep is kind to the light."', next: { pick: 'remove' } }) },
        { label: 'Leave', desc: 'Leave him be.', decline: true, act: () => ({ text: 'He bows as you pass.' }) },
      ],
    },
    {
      id: 'bottle', title: 'Message in a Bottle', art: 'ev_bottle',
      text: 'A bottle bobs against a rock, a rolled note inside. The glass glows faintly.',
      options: [
        { label: 'Read the note', desc: 'Choose 1 of 3 cards. Gain 15 Pearls.',
          act: (r, E) => { r.pearls += 15; return { text: 'A sailor\'s notes on fighting at sea, and a few pearls rolled in with them.', next: { cards: E.rewardCards(r, 'normal') } }; } },
        { label: 'Keep the glowing glass', desc: 'Gain a random tonic.', cond: (r) => r.tonics.includes(null) || 'Tonic slots full',
          act: (r, E) => { const t = E.gainRandomTonic(r); return { text: `The glow was a ${BL.TONICS[t].name}. You stopper it carefully.` }; } },
      ],
    },
    {
      id: 'ambush', title: 'Eyes in the Kelp', art: 'ev_ambush',
      text: 'Pairs of eyes blink open between the kelp fronds. Something is guarding a glinting cache.',
      options: [
        { label: 'Fight for the cache', desc: 'Fight. Win 30 extra Pearls.', act: () => ({ text: 'You raise your harpoon.', next: { fight: 'hard', bonusPearls: 30 } }) },
        { label: 'Sneak past', desc: 'Lose 5 HP.', act: (r, E) => { E.loseHp(r, 5); return { text: 'Thorny kelp scrapes you as you slip by.' }; } },
      ],
    },
  ];

  /* ------------------------------------------------------------------ *
   *  WORKSHOP (permanent progression between runs)
   *  Every finished run turns its score into Salvage. Salvage buys kit in the Workshop, and kit stays
   *  bought. Kit is mundane gear Wren wears and carries, one item in each place; keepsakes are the
   *  magic. Some kit is locked until an achievement. The names are working names, kept here so they
   *  are easy to change.
   * ------------------------------------------------------------------ */
  BL.META_TEXT = { currency: 'Salvage', shop: 'Workshop', item: 'Kit' };
  /* Where kit goes. The Bell always holds a bell; the others can be empty. */
  BL.KIT_PLACES = [
    { id: 'harpoon', name: 'Harpoon', desc: 'Your weapon. It changes your Harpoon Jabs.' },
    { id: 'bell', name: 'Bell', desc: 'Your Tide-Bell. It decides what you draw when you Crest or Strand.' },
    { id: 'coat', name: 'Coat', desc: 'What you wear over your oilskin.' },
    { id: 'pocket', name: 'Pocket', desc: 'Coins and tokens.' },
    { id: 'ditty', name: 'Ditty Bag', desc: 'Small tools and supplies.' },
  ];
  BL.KIT = {
    honed: { place: 'harpoon', name: 'Honed Harpoon', art: 'g_honed', price: 35, unlock: 'dreadhunter', dmg: 2, desc: 'Your first Harpoon Jab in each fight deals 2 more damage.' },
    barbed: { place: 'harpoon', name: 'Barbed Harpoon', art: 'g_barbed', price: 25, unlock: 'pickled', brine: 1, desc: 'Your first Harpoon Jab in each fight applies 1 Brine.' },
    tidebell: { place: 'bell', name: 'Brass Tide-Bell', art: 'k_tidebell', price: 0, starter: true, desc: 'Whenever you Crest or Strand, draw 1 card.' },
    floodbell: { place: 'bell', name: 'Flood Bell', art: 'g_floodbell', price: 20, unlock: 'twocrests', desc: 'Whenever you Crest, draw 2 cards. A Strand draws nothing.' },
    ebbbell: { place: 'bell', name: 'Ebb Bell', art: 'g_ebbbell', price: 20, unlock: 'twolows', desc: 'Whenever you Strand, draw 2 cards. Crests draw nothing.' },
    crackedbell: { place: 'bell', name: 'Cracked Bell', art: 'g_crackedbell', price: 30, unlock: 'threecrests', desc: 'Your first Crest or Strand each turn draws nothing. Every one after it draws 2 cards.' },
    cork: { place: 'coat', name: 'Cork Vest', art: 'g_cork', price: 12, desc: 'Start each run with 5 more Max HP.' },
    gorget: { place: 'coat', name: 'Shell Gorget', art: 'g_gorget', price: 25, unlock: 'untouched', desc: 'Start each fight with 4 Ward.' },
    purse: { place: 'pocket', name: 'Coin Purse', art: 'g_purse', price: 8, desc: 'Start each run with 30 more Pearls.' },
    pouch: { place: 'pocket', name: "Gleaner's Pouch", art: 'g_pouch', price: 15, desc: 'Gain 10 extra Pearls after each fight.' },
    marker: { place: 'pocket', name: "Barnaby's Marker", art: 'g_marker', price: 25, unlock: 'travellight', desc: "Your first card removal at Barnaby's shop in each run is free." },
    flask: { place: 'ditty', name: 'Spare Flask', art: 'g_flask', price: 12, desc: 'Start each run with a random tonic.' },
    scales: { place: 'ditty', name: 'Pearl Scales', art: 'g_scales', price: 15, desc: "Barnaby's prices are 25% lower: he can't argue with honest weights." },
    net: { place: 'ditty', name: 'Gleaning Net', art: 'g_net', price: 10, desc: 'Gain 3 Pearls whenever you Crest.' },
    wick: { place: 'ditty', name: 'Spare Wick', art: 'g_wick', price: 12, desc: 'Resting heals 10 more HP.' },
  };
  /* Story so far (title screen and menu): the opening, chapters, the world glossary and the keeper's notes.
     `when` is a mark the player has to earn (E.storyMarks in js/engine.js); an entry without it is always open.
     `lock` is what a locked entry shows. Art paths are under img/. An opening picture is placed by `pos` on tall screens,
     and by `wide` and `zoom` on wide ones. WORLD.md has to agree with all of this. */
  BL.STORY = {
    title: 'An enchanted bell, sunk under the cliffs, has stolen the fire from your lighthouse, and it is pulling the sea up toward the town. You are the last keeper. Go down and take the fire back.',
    opening: [
      { art: 'bg/bg_title', pos: '22% top', wide: '22% top', zoom: 1.3,
        text: 'You are Wren, the lighthouse keeper of Saltmere, a harbour town on a rocky coast. The lighthouse burns a magic fire called the Lantern Heart. While it burns, ships find their way past the rocks.' },
      { art: 'bg/bg_title', pos: '72% bottom', wide: '70% bottom', zoom: 1.5,
        text: 'In the sea-caves under the cliffs hangs an enchanted bell, the Bellwether. Keepers sank it there long ago to hold the sea back. Nobody has tended it for a hundred years.' },
      { art: 'bg/bg_boss', pos: 'center', sfx: 'bell',
        text: 'Tonight the bell rang by itself. Its magic pulled the Lantern Heart out of the lighthouse and down into the caves. Now the bell is flooding the caves and lifting the sea toward the town, a little higher with every tide.' },
      { art: 'scenes/rest', pos: 'center', wide: 'left center', zoom: 1.6, fig: 'units/keeper',
        text: 'Your lantern holds the last of that fire. Your hand-bell moves water the way the great bell does. Take both, and your harpoon. Go down through the caves, fight what lives there, and bring the Lantern Heart home.' },
    ],
    chapters: [
      { id: 'night', title: 'The night the light went out', opening: true },
      { id: 'fall', title: 'The sea gives you back', when: 'fell', lock: 'Fall in the Reach.', text: [
        'The cold water closed over your lantern, and you went under. You woke on the shingle below the lighthouse, alive, with your harpoon beside you. Your lantern had burned down to an ember, but it was still alight.',
        'The water the bell holds keeps everything it takes. The open sea does not. It carries the drowned back to shore, and it carried you. The keepsakes you found in the caves are gone: the bell called them back.',
        'The lighthouse is still dark, and the water stands a little higher on the stairs. You trim your lantern and go down again.',
      ] },
      { id: 'home', title: 'The Heart comes home', when: 'won:0', lock: 'Clear the Shallows.', text: [
        'On the last landing the Bellwether cracked and fell silent, and the water it was holding ran out of the caves. The Lantern Heart was still burning in the broken bronze. You carried it up the stairs, and by dawn the great light of Saltmere was turning again.',
        'It did not last. Before the next tide a bell was ringing below again, from deeper down. The fire answered it and went back, and the caves filled behind you.',
        'The keepers\' charts show stairs that go on below the Shallows, into a depth they called Dark Water.',
      ] },
      { id: 'sunk', title: 'Why the bell was sunk', when: 'won:1', lock: 'Clear Dark Water.', text: [
        'Below Dark Water the stairs are older, and keepers cut them. The keepers made the Bellwether too. A hand-bell like yours moves the water in a pool. They cast a bell big enough to move the sea, and sank it under the cliffs to hold the water off their low stairs and their quay.',
        'A bell that size has to be tended. Keepers walked down to it at the lowest tides of the year. The last one to go was a lamplighter, a hundred years ago. He drowned on the low stair, and nobody went down after him.',
      ] },
      { id: 'followed', title: 'Why the fire followed', when: 'won:2', lock: 'Clear Riptide.', text: [
        'Every keeper\'s hand-bell is tuned to the Bellwether, and every keeper\'s lantern is lit from the Lantern Heart. The great bell leads and the small ones follow. That is what a bellwether is: the sheep that wears the bell, and the flock walks behind it.',
        'Nobody rang it that night. The tide swings its clapper, and its ringing holds the tide, so it cannot stop by itself. For a hundred years nobody has gone down to still it, and it has rung a little louder every year.',
        'When it rang loud enough, the Lantern Heart did what a keeper\'s light does. It answered the lead bell and went down.',
      ] },
      { id: 'belfry', title: 'Under the last stair', when: 'won:3', lock: 'Clear the Abyss.', text: [
        'The Abyss is the last hall you can walk. Under it there is one more chamber, and its floor is below the sea. The keepers called it the Belfry. A lighthouse keeps its light at the top of a tower. The keepers hung their bell at the bottom of one.',
        'The Belfry is full of water and it does not drain. An open lantern cannot go there. On the wall of the hall above it hangs an old keeper\'s diving dress, with a sealed lamp on its helmet.',
        'That is as far as the story goes for now.',
      ] },
    ],
    world: [
      { group: 'Places', items: [
        ['Saltmere', 'A harbour town on a rocky headland. Its lighthouse warns ships off the rocks.'],
        ['The lighthouse', 'It stands above the town, and you keep it. Its lamp burns the Lantern Heart.'],
        ['The Drowned Reach', 'The sea-caves, stairs and rock terraces under the cliffs, below the lighthouse. The Bellwether keeps them flooded.'],
        ['Depths', 'The Reach goes down in four depths: the Shallows, Dark Water, Riptide and the Abyss. Each is harder than the one above it.'],
        ['Landings', 'The stops on the way down through a depth. The Bellwether waits on the last one.'],
        ['The Lazaret', 'The locked store room at the lighthouse where keepers shut keepsakes away. It keeps their Roil inside, so many can lie there together. It opens after your first win.'],
      ] },
      { group: 'People', items: [
        ['Wren', 'You. The last lighthouse keeper of Saltmere.'],
        ['Keepers', 'The people who tend the light and the bell. A keeper carries a lantern lit from the Lantern Heart and a hand-bell tuned to the Bellwether.'],
        ['Barnaby', 'A hermit crab who keeps a shop in his shell. He sells cards, keepsakes and tonics for pearls.'],
      ] },
      { group: 'Light and bell', items: [
        ['The Lantern Heart', 'The magic fire that burns in the lighthouse lamp. Every keeper\'s lantern is lit from it.'],
        ['Light', 'The fire in your lantern. You spend it to play cards, and it comes back at the start of each turn.'],
        ['The Bellwether', 'An enchanted bronze bell. Its ringing holds seawater in place. Keepers sank it under the cliffs long ago to hold the sea back, and now it rings by itself.'],
        ['Tide-bell', 'Your hand-bell. Ring it and the water near you moves. Keepers call it a tide-bell because it is tuned to the Bellwether, the bell that holds the tide.'],
        ['The Swell', 'The water around the enemies in a fight. You stand on stone and they stand in the wash. Surge raises the water until a wave breaks on them: a Crest. Ebb pulls it away until they are left on bare rock: a Strand.'],
      ] },
      { group: 'Magic in the water', items: [
        ['Brinelight', 'The glow in the water of the Reach. It is light from the Lantern Heart that has soaked into the seawater the bell holds.'],
        ['Keepsakes', 'Lost things that have lain in brinelight until they took on a magic of their own. The deeper they lay, the stronger they are.'],
        ['The aether', 'The unseen stuff that carries magic, the way air carries sound. Every keepsake stirs it. Roil is how much.'],
        ['Calm and Roiled', 'The aether around you can take a certain amount of Roil: your Hold. Up to that it is Calm. Past it the aether is Roiled. First seawater comes out of it into your pack: Seep. Then the aether thrashes, and it strikes you each turn unless your Ward is still up: Thrash. Then the Bellwether hears it, and a Bell Minnow comes to look.'],
        ['Pearls', 'Money in the Reach. You find them after fights and in wrecks.'],
        ['Tonics', 'Brews in small bottles. Each works once.'],
      ] },
    ],
    notes: [
      { id: 'barnaby', title: 'Barnaby', when: 'shop', lock: 'Found at a shop.', art: 'units/trader',
        text: 'Barnaby is a hermit crab, and his shell is both his house and his shop: Barnaby\'s Drifting Emporium. He says everything in it came down with a wreck, and that it still works, mostly. He trades fairly and will not haggle. He also asks that you do not bite.' },
      { id: 'cove', title: 'Sheltered Coves', when: 'cove', lock: 'Found at a Cove.', art: 'scenes/rest',
        text: 'Here and there the caves have a dry hollow above the reach of the tide. Somebody has left a blanket, a kettle and a coil of rope in each one. The bell\'s water cannot reach you there, and a lantern burns steadily.' },
      { id: 'chest', title: 'Sea chests', when: 'wreck', lock: 'Found at a Wreck.', art: 'scenes/treasure',
        text: 'On an ordinary coast the sea breaks a wreck up and washes the pieces ashore. The water the bell holds keeps everything it takes. Chests lie where they sank, and what is inside has soaked in brinelight for years. That is why it glows.' },
      { id: 'keepsake', title: 'How a keepsake is made', when: 'keepsake', lock: 'Carry a keepsake.',
        text: 'A keepsake starts as something somebody lost: a fish hook, a gull\'s feather, a whale\'s tooth. It lies in brinelight for years, and when it is found it works a small magic of its own. Nobody knows why some lost things turn and others do not.' },
      { id: 'seep', title: 'A Roiled aether', when: 'roiled', lock: 'Carry more Roil than your Hold.',
        text: 'One keepsake stirs the aether a little. Many together stir it more than it can take. First seawater beads on your gear and soaks into your pack. Keepers call that Seep. Stir it further and the aether thrashes like a hooked fish. It has no aim. It strikes whoever stands nearest, again and again, and each blow takes a little of you unless you are still braced for it. That is Thrash. Further still, and the noise carries. The Bellwether listens for it, and sends a Bell Minnow to find what is calling. Drop a keepsake, or go deeper: near the bell the aether holds more.' },
      { id: 'lazaret', title: 'A night in the Lazaret', when: 'won:0', lock: 'Clear the Shallows.',
        text: 'A lazaret is a ship\'s store locker, and also a house where the sick are kept apart. The keepers\' Lazaret is a little of both. A keepsake fresh from the Reach still answers the Bellwether, and the bell calls it back if its finder falls. One night shut in the Lazaret breaks that pull. After that the keepsake answers its keeper, and it turns up in the Lazaret again even if she leaves it behind in the caves.' },
      { id: 'kelp', title: 'The old coast', when: 'ev:ambush', lock: 'Found in the Fog.', art: 'scenes/ev_ambush',
        text: 'Not everything in the Reach serves the bell. Crabs, eels, gulls and kelp lived on this coast long before it rang by itself. The flooding gave them more room, and they guard what they find in it.' },
      { id: 'deckhand', title: 'Drowned Deckhands', when: 'en:sailor', lock: 'Found in a fight.', art: 'units/sailor',
        text: 'The open sea carries the drowned back to shore. The water the bell holds does not. The crews of its wrecks are still down there, and they still work their watch.' },
      { id: 'siren', title: 'The Hollow Siren', when: 'en:siren', lock: 'Found at a Dread.', art: 'units/siren',
        text: 'She sings one flat note, and the water goes flat with it. While she sings, your Swell is dragged back to the middle, and no wave can build.' },
      { id: 'lamplighter', title: 'The Lost Lamplighter', when: 'ev:ghost', lock: 'Found in the Fog.', art: 'scenes/ev_ghost',
        text: 'He was the last keeper who went down to tend the bell. He drowned on the low stair a hundred years ago, and he has waited there since with a lantern that went out when he did. A keeper can light another lantern from their own, but it takes something out of the one who gives. That is why sharing your light hurts.' },
      { id: 'goddess', title: 'The forgotten goddess', when: 'ev:shrine', lock: 'Found in the Fog.', art: 'scenes/ev_shrine',
        text: 'Nobody in Saltmere remembers her name, or who built her altar. Her stone hands are still held out, and they are empty. She still answers an offering: the water around the altar turns warm.' },
      { id: 'witch', title: 'The Tide-Witch', when: 'ev:witch', lock: 'Found in the Fog.', art: 'scenes/ev_witch',
        text: 'She lives in a hut on stilts and wears a shawl of fishing net. Her brews cost pearls. Her rare lessons cost more: she takes years off your life, and that is why your Max HP drops.' },
      { id: 'gull', title: 'The Gilded Gull', when: 'ev:wreck', lock: 'Found in the Fog.', art: 'scenes/ev_wreck',
        text: 'A merchant ship, split open in a rock basin. Her captain\'s cabin is still sealed and her hold is still flooded. Something long and cold has made the hold its home.' },
      { id: 'pool', title: 'The Glimmering Pool', when: 'ev:pool', lock: 'Found in the Fog.', art: 'scenes/ev_pool',
        text: 'The turquoise glow in the pool is brinelight. There is so much of it here that the water is warm, and the light seems to listen. It mends wounds and sharpens gear. It has also given the pearls in the pool a bite.' },
      { id: 'bottle', title: 'The message in the bottle', when: 'ev:bottle', lock: 'Found in the Fog.', art: 'scenes/ev_bottle',
        text: 'A sailor wrote down what he knew about fighting at sea, corked the note in a bottle and threw it over the side. The open sea would have carried it to a beach. The bell\'s water kept it here, and the glass has started to glow.' },
      { id: 'bellwether', title: 'The Bellwether, up close', when: 'boss', lock: 'Found on the last landing.', art: 'units/bell',
        text: 'A hundred years under the sea have changed the bell. Coral and weed grow on its bronze, and something with one eye and many arms has grown into it. When the bronze cracks, a shoal of Bell Minnows comes to its call.' },
    ],
  };

  /* Gear from before v0.10.0 that became kit (or went away): owned pieces carry over (E.migrateMeta). */
  BL.OLD_GEAR = { floodchart: 'floodbell', ebbchart: 'ebbbell', stormlens: 'crackedbell', whetstone: 'honed', purse: 'purse', cork: 'cork', flask: 'flask', gorget: 'gorget', marker: 'marker' };
  /* Achievements unlock kit. met(run) is checked after every fight and at the end of a run (never in the tutorial). */
  BL.ACHIEVEMENTS = {
    twocrests: { name: 'Double Crest', desc: 'Crest twice in one turn.', met: (r) => (r.stats.maxChain || 0) >= 2 },
    twolows: { name: 'Double Strand', desc: 'Strand twice in one turn.', met: (r) => (r.stats.maxLowChain || 0) >= 2 },
    threecrests: { name: 'Triple Crest', desc: 'Crest three times in one turn.', met: (r) => (r.stats.maxChain || 0) >= 3 },
    untouched: { name: 'Untouched', desc: 'Win 3 fights in one run without losing HP.', met: (r) => (r.stats.flawless || 0) >= 3 },
    dreadhunter: { name: 'Dread Hunter', desc: 'Defeat a Dread.', met: (r) => (r.stats.elites || 0) >= 1 },
    travellight: { name: 'Travel Light', desc: 'Defeat a Dread with 12 or fewer cards in your deck.', met: (r) => !!r.stats.leanDread },
    pickled: { name: 'Salt the Wound', desc: 'Defeat an enemy with Brine.', met: (r) => (r.stats.brineKills || 0) >= 1 },
  };
})();
