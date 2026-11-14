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
    v: { ward: 4, ebb: 2 }, up: { ward: 7 }, art: 'c_slack',
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
    v: { dmg: 3, ebb: 2 }, up: { dmg: 5 }, art: 'c_riptide',
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
    v: { brine: 5, ebb: 2 }, up: { brine: 7 }, art: 'c_saltspray',
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
    v: { ward: 15, ebb: 2 }, up: { ward: 20 }, art: 'c_seawall',
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
    v: { soak: 2, chill: 1, ebb: 2 }, up: { soak: 3, chill: 2 }, art: 'c_whirlpool',
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
    v: { per: 2 }, up: { per: 3 }, art: 'c_beam',
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
    Echo: 'Your next card is played twice. On a creature: its next move happens twice.',
    Bail: 'Once a turn, without a card: spend 1 Light to Ebb 1. If it makes a Strand, the Strand gives the Light back. Bail or Stir, not both.',
    Stir: 'Once a turn, without a card: spend 1 Light to Surge 1. Bail or Stir, not both.',
    Might: 'Each hit of an attack deals that much more damage.',
    Spines: 'Whenever you are attacked, deal that much damage back.',
    Soaked: 'Takes 50% more damage from attacks and Crests. Wears off by 1 each turn.',
    Chilled: 'Deals 25% less attack damage. Wears off by 1 each turn.',
    Brine: 'Loses that much HP at the start of its turn, then Brine drops by 1.',
    Roil: 'How much a keepsake stirs the aether around it. Every keepsake you carry counts.',
    Hold: 'How much Roil the aether around you holds while it stays Calm. It grows for good the first time you reach each deeper level.',
    Seep: 'Seawater shed by a Roiled aether: an unplayable card shuffled into your draw pile at the start of each fight. It is gone after the fight.',
    Thrash: 'A Roiled aether thrashes, and it strikes you through a fight. Thrash 1: at the start of each of your turns, take 1 damage. Ward you still have from the turn before stops it.',
    Doused: 'Something drank from your lantern: you start your next turn with that much less Light.',
    Submerged: 'Sunk out of reach until it next acts. You cannot target it, and attacks cannot reach it, but Crests and other waves still hit it. A Strand brings it up.',
    Shell: 'Its Ward does not wash away from turn to turn. A Strand still strips it.',
    Breathless: 'Something squeezed the air out of your suit: you draw that many fewer cards at the start of your next turn.',
    Burst: 'When it dies, it bursts, and the burst hurts you and every other creature. Your Ward stops it.',
    Heartfire: 'The Lantern Heart is free beside you: you gain more Light at the start of each turn, for the rest of the fight.',
    Roiled: 'You carry more Roil than your Hold. Every 12 Roil over (or part of 12) is one step, and each step adds one thing to every fight: a Seep, then 1 Thrash, then a Bell Minnow at half health, then round again. Never more than 2 Bell Minnows.',
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
    // Dark Water
    doused: { name: 'Doused', kind: 'debuff', icon: 'doused', desc: (n) => `Your lantern is doused: you start your next turn with ${n} less Light.` },
    submerged: { name: 'Submerged', kind: 'buff', icon: 'submerged', desc: () => 'Sunk out of reach until it acts. You cannot target it, and attacks cannot reach it. Crests and other waves still hit it, and a Strand brings it up.' },
    shell: { name: 'Shell', kind: 'buff', icon: 'shell', desc: () => 'Its Ward does not wash away from turn to turn. A Strand still strips it.' },
    swallowed: { name: 'Swallowed', kind: 'buff', icon: 'swallowed', desc: (n) => `It has swallowed ${n} of your card${n > 1 ? 's' : ''}. They come back to your discard pile when it dies.` },
    // the Shallows' pin
    belled: { name: 'In its Bell', kind: 'buff', icon: 'boss', desc: () => 'Its Ward does not wash away from turn to turn. A Crest or a Strand shakes it out of the bell: it loses all its Ward.' },
    // the Belfry
    echo: { name: 'Echo', kind: 'buff', icon: 'echo', desc: () => 'Its next move happens twice.' },
    burst: { name: 'Burst', kind: 'buff', icon: 'burst', desc: (n) => `When it dies, it bursts: ${n} damage to you and to every other creature. Your Ward stops it.` },
    breathless: { name: 'Breathless', kind: 'debuff', icon: 'air', desc: (n) => `Something squeezed the air out of your suit: you draw ${n} fewer card${n > 1 ? 's' : ''} at the start of your next turn.` },
    heartfire: { name: 'Heartfire', kind: 'buff', icon: 'flame', desc: (n) => `The Lantern Heart is free beside you: you gain ${n} more Light at the start of each turn.` },
  };

  /* ------------------------------------------------------------------ *
   *  ENEMIES
   *  moves: dmg (number or fn(e, c)), hits, ward, buff{}, debuff{}, addCards{}, tide, summon[],
   *         drain (heals the HP its hits take), submerge (Submerged until it next acts),
   *         swallow (takes the last card you played this turn, until it dies), tip (a line for the intent)
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

  /* A pin (a band's boss) changes once it is down to this share of its health: the Bellwether calls its shoal, the
     Tolling Buoy slips its chain. It was half until v0.16.0, which came too late for the help to matter. */
  BL.PIN_CALL = 2 / 3;
  /* The Pale Gulper, a Dread of Dark Water, retches up two Glimmer Leeches once it is down to this share of its health. */
  BL.DREAD_CALL = 1 / 2;
  /* The Tolling Buoy's Wild Peal: this much damage, less this much for each Crest or Strand you make that turn. */
  BL.PEAL = { dmg: 30, quiet: 10 };
  /* A Glimmer Bladder's burst when it dies: this much damage to the keeper and to every other creature. */
  BL.BURST = 8;
  /* When the Bellwether's bronze breaks, the Lantern Heart's light pours out: the keeper heals this share of her
     Max HP, and her lantern gains this much Light at the start of each turn for the rest of the fight (Heartfire). */
  BL.HEART_RISE = { heal: 0.3, light: 1 };

  const ENEMIES = {
    kelp: {
      name: 'Kelp Lurker', hp: [27, 31], art: 'kelp', scale: 1.05,
      moves: {
        // the kelp tightens: each Lash hits 2 harder than the last, so a Lurker left alone gets dangerous
        lash: { name: 'Lash', dmg: (e) => 8 + 2 * (e.mem.lashes || 0), after: (e) => { e.mem.lashes = (e.mem.lashes || 0) + 1; },
          tip: 'Each Lash hits 2 harder than the last' },
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
        burrow: { name: 'Burrow', ward: 5, buff: { might: 1 } }, // it digs in and comes out bolder
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
      init: (e) => { e.st.spines = 2; }, // Spines 3 and Rouse Might 2 until v0.21.0: by far the deadliest Dread in the game
      moves: {
        crush: { name: 'Crush', dmg: 11 },
        grind: { name: 'Grind', dmg: 5, hits: 2 },
        rouse: { name: 'Rouse', buff: { might: 1 }, ward: 10 },
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
    // ---------- The Shallows' pin: Saltmere's old harbour bell, worn by a hermit crab ----------
    harbour: {
      name: 'The Harbour Hermit', hp: [150, 150], art: 'harbour', scale: 1.5, boss: true,
      init: (e) => { e.st.belled = 1; },
      moves: {
        // it pulls into its bell, and the Ward stays until a Crest or a Strand shakes it out
        withdraw: { name: 'Pull In', ward: 20 },
        pinch: { name: 'Pinch', dmg: 6, hits: 2 },
        crush: { name: 'Bell Crush', dmg: (e) => 15 + 3 * (e.mem.crushes || 0), after: (e) => { e.mem.crushes = (e.mem.crushes || 0) + 1; },
          tip: 'Each Bell Crush hits 3 harder than the last' },
        // hurt, its bell rings the harbour's call, and the mites living on the bell drop off to help
        ring: { name: 'Ring the Harbour Bell', summon: ['mite', 'mite'], buff: { might: 1 }, phase: 'The Harbour Bell Rings!' },
      },
      ai: (e) => {
        if (!e.mem.summoned && e.hp <= e.maxHp * BL.PIN_CALL) { e.mem.summoned = true; return 'ring'; }
        const seq = ['withdraw', 'pinch', 'crush', 'pinch', 'crush'];
        e.mem.step = (e.mem.step || 0) + 1;
        return seq[(e.mem.step - 1) % seq.length];
      },
    },
    // ---------- The Belfry's last landing: the Bellwether, and the thing that grew into it ----------
    /* `next`: a creature with a second form. When the first form's HP runs out it doesn't die: the second form
       comes out (E's rise), with its own HP. Its shoal scatters, and the Heart's light heals the keeper and burns
       in her lantern for the rest of the fight (BL.HEART_RISE). */
    bell: {
      name: 'The Drowned Bellwether', hp: [160, 160], art: 'bell', scale: 1.55, boss: true, next: 'bellthing', rise: 'The Bell Breaks!',
      moves: {
        ring: { name: 'Ring the Deep', ward: 14, addCards: { id: 'seaweed', n: 2, pile: 'draw' } },
        clapper: { name: 'Clapper Swing', dmg: 7, hits: 2 },
        toll: { name: 'Great Toll', dmg: (e) => 14 + 3 * (e.mem.tolls || 0), after: (e) => { e.mem.tolls = (e.mem.tolls || 0) + 1; } },
        undertow: { name: 'Undertow', dmg: 10, tide: -2, debuff: { chilled: 1 } },
        shoal: { name: 'Call the Shoal', summon: ['minnow', 'minnow'], buff: { might: 1 }, phase: 'The Bell Cracks!' },
      },
      ai: (e) => {
        if (!e.mem.summoned && e.hp <= e.maxHp * BL.PIN_CALL) { e.mem.summoned = true; return 'shoal'; }
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
    // ---------- Dark Water: what grew in the still, held water, and what eats the light in it ----------
    leech: {
      name: 'Glimmer Leech', plural: 'Glimmer Leeches', hp: [12, 14], art: 'leech', scale: 0.62,
      moves: {
        latch: { name: 'Latch', dmg: 5, drain: true },
        gorge: { name: 'Gorge', buff: { might: 1 } },
      },
      ai: weighted([['latch', 65], ['gorge', 35]], 2),
    },
    shrimp: {
      name: 'Pistol Shrimp', hp: [20, 23], art: 'shrimp', scale: 0.8,
      init: (e, R) => { e.mem.offset = R.int(0, 1); },
      moves: {
        cock: { name: 'Cock the Claw', dmg: 4 },
        snap: { name: 'Flash Snap', dmg: 14 },
      },
      ai: cycleFrom(['cock', 'snap']),
    },
    ray: {
      name: 'Murk Ray', hp: [28, 32], art: 'ray', scale: 1.0,
      init: (e, R) => { e.mem.offset = R.int(0, 2); },
      moves: {
        sting: { name: 'Sting', dmg: 8 },
        sink: { name: 'Sink', submerge: true },
        rise: { name: 'Rise', dmg: 15 },
      },
      ai: cycleFrom(['sting', 'sink', 'rise']),
    },
    hermit: {
      name: 'Lamp Hermit', hp: [26, 29], art: 'hermit', scale: 0.9,
      init: (e, R) => { e.mem.offset = R.int(0, 3); e.st.shell = 1; },
      moves: {
        withdraw: { name: 'Withdraw', ward: 8 },
        pinch: { name: 'Pinch', dmg: 5, hits: 2 },
        clamp: { name: 'Clamp', dmg: 10 },
      },
      ai: cycleFrom(['withdraw', 'pinch', 'withdraw', 'clamp']),
    },
    chain: {
      name: 'Glimmer Chain', hp: [74, 78], art: 'chain', scale: 1.25, elite: true,
      init: (e, R) => { e.mem.offset = R.int(0, 2); },
      moves: {
        lash: { name: 'Lash', dmg: 6, hits: 2 },
        douse: { name: 'Drink the Light', dmg: 8, debuff: { doused: 1 } },
        glut: { name: 'Glut', buff: { might: 2 }, ward: 10 },
      },
      ai: cycleFrom(['lash', 'douse', 'glut']),
    },
    gulper: {
      name: 'Pale Gulper', hp: [62, 66], art: 'gulper', scale: 1.2, elite: true,
      init: (e, R) => { e.mem.offset = R.int(0, 2); },
      moves: {
        bite: { name: 'Bite', dmg: 14 },
        gulp: { name: 'Gulp', dmg: 7, swallow: true },
        whip: { name: 'Tail Whip', dmg: 5, hits: 2, debuff: { soaked: 1 } },
        // hurt, it brings up what it has swallowed: two Glimmer Leeches, still alive, and your cards with them
        retch: { name: 'Retch', summon: ['leech', 'leech'], disgorge: true, phase: 'It Retches!' },
      },
      ai: (e) => {
        if (!e.mem.summoned && e.hp <= e.maxHp * BL.DREAD_CALL) { e.mem.summoned = true; return 'retch'; }
        const seq = ['bite', 'gulp', 'whip'];
        return seq[((e.mem.offset || 0) + e.hist.filter((h) => h !== 'retch').length) % seq.length];
      },
    },
    // a giant sea spider that walks the Glimmer Garden on stilt legs and grazes its beads. It is what tends the garden:
    // it sows Glimmer Leeches in it, and drinks what it takes. Dark Water's own Dread (v0.21.0), in the Angler Twins' place
    strider: {
      name: 'Garden Strider', hp: [72, 76], art: 'strider', scale: 1.35, elite: true,
      moves: {
        tend: { name: 'Tend the Garden', grow: { id: 'leech', max: 2 }, ward: 8 },
        graze: { name: 'Graze', dmg: 10, drain: true },
        stilts: { name: 'Stilt Legs', dmg: 4, hits: 3 },
      },
      ai: cycleFrom(['tend', 'graze', 'stilts']),
    },
    // ---------- Dark Water's pin: it holds the water in Dark Water for the Bellwether ----------
    buoy: {
      name: 'The Tolling Buoy', hp: [165, 165], art: 'buoy', scale: 1.5, boss: true,
      moves: {
        haul: { name: 'Haul the Chain', ward: 12, debuff: { doused: 1 } },
        // it rocks on the Swell: the further the water is from 3, the harder it swings
        toll: { name: 'Rocking Toll', dmg: (e, c) => 12 + 2 * (e.mem.tolls || 0) + 4 * Math.abs(((c && c.tide) == null ? 3 : c.tide) - 3), after: (e) => { e.mem.tolls = (e.mem.tolls || 0) + 1; },
          tip: 'It hits 4 harder for each step your Swell is away from 3, and every Toll rings 2 harder than the last' },
        clang: { name: 'Clang', dmg: 8, hits: 2 },
        // at two thirds of its health its chain snaps: it swings free, and with no chain left to haul it rings wild
        slip: { name: 'Slip the Chain', ward: 15, buff: { might: 1 }, phase: 'The Chain Snaps!' },
        // a wave smothers a bell and a Strand grounds it: each Crest or Strand you make this turn muffles the Peal
        peal: { name: 'Wild Peal', dmg: (e, c) => Math.max(0, BL.PEAL.dmg - BL.PEAL.quiet * ((c && (c.turnCrests + c.turnLows)) || 0)),
          tip: `Each Crest or Strand you make this turn muffles it by ${BL.PEAL.quiet}` },
      },
      ai: (e) => {
        if (!e.mem.free && e.hp <= e.maxHp * BL.PIN_CALL) { e.mem.free = true; e.mem.step = 0; return 'slip'; }
        const seq = e.mem.free ? ['peal', 'toll', 'clang', 'toll'] : ['haul', 'toll', 'clang', 'toll'];
        e.mem.step = (e.mem.step || 0) + 1;
        return seq[(e.mem.step - 1) % seq.length];
      },
    },
    // ---------- The Belfry: under the sea, around the great bell, where the Heart's light is strongest ----------
    // a jellyfish shaped like a little bell: its chime makes another creature's next move happen twice
    belljelly: {
      name: 'Bell Jelly', hp: [18, 21], art: 'belljelly', scale: 0.85,
      init: (e, R) => { e.mem.offset = R.int(0, 1); },
      moves: {
        chime: { name: 'Chime', dmg: 3, echoOne: true },
        sting: { name: 'Sting', dmg: 6, debuff: { soaked: 1 } },
      },
      ai: cycleFrom(['chime', 'sting']),
    },
    // the young of the thing in the bell: it squeezes the air out of the keeper's suit
    spawn: {
      name: 'Bellspawn', hp: [24, 27], art: 'spawn', scale: 0.8,
      init: (e, R) => { e.mem.offset = R.int(0, 2); },
      moves: {
        squeeze: { name: 'Squeeze', dmg: 5, debuff: { breathless: 1 } },
        lash: { name: 'Lash', dmg: 4, hits: 2 },
        grab: { name: 'Grab', dmg: 9 },
      },
      ai: cycleFrom(['squeeze', 'lash', 'grab']),
    },
    // a light-eater so full of the Heart's light that it bursts when it dies
    bladder: {
      name: 'Glimmer Bladder', hp: [22, 25], art: 'bladder', scale: 0.9,
      init: (e, R) => { e.mem.offset = R.int(0, 1); e.st.burst = BL.BURST; },
      moves: {
        bump: { name: 'Bump', dmg: 7 },
        bloat: { name: 'Bloat', ward: 6, buff: { might: 2 } },
      },
      ai: cycleFrom(['bump', 'bloat', 'bump']),
    },
    // Dreads
    ringer: {
      name: 'Drowned Ringer', hp: [60, 64], art: 'ringer', scale: 1.15, elite: true,
      init: (e, R, idx) => { e.mem.offset = idx ? R.int(1, 2) : 0; },
      moves: {
        ring: { name: 'Ring Out', ward: 8, echoAll: true },
        hook: { name: 'Boathook', dmg: 10 },
        knell: { name: 'Knell', dmg: 5, hits: 2 },
      },
      ai: cycleFrom(['ring', 'hook', 'knell']),
    },
    oarfish: {
      name: 'Crowned Oarfish', hp: [66, 70], art: 'oarfish', scale: 1.3, elite: true,
      init: (e, R) => { e.mem.offset = R.int(0, 2); e.st.spines = 2; },
      moves: {
        coil: { name: 'Coil', dmg: 6, debuff: { breathless: 1 } },
        lash: { name: 'Ribbon Lash', dmg: 3, hits: 4 },
        ram: { name: 'Ram', dmg: 13 },
      },
      ai: cycleFrom(['coil', 'lash', 'ram']),
    },
    // the Bellwether's second form: the thing with one eye and many arms that grew into the bronze
    bellthing: {
      name: 'The Thing in the Bell', hp: [150, 150], art: 'bellthing', scale: 1.55, boss: true,
      arrive: ['arm', 'arm'], // when it comes out of the bell, two of its arms come with it
      moves: {
        drink: { name: 'Drink the Light', dmg: 6, douseArms: true },
        eye: { name: 'The Eye Opens', expose: 2, ward: 8 },
        glare: { name: 'Glare', dmg: 24 },
        reach: { name: 'Reach', grow: { id: 'arm', max: 2 }, ward: 12 },
      },
      ai: (e) => {
        const seq = ['drink', 'eye', 'glare', 'reach'];
        e.mem.step = (e.mem.step || 0) + 1;
        return seq[(e.mem.step - 1) % seq.length];
      },
    },
    arm: {
      name: 'Grasping Arm', hp: [15, 17], art: 'arm', scale: 0.95,
      init: (e, R, idx) => { e.mem.offset = idx % 2; },
      moves: {
        lash: { name: 'Lash', dmg: 7 },
        grip: { name: 'Grip', dmg: 4, debuff: { breathless: 1 } },
      },
      ai: cycleFrom(['lash', 'grip']),
    },
    // after the Heart has come home, the Belfry's last landing is one of these (BL.BANDS.belfry.enc.finals)
    thing: {
      name: 'The Thing in the Bell', hp: [170, 170], art: 'bellthing', scale: 1.55, boss: true,
      moves: {
        drink: { name: 'Drink the Light', dmg: 7, douseArms: true },
        eye: { name: 'The Eye Opens', expose: 2, ward: 8 },
        glare: { name: 'Glare', dmg: 26 },
        reach: { name: 'Reach', grow: { id: 'arm', max: 2 }, ward: 12 },
      },
      ai: (e) => {
        const seq = ['reach', 'drink', 'eye', 'glare'];
        e.mem.step = (e.mem.step || 0) + 1;
        return seq[(e.mem.step - 1) % seq.length];
      },
    },
    cantor: {
      name: 'The Drowned Cantor', hp: [160, 160], art: 'cantor', scale: 1.35, boss: true,
      moves: {
        lead: { name: 'Lead the Peal', ward: 12, echoAll: true },
        toll: { name: 'Toll', dmg: (e) => 10 + 2 * (e.mem.tolls || 0), after: (e) => { e.mem.tolls = (e.mem.tolls || 0) + 1; },
          tip: 'Each Toll rings 2 harder than the last' },
        call: { name: 'Call the Choir', grow: { id: 'ringer', max: 1 } },
      },
      ai: (e) => {
        const seq = ['lead', 'toll', 'toll', 'call'];
        e.mem.step = (e.mem.step || 0) + 1;
        return seq[(e.mem.step - 1) % seq.length];
      },
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
      'jab', 'stormsurge', 'jab', // turn 3, then the reshuffle (turn 3 teaches Bail, so no Ebb card)
    ],
  };

  BL.ENCOUNTERS = {
    easy: [['kelp'], ['crab'], ['mite', 'mite', 'mite'], ['jelly', 'jelly'], ['eel', 'mite'], ['gull', 'mite']],
    hard: [
      ['sailor', 'gull'], ['crab', 'jelly'], ['wisp', 'eel'], ['crab', 'mite', 'mite'],
      ['kelp', 'kelp'], ['sailor', 'mite'], ['jelly', 'gull', 'jelly'], ['wisp', 'kelp'], ['eel', 'gull'],
    ],
    elite: [['hulk'], ['siren'], ['angler', 'angler']],
    boss: [['harbour']],
  };

  /* Bands: the parts of the Reach, each with its own creatures, Fog events and look. E.LEVELS says which band
     each level of an expedition uses. Each band's pin waits on its last landing: the Harbour Hermit in the Shallows,
     the Tolling Buoy in Dark Water, and the Bellwether in the Belfry. `pin` is what happens when a pin breaks with
     more of the expedition below it; `win` is the end of the expedition, when the Belfry's last landing is won:
     `win` the first time, when the Heart comes home, and `quiet` on later expeditions. After the Heart has come
     home the Belfry's last landing is one of `enc.finals` (the Bellwether stays silent). */
  BL.BANDS = {
    shallows: {
      name: 'the Shallows', boss: 'The Harbour Hermit', bg: 'bg_battle', bossBg: 'bg_shallows_boss',
      pin: 'The harbour bell cracks, and the crab inside it lets go of the water. It runs away down a stair that has been under the sea for a hundred years. The Lantern Heart is not here. Far below, something is still ringing, and the glow of the fire goes on down the stair toward it.',
      enc: BL.ENCOUNTERS,
      events: ['shrine', 'wreck', 'witch', 'pool', 'ghost', 'bottle', 'ambush'],
    },
    dark: {
      name: 'Dark Water', boss: 'The Tolling Buoy', bg: 'bg_dark', bossBg: 'bg_dark_boss',
      pin: 'The Tolling Buoy rocks one last time and goes silent, and the water it held runs away down the last stair. At the bottom the water does not drain: below Dark Water is the Belfry, and its floor is under the sea.',
      enc: {
        easy: [['leech', 'leech', 'leech'], ['shrimp', 'leech'], ['hermit'], ['ray'], ['jelly', 'leech'], ['eel', 'leech']],
        hard: [
          ['ray', 'leech', 'leech'], ['hermit', 'shrimp'], ['sailor', 'leech'], ['shrimp', 'shrimp'], ['wisp', 'ray'],
          ['hermit', 'jelly'], ['eel', 'shrimp'], ['sailor', 'hermit'], ['ray', 'jelly'],
        ],
        elite: [['chain'], ['gulper'], ['strider']],
        boss: [['buoy']],
      },
      events: ['shrine', 'pool', 'ghost', 'tideboard', 'garden', 'divingbell'],
    },
    belfry: {
      name: 'the Belfry', boss: 'The Drowned Bellwether', bg: 'bg_belfry', bossBg: 'bg_belfry_boss',
      finalBoss: 'Something in the Belfry',
      stair: 'Below Dark Water the stair goes on down into the sea. On the last dry step you check the seams of the diving dress, light its sealed lamp, and rest a while before you go under.',
      win: 'The Bellwether\'s bronze breaks, and the Lantern Heart\'s light pours out through the water. The thing that grew into the bell lets go of the Heart and sinks away into the dark under the floor. You carry the Heart up three levels of stairs, and by dawn the great light of Saltmere is turning again.',
      quiet: 'The Belfry goes quiet. The broken bell hangs still over the place where the Heart lay, and a faint light stays behind there, as it always does. You climb home with what you found.',
      enc: {
        easy: [['belljelly', 'minnow', 'minnow'], ['spawn', 'minnow'], ['bladder', 'bladder'], ['ray', 'belljelly'], ['spawn', 'leech'], ['bladder', 'eel']],
        hard: [
          ['belljelly', 'spawn'], ['spawn', 'spawn'], ['bladder', 'bladder', 'minnow'], ['belljelly', 'ray'], ['bladder', 'spawn'],
          ['spawn', 'jelly', 'minnow'], ['belljelly', 'bladder', 'minnow'], ['ray', 'spawn'], ['eel', 'belljelly', 'leech'],
        ],
        elite: [['ringer', 'minnow'], ['oarfish'], ['chain']],
        boss: [['bell']],
        finals: [['thing', 'arm', 'arm'], ['cantor']],
      },
      events: ['lanterns', 'heartglow', 'rope', 'shrine', 'garden'],
    },
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
    /* Found deeper (`deep`: the first level where it can be found, 1 = Dark Water, 2 = the Belfry). Nearer the bell the
       held water has more of the Heart's light in it, so these are stronger, and they stir the aether more. In those
       levels the first keepsake of every offer is one of the level's own while any are left (E.keepsakeChoices). */
    whelk: { name: 'Hollow Whelk', art: 'k_whelk', charge: 27, deep: 1, keep: 1, desc: 'Your Ward no longer washes away at the start of your turn.' },
    bulb: { name: 'Glimmer Bulb', art: 'k_bulb', charge: 30, deep: 1, light: 1, desc: 'Whenever you Strand, gain 1 more Light.' },
    leechjar: { name: 'Leech Jar', art: 'k_leechjar', charge: 21, deep: 1, heal: 4, maxHp: 2, desc: 'Whenever a creature dies, your Max HP rises by 2 and you heal 4 HP.' },
    clapper: { name: 'Bell Clapper', art: 'k_clapper', charge: 41, deep: 2, desc: 'The first time you Crest or Strand each turn, your next card is played twice.' },
    powderhorn: { name: 'Powder Horn', art: 'k_powderhorn', charge: 26, deep: 2, burst: 12, desc: 'Whenever a creature dies, it bursts: 12 damage to every other creature.' },
    cinder: { name: 'Heart Cinder', art: 'k_cinder', charge: 42, deep: 2, every: 2, desc: 'Gain 1 more Light on the 1st, 3rd, 5th and every other turn of each fight.' },
  };

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
    // ---------- Dark Water ----------
    {
      id: 'tideboard', title: 'The Tide-Board', art: 'ev_tideboard',
      text: 'The keepers cut a tide-board into the wall of the stair: a line and a year for every highest tide. The lowest lines are older than the lighthouse. For the last hundred years each line sits a little above the one before, and the newest is above your head.',
      options: [
        { label: 'Read the old notes', desc: 'Choose 1 of 3 cards that Surge or Ebb.',
          act: (r, E) => ({ text: 'Beside the oldest lines the keepers wrote down how the water moved, and how they moved it.', next: { cards: E.swellCards(r, 3) } }) },
        { label: "Cut tonight's line", desc: 'Gain 5 Max HP.',
          act: (r) => { r.maxHp += 5; r.hp += 5; return { text: 'You cut a line at the height of the water tonight, as a keeper should. Somebody has to keep the record. (+5 Max HP)' }; } },
        { label: 'Leave', desc: 'Climb on down.', decline: true, act: () => ({ text: 'You leave the lines to the dark.' }) },
      ],
    },
    {
      id: 'garden', title: 'The Glimmer Garden', art: 'ev_garden',
      text: 'Pale stalks crowd a flooded cellar, each one tipped with a bead of brinelight. When you raise your lantern, every bead in the room turns toward it.',
      options: [
        { label: 'Reach into the glow', desc: 'Lose 9 HP. Gain a random keepsake.',
          act: (r, E) => { E.loseHp(r, 9); const k = E.gainRandomKeepsake(r); return { text: k ? `The stalks bite and drink as your arm goes in. At the roots, where the glow is brightest, your hand closes on the ${BL.KEEPSAKES[k].name}.` : 'The stalks bite and drink as your arm goes in, and there is nothing at the roots.' }; } },
        { label: 'Pick the brightest beads', desc: 'Gain 45 Pearls. A Glimmer Leech follows you into your next fight.',
          act: (r, E) => { r.pearls += 45; E.addFollower(r, 'leech'); return { text: 'The beads come away like ripe berries, and they are pearls. Something in the water saw the light go into your pocket. (+45 Pearls)' }; } },
        { label: 'Leave', desc: 'Shade your lantern and walk past.', decline: true, act: () => ({ text: 'In the dark, the stalks turn back to one another.' }) },
      ],
    },
    {
      id: 'divingbell', title: 'The Diving Bell', art: 'ev_divingbell',
      text: 'An old keepers\' diving bell rests on the floor of a flooded alcove, and air is still trapped inside it. Somebody lived in it once: a cot, a cold lamp, and a tally of days scratched into the iron. The tally stops.',
      options: [
        { label: 'Rest in the trapped air', desc: 'Heal 18 HP.', act: (r, E) => { const h = E.heal(r, 18); return { text: `The air is old and still, and it is enough. Healed ${h} HP.` }; } },
        { label: "Read the diver's log", desc: 'Choose 1 of 3 cards.',
          act: (r, E) => ({ text: 'The log is mostly soundings. The last pages are about something big that came to the bell\'s light at night.', next: { cards: E.rewardCards(r, 'normal') } }) },
        { label: 'Leave', desc: 'Let the diver rest.', decline: true, act: () => ({ text: 'You add one line to the tally, and go.' }) },
      ],
    },
    // ---------- The Belfry ----------
    {
      id: 'lanterns', title: 'The Lost Lanterns', art: 'ev_lanterns',
      text: 'On a ledge under the bell lie hundreds of keepers\' lanterns, lost down the stairs over the years. They have all rolled the same way, toward the glow under the bell. A few still hold a spark.',
      options: [
        { label: 'Relight one from yours', desc: 'Lose 6 HP. Upgrade 3 random cards.',
          act: (r, E) => { E.loseHp(r, 6); const n = E.upgradeRandom(r, 3); return { text: n ? `The old wick takes your flame. As it catches, you know things the keeper who carried it knew. ${n} of your cards feel sharper.` : 'The old wick takes your flame, but it has nothing left to teach you.' }; } },
        { label: 'Take the brass', desc: 'Gain 60 Pearls.',
          act: (r) => { r.pearls += 60; return { text: 'Old brass, and pearls that grew in the glass where the light pooled. (+60 Pearls)' }; } },
        { label: 'Leave', desc: 'Let them keep looking at the glow.', decline: true, act: () => ({ text: 'You leave the lanterns to their watch.' }) },
      ],
    },
    {
      id: 'heartglow', title: 'The Glow under the Bell', art: 'ev_heartglow',
      text: (r) => (r && r.heartHome
        ? 'Far below the broken bell, something still glows under the water where the Heart lay: a little of its light that stayed behind. The water around it is warm.'
        : 'Far below the great bell, something burns under the water: the Lantern Heart. Even from here the water is warm, and your lantern leans toward it.'),
      options: [
        { label: 'Warm yourself', desc: 'Heal 25 HP.', act: (r, E) => { const h = E.heal(r, 25); return { text: `The warmth soaks through the dress and into your bones. Healed ${h} HP.` }; } },
        { label: 'Hold your lantern to it', desc: 'Gain 6 Max HP.',
          act: (r) => { r.maxHp += 6; r.hp += 6; return { text: 'Your flame burns higher, and so do you. (+6 Max HP)' }; } },
        { label: 'Leave', desc: 'Swim on.', decline: true, act: () => ({ text: 'You turn away from the glow. It is hard.' }) },
      ],
    },
    {
      id: 'rope', title: 'The Bell-Rope', art: 'ev_rope',
      text: 'The great bell\'s rope hangs down through the water, thick as a mast and furred with weed. Things are tangled in the weed, and something has been climbing it.',
      options: [
        { label: 'Search the weed', desc: 'Lose 8 HP. Choose 1 of 3 rare cards.',
          act: (r, E) => { E.loseHp(r, 8); return { text: 'The weed is full of hooks and stings. Among them are a keeper\'s tricks, written on scraps of oilcloth.', next: { cards: E.randomCards(r, 'rare', 3) } }; } },
        { label: 'Pull the rope', desc: 'Gain a random keepsake. Two Bell Minnows follow you into your next fight.',
          act: (r, E) => { const k = E.gainRandomKeepsake(r); E.addFollower(r, 'minnow'); E.addFollower(r, 'minnow'); return { text: `Far above you, something gives one slow note. ${k ? `The ${BL.KEEPSAKES[k].name} falls out of the weed into your hands. ` : ''}A shoal of Bell Minnows heard it too.` }; } },
        { label: 'Leave', desc: 'Swim past.', decline: true, act: () => ({ text: 'The rope sways after you have passed.' }) },
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
  /* Where kit goes. The Bell always holds a bell; the others can be empty (`none` names the empty slot).
     The kit screens show Wren with a slot for each place: `side` is the side of her picture the slot sits on,
     and `at` is where its line points on her picture (fractions of its width and height, from the top left).
     Her pictures share one canvas (tools/wren-art.py), so one point fits them all; BL.WREN_POINTS moves a point
     for a picture where her rig covers it. A new place needs these and a glyph in ui.js (ICON.slot_<id>).
     The Rig place is `coat` in the code and in saves (it was called the Coat until v0.24.3). */
  BL.KIT_PLACES = [
    { id: 'harpoon', name: 'Harpoon', desc: 'Your weapon. It changes your Harpoon Jabs.', none: 'Plain harpoon', side: 'left', at: [0.2, 0.48] },
    { id: 'bell', name: 'Bell', desc: 'Your Tide-Bell. It decides what you get when you Crest or Strand.', side: 'right', at: [0.52, 0.42] },
    { id: 'coat', name: 'Rig', desc: 'What you wear over your oilskin. A keeper never takes the oilskin off: brinelight runs off it.', none: 'Just the oilskin', side: 'right', at: [0.66, 0.29] },
    { id: 'pocket', name: 'Pocket', desc: 'Coins and tokens.', none: 'Empty', side: 'right', at: [0.75, 0.515] },
    { id: 'ditty', name: 'Ditty Bag', desc: 'Small tools and supplies.', none: 'Empty', side: 'left', at: [0.37, 0.49] },
  ];
  /* Per-picture corrections to the slot points above, where her rig moves a point: { picture: { place: [x, y] } }.
     In a diving dress she stands in another pose, with her harpoon raised, her bell lower and no coat pocket. */
  const IN_DRESS = { harpoon: [0.3, 0.335], ditty: [0.47, 0.455], coat: [0.64, 0.34], bell: [0.59, 0.52], pocket: [0.7, 0.55] };
  BL.WREN_POINTS = { keeper_suit: IN_DRESS, keeper_plated: IN_DRESS };
  /* A rig's `look` is Wren's picture (img/units) on shore and on the open-air levels; a dress also has `lookUnder`,
     her picture wearing it in the Belfry and on the kit screens (E.keeperArt). Without them she shows as plain Wren
     (keeper, and keeper_suit underwater). */
  BL.KIT = {
    honed: { place: 'harpoon', name: 'Honed Harpoon', art: 'g_honed', price: 35, unlock: 'dreadhunter', dmg: 2, desc: 'Your first Harpoon Jab in each fight deals 2 more damage.' },
    barbed: { place: 'harpoon', name: 'Barbed Harpoon', art: 'g_barbed', price: 25, unlock: 'pickled', brine: 1, desc: 'Your first Harpoon Jab in each fight applies 1 Brine.' },
    toggle: { place: 'harpoon', name: 'Toggle Iron', art: 'g_toggle', price: 30, unlock: 'stillwater', soaked: 2, desc: 'Your first Harpoon Jab in each fight applies 2 Soaked.' },
    tidebell: { place: 'bell', name: 'Brass Tide-Bell', art: 'k_tidebell', price: 0, starter: true, desc: 'Whenever you Crest or Strand, draw 1 card.' },
    floodbell: { place: 'bell', name: 'Flood Bell', art: 'g_floodbell', price: 20, unlock: 'twocrests', desc: 'Whenever you Crest, draw 1 card and gain 1 Light. A Strand gives nothing.' },
    ebbbell: { place: 'bell', name: 'Ebb Bell', art: 'g_ebbbell', price: 20, unlock: 'twolows', desc: 'Whenever you Strand, draw 1 card and gain 3 Ward. A Crest gives nothing.' },
    crackedbell: { place: 'bell', name: 'Cracked Bell', art: 'g_crackedbell', price: 30, unlock: 'threecrests', desc: 'Your first Crest or Strand each turn gives nothing. Every one after it draws 2 cards and gives 1 Light.' },
    harbourbell: { place: 'bell', name: 'Harbour Bell', art: 'g_harbourbell', price: 25, unlock: 'outofbell', desc: 'The Hermit\'s bell, mended. Whenever you Crest or Strand, gain 3 Ward. It draws nothing.' },
    cork: { place: 'coat', name: 'Cork Vest', art: 'g_cork', look: 'keeper_cork', price: 12, desc: 'Start each run with 5 more Max HP.' },
    gorget: { place: 'coat', name: 'Shell Gorget', art: 'g_gorget', look: 'keeper_gorget', price: 25, unlock: 'untouched', ward: 4, desc: 'Start each fight with 4 Ward.' },
    /* Found, never bought: the first time Dark Water's pin breaks, Wren finds it and carries it home (E.carryHome). */
    suit: { place: 'coat', name: 'Diving Dress', art: 'g_suit', look: 'keeper_packed', lookUnder: 'keeper_suit', price: 0, found: true, desc: "An old keeper's diving dress with a sealed lamp. You need it to go down into the Belfry. It does nothing in a fight." },
    /* The dress again, plated with shell: it counts as the Diving Dress (`as`) for the Belfry's stair. */
    plated: { place: 'coat', name: 'Plated Dress', art: 'g_plated', look: 'keeper_plated_packed', lookUnder: 'keeper_plated', price: 50, unlock: 'heartlight', as: 'suit', ward: 3, desc: 'The diving dress again, armoured with shell plates from shoulders to shins. You can go down into the Belfry in it, and you start each fight with 3 Ward.' },
    purse: { place: 'pocket', name: 'Coin Purse', art: 'g_purse', price: 8, desc: 'Start each run with 30 more Pearls.' },
    pouch: { place: 'pocket', name: "Gleaner's Pouch", art: 'g_pouch', price: 15, desc: 'Gain 10 extra Pearls after each fight.' },
    marker: { place: 'pocket', name: "Barnaby's Marker", art: 'g_marker', price: 25, unlock: 'travellight', desc: "Your first card removal at Barnaby's shop in each run is free." },
    flask: { place: 'ditty', name: 'Spare Flask', art: 'g_flask', price: 12, desc: 'Start each run with a random tonic.' },
    scales: { place: 'ditty', name: 'Pearl Scales', art: 'g_scales', price: 15, desc: "Barnaby's prices are 25% lower: he can't argue with honest weights." },
    net: { place: 'ditty', name: 'Gleaning Net', art: 'g_net', price: 10, desc: 'Gain 3 Pearls whenever you Crest.' },
    wick: { place: 'ditty', name: 'Spare Wick', art: 'g_wick', price: 12, desc: 'Resting heals 10 more HP.' },
    bailer: { place: 'ditty', name: 'Bailer', art: 'g_bailer', price: 30, unlock: 'bothends', desc: 'You can Bail or Stir twice a turn.' },
    line: { place: 'ditty', name: 'Safety Line', art: 'g_line', price: 35, unlock: 'closecall', hp: 5, desc: 'The first time you would fall on an expedition, the line holds: you are left with 5 HP.' },
  };
  /* Story so far (title screen and menu): the opening, chapters, the world glossary and the keeper's notes.
     `when` is a mark the player has to earn (E.storyMarks in js/engine.js); an entry without it is always open.
     `lock` is what a locked entry shows. Art paths are under img/. An opening picture is placed by `pos` on tall screens,
     and by `wide` and `zoom` on wide ones. WORLD.md has to agree with all of this. */
  BL.STORY = {
    title: 'An enchanted bell, sunk under the cliffs, has stolen the fire from your lighthouse, and it is pulling the sea up toward the town. You are the last keeper. Go down and take the fire back.',
    opening: [
      { art: 'scenes/op_lighthouse', pos: '36% center', wide: 'center top', zoom: 1.08,
        text: 'You are Wren, the lighthouse keeper of Saltmere, a harbour town on a rocky coast. The lighthouse burns a magic fire called the Lantern Heart. While it burns, ships find their way past the rocks.' },
      { art: 'scenes/op_bell', pos: 'center', wide: 'center top', zoom: 1.08,
        text: 'In the sea-caves under the cliffs hangs an enchanted bell, the Bellwether. Keepers sank it there long ago to hold the sea back. Nobody has tended it for a hundred years.' },
      { art: 'scenes/op_fire', pos: '28% center', wide: '30% center', zoom: 1.08, sfx: 'bell',
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
      { id: 'home', title: 'The harbour bell', when: 'won:0', lock: "Break the Shallows' pin.", text: [
        'On the last landing of the Shallows waited a hermit crab as big as a rowing boat. It wore Saltmere\'s old harbour bell for a shell: the bell that rang the boats home in fog, until a winter storm tore it off the harbour wall. When the bell cracked, the crab let go of the water, and the water ran away down a stair that had been under the sea for a hundred years.',
        'The Lantern Heart was not there. The harbour bell only answers a bigger one. Far below, something was still ringing, and the glow of the fire went on down the stair toward it.',
        'You can go home from there with what you carry. But before the next tide the water comes back over the landings, something answers the bell again, and the next expedition starts from the shore.',
      ] },
      { id: 'sunk', title: 'Why the bell was sunk', when: 'won:1', lock: "Break Dark Water's pin.", text: [
        'The bell ringing in Dark Water was not the Bellwether either. It was Saltmere\'s old bell-buoy, lost in a storm before the lighthouse was built. It answers the great bell now, and it held the water over the last stair.',
        'The keepers made the Bellwether. A hand-bell like yours moves the water in a pool. They cast a bell big enough to move the sea, and sank it at the bottom of the cliffs to hold the water off their low stairs and their quay.',
        'A bell that size has to be tended. Keepers walked down to it at the lowest tides of the year. The last one to go was a lamplighter, a hundred years ago. He drowned on the low stair, and nobody went down after him.',
      ] },
      { id: 'belfry', title: 'The diving dress', when: 'won:1', lock: "Break Dark Water's pin.", text: [
        'Below Dark Water there is one more chamber, and its floor is under the sea. The keepers called it the Belfry. A lighthouse keeps its light at the top of a tower. The keepers hung their bell at the bottom of one.',
        'The Belfry is full of water and it does not drain, and an open lantern cannot go there. But on the wall above its stair hung an old keeper\'s diving dress, with a sealed lamp on its helmet. Its seams had rotted and its lamp was dry, so you carried it home and mended it.',
        'Pack the dress in your Rig place, and the last stair is open. It does nothing in a fight, and it takes the place of anything else you would wear.',
      ] },
      { id: 'heart', title: 'The Heart comes home', when: 'heart', lock: 'Bring the Heart home.', text: [
        'The Bellwether hung in the Belfry over the Lantern Heart, and it rang with no hand on its rope. When its bronze broke, the Heart\'s light poured out through the water, and something came out of the bell with it: a thing with one eye and many arms, which had grown into the bronze in the hundred years nobody came down.',
        'You do not know if you killed it. When it let go of the Heart, it sank away into the dark under the floor.',
        'You carried the Heart up three levels of stairs. By dawn the great light of Saltmere was turning again, and the water stopped rising.',
      ] },
      { id: 'followed', title: 'Why the fire followed', when: 'heart', lock: 'Bring the Heart home.', text: [
        'Every keeper\'s hand-bell is tuned to the Bellwether, and every keeper\'s lantern is lit from the Lantern Heart. The great bell leads and the small ones follow. That is what a bellwether is: the sheep that wears the bell, and the flock walks behind it.',
        'Nobody rang it that night. The tide swings its clapper, and its ringing holds the tide, so it cannot stop by itself. For a hundred years nobody went down to still it, and it rang a little louder every year. Something was living in it by then. Whether that made it louder, nobody knows.',
        'When it rang loud enough, the Lantern Heart did what a keeper\'s light does. It answered the lead bell and went down.',
      ] },
      { id: 'after', title: 'What stays below', when: 'heart', lock: 'Bring the Heart home.', text: [
        'The Bellwether is silent and the lighthouse is lit. The Reach has not gone back to what it was. Something still answers in the pins, the water still comes back over the landings, and in the Belfry a faint light stayed behind where the Heart lay.',
        'Things gather around it. The thing from the bell grows back in the broken bronze. Drowned keepers come to ring the bell they answered for a hundred years, and they do not know how to stop.',
        'Saltmere still needs a keeper who goes down. Quiet the Belfry, and bring home what you find. The sea is wide awake now, and it can choose its moods: once the Heart is home you can choose currents on shore, for a harder expedition and a higher score.',
      ] },
    ],
    world: [
      { group: 'Places', items: [
        ['Saltmere', 'A harbour town on a rocky headland. Its lighthouse warns ships off the rocks.'],
        ['The lighthouse', 'It stands above the town, and you keep it. Its lamp burns the Lantern Heart.'],
        ['The Drowned Reach', 'The sea-caves, stairs and rock terraces under the cliffs, below the lighthouse. The Bellwether keeps them flooded.'],
        ['Expeditions', 'Every expedition starts on the shore and goes down through the Reach a level at a time: the Shallows, then Dark Water, then the Belfry. You can go home after any pin, with everything you carry. The next expedition starts on the shore again.'],
        ['Dark Water', 'The level below the Shallows. Its water has been held still for a hundred years, so the brinelight in it has nowhere to go, and things there have learned to live on it.'],
        ['The Belfry', 'The last level, below Dark Water: a chamber at the bottom of a tower, under the sea. It never drains. The Bellwether hangs there over the Lantern Heart. You can only go down in a diving dress.'],
        ['Landings', 'The stops on the way down through a level. A boss waits on the last one: the Harbour Hermit in the Shallows, the Tolling Buoy in Dark Water, and the Bellwether in the Belfry.'],
        ['Pins', 'A pin is a boss that holds the water over the stair down to the next level. Break it, and the water runs away down the stair.'],
        ['Currents', 'Moods of the sea that make an expedition harder and its score higher. You choose them on shore, once the Heart has come home.'],
        ['The Lazaret', 'The locked store room at the lighthouse where keepers shut keepsakes away. It keeps their Roil inside, so many can lie there together. It opens the first time you come home.'],
      ] },
      { group: 'People', items: [
        ['Wren', 'You. The last lighthouse keeper of Saltmere.'],
        ['Keepers', 'The people who tend the light and the bell. A keeper carries a lantern lit from the Lantern Heart and a hand-bell tuned to the Bellwether.'],
        ['The oilskin', 'A keeper\'s coat, proofed with the oil that burns in the great lamp under the Heart\'s fire. Brine runs off it, and so does brinelight, so the Reach never soaks into a keeper the way it soaks into lost things. No keeper goes down without one. Everything else you wear goes over it, in your Rig place.'],
        ['Barnaby', 'A hermit crab who keeps a shop in his shell. He sells cards, keepsakes and tonics for pearls.'],
        ['The diving dress', 'An old keeper\'s diving suit with a sealed lamp on its helmet. You find it the first time you break Dark Water\'s pin and carry it home. Pack it in your Rig place to go down into the Belfry.'],
      ] },
      { group: 'Light and bell', items: [
        ['The Lantern Heart', 'The magic fire that burns in the lighthouse lamp. Every keeper\'s lantern is lit from it.'],
        ['Light', 'The fire in your lantern. You spend it to play cards, and it comes back at the start of each turn.'],
        ['The Bellwether', 'An enchanted bronze bell. Its ringing holds seawater in place. Keepers sank it under the cliffs long ago to hold the sea back, and now it rings by itself.'],
        ['Pins', 'Lesser bells that answer the Bellwether and do its work. A pin holds the water in its own part of the Reach, over the stair down. Silence it and the water runs out. The harbour bell in the Shallows and the Tolling Buoy in Dark Water are pins.'],
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
      { id: 'keepsake', title: 'How a keepsake is made', when: 'keepsake', lock: 'Carry a keepsake.', art: 'icons/k_whaletooth',
        text: 'A keepsake starts as something somebody lost: a fish hook, a gull\'s feather, a whale\'s tooth. It lies in brinelight for years, and when it is found it works a small magic of its own. Nobody knows why some lost things turn and others do not.' },
      { id: 'seep', title: 'A Roiled aether', when: 'roiled', lock: 'Carry more Roil than your Hold.', art: 'cards/c_seep',
        text: 'One keepsake stirs the aether a little. Many together stir it more than it can take. First seawater beads on your gear and soaks into your pack. Keepers call that Seep. Stir it further and the aether thrashes like a hooked fish. It has no aim. It strikes whoever stands nearest, again and again, and each blow takes a little of you unless you are still braced for it. That is Thrash. Further still, and the noise carries. The Bellwether listens for it, and sends a Bell Minnow to find what is calling. Drop a keepsake, or bring fewer from home.' },
      { id: 'lazaret', title: 'A night in the Lazaret', when: 'home', lock: 'Come home from an expedition.', art: 'scenes/lazaret',
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
      { id: 'bellwether', title: 'The Bellwether, up close', when: 'en:bell', lock: 'Found on the last landing of the Belfry.', art: 'units/bell',
        text: 'A hundred years under the sea have changed the bell. Coral and weed grow on its bronze, and something with one eye and many arms has grown into it. When the bronze cracks, a shoal of Bell Minnows comes to its call.' },
      // Dark Water
      { id: 'lighteaters', title: 'What eats the light', when: 'en:leech', lock: 'Found in Dark Water.', art: 'units/leech',
        text: 'Below the Shallows the water has been held still for a hundred years. The brinelight that soaks into it has no tide to carry it away, so it gathers, and things have learned to live on it. Leeches, pale stalks and long glowing chains all shine with what they have eaten. They all turn toward an open flame. A keeper\'s lantern is the brightest thing they have ever seen. When one drinks from it, you start your next turn with less Light: you are Doused.' },
      { id: 'hermit', title: 'Lamp Hermits', when: 'en:hermit', lock: 'Found in Dark Water.', art: 'units/hermit',
        text: 'Keepers carried lanterns down the stair, and not all of them came back up. The hermit crabs of Dark Water grew too big for whelk shells long ago. They live in the keepers\' lanterns now, and they keep their Ward from turn to turn the way the lanterns kept their glass. A Strand still strips it.' },
      { id: 'strider', title: 'The Garden Strider', when: 'en:strider', lock: 'Found at a Dread in Dark Water.', art: 'units/strider',
        text: 'A sea spider is mostly legs. Its body is too small to hold its own gut, so the gut runs down inside the legs. It lives by sucking the soft animals of the sea floor. The one in Dark Water is taller than a man. At night it walks the Glimmer Garden on its stilt legs and grazes the beads, and the light it drinks shows through its skin. It is what tends the garden: it sows Glimmer Leeches among the stalks, and it notices what is taken. The keepers who wrote about it called it the Gardener.' },
      { id: 'buoy', title: 'The Tolling Buoy', when: 'en:buoy', lock: 'Found on the last landing of Dark Water.', art: 'units/buoy',
        text: 'Before there was a lighthouse, Saltmere had a bell-buoy. It rocked on its chain off the harbour rocks and rang in the swell, so ships heard the rocks before they saw them. A storm broke its chain and it sank. Now it rings for the Bellwether. It is a pin: while it rings, it holds the water in Dark Water. It still rocks on the water. The further you push the Swell from the middle, the harder its Toll swings, and every Toll is louder than the last. Hurt, it snaps its chain and swings free, and then it rings wild. A breaking wave smothers a bell, and a bell on dry rock cannot swing.' },
      { id: 'tideboard', title: 'The tide-board', when: 'ev:tideboard', lock: 'Found in the Fog in Dark Water.', art: 'scenes/ev_tideboard',
        text: 'For as long as there have been keepers, they cut a line for the highest tide of the year. While they still tended the Bellwether, the lines go up and down. For the last hundred years, with nobody to tend it, every line is higher than the one before. The bell holds the sea off the town by holding it under the cliffs, and the water it holds grows every year.' },
      { id: 'garden', title: 'The Glimmer Garden', when: 'ev:garden', lock: 'Found in the Fog in Dark Water.', art: 'scenes/ev_garden',
        text: 'The stalks are not plants. They are animals rooted to the stone like barnacles, and each bead is a mouth full of brinelight. Picked, a bead hardens into a pearl. The garden grows around whatever glows brightest, and sometimes that is a keepsake. Something in the water tends it, and it notices what you take.' },
      { id: 'divingbell', title: 'The diving bell', when: 'ev:divingbell', lock: 'Found in the Fog in Dark Water.', art: 'scenes/ev_divingbell',
        text: 'Before the lamplighter, keepers went down to the Bellwether in a diving bell, with a pump on the stair above feeding them air. One of them stayed down. His tally runs to two hundred and twelve days. Nobody knows what kept him alive that long, or why he stopped counting.' },
      // the Shallows' pin
      { id: 'harbour', title: 'The Harbour Hermit', when: 'en:harbour', lock: 'Found on the last landing of the Shallows.', art: 'units/harbour',
        text: 'Saltmere\'s harbour bell hung on the harbour wall and rang the boats home in fog, until a winter storm tore it down. A hermit crab grew into it as it would into any shell, and kept growing. Now it answers the Bellwether, and it holds the water over the Shallows\' stair. It pulls into the bell and stays there, and its Ward stays with it. A Crest rings the bell around its ears, and a Strand leaves it stuck on the rock: either one shakes it out.' },
      // the Belfry
      { id: 'thing', title: 'The Thing in the Bell', when: 'en:bellthing', lock: 'Found in the Belfry.', art: 'units/bellthing',
        text: 'It has one eye and many arms, and it grew into the Bellwether\'s bronze the way a hermit crab grows into a shell. Nobody knows what it eats. It drinks from a keeper\'s light through its arms, so cut the arms and it drinks less. When its eye opens it can be hurt, and then it glares.' },
      { id: 'spawn', title: 'Bellspawn', when: 'en:spawn', lock: 'Found in the Belfry.', art: 'units/spawn',
        text: 'Small things with one eye and many arms. They are young, and you do not want to know what they grow into. They wrap around the dress and squeeze the air out of it, and a keeper who cannot breathe cannot think: you draw fewer cards.' },
      { id: 'belljelly', title: 'Bell Jellies', when: 'en:belljelly', lock: 'Found in the Belfry.', art: 'units/belljelly',
        text: 'Jellyfish shaped like little bells, with a glowing clapper inside. When one chimes, the Belfry rings with it, and whatever hears it does its next thing twice.' },
      { id: 'bladder', title: 'Glimmer Bladders', when: 'en:bladder', lock: 'Found in the Belfry.', art: 'units/bladder',
        text: 'Light-eaters that found the Heart. They have drunk so much of its light that they cannot hold it, and they burst when they die. Brace before you kill one, or kill it next to its friends.' },
      { id: 'ringer', title: 'The Drowned Ringers', when: 'en:ringer', lock: 'Found at a Dread in the Belfry.', art: 'units/ringer',
        text: 'Keepers who went down to tend the bell and stayed. They still carry their hand-bells, and they still ring them for the Bellwether. When a Ringer rings out, every creature that hears it does its next thing twice. One of them may be the keeper from the diving bell, who stopped counting at two hundred and twelve days.' },
      { id: 'oarfish', title: 'The Crowned Oarfish', when: 'en:oarfish', lock: 'Found at a Dread in the Belfry.', art: 'units/oarfish',
        text: 'Sailors called the oarfish the king of herrings, for the red crest it wears like a crown. This one came in from the open sea through the Belfry\'s broken arch. It coils around a diver and squeezes, and its crest is sharp.' },
      { id: 'lanterns', title: 'The Lost Lanterns', when: 'ev:lanterns', lock: 'Found in the Fog in the Belfry.', art: 'scenes/ev_lanterns',
        text: 'Every keeper who went down carried a lantern lit from the Heart. When a keeper drowned, the lantern rolled on down the stairs, toward the fire it was lit from, and it stopped where the Belfry floor stopped it. A wick lit from the Heart keeps a little of whoever carried it. Light one from yours, and for a moment you know what they knew.' },
      { id: 'heartglow', title: 'The glow under the bell', when: 'ev:heartglow', lock: 'Found in the Fog in the Belfry.', art: 'scenes/ev_heartglow',
        text: 'The Lantern Heart burns in water as well as in air. Under the bell it warmed the Belfry for a hundred years, and everything down there grew toward it, the way a plant grows toward a window. When the Heart goes home, a little of its light stays in the stone where it lay, and they still grow toward that.' },
      { id: 'rope', title: 'The bell-rope', when: 'ev:rope', lock: 'Found in the Fog in the Belfry.', art: 'scenes/ev_rope',
        text: 'The keepers rang the Bellwether by hand once, with a rope that ran up the tower to the stair. The top of it rotted away long ago. The rest hangs in the water, and the creatures of the Belfry climb it, nest in it, and hide what they find in its weed. Pull it, and the great bell gives one note, and everything near it hears.' },
      { id: 'choir', title: 'The Drowned Choir', when: 'en:cantor', lock: 'Found in the Belfry, after the Heart comes home.', art: 'units/cantor',
        text: 'With the Bellwether silent, the drowned keepers gather under it and try to ring it again. The Cantor leads them. Silence the Cantor and the others stop, and drift back into the dark.' },
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
    bothends: { name: 'Both Ends', desc: 'Crest and Strand in the same turn.', met: (r) => !!r.stats.bothEnds },
    closecall: { name: 'Close Call', desc: 'Win a fight with 5 HP or less left.', met: (r) => !!r.stats.closeCall },
    outofbell: { name: 'Out of Its Bell', desc: "Break the Harbour Hermit's bell, the Shallows' pin.", met: (r) => (r.cleared || []).indexOf(0) >= 0 },
    stillwater: { name: 'Still Water', desc: "Silence the Tolling Buoy, Dark Water's pin.", met: (r) => (r.cleared || []).indexOf(1) >= 0 },
    heartlight: { name: 'The Light Returns', desc: 'Bring the Lantern Heart home.', met: (r) => !!r.heart && r.screen === 'victory' },
  };
})();
