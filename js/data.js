/* Brinelight — game data: cards, enemies, encounters, keepsakes, tonics, events. */
(function () {
  'use strict';
  const BL = (globalThis.BL = globalThis.BL || {});

  /* ------------------------------------------------------------------ *
   *  CARDS
   *  text(v, k): v = numbers (base or upgraded), k = formatter
   *    k.d(n)   -> attack damage as shown in combat (Might / Chilled / Soaked applied)
   *    k.tide   -> current Tide in combat, or null outside combat
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
      return `Deal ${v.base} damage, +${v.per} for each Tide.${now}`;
    },
    play: (A, v, t) => A.hit(t, v.base + v.per * A.tide()),
  });
  card('deepguard', {
    name: 'Deep Guard', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    v: { ward: 6, bonus: 5 }, up: { ward: 8, bonus: 7 }, art: 'c_deepguard',
    text: (v) => `Gain ${v.ward} Ward. If Tide is 2 or lower, gain ${v.bonus} more.`,
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
    text: (v) => `If Tide is 3 or higher, Surge ${v.shift}. Otherwise, Ebb ${v.shift}. Draw ${v.draw} card.`,
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
    text: (v) => `Whenever you reach Low Water, deal ${v.n} damage to ALL enemies.`,
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
    text: (v) => `At the end of your turn, deal ${v.per} damage for each Tide to a random enemy.`,
    play: (A, v) => A.rite('r_beam', v.per),
  });
  card('tsunami', {
    name: 'Tsunami', type: 'attack', rarity: 'rare', cost: 2, target: 'all',
    v: { per: 3 }, up: { per: 4 }, art: 'c_tsunami',
    text: (v, k) => {
      const now = k.tide == null ? '' : ` <span class="calc">(${v.per * k.tide} each)</span>`;
      return `Deal ${v.per} damage to ALL enemies for each Tide, then drain to Low Water.${now}`;
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
    text: () => `Reach Low Water, then Crest. Sink.`,
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
    text: () => `Unplayable. A curse that clings to your deck.`,
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
    Surge: 'Raise the Tide. At 6 you Crest; any extra keeps rising from 3, so a big Surge can Crest twice.',
    Ebb: 'Lower the Tide. At 0 you reach Low Water; any extra keeps falling from 3.',
    Tide: 'The sea level, from 0 to 6. It starts each fight at 3.',
    Crest: 'The wave breaks: deal 6 damage to ALL enemies, +3 for every earlier Crest this turn. Then the Tide resets to 3.',
    'Low Water': 'The sea pulls back: enemies lose all their Ward, and you gain 1 Light. Then the Tide resets to 3.',
    Sink: 'After you play it, this card is gone for the rest of the fight.',
    Float: 'Stays in your hand at the end of your turn.',
    Rite: 'Rites stay in effect for the rest of the fight once played.',
    Echo: 'Your next card is played twice.',
    Might: 'Each hit of an attack deals that much more damage.',
    Spines: 'Whenever you are attacked, deal that much damage back.',
    Soaked: 'Takes 50% more damage from attacks and Crests. Wears off by 1 each turn.',
    Chilled: 'Deals 25% less attack damage. Wears off by 1 each turn.',
    Brine: 'Loses that much HP at the start of its turn, then Brine drops by 1.',
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
    r_abyss: { name: 'Abyssal Pull', kind: 'rite', icon: 'anchor', desc: (n) => `Whenever you reach Low Water, deal ${n} damage to ALL enemies.` },
    r_beam: { name: 'Lighthouse Beam', kind: 'rite', icon: 'beam', desc: (n) => `At the end of your turn, deal ${n} damage per Tide to a random enemy.` },
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
  BL.KEEPSAKES = {
    tidebell: { name: 'Brass Tide-Bell', art: 'k_tidebell', starter: true, desc: 'Whenever you Crest or reach Low Water, draw 1 card.' },
    whaletooth: { name: 'Whale Tooth', art: 'k_whaletooth', desc: 'Start each fight with 1 Might.' },
    barnacleplate: { name: 'Barnacle Plate', art: 'k_barnacleplate', desc: 'Start each fight with 3 Spines.' },
    pearlearring: { name: 'Pearl Earring', art: 'k_pearlearring', desc: 'Gain 10 extra Pearls after each fight.' },
    tidewatch: { name: 'Tidewatch', art: 'k_tidewatch', desc: 'Your Crests deal 4 more damage.' },
    moonshard: { name: 'Moon Shard', art: 'k_moonshard', desc: 'Start each fight at Tide 5.' },
    kelpbracelet: { name: 'Kelp Bracelet', art: 'k_kelpbracelet', desc: 'Whenever you reach Low Water, gain 8 Ward.' },
    gullfeather: { name: 'Gull Feather', art: 'k_gullfeather', desc: 'Draw 2 extra cards on your first turn of each fight.' },
    biscuit: { name: 'Scallop Charm', art: 'k_biscuit', desc: 'When picked up, raise your Max HP by 10 and heal 10.' },
    stormbottle: { name: 'Storm Bottle', art: 'k_stormbottle', desc: 'Every 3rd turn of a fight, gain 1 extra Light.' },
    sirenscale: { name: 'Whispering Conch', art: 'k_sirenscale', desc: 'Enemies start each fight with 2 Soaked.' },
    coralcrown: { name: 'Coral Branch', art: 'k_coralcrown', desc: 'Whenever you play a Rite, gain 5 Ward.' },
    doubloon: { name: "Merchant's Astrolabe", art: 'k_doubloon', desc: "Barnaby's prices are 25% lower." },
    inksac: { name: "Angler's Lure", art: 'k_inksac', desc: 'The first time you lose HP in a fight, apply 2 Chilled to ALL enemies.' },
    saltedhook: { name: 'Salted Hook', art: 'k_saltedhook', desc: 'Whenever you apply Brine, apply 1 more.' },
    echoconch: { name: 'Conch of Echoes', art: 'k_echoconch', desc: 'The first card you play in each fight is played twice.' },
    anchor: { name: 'Drowned Anchor', art: 'k_anchor', desc: 'Low Water also deals 4 damage to ALL enemies.' },
    pearlstrand: { name: 'Pearl Strand', art: 'k_pearlstrand', desc: 'Gain 3 Pearls whenever you Crest.' },
    sparewick: { name: 'Spare Lantern', art: 'k_sparewick', desc: 'Resting heals 10 more HP.' },
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
        { label: 'Leave', desc: 'Swim on.', act: () => ({ text: 'You leave the goddess to her waiting.' }) },
      ],
    },
    {
      id: 'wreck', title: 'Wreck of the Gilded Gull', art: 'ev_wreck',
      text: "A merchant ship lies split on the seabed. The captain's cabin is sealed and something glints inside; the cargo hold gapes open.",
      options: [
        { label: "Pry open the captain's cabin", desc: 'Gain a random keepsake. Gain the curse Barnacle Growth.',
          act: (r, E) => { const k = E.gainRandomKeepsake(r); E.addCard(r, 'barnacles'); return { text: k ? `You find the ${BL.KEEPSAKES[k].name}, but barnacles creep onto your hands as you leave.` : 'The cabin is empty, and barnacles creep onto your hands.' }; } },
        { label: 'Salvage the cargo', desc: 'Gain 45 Pearls.', act: (r) => { r.pearls += 45; return { text: 'Water-swollen crates, but a pouch of pearls is still dry inside one of them.' }; } },
        { label: 'Dive into the flooded hold', desc: 'A gamble. Half the time: 90 Pearls. Otherwise something in the dark bites for 12 HP.',
          act: (r, E) => {
            if (E.makeR(r).chance(0.5)) { r.pearls += 90; return { text: 'Your lantern finds a strongbox wedged under the stairs. It is heavy with pearls. (+90 Pearls)' }; }
            E.loseHp(r, 12); return { text: 'Something long and cold uncoils in the dark and bites before you can kick away. (-12 HP)' };
          } },
        { label: 'Leave', desc: 'Let the dead keep their things.', act: () => ({ text: 'You swim past the wreck.' }) },
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
        { label: 'Decline', desc: 'Leave politely.', act: () => ({ text: '"Another time," she cackles.' }) },
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
      text: 'A drowned lamplighter waits on a submerged stair, holding a lantern that has not burned in a hundred years.',
      options: [
        { label: 'Share your light', desc: 'Lose 6 HP. Choose 1 of 3 uncommon cards.',
          act: (r, E) => { E.loseHp(r, 6); return { text: 'His lantern flickers to life. In gratitude he shows you an old trick.', next: { cards: E.randomCards(r, 'uncommon', 3) } }; } },
        { label: 'Ask for guidance', desc: 'Remove a card from your deck.', act: () => ({ text: '"Carry less," he says. "The deep is kind to the light."', next: { pick: 'remove' } }) },
        { label: 'Leave', desc: 'Leave him be.', act: () => ({ text: 'He bows as you pass.' }) },
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
})();
