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
   *  up preserves the original + refit. refit holds the alternate's name and overrides to the base card.
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
    v: { dmg: 6 }, up: { dmg: 9 }, refit: { name: 'Guarded Jab', ward: 3 }, art: 'c_jab',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage.${v.ward ? ` Gain ${v.ward} Ward.` : ''}`,
    play: (A, v, t) => { A.hit(t, v.dmg); if (v.ward) A.ward(v.ward); },
  });
  card('brace', {
    name: 'Brace', type: 'skill', rarity: 'starter', cost: 1, target: 'none',
    v: { ward: 5 }, up: { ward: 8 }, refit: { name: 'Ready Brace', draw: 1 }, art: 'c_brace',
    text: (v) => `Gain ${v.ward} Ward.${v.draw ? ' Draw a card.' : ''}`,
    play: (A, v) => { A.ward(v.ward); if (v.draw) A.draw(v.draw); },
  });
  card('swell', {
    name: 'Rising Swell', type: 'attack', rarity: 'starter', cost: 1, target: 'enemy',
    v: { dmg: 5, surge: 2 }, up: { dmg: 8 }, refit: { name: 'High Swell', surge: 3 }, art: 'c_swell',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Surge ${v.surge}.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.surge(v.surge); },
  });
  card('slack', {
    name: 'Slack Water', type: 'skill', rarity: 'starter', cost: 1, target: 'none',
    v: { ward: 4, ebb: 2 }, up: { ward: 7 }, refit: { name: 'Deep Ebb', ebb: 3 }, art: 'c_slack',
    text: (v) => `Gain ${v.ward} Ward. Ebb ${v.ebb}.`,
    play: (A, v) => { A.ward(v.ward); A.ebb(v.ebb); },
  });

  // ---------- Common ----------
  card('breaker', {
    name: 'Breaker', type: 'attack', rarity: 'common', cost: 2, target: 'enemy',
    v: { dmg: 12, surge: 1 }, up: { dmg: 16 }, refit: { name: 'Rising Breaker', surge: 2 }, art: 'c_breaker',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Surge ${v.surge}.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.surge(v.surge); },
  });
  card('spraylash', {
    name: 'Spray Lash', type: 'attack', rarity: 'common', cost: 1, target: 'all',
    v: { dmg: 4, surge: 1 }, up: { dmg: 6 }, refit: { name: 'Rising Spray', surge: 2 }, art: 'c_spraylash',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage to ALL enemies. Surge ${v.surge}.`,
    play: (A, v) => { A.hitAll(v.dmg); A.surge(v.surge); },
  });
  card('gaff', {
    name: 'Gaff Hook', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    v: { dmg: 5, soak: 1, surge: 1 }, up: { dmg: 7, soak: 2 }, refit: { name: 'Rising Gaff', surge: 2 }, art: 'c_gaff',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Apply ${v.soak} Soaked. Surge ${v.surge}.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.apply(t, 'soaked', v.soak); A.surge(v.surge); },
  });
  card('riptide', {
    name: 'Riptide Cut', type: 'attack', rarity: 'common', cost: 0, target: 'enemy',
    v: { dmg: 3, ebb: 2 }, up: { dmg: 5 }, refit: { name: 'Riptide Slip', ward: 3 }, art: 'c_riptide',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Ebb ${v.ebb}. Draw 1 card.${v.ward ? ` Gain ${v.ward} Ward.` : ''}`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.ebb(v.ebb); A.draw(1); if (v.ward) A.ward(v.ward); },
  });
  card('pearldiver', {
    name: 'Pearl Diver', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    v: { dmg: 8, pearls: 10 }, up: { dmg: 11, pearls: 15 }, refit: { name: 'Pearl Hunter', pearls: 22 }, art: 'c_pearldiver',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. If this kills, gain ${v.pearls} Pearls.`,
    play: (A, v, t) => { A.hit(t, v.dmg); if (t && t.dead) A.pearls(v.pearls); },
  });
  card('shellup', {
    name: 'Shell Up', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    v: { ward: 7, surge: 1 }, up: { ward: 10 }, refit: { name: 'Rising Shell', surge: 2 }, art: 'c_shellup',
    text: (v) => `Gain ${v.ward} Ward. Surge ${v.surge}.`,
    play: (A, v) => { A.ward(v.ward); A.surge(v.surge); },
  });
  card('kelpsnare', {
    name: 'Kelp Snare', type: 'skill', rarity: 'common', cost: 1, target: 'enemy',
    v: { ward: 5, chill: 1 }, up: { ward: 7, chill: 2 }, refit: { name: 'Kelp Loop', ward: 9 }, art: 'c_kelpsnare',
    text: (v) => `Gain ${v.ward} Ward. Apply ${v.chill} Chilled.`,
    play: (A, v, t) => { A.ward(v.ward); A.apply(t, 'chilled', v.chill); },
  });
  card('tidereading', {
    name: 'Tide Reading', type: 'skill', rarity: 'common', cost: 0, target: 'none',
    v: { draw: 1, surge: 1 }, up: { draw: 2 }, refit: { name: 'Read the Flood', surge: 2 }, art: 'c_tidereading',
    text: (v) => `Draw ${v.draw} card${v.draw > 1 ? 's' : ''}. Surge ${v.surge}.`,
    play: (A, v) => { A.draw(v.draw); A.surge(v.surge); },
  });
  card('saltspray', {
    name: 'Saltspray', type: 'skill', rarity: 'common', cost: 1, target: 'enemy',
    v: { brine: 5, ebb: 2 }, up: { brine: 7 }, refit: { name: 'Salt Ebb', ebb: 3 }, art: 'c_saltspray',
    text: (v) => `Apply ${v.brine} Brine. Ebb ${v.ebb}.`,
    play: (A, v, t) => { A.apply(t, 'brine', v.brine); A.ebb(v.ebb); },
  });
  card('undercurrent', {
    name: 'Undercurrent', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    v: { base: 3, per: 2 }, up: { base: 4, per: 3 }, refit: { name: 'Crosscurrent', base: 10, per: 1 }, art: 'c_undercurrent',
    text: (v, k) => {
      const now = k.tide == null ? '' : ` <span class="calc">(${k.d(v.base + v.per * k.tide)})</span>`;
      return `Deal ${v.base} damage, +${v.per} for each Swell.${now}`;
    },
    play: (A, v, t) => A.hit(t, v.base + v.per * A.tide()),
  });
  card('deepguard', {
    name: 'Deep Guard', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    v: { ward: 6, bonus: 5 }, up: { ward: 8, bonus: 7 }, refit: { name: 'Steady Guard', ward: 10, bonus: 3 }, art: 'c_deepguard',
    text: (v) => `Gain ${v.ward} Ward. If the Swell is 2 or lower, gain ${v.bonus} more.`,
    play: (A, v) => A.ward(v.ward + (A.tide() <= 2 ? v.bonus : 0)),
  });
  card('oarflurry', {
    name: 'Oar Flurry', type: 'attack', rarity: 'common', cost: 1, target: 'enemy',
    v: { dmg: 3, hits: 3 }, up: { dmg: 4 }, refit: { name: 'Quick Oars', hits: 4 }, art: 'c_oarflurry',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage ${v.hits} times.`,
    play: (A, v, t) => A.hit(t, v.dmg, v.hits),
  });
  card('bilgepump', {
    name: 'Bilge Pump', type: 'skill', rarity: 'common', cost: 1, target: 'none',
    v: { ebb: 2, draw: 2 }, up: { draw: 3 }, refit: { name: 'Deep Pump', ebb: 3 }, art: 'c_bilgepump',
    text: (v) => `Ebb ${v.ebb}. Draw ${v.draw} cards.`,
    play: (A, v) => { A.ebb(v.ebb); A.draw(v.draw); },
  });

  // ---------- Uncommon ----------
  card('roguewave', {
    name: 'Rogue Wave', type: 'attack', rarity: 'uncommon', cost: 2, target: 'all',
    v: { dmg: 9, surge: 2 }, up: { dmg: 12 }, refit: { name: 'Rogue Crest', surge: 3 }, art: 'c_roguewave',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage to ALL enemies. Surge ${v.surge}.`,
    play: (A, v) => { A.hitAll(v.dmg); A.surge(v.surge); },
  });
  card('ebbflow', {
    name: 'Ebb and Flow', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none',
    v: { shift: 2, draw: 1 }, up: { shift: 3 }, refit: { name: 'Reading Tides', draw: 2 }, art: 'c_ebbflow',
    text: (v) => `If the Swell is 3 or higher, Surge ${v.shift}. Otherwise, Ebb ${v.shift}. Draw ${v.draw} card${v.draw > 1 ? 's' : ''}.`,
    play: (A, v) => { if (A.tide() >= 3) A.surge(v.shift); else A.ebb(v.shift); A.draw(v.draw); },
  });
  card('moonpull', {
    name: 'Moon Pull', type: 'rite', rarity: 'uncommon', cost: 1, target: 'none',
    v: { n: 1 }, up: { cost: 0 }, refit: { name: 'Rising Moon', surge: 2 }, art: 'c_moonpull',
    text: (v) => `${v.surge ? `Surge ${v.surge}. ` : ''}At the start of each of your turns, Surge 1.`,
    play: (A, v) => { if (v.surge) A.surge(v.surge); A.rite('r_moonpull', v.n); },
  });
  card('seawall', {
    name: 'Sea Wall', type: 'skill', rarity: 'uncommon', cost: 2, target: 'none',
    v: { ward: 15, ebb: 2 }, up: { ward: 20 }, refit: { name: 'Low Sea Wall', ebb: 3 }, art: 'c_seawall',
    text: (v) => `Gain ${v.ward} Ward. Ebb ${v.ebb}.`,
    play: (A, v) => { A.ward(v.ward); A.ebb(v.ebb); },
  });
  card('brinespear', {
    name: 'Brine Spear', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    v: { dmg: 6, brine: 3 }, up: { dmg: 7, brine: 4 }, refit: { name: 'Piercing Brine', dmg: 10 }, art: 'c_brinespear',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Apply ${v.brine} Brine.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.apply(t, 'brine', v.brine); },
  });
  card('tidalmemory', {
    name: 'Tidal Memory', type: 'rite', rarity: 'uncommon', cost: 2, target: 'none',
    v: { n: 1 }, up: { cost: 1 }, refit: { name: 'Tidal Shelter', ward: 7 }, art: 'c_tidalmemory',
    text: (v) => `${v.ward ? `Gain ${v.ward} Ward. ` : ''}Whenever you Crest, gain 1 Light.`,
    play: (A, v) => { if (v.ward) A.ward(v.ward); A.rite('r_tidalmemory', v.n); },
  });
  card('volley', {
    name: 'Harpoon Volley', type: 'attack', rarity: 'uncommon', cost: 1, target: 'random',
    v: { dmg: 3, hits: 4 }, up: { hits: 5 }, refit: { name: 'Heavy Volley', dmg: 6, hits: 3 }, art: 'c_volley',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage to a random enemy ${v.hits} times.`,
    play: (A, v) => A.hitRandom(v.dmg, v.hits),
  });
  card('spindrift', {
    name: 'Spindrift', type: 'rite', rarity: 'uncommon', cost: 1, target: 'none',
    v: { n: 3 }, up: { n: 5 }, refit: { name: 'Light Spindrift', cost: 0 }, art: 'c_spindrift',
    text: (v) => `Each time you Surge (by any amount), deal ${v.n} damage to a random enemy.`,
    play: (A, v) => A.rite('r_spindrift', v.n),
  });
  card('sirensecho', {
    name: "Siren's Echo", type: 'skill', rarity: 'uncommon', cost: 1, target: 'none', givesEcho: true,
    // upgraded: draw a card first (cost 0 until v0.39.0: a 0-cost doubler was in all three winning decks of the playtests)
    v: { draw: 0 }, up: { draw: 1 }, refit: { name: 'Sheltered Echo', ward: 6 }, art: 'c_sirensecho',
    text: (v) => `${v.draw ? 'Draw 1 card. ' : ''}${v.ward ? `Gain ${v.ward} Ward. ` : ''}Your next card is played twice.`,
    play: (A, v) => { if (v.draw) A.draw(v.draw); if (v.ward) A.ward(v.ward); A.echo(1); },
  });
  // Sink since v0.40.0: played again and again, the doubling grew without end (the user, of two Blooms with a Salted Hook)
  card('brinebloom', {
    name: 'Brine Bloom', type: 'skill', rarity: 'uncommon', cost: 1, target: 'enemy', sink: true,
    v: { add: 0 }, up: { add: 3 }, refit: { name: 'Brine Bulwark', ward: 7 }, art: 'c_brinebloom',
    text: (v) => `${v.ward ? `Gain ${v.ward} Ward. ` : ''}${v.add ? `Apply ${v.add} Brine, then double` : 'Double'} the target's Brine. Sink.`,
    play: (A, v, t) => { if (v.ward) A.ward(v.ward); if (v.add) A.apply(t, 'brine', v.add); if (t && t.st.brine) A.apply(t, 'brine', t.st.brine); },
  });
  card('abyssalpull', {
    name: 'Abyssal Pull', type: 'rite', rarity: 'uncommon', cost: 1, target: 'none',
    v: { n: 5 }, up: { n: 8 }, refit: { name: 'Deep Pull', ebb: 2 }, art: 'c_abyssalpull',
    // copies don't add up since v0.40.0 (the user: "Multiple Abyssal pull ... combo maybe too powerful"): the strongest
    // played counts, so an upgraded one still raises a plain one to 8. Before, two Pull+ dealt 16 on every Strand.
    text: (v) => `Whenever you Strand, deal ${v.n} damage to ALL enemies. More copies don't add to it.${v.ebb ? ` Ebb ${v.ebb} now.` : ''}`,
    play: (A, v) => { A.riteMax('r_abyss', v.n); if (v.ebb) A.ebb(v.ebb); },
  });
  card('depthcharge', {
    name: 'Depth Charge', type: 'attack', rarity: 'uncommon', cost: 2, target: 'enemy',
    v: { dmg: 18, ebb: 3 }, up: { dmg: 24 }, refit: { name: 'Deep Charge', dmg: 19, ebb: 4 }, art: 'c_depthcharge',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Ebb ${v.ebb}.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.ebb(v.ebb); },
  });
  card('stormglass', {
    name: 'Storm Glass', type: 'skill', rarity: 'uncommon', cost: 0, target: 'none', sink: true,
    v: { light: 2, surge: 2 }, up: { light: 3 }, refit: { name: 'Flood Glass', surge: 3 }, art: 'c_stormglass',
    text: (v) => `Gain ${v.light} Light. Surge ${v.surge}. Sink.`,
    play: (A, v) => { A.light(v.light); A.surge(v.surge); },
  });
  card('saltward', {
    name: 'Salt Ward', type: 'skill', rarity: 'uncommon', cost: 1, target: 'none',
    v: { ward: 6, brine: 2 }, up: { ward: 8, brine: 3 }, refit: { name: 'Salt Shield', ward: 11 }, art: 'c_saltward',
    text: (v) => `Gain ${v.ward} Ward. Apply ${v.brine} Brine to ALL enemies.`,
    play: (A, v) => { A.ward(v.ward); A.applyAll('brine', v.brine); },
  });
  card('breakwater', {
    name: 'Breakwater', type: 'attack', rarity: 'uncommon', cost: 1, target: 'enemy',
    v: {}, up: { cost: 0 }, refit: { name: 'Braced Breakwater', ward: 4 }, art: 'c_breakwater',
    text: (v, k) => `${v.ward ? `Gain ${v.ward} Ward. ` : ''}Deal damage equal to your Ward.${k.ward == null ? '' : ` <span class="calc">(${k.d(k.ward + (v.ward || 0))})</span>`}`,
    play: (A, v, t) => { if (v.ward) A.ward(v.ward); A.hit(t, A.wardNow()); },
  });
  card('driftwood', {
    name: 'Driftwood', type: 'skill', rarity: 'common', cost: 1, target: 'none', float: true,
    v: { ward: 9 }, up: { ward: 12 }, refit: { name: 'Drifting Shield', ebb: 1 }, art: 'c_driftwood',
    text: (v) => `Float. Gain ${v.ward} Ward.${v.ebb ? ` Ebb ${v.ebb}.` : ''}`,
    play: (A, v) => { A.ward(v.ward); if (v.ebb) A.ebb(v.ebb); },
  });
  card('whirlpool', {
    name: 'Whirlpool', type: 'skill', rarity: 'uncommon', cost: 1, target: 'all', sink: true,
    v: { soak: 2, chill: 1, ebb: 2 }, up: { soak: 3, chill: 2 }, refit: { name: 'Deep Whirlpool', ebb: 4 }, art: 'c_whirlpool',
    text: (v) => `Apply ${v.soak} Soaked and ${v.chill} Chilled to ALL enemies. Ebb ${v.ebb}. Sink.`,
    play: (A, v) => { A.applyAll('soaked', v.soak); A.applyAll('chilled', v.chill); A.ebb(v.ebb); },
  });

  // ---------- Rare ----------
  card('leviathan', {
    name: "Leviathan's Call", type: 'attack', rarity: 'rare', cost: 3, target: 'enemy',
    v: { dmg: 28, surge: 3 }, up: { dmg: 36 }, refit: { name: "Leviathan's Wake", surge: 5 }, art: 'c_leviathan',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Surge ${v.surge}.`,
    play: (A, v, t) => { A.hit(t, v.dmg); A.surge(v.surge); },
  });
  card('maelstrom', {
    name: 'Maelstrom', type: 'rite', rarity: 'rare', cost: 2, target: 'none',
    v: { n: 1 }, up: { cost: 1 }, refit: { name: "Maelstrom's Eye", surge: 2 }, art: 'c_maelstrom',
    text: (v) => `Your Crests deal double damage (not the extra a chained Crest adds).${v.surge ? ` Surge ${v.surge} now.` : ''}`,
    play: (A, v) => { A.rite('r_maelstrom', v.n); if (v.surge) A.surge(v.surge); },
  });
  card('beam', {
    name: 'Lighthouse Beam', type: 'rite', rarity: 'rare', cost: 2, target: 'none',
    v: { per: 2 }, up: { per: 3 }, refit: { name: 'Quick Beam', cost: 1 }, art: 'c_beam',
    text: (v) => `At the end of your turn, deal ${v.per} damage for each Swell to a random enemy.`,
    play: (A, v) => A.rite('r_beam', v.per),
  });
  card('tsunami', {
    name: 'Tsunami', type: 'attack', rarity: 'rare', cost: 2, target: 'all',
    v: { per: 3 }, up: { per: 4 }, refit: { name: 'Raking Tsunami', strandFirst: true }, art: 'c_tsunami',
    text: (v, k) => {
      const now = k.tide == null ? '' : ` <span class="calc">(${v.per * k.tide} each)</span>`;
      return v.strandFirst ? `Strand, then deal ${v.per} damage to ALL enemies for each Swell you had.${now}` : `Deal ${v.per} damage to ALL enemies for each Swell, then Strand.${now}`;
    },
    play: (A, v) => {
      const damage = v.per * A.tide();
      if (v.strandFirst) A.drain();
      A.wave(damage);
      if (!v.strandFirst) A.drain();
    },
  });
  card('galeheart', {
    name: 'Gale Heart', type: 'rite', rarity: 'rare', cost: 1, target: 'none',
    v: { might: 2 }, up: { might: 3 }, refit: { name: 'Tailwind Heart', cost: 0 }, art: 'c_galeheart',
    text: (v) => `Gain ${v.might} Might.`,
    play: (A, v) => A.buff('might', v.might),
  });
  card('toppledtower', {
    name: 'Toppled Tower', type: 'attack', rarity: 'rare', cost: 3, target: 'enemy', costDown: 'crests',
    v: { dmg: 18 }, up: { dmg: 25 }, refit: { name: 'Falling Tower', cost: 2 }, art: 'c_toppledtower',
    text: (v, k) => `Deal ${k.d(v.dmg)} damage. Costs 1 less for each Crest you made this turn.`,
    play: (A, v, t) => A.hit(t, v.dmg),
  });
  card('stormsurge', {
    name: 'Storm Surge', type: 'skill', rarity: 'rare', cost: 1, target: 'none', sink: true,
    v: { surge: 6 }, up: { cost: 0 }, refit: { name: 'Storm Break', surge: 7 }, art: 'c_stormsurge',
    text: (v) => `Surge ${v.surge}. Sink.`,
    play: (A, v) => A.surge(v.surge),
  });
  card('springtide', {
    name: 'Spring Tide', type: 'skill', rarity: 'rare', cost: 1, target: 'none', sink: true,
    v: {}, up: { cost: 0 }, refit: { name: 'Spring Flood', surge: 2 }, art: 'c_springtide',
    text: (v) => `Strand, then Crest.${v.surge ? ` Surge ${v.surge}.` : ''} Sink.`,
    play: (A, v) => { A.lowWater(); A.crest(); if (v.surge) A.surge(v.surge); },
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
  /* Hester never went down the stair, and nobody has for a hundred years: what she knows of the Reach is in the keepers'
     book. The buoy sank before the lighthouse was built, so she never heard it (until v0.62.0 her lines said she had,
     and that she polished its plate). The log is the keepers' stair log: its last line is the lamplighter's. */
  BL.HESTER_JOBS = [
    { id: 'log', name: 'Keeper’s log', marker: 'Log', pay: 8, stop: 'event',
      brief: 'The keepers’ book says a stair log was kept behind a loose stone on the first stair: a line when a keeper went down, a line when they came up. Hester marks the place. Search the marked Fog landing in the Shallows.',
      found: 'Behind a loose stone you find an oilskin wrap tied with cord. The log inside is still dry.',
      home: 'Hester knows the last hand in it from the keepers’ book: the lamplighter’s, a hundred years old. “Lamp lit last night. Gone down to see to the bell.” There is no line under it. She sets the log beside the harbour record.' },
    { id: 'plate', name: 'Buoy’s nameplate', marker: 'Nameplate', pay: 12, stop: 'event',
      brief: 'The keepers’ book says the old bell-buoy wore the town’s name on a brass plate. Look for it at the marked Fog landing in Dark Water.',
      found: 'You work the plate loose from a tangle of broken chain. Under the salt you can still read the letters that spelled Saltmere.',
      home: 'Hester rubs the last of the salt out of the letters. The plate goes into the harbour record, beside the night of the storm that sank the buoy.' },
    { id: 'tag', name: 'Lamplighter’s tag', marker: 'Tag', pay: 16, stop: 'pocket',
      brief: 'A keeper going down to the great bell hung a brass tag with their name on a hook in the first lesser bell, and took it off again on the way up. The lamplighter never came back up past it, so his should still hang there. Hester asks you to search under the first lesser bell in the Belfry.',
      found: 'Your glove catches a small brass tag on a hook inside the bell. There is a name under the green tarnish.',
      home: 'Hester reads the name out loud and writes it in the harbour record. After a hundred years the record has a name for the lamplighter.' },
  ];
  BL.CASK_NOTE = 'If you reach the boat in the fog, knock three times on the gunwale. If the line pulls you over, cut it. One of us has to get home.';
  /* Who goes down. A keeper's pictures (img/units) are their own, and kit never changes them (v0.61.0):
       looks.shore  on land, when the keeper has no outfit (BL.OUTFITS) or before one is chosen
       looks.fight  optional: a fighting stance on land, instead of the shore picture
       looks.dive   under the sea (the Belfry), in the keeper's diving dress, whatever the outfit and the kit
     `weapon` is what the keeper carries: its name, the name of their starter attack (`strike`, the 'jab' card; `refit`
     and `art` when that card has its own refit name and picture for them) and the glyph of the empty Weapon slot
     (ICON[icon] in ui.js). Kit text says {weapon} and {strike} (E.kitText), so one piece of kit reads right for all.
     `points` moves the kit screen's slot lines for this keeper's shore picture (see BL.KIT_PLACES).
     A new keeper needs these, a shore picture and a dive picture. E.keeperArt chooses the picture. */
  BL.KEEPERS = {
    wren: { name: 'Wren', title: 'Wren, the Keeper', looks: { shore: 'keeper', dive: 'keeper_suit' },
      // 'First Ring' until v0.65.0 (the user asked for "a catchier name"); the code and saves still say firstRing
      weapon: { name: 'Harpoon', strike: 'Harpoon Jab', icon: 'slot_harpoon' }, final: 'darkwatch', skill: 'Opening Bell',
      desc: 'Your first Bail or Stir each fight costs 0 Light.' },
    mateo: { name: 'Mateo', title: 'Mateo, the Cooper', looks: { shore: 'mateo', fight: 'mateo_guard', dive: 'mateo_suit' },
      weapon: { name: 'Mallet', strike: 'Mallet Strike', refit: 'Guarded Strike', art: 'c_mallet', icon: 'slot_mallet' },
      points: { harpoon: [0.19, 0.51], ditty: [0.35, 0.51], coat: [0.64, 0.28], bell: [0.52, 0.48], pocket: [0.64, 0.57] },
      dread: 'splitcask', level: 1, final: 'lasthoop', skill: 'Shield Bash',
      desc: 'Spend 4 Ward to deal 6 damage. Bash costs 0 Light and uses one of your Bail or Stir actions. Once per turn.',
      // how the skill grows on an expedition (BL.HOOPS, v0.65.0): shown in Pack, in his first briefing and in How to Play
      grow: 'On each stair down from a broken pin you find two cask hoops and fit one to your lid. A hoop changes Bash for the rest of the expedition.',
      quiet: 'The last hoop drops. You lift the lid and wait. Only water comes out. You take the loose end of the line home to tell Hester who held the other end.' },
  };
  /* Mateo's hoops (v0.65.0): each one changes his Shield Bash for the rest of the expedition. On the stair down from a
     broken pin he finds two and fits one (E.hoopOffer, E.fitHoop), so an expedition has at most one for each level
     below the Shallows, and no hoop twice. The names are a cooper's: the chime hoop sits at a cask's rim, the bilge
     hoop round its belly, a truss hoop is the stout wooden one that holds the staves while the cask is raised, and a
     withy hoop is twisted hazel. `art` is its icon (img/icons). The rules are E.bashInfo and E.bash in js/engine.js.
       dmg    more damage
       per    1 more damage for every `per` Ward left after paying
       off    Ward off the cost on a turn with a Crest or Strand
       brine  Brine on the enemy it hits */
  BL.HOOPS = {
    /* v0.66.0, the user: "the hoop effects, especially when combined are a bit too strong". Until then the Iron Hoop
       added 4, the Truss Hoop 1 for every 2 Ward, and the Herring Hoop applied 3 Brine. */
    iron: { name: 'Iron Hoop', art: 'h_iron', dmg: 3, desc: 'Bash deals 3 more damage.' },
    truss: { name: 'Truss Hoop', art: 'h_truss', per: 3, desc: 'Bash deals 1 more damage for every 3 Ward you have left after paying for it.' },
    // `off` is the Ward it takes off the cost: 4 is all of it
    chime: { name: 'Chime Hoop', art: 'h_chime', off: 4, desc: 'On a turn when you have Crested or Stranded, Bash costs no Ward.' },
    bilge: { name: 'Bilge Hoop', art: 'h_bilge', desc: 'Bash no longer uses one of your Bail or Stir actions.' },
    herring: { name: 'Herring Hoop', art: 'h_herring', brine: 2, desc: 'Bash applies 2 Brine to the enemy it hits.' },
    withy: { name: 'Withy Hoop', art: 'h_withy', desc: 'When Bash finishes an enemy, you get back the Ward it cost and can Bash again this turn.' },
  };
  /* Outfits: what a keeper wears on land, one picture each (`art`; `fight` for a fighting stance of its own). Each
     belongs to one keeper, and that keeper's first one is what they wear until another is chosen. They are for looks
     only. `when` is what opens it (E.outfitOpen) and `home` what the lighthouse says then.
     A new outfit needs a line here and its picture, on the keeper's own canvas. Wren's are all in her pose. One in a
     pose of its own (Mateo's costumes, v0.64.0) says where the kit screen's slot lines end on its `art` picture
     (`points`, like a keeper's). Mateo's two open on a safe return as Mateo: the user asked that they be "fairly
     easy to unlock" (E.outfitOpen, meta.mateoHome). */
  BL.OUTFITS = {
    ochre: { keeper: 'wren', name: 'Ochre Oilskin', art: 'keeper' },
    harbour: { keeper: 'wren', name: 'Harbour Blue', art: 'wren_harbour' },
    lamplighter: { keeper: 'wren', name: 'Lamplighter’s Green', art: 'wren_lamplighter', when: 'log',
      home: 'For bringing the keeper’s log home, Hester leaves a spare green oilskin on Wren’s peg.' },
    shells: { keeper: 'wren', name: 'Shell Bikini', art: 'wren_shells', when: 'shells',
      home: 'Saltmere’s harbour players stitched your scallop shells into a mermaid costume and hung it on your peg beside your oilskin.' },
    gala: { keeper: 'wren', name: 'Gala', art: 'wren_gala', when: 'heart',
      home: 'Saltmere is throwing a party now the Heart is home. The harbour players have laid out your gala outfit.' },
    longjohns: { keeper: 'wren', name: 'Long Johns', art: 'wren_longjohns', when: 'longwatch',
      home: 'Hester leaves a dry pair of long johns by your bed. For the first time since the light went out, you sleep through to morning.' },
    cooper: { keeper: 'mateo', name: 'Cooper’s Blue', art: 'mateo', fight: 'mateo_guard' },
    frontman: { keeper: 'mateo', name: 'Front Man', art: 'mateo_frontman', fight: 'mateo_frontman_fight', when: 'mateoShallows',
      points: { harpoon: [0.7, 0.33], ditty: [0.4, 0.52], coat: [0.57, 0.38], bell: [0.585, 0.5], pocket: [0.65, 0.6] },
      home: 'Mateo sang all the way home from the Shallows. Hester gave the harbour players an old keeper’s oilskin, and they cut it short for him. The harbour band has a front man now.' },
    king: { keeper: 'mateo', name: 'Harbour King', art: 'mateo_king', fight: 'mateo_king_fight', when: 'mateoDark',
      points: { harpoon: [0.34, 0.31], ditty: [0.33, 0.53], coat: [0.63, 0.26], bell: [0.5, 0.5], pocket: [0.58, 0.6] },
      home: 'The harbour players needed a king for their pageant. Mateo coopered his own crown from a barrel hoop and six stave ends. The cloak is a signal flag trimmed with gull feathers.' },
  };
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
    Crest: 'The wave breaks: deal 6 damage to ALL enemies, +3 for every earlier Crest this turn. Ward blocks it, as it blocks any hit. Then the Swell resets to 3.',
    Strand: 'The water pulls back and strands the enemies: they lose all their Ward. The first Strand of a turn also gives you 1 Light. Then the Swell resets to 3.',
    Sink: 'After you play it, this card is gone for the rest of the fight.',
    Float: 'Stays in your hand at the end of your turn.',
    Rite: 'Rites stay in effect for the rest of the fight once played.',
    Echo: 'Your next card is played twice. On a creature: its next move happens twice.',
    Bail: 'Once a turn, without a card: spend 1 Light to Ebb 1. A Bail that makes your first Strand of the turn is free, even with no Light left: that Strand\'s 1 Light pays it back. Bail or Stir, not both.',
    Stir: 'Once a turn, without a card: spend 1 Light to Surge 1. Bail or Stir, not both.',
    Might: 'Each hit of an attack deals that much more damage.',
    Spines: 'Whatever hits it takes that much damage back: an attack, and also your Crests, Strands and Rites.',
    Soaked: 'Takes 50% more damage from attacks and Crests. Wears off by 1 each turn.',
    Chilled: 'Deals 25% less attack damage. Wears off by 1 each turn.',
    Brine: 'Loses that much HP at the start of its turn, then Brine drops by 1.',
    Roil: 'How much a keepsake stirs the aether around it. Every keepsake you carry counts.',
    // Hold and Roiled read the engine's numbers: js/engine.js defines them again as getters once its constants exist
    Hold: 'How much Roil the aether around you holds while it stays Calm. The lantern in the Workshop raises it for good.',
    Seep: 'Seawater shed by a Roiled aether: an unplayable card shuffled into your draw pile at the start of each fight. It is gone after the fight.',
    Thrash: 'A Roiled aether strikes after the enemies act. Thrash 1 deals 1 damage. Any Ward left from your turn can block it.',
    Doused: 'Something drank from your lantern: you start each turn with that much less Light, until you Crest or Strand.',
    Submerged: 'Sunk out of reach until it next acts. You cannot target it, and attacks cannot reach it, but Crests and other waves still hit it. A Strand brings it up.',
    Shell: 'Its Ward does not wash away from turn to turn. A Strand still strips it.',
    Breathless: 'Something squeezed the air out of your suit: you draw that many fewer cards at the start of your next turn.',
    Burst: 'When it dies, it bursts, and the burst hurts you and every other creature. Your Ward stops it.',
    Heartfire: 'The Lantern Heart is free beside you: you gain more Light at the start of each turn, for the rest of the fight.',
    Roiled: 'You carry more Roil than your Hold. Every 12 Roil over (or part of 12) is one step, and each step adds one thing to every fight: a Seep, then 1 Thrash, then a Bell Minnow at half health, then round again. Never more than 2 Bell Minnows. It also pays: 4 more Pearls after each fight for each step.',
  };

  /* ------------------------------------------------------------------ *
   *  STATUSES (shown on combatants)
   * ------------------------------------------------------------------ */
  BL.STATUSES = {
    might: { name: 'Might', kind: 'buff', icon: 'might', desc: (n) => `Attacks deal +${n} damage per hit.` },
    spines: { name: 'Spines', kind: 'buff', icon: 'spines', desc: (n) => `Whatever hits it takes ${n} damage back: an attack, and also your Crests, Strands and Rites.` },
    soaked: { name: 'Soaked', kind: 'debuff', icon: 'soaked', desc: (n) => `Takes 50% more damage from attacks and Crests for ${n} more turn${n > 1 ? 's' : ''}.` },
    chilled: { name: 'Chilled', kind: 'debuff', icon: 'chilled', desc: (n) => `Deals 25% less attack damage for ${n} more turn${n > 1 ? 's' : ''}.` },
    brine: { name: 'Brine', kind: 'debuff', icon: 'brine', desc: (n) => `Loses ${n} HP at the start of its turn, then Brine drops by 1.` },
    r_moonpull: { name: 'Moon Pull', kind: 'rite', icon: 'moon', desc: (n) => `At the start of your turn, Surge ${n}.` },
    r_tidalmemory: { name: 'Tidal Memory', kind: 'rite', icon: 'shell', desc: (n) => `Whenever you Crest, gain ${n} Light.` },
    r_maelstrom: { name: 'Maelstrom', kind: 'rite', icon: 'vortex', desc: (n) => `Crests deal ${n + 1}x damage, not counting the extra a chained Crest adds.` },
    r_spindrift: { name: 'Spindrift', kind: 'rite', icon: 'wave', desc: (n) => `Each time you Surge (by any amount), deal ${n} damage to a random enemy.` },
    r_abyss: { name: 'Abyssal Pull', kind: 'rite', icon: 'anchor', desc: (n) => `Whenever you Strand, deal ${n} damage to ALL enemies.` },
    r_beam: { name: 'Lighthouse Beam', kind: 'rite', icon: 'beam', desc: (n) => `At the end of your turn, deal ${n} damage per Swell to a random enemy.` },
    grief: { name: 'Twin Bond', kind: 'buff', icon: 'bond', desc: () => `When its twin dies, it gains 4 Might.` },
    // Dark Water
    doused: { name: 'Doused', kind: 'debuff', icon: 'doused', desc: (n) => `Your lantern is doused: you start each turn with ${n} less Light, until you Crest or Strand.` },
    submerged: { name: 'Submerged', kind: 'buff', icon: 'submerged', desc: () => 'Sunk out of reach until it acts. You cannot target it, and attacks cannot reach it. Crests and other waves still hit it, and a Strand brings it up.' },
    shell: { name: 'Shell', kind: 'buff', icon: 'shell', desc: () => 'Its Ward does not wash away from turn to turn. A Strand still strips it.' },
    fullbelly: { name: 'Full Belly', kind: 'buff', icon: 'swallowed', desc: () => 'Two Glimmer Leeches are alive in its belly. The moment a blow brings it to half its HP or below, it Retches them up, out of turn, with any cards it swallowed. They act this turn.' },
    swallowed: { name: 'Swallowed', kind: 'buff', icon: 'swallowed', desc: (n) => `It has swallowed ${n} of your card${n > 1 ? 's' : ''}. They come back to your discard pile when it dies.` },
    // the Shallows' pin
    belled: { name: 'In its Bell', kind: 'buff', icon: 'boss', desc: () => 'Its Ward does not wash away from turn to turn. A Crest\'s wave hits its Ward first, then rings the bell and shakes off the rest. A Strand shakes off all of it. It stays in its bell.' },
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
   *         swallow (takes the last card you played this turn, until it dies), tip (a line for the intent),
   *         swell ('mid': the attack is weakest at Swell 3; 'ends': each Crest or Strand this turn weakens it. The UI
   *         gives such an attack a bell for its intent and marks the Swell bar)
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
  /* The Harbour Hermit rings for its mites at half its health (two thirds until v0.33.0: the user met it at 83 of 150
     and found that "just a bit too early", with most of the Hermit still to break). */
  BL.HERMIT_CALL = 1 / 2;
  // the Dark Watch calls Nobody Comes Home (a Hollow Diver) at half its health
  BL.WATCH_CALL = 1 / 2;
  // a Listener's Pounce: `dmg`, and `per` more for each card played that turn
  BL.LISTEN = { dmg: 5, per: 2 };
  /* The Pale Gulper, a Dread of Dark Water, retches up two Glimmer Leeches the moment it is hurt to this share of its
     health (at once, out of turn, since v0.36.0; before, it was its next move, and it could die first). */
  BL.DREAD_CALL = 1 / 2;
  BL.SWARM = 2; // a Glimmer Leech's Latch: this much harder for each other Leech in the fight (v0.39.0)
  /* The Tolling Buoy's Wild Peal: this much damage, less `step` for each step the Swell is away from 3 when it rings, and
     less `quiet` for each Crest or Strand you make that turn. v0.41.0 (the user: "each step away from 3 muffles ... Full
     Strand/Crest muffles it on top of this. Make it fairer and harder"): a Bail or a Stir always helps a little, and ignoring
     it costs more. Until then 30, less 15 a Crest or Strand, and a hand that could neither ate all of it. */
  BL.PEAL = { dmg: 40, quiet: 15, step: 8 }; // quiet 20 in v0.42.0: one Strand and one Crest silenced it, and a Grok run took 0
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
        harden: { name: 'Harden', ward: 6, dmg: 3 }, // 9 Ward until v0.41.0: with four Braces, a turn where nothing happened
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
        nibble: { name: 'Nibble', dmg: 4 }, // 5 until v0.33.0: at 4, a Brace (5 Ward) has 1 Ward to spare, and a Brace+ (8) stops two Nibbles
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
      name: 'Reefback Hulk', hp: [56, 60], art: 'hulk', scale: 1.3, elite: true, // 68-72 until v0.46.0: 7.9 turns a fight for the bot, the other Shallows Dreads 6.8
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
        if (!e.mem.summoned && e.hp <= e.maxHp * BL.HERMIT_CALL) { e.mem.summoned = true; return 'ring'; }
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
      name: 'The Drowned Bellwether', hp: [160, 160], art: 'bell', cracked: 'bell_cracked', scale: 1.55, boss: true, next: 'bellthing', rise: 'The Bell Breaks!',
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
        // v0.39.0 (the user: Dark Water's Skirmishes stronger by their abilities, not only HP): a swarm. Each other
        // Leech in the fight makes its Latch 2 harder, so which one dies first matters
        latch: { name: 'Latch', dmg: (e, c) => 5 + BL.SWARM * (c ? c.enemies.filter((o) => o !== e && !o.dead && o.id === 'leech').length : 0), drain: true, tip: `Swarm: ${BL.SWARM} harder for each other Glimmer Leech here` },
        gorge: { name: 'Gorge', buff: { might: 1 } },
      },
      ai: weighted([['latch', 65], ['gorge', 35]], 2),
    },
    shrimp: {
      name: 'Pistol Shrimp', hp: [20, 23], art: 'shrimp', scale: 0.8,
      init: (e, R) => { e.mem.offset = R.int(0, 1); },
      moves: {
        cock: { name: 'Cock the Claw', dmg: 4, ward: 6 }, // braces behind its claw (v0.39.0; a 4 hit with no Ward until then)
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
        rise: { name: 'Rise', dmg: 18 }, // 15 until v0.39.0
      },
      ai: cycleFrom(['sting', 'sink', 'rise']),
    },
    hermit: {
      name: 'Lamp Hermit', hp: [26, 29], art: 'hermit', scale: 0.9,
      init: (e, R) => { e.mem.offset = R.int(0, 3); e.st.shell = 1; },
      moves: {
        withdraw: { name: 'Withdraw', ward: 10 }, // 8 until v0.39.0
        pinch: { name: 'Pinch', dmg: 5, hits: 2 },
        clamp: { name: 'Clamp', dmg: 10 },
      },
      ai: cycleFrom(['withdraw', 'pinch', 'withdraw', 'clamp']),
    },
    chain: {
      name: 'Glimmer Chain', hp: [74, 78], art: 'chain', scale: 1.25, elite: true,
      moves: {
        lash: { name: 'Lash', dmg: 6, hits: 2 },
        douse: { name: 'Drink the Light', dmg: 8, debuff: { doused: 1 } },
        glut: { name: 'Glut', buff: { might: 2 }, ward: 10 },
      },
      // it opens by drinking from the lantern (v0.41.0; it started anywhere in its cycle, so the drink often came too late to matter)
      ai: cycleFrom(['douse', 'lash', 'glut']),
    },
    gulper: {
      name: 'Pale Gulper', hp: [62, 66], art: 'gulper', scale: 1.2, elite: true,
      init: (e, R) => { e.mem.offset = R.int(0, 2); },
      moves: {
        bite: { name: 'Bite', dmg: 14 },
        gulp: { name: 'Gulp', dmg: 7, swallow: true },
        whip: { name: 'Tail Whip', dmg: 5, hits: 2, debuff: { soaked: 1 } },
        // hurt, it brings up what it has swallowed: two Glimmer Leeches, still alive, and your cards with them. It is never
        // an intent: it happens the moment the Gulper is hurt to half (`hurt`, E's hurtReact)
        retch: { name: 'Retch', summon: ['leech', 'leech'], disgorge: true, phase: 'It Retches!' },
      },
      hurt: { at: BL.DREAD_CALL, move: 'retch', status: 'fullbelly' },
      ai: (e) => {
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
        toll: { name: 'Rocking Toll', dmg: (e, c) => 12 + 2 * (e.mem.tolls || 0) + 4 * Math.abs(((c && c.tide) == null ? 3 : c.tide) - 3), after: (e) => { e.mem.tolls = (e.mem.tolls || 0) + 1; }, swell: 'mid',
          tip: 'It hits 4 harder for each step your Swell is away from 3, and every Toll rings 2 harder than the last' },
        clang: { name: 'Clang', dmg: 8, hits: 2 },
        // at two thirds of its health its chain snaps: it swings free, and with no chain left to haul it rings wild
        slip: { name: 'Slip the Chain', ward: 15, buff: { might: 1 }, phase: 'The Chain Snaps!' },
        // a wave smothers a bell and a Strand grounds it: each Crest or Strand you make this turn muffles the Peal
        peal: { name: 'Wild Peal', dmg: (e, c) => Math.max(0, BL.PEAL.dmg - BL.PEAL.step * Math.abs(((c && c.tide) == null ? 3 : c.tide) - 3) - BL.PEAL.quiet * ((c && (c.turnCrests + c.turnLows)) || 0)),
          swell: 'ends', tip: `${BL.PEAL.step} softer for each step your Swell is away from 3 when it rings, and ${BL.PEAL.quiet} softer for each Crest or Strand you make this turn` },
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
    // eyeless, with two fans of skin that hear the bell: it hunts by sound, and every card played is a sound
    listener: {
      name: 'Listener', hp: [26, 29], art: 'listener', scale: 0.95,
      init: (e, R, idx) => { e.mem.offset = idx % 2; },
      moves: {
        pounce: { name: 'Pounce', dmg: (e, c) => BL.LISTEN.dmg + BL.LISTEN.per * ((c && c.turnCards) || 0), heard: BL.LISTEN.per },
        hush: { name: 'Hush', ward: 8 },
      },
      ai: cycleFrom(['pounce', 'hush']),
    },
    // an old keeper's diving dress, walking, with nothing in it but what grew in through the seams
    diver: {
      name: 'Hollow Diver', hp: [32, 36], art: 'diver', scale: 1.05,
      init: (e, R) => { e.mem.offset = R.int(0, 2); },
      moves: {
        lamp: { name: 'Cold Lamp', dmg: 6, debuff: { doused: 1 } },
        step: { name: 'Leaden Step', dmg: 11 },
        seal: { name: 'Seal Up', ward: 9 },
      },
      ai: cycleFrom(['lamp', 'step', 'seal']),
    },
    // Dreads
    // a young Thing, a year out of the bronze: it does what the old one does, smaller
    yearling: {
      name: 'Bell Yearling', hp: [72, 76], art: 'yearling', scale: 1.25, elite: true,
      moves: {
        squeeze: { name: 'Squeeze', dmg: 9, debuff: { breathless: 1 } },
        eye: { name: 'The Eye Opens', expose: 2, ward: 8 },
        glare: { name: 'Glare', dmg: 20 },
        lash: { name: 'Lash', dmg: 5, hits: 2 },
      },
      ai: cycleFrom(['squeeze', 'eye', 'glare', 'lash']),
    },
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
      name: 'The Thing in the Bell', hp: [110, 110], art: 'bellthing', scale: 1.55, boss: true, // 150 until v0.34.0: less HP, harder hits
      arrive: ['arm', 'arm'], // when it comes out of the bell, two of its arms come with it
      moves: {
        drink: { name: 'Drink the Light', dmg: 9, douseArms: true },
        eye: { name: 'The Eye Opens', expose: 2, ward: 8 },
        glare: { name: 'Glare', dmg: 30 },
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
        lash: { name: 'Lash', dmg: 8 },
        grip: { name: 'Grip', dmg: 4, debuff: { breathless: 1 } },
      },
      ai: cycleFrom(['lash', 'grip']),
    },
    /* After the Heart has come home (v0.37.0, the user's idea): the deep grows toward the keeper's lantern and takes the
       shape of what the keeper carries down. The Belfry's last landing is the keeper's own fear (BL.BANDS.belfry.enc.finals).
       Wren's: the light went out on her watch. It wears her coat and carries her lantern, unlit, her bell and her harpoon.
       Until v0.37.0 the finals were the Thing in the Bell grown back (130 HP) and the Drowned Cantor (160 HP). */
    darkwatch: {
      name: 'The Dark Watch', hp: [180, 180], art: 'darkwatch', scale: 1.3, boss: true,
      moves: {
        ring: { name: 'Ring Her Bell', ward: 14, tideSet: 3 },
        harpoon: { name: 'Her Harpoon', dmg: 9, hits: 2 },
        snuff: { name: 'Pinch the Wick', dmg: 11, debuff: { doused: 1 } },
        out: { name: 'Lights Out', dmg: (e) => 22 + 4 * (e.mem.outs || 0), after: (e) => { e.mem.outs = (e.mem.outs || 0) + 1; },
          tip: 'Each Lights Out hits 4 harder than the last' },
        // at half its HP: the empty dress, the keeper who did not come home
        nobody: { name: 'Nobody Comes Home', grow: { id: 'diver', max: 1 }, ward: 10, phase: 'Nobody Comes Home!' },
      },
      ai: (e) => {
        if (!e.mem.called && e.hp <= e.maxHp * BL.WATCH_CALL) { e.mem.called = true; return 'nobody'; }
        const seq = ['ring', 'harpoon', 'snuff', 'out'];
        e.mem.step = (e.mem.step || 0) + 1;
        return seq[(e.mem.step - 1) % seq.length];
      },
    },
    // The Split Cask keeps its Ward. Splinter and Give Way draw their strength from the Ward still on the cask.
    splitcask: {
      name: 'The Split Cask', hp: [62, 66], art: 'splitcask', scale: 1.13, elite: true,
      init: (e) => { e.st.shell = 1; },
      moves: {
        tighten: { name: 'Brace the Staves', ward: 12 },
        knock: { name: 'Three Knocks', dmg: 5, hits: 3 },
        split: { name: 'Splinter', dmg: (e) => 12 + Math.min(12, e.ward), tip: 'Hits harder for each Ward it has, up to 12 extra. A Strand strips its Ward.' },
      },
      ai: cycleFrom(['tighten', 'knock', 'split']),
    },
    lasthoop: {
      name: 'The Last Hoop', hp: [175, 175], art: 'lasthoop', scale: 1.37, boss: true,
      init: (e) => { e.st.shell = 1; },
      moves: {
        tighten: { name: 'Draw Tight', ward: 18 },
        knock: { name: 'Three Knocks', dmg: 7, hits: 3 },
        pull: { name: 'The Line Goes Taut', dmg: 13, debuff: { breathless: 1 } },
        split: { name: 'Give Way', dmg: (e) => 18 + Math.min(18, e.ward) + 4 * (e.mem.bursts || 0),
          tip: 'Hits harder for each Ward it has, up to 18 extra. A Strand strips its Ward. Give Way grows 4 stronger each time.',
          after: (e) => { e.mem.bursts = (e.mem.bursts || 0) + 1; } },
      },
      ai: cycleFrom(['tighten', 'knock', 'pull', 'split']),
    },
    /* The Drowned Cantor: a final from v0.20.0, a Dread of the dives after the Heart since v0.37.0 (160 HP before).
       `leads`: when it falls, the choir it called stops, as a pin's shoal scatters. */
    cantor: {
      name: 'The Drowned Cantor', hp: [90, 94], art: 'cantor', scale: 1.35, elite: true, leads: true,
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
      name: 'the Shallows', boss: 'The Harbour Hermit', bg: 'bg_battle', bossBg: 'bg_shallows_boss', mapBg: 'map_shallows',
      pin: 'The harbour bell cracks, and the crab inside it lets go of the water. It runs away down a stair that has been under the sea for a hundred years. Far below, something is still ringing, and a glow goes on down the stair toward it.',
      enc: BL.ENCOUNTERS,
      events: ['shrine', 'wreck', 'witch', 'pool', 'ghost', 'bottle', 'ambush'],
    },
    dark: {
      name: 'Dark Water', boss: 'The Tolling Buoy', bg: 'bg_dark', bossBg: 'bg_dark_boss', mapBg: 'map_dark', stairArt: 'stair_dark',
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
      name: 'the Belfry', boss: 'The Drowned Bellwether', bg: 'bg_belfry', bossBg: 'bg_belfry_boss', mapBg: 'map_belfry', stairArt: 'stair_belfry',
      finalBoss: 'Something in the Belfry',
      pocketArt: 'pocket', // under a lesser bell (v0.37.0)
      pocket: 'A lesser bell hangs here from a beam of the old tower, and air is caught under it. You come up into the dark inside the bronze, open your helmet and breathe.',
      stair: 'Below Dark Water the stair goes on down into the sea. On the last dry step you check the seams of the diving dress, light its sealed lamp, and rest a while before you go under.',
      win: 'The thing that grew into the Bellwether lets go of the Lantern Heart and sinks below the Belfry floor. You carry the Heart up three levels of stairs. By dawn the great light is turning again, and Hester and Bosun watch the boats go out.',
      quiet: 'The keeper in your coat goes out like a pinched wick, and the Belfry goes quiet. The broken bell hangs still over the place where the Heart lay, and a faint light stays behind there, as it always does. You climb home, and the great light is still turning.',
      /* The Belfry is a dive (v0.37.0, E.DIVE): two Dreads, each guarded, a lesser bell after each, then the pin. Before
         v0.37.0 it was a map like the others, with easy and hard fights of its own creatures. */
      enc: {
        dive: [['ringer', 'belljelly'], ['oarfish', 'spawn']], // until the Heart is home: these two, in this order
        // once the Heart is home: two of these, in a random order (the user turned down the Glimmer Bladder as a guard
        // of the first dive; it waits for the dives after the Heart)
        diveAfter: [['ringer', 'belljelly'], ['oarfish', 'spawn'], ['yearling', 'listener'], ['cantor'], ['oarfish', 'bladder']],
        boss: [['bell']],
        finals: [['darkwatch']],
      },
      // under a lesser bell, one choice is to swim out into the dark: one of these (the Shrine and the Garden came down
      // too until v0.37.0)
      events: ['lanterns', 'heartglow', 'rope'],
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
    moonshard: { name: 'Moon Shard', art: 'k_moonshard', charge: 12, /* 8 until v0.36.0: the user found it too good for its cost */ desc: 'Start each fight at Swell 5.' },
    kelpbracelet: { name: 'Kelp Bracelet', art: 'k_kelpbracelet', charge: 11, desc: 'Whenever you Strand, gain 8 Ward.' },
    gullfeather: { name: 'Gull Feather', art: 'k_gullfeather', charge: 8, desc: 'Draw 2 extra cards on your first turn of each fight.' },
    biscuit: { name: 'Scallop Charm', art: 'k_biscuit', charge: 12, desc: 'While you carry it, your Max HP is 10 higher. Heals 10 when you pick it up.' },
    stormbottle: { name: 'Storm Bottle', art: 'k_stormbottle', charge: 18, desc: 'Every 3rd turn of a fight, gain 1 extra Light.' },
    sirenscale: { name: 'Whispering Conch', art: 'k_sirenscale', charge: 17, soaked: 1, desc: 'Enemies start each fight with 1 Soaked.' }, // 2 until v0.39.0 (three playtests: it set up a turn-1 burst)
    coralcrown: { name: 'Coral Branch', art: 'k_coralcrown', charge: 6, desc: 'Whenever you play a Rite, gain 5 Ward.' },
    inksac: { name: "Angler's Lure", art: 'k_inksac', charge: 10, desc: 'The first time you lose HP in a fight, apply 2 Chilled to ALL enemies.' },
    saltedhook: { name: 'Salted Hook', art: 'k_saltedhook', charge: 7, desc: 'Whenever you apply Brine, apply 1 more.' },
    echoconch: { name: 'Conch of Echoes', art: 'k_echoconch', charge: 17, desc: 'The first card you play in each fight is played twice.' },
    anchor: { name: 'Drowned Anchor', art: 'k_anchor', charge: 18, desc: 'A Strand also deals 4 damage to ALL enemies.' },
    /* Found deeper (`deep`: the first level where it can be found, 1 = Dark Water, 2 = the Belfry). Nearer the bell the
       held water has more of the Heart's light in it, so these are stronger, and they stir the aether more. In those
       levels the first keepsake of every offer is one of the level's own while any are left (E.keepsakeChoices). */
    whelk: { name: 'Hollow Whelk', art: 'k_whelk', charge: 27, deep: 1, keep: 1, desc: 'Your Ward no longer washes away at the start of your turn.' },
    bulb: { name: 'Glimmer Bulb', art: 'k_bulb', charge: 30, deep: 1, desc: 'Every Strand gives 1 Light, not only the first each turn.' }, // until v0.40.0: a Strand gave 2 Light
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
  /* The Toll's words (v0.41.0; its rules are E.TOLL in js/engine.js): a lost bell across the way, on every route. */
  BL.TOLL = {
    title: 'A Toll Bell',
    text: 'A lost bell hangs low across the only way on, swinging by itself in the held water. Like every bell on this coast it answers the Bellwether, and it lets nobody pass for free.',
    ways: {
      hp: { label: 'Wade under it', desc: (t) => `Lose ${t.hp} HP.`, paid: 'You wade in under it. It swings down and strikes you across the shoulders, hard, and lets you by.' },
      pearls: { label: 'Feed it Pearls', desc: (t) => `Pay ${t.pearls} Pearls.`, paid: 'You throw the Pearls up into its mouth. The bell drinks their light and hangs still while you wade under.' },
      barnacle: { label: 'Squeeze past', desc: () => 'A Barnacle Growth joins your deck: unplayable, it stays until you remove it.', paid: 'You squeeze through the slit beside it. The barnacles tear at you, and some of them come with you.' },
    },
  };

  BL.EVENTS = [
    {
      id: 'shrine', title: 'The Sunken Shrine', art: 'ev_shrine',
      text: 'A barnacle-crusted altar to a sea goddess nobody remembers. Before Saltmere had keepers, it paid the sea here. Her stone hands are still held out, waiting for an offering.',
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
      text: 'A hut on stilts below the tide line, and a crone in a shawl of knotted net. Saltmere calls her the Tide-Witch, and does not come down here. "Rare lessons for a rare price, keeper. Or a brew, for pearls."',
      options: [
        { label: 'Trade your years', desc: 'Lose 7 Max HP. Choose 1 of 3 rare cards.',
          act: (r, E) => { E.loseMaxHp(r, 7); return { text: 'She plucks a few of your years like loose threads and knots them into her shawl. Then she spreads her cards.', next: { cards: E.randomCards(r, 'rare', 3) } }; } },
        { label: 'Buy a brew', desc: 'Pay 30 Pearls. Gain a random tonic.', cond: (r) => (r.pearls >= 30 ? (r.tonics.includes(null) || 'Tonic slots full') : 'Not enough Pearls'),
          act: (r, E) => { r.pearls -= 30; const t = E.gainRandomTonic(r); return { text: `She corks a bottle of ${BL.TONICS[t].name} and presses it into your hand.` }; } },
        { label: 'Decline', desc: 'Leave politely.', decline: true, act: () => ({ text: '"Another time," she cackles. "I have plenty."' }) },
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
        { label: 'Fight for the cache', desc: 'Fight. Win 30 extra Pearls.', act: (r, E) => ({ text: `You raise your ${E.keeper(r).weapon.name.toLowerCase()}.`, next: { fight: 'hard', bonusPearls: 30 } }) },
        { label: 'Sneak past', desc: 'Lose 5 HP.', act: (r, E) => { E.loseHp(r, 5); return { text: 'Thorny kelp scrapes you as you slip by.' }; } },
      ],
    },
    // ---------- Dark Water ----------
    {
      id: 'tideboard', title: 'The Tide-Board', art: 'ev_tideboard',
      text: 'The keepers cut a tide-board into the wall of the stair: a line and a year for every highest tide. The lowest lines are older than the lighthouse. For the last hundred years each line sits a little above the one before, and the newest is above your head. No keeper has come down here in all that time, and still the lines are cut.',
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
      text: 'On a ledge under the bell lie hundreds of keepers\' lanterns, lost down the stairs over the years. They have all rolled the same way, toward the glow under the bell. In a few, a spark of brinelight still sits in the glass.',
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
          act: (r, E) => { const k = E.gainRandomKeepsake(r); E.addFollower(r, 'minnow'); E.addFollower(r, 'minnow'); return { text: `Somewhere in the tower, something gives one slow note. ${k ? `The ${BL.KEEPSAKES[k].name} falls out of the weed into your hands. ` : ''}A shoal of Bell Minnows heard it too.` }; } },
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
     Place and kit text can say {weapon}, {Weapon} and {strike}: the keeper's own words for them (E.kitText).
     The kit screens show the keeper with a slot for each place: `side` is the side of the picture the slot sits on,
     and `at` is where its line points on the picture (fractions of its width and height, from the top left).
     `at` fits Wren, whose outfits share one canvas and pose (tools/wren-art.py); another keeper moves the points
     with `points` in BL.KEEPERS. A new place needs these and a glyph in ui.js (ICON.slot_<id>).
     The Weapon place is `harpoon` in the code and in saves (it was called the Harpoon until v0.61.0), and the Rig
     place is `coat` (it was called the Coat until v0.24.3). */
  BL.KIT_PLACES = [
    { id: 'harpoon', name: 'Weapon', desc: 'A fitting for your {weapon}. It changes your first {strike} in each fight.', none: 'Plain {weapon}', side: 'left', at: [0.2, 0.48] },
    { id: 'bell', name: 'Bell', desc: 'Your Tide-Bell. It decides what you get when you Crest or Strand.', side: 'right', at: [0.52, 0.42] },
    { id: 'coat', name: 'Rig', desc: 'What you wear over your clothes, or the dress that takes you under the sea.', none: 'Nothing extra', side: 'right', at: [0.66, 0.29] },
    { id: 'pocket', name: 'Pocket', desc: 'Coins and tokens.', none: 'Empty', side: 'right', at: [0.75, 0.515] },
    { id: 'ditty', name: 'Ditty Bag', desc: 'Small tools and supplies.', none: 'Empty', side: 'left', at: [0.37, 0.49] },
  ];
  /* Kit shows as its icon (`art`, img/icons) in its slot, and never changes the keeper's picture (v0.61.0; until then
     a Rig piece had a picture of Wren wearing it, one for each of her outfits). So a new piece needs only an icon.
     The Weapon pieces are fittings that go on any keeper's weapon, so their text says {weapon} and {strike}.
     A dress (`suit`, or `as: 'suit'`) opens the Belfry; under the sea every keeper shows in their own dive picture. */
  BL.KIT = {
    /* Until v0.61.0 these were the Honed Harpoon, the Barbed Harpoon and the Toggle Iron (the ids are from then). */
    honed: { place: 'harpoon', name: 'Lead Collar', art: 'g_collar', price: 35, unlock: 'dreadhunter', dmg: 2, desc: 'A lead weight for your {weapon}. Your first {strike} in each fight deals 2 more damage.' },
    barbed: { place: 'harpoon', name: 'Brined Lashing', art: 'g_lashing', price: 25, unlock: 'pickled', brine: 1, desc: 'Brine-soaked cord for your {weapon}. Your first {strike} in each fight applies 1 Brine.' },
    toggle: { place: 'harpoon', name: 'Sponge Wrap', art: 'g_sponge', price: 30, unlock: 'stillwater', soaked: 2, desc: 'A wet sea sponge bound to your {weapon}. Your first {strike} in each fight applies 2 Soaked.' },
    tidebell: { place: 'bell', name: 'Brass Tide-Bell', art: 'k_tidebell', price: 0, starter: true, desc: 'Whenever you Crest or Strand, draw 1 card.' },
    floodbell: { place: 'bell', name: 'Flood Bell', art: 'g_floodbell', price: 20, unlock: 'twocrests', desc: 'Whenever you Crest, draw 1 card and gain 1 Light. A Strand gives nothing.' },
    ebbbell: { place: 'bell', name: 'Ebb Bell', art: 'g_ebbbell', price: 20, unlock: 'twolows', desc: 'Whenever you Strand, draw 1 card and gain 3 Ward. A Crest gives nothing.' },
    crackedbell: { place: 'bell', name: 'Cracked Bell', art: 'g_crackedbell', price: 30, unlock: 'threecrests', desc: 'Your first Crest or Strand each turn gives nothing. Every one after it draws 2 cards and gives 1 Light.' },
    harbourbell: { place: 'bell', name: 'Harbour Bell', art: 'g_harbourbell', price: 25, unlock: 'outofbell', desc: 'The Hermit\'s bell, mended. Whenever you Crest or Strand, gain 3 Ward. It draws nothing.' },
    cork: { place: 'coat', name: 'Cork Vest', art: 'g_cork', price: 12, desc: 'Start each run with 5 more Max HP.' },
    gorget: { place: 'coat', name: 'Shell Gorget', art: 'g_gorget', price: 25, unlock: 'untouched', ward: 4, desc: 'Start each fight with 4 Ward.' },
    /* Found, never bought: the first time Dark Water's pin breaks, Wren finds it and carries it home (E.carryHome). */
    suit: { place: 'coat', name: 'Diving Dress', art: 'g_suit', price: 0, found: true, desc: "An old keeper's diving dress with a sealed lamp. You need it to go down into the Belfry. It does nothing in a fight." },
    /* The dress again, plated with shell: it counts as the Diving Dress (`as`) for the Belfry's stair. */
    plated: { place: 'coat', name: 'Plated Dress', art: 'g_plated', price: 50, unlock: 'heartlight', as: 'suit', ward: 3, desc: 'The diving dress again, armoured with shell plates from shoulders to shins. You can go down into the Belfry in it, and you start each fight with 3 Ward.' },
    purse: { place: 'pocket', name: 'Coin Purse', art: 'g_purse', price: 8, desc: 'Start each run with 30 more Pearls.' },
    // 10 until v0.33.0: with no Pearls at the start it more than paid for a keepsake in the Shallows alone (the user: "a bit over-powered")
    pouch: { place: 'pocket', name: "Gleaner's Pouch", art: 'g_pouch', price: 15, pearls: 6, desc: 'Gain 6 extra Pearls after each fight.' },
    // Wren's own (v0.37.0): for beating the Dark Watch, her own fear, the first time. A keeper's first win against
    // their own fear gives something of their trade that any keeper can carry
    watchglass: { place: 'pocket', name: 'Watch Glass', art: 'g_watchglass', price: 40, unlock: 'longwatch', desc: "A keeper's half-hour glass, turned all night on watch. You start each fight with 1 more Light on your first turn." },
    marker: { place: 'pocket', name: "Barnaby's Marker", art: 'g_marker', price: 25, unlock: 'travellight', desc: "Your first card removal at Barnaby's shop in each run is free." },
    // one tonic and price 12 until v0.36.0 (the user: "could give one more tonic, and one more tonic slot, and increase in cost")
    flask: { place: 'ditty', name: 'Spare Flask', art: 'g_flask', price: 22, tonics: 2, desc: 'Carry a fourth tonic, and start each run with two random tonics.' },
    scales: { place: 'ditty', name: 'Pearl Scales', art: 'g_scales', price: 15, desc: "Barnaby's prices are 25% lower: he can't argue with honest weights." },
    net: { place: 'ditty', name: 'Gleaning Net', art: 'g_net', price: 10, desc: 'Gain 3 Pearls whenever you Crest.' },
    wick: { place: 'ditty', name: 'Spare Wick', art: 'g_wick', price: 12, desc: 'Resting heals 10 more HP.' },
    bailer: { place: 'ditty', name: 'Bailer', art: 'g_bailer', price: 30, unlock: 'bothends', desc: 'You can Bail or Stir twice a turn.' },
    line: { place: 'ditty', name: 'Safety Line', art: 'g_line', price: 35, unlock: 'closecall', hp: 5, desc: 'The first time you would fall on an expedition, the line holds: you are left with 5 HP.' },
    sparehoop: { place: 'ditty', name: 'Spare Hoop', art: 'g_hoop', price: 35, unlock: 'lasthoop', firstTideWard: 5, desc: 'Your first Crest or Strand each fight gives you 5 Ward.' },
  };
  /* Story so far (title screen and menu): the opening, chapters, the world glossary and the keeper's notes.
     `when` is a mark the player has to earn (E.storyMarks in js/engine.js); an entry without it is always open.
     `lock` is what a locked entry shows. A world entry is [name, text], with an optional third field for one that
     opens later: { level } once that level is known (the UI's levelKnown), { when } once that mark is earned. Until
     then it is left out, and its text never changes (see the comment on `world`). Art paths are under img/. An opening picture is placed by `pos` on tall screens,
     and by `wide` and `zoom` on wide ones. WORLD.md has to agree with all of this. */
  BL.STORY = {
    title: 'An enchanted bell, sunk under the cliffs, has stolen the fire from your lighthouse, and it is pulling the sea up toward the town. You are the last keeper. Go down and take the fire back.',
    opening: [
      { art: 'scenes/op_lighthouse', pos: '78% center', wide: 'center top', zoom: 1.08,
        text: 'You are Wren, the lighthouse keeper of Saltmere, a harbour town on a rocky coast. The lighthouse stands on a rock off the harbour, and it burns a magic fire called the Lantern Heart. While it burns, ships find their way past the rocks.' },
      { art: 'scenes/op_bell', pos: 'center', wide: 'center top', zoom: 1.08,
        text: 'In the sea-caves under the cliffs hangs an enchanted bell, the Bellwether. Keepers sank it there long ago to hold the sea back. Nobody has tended it for a hundred years.' },
      { art: 'scenes/op_fire', pos: '28% center', wide: '30% center', zoom: 1.08, sfx: 'bell',
        text: 'Tonight the bell rang by itself. Its magic pulled the Lantern Heart out of the lighthouse and down into the caves. Now the bell is flooding the caves and lifting the sea toward the town, a little higher with every tide.' },
      // v0.43.0: Hester and Bosun, who wait for Wren and bring her home when she falls (WORLD.md, "Who waits for Wren")
      { art: 'scenes/op_home', pos: '80% center', wide: 'center 30%', zoom: 1.06,
        text: 'Your lantern holds the last of that fire. Hester carried it for forty years before she gave it to you, and her knees will not take the tower stairs now. Her dog Bosun is already waiting on the step.' },
      { art: 'scenes/rest', pos: 'center', wide: 'left center', zoom: 1.6, fig: 'units/keeper',
        text: 'Your hand-bell moves water the way the great bell does. Take your lantern, your bell and your harpoon. Go down through the caves, fight what lives there, and bring the Lantern Heart home.' },
    ],
    /* Story scenes (v0.33.0, the user's idea): a few pictures with a few lines each, like the opening, the first time
       something big happens. `at` is when one plays: 'pin:<level>' as that level's pin breaks (before the choice to go
       home or deeper), 'dress' on coming home with the diving dress, 'heart' on bringing the Heart home, 'fell' on the
       first fall (its picture stays on every fall's end screen). A beat with
       `found` shows only when that kit was found there. The chapter that names a scene (`scene`) can play it again.
       The tutorial and debug-cheated runs play none. */
    scenes: {
      hermit: { at: 'pin:0', beats: [
        { art: 'scenes/sc_hermit1', pos: '30% center', wide: 'center 30%', zoom: 1.04, sfx: 'bell',
          text: 'The harbour bell cracks from rim to crown. The crab that wore it lets go of the water it was holding, and runs. Where the sea stood a moment ago, a stair comes up out of it: the keepers\' stair, a hundred years under water.' },
        { art: 'scenes/sc_hermit2', pos: '62% center', wide: 'center 35%', zoom: 1.04,
          text: 'The Lantern Heart is not here. Every bell on this coast answers the Bellwether, and the harbour bell was only answering it. Far below, the great bell is still ringing, and the glow of the fire goes on down the stair toward it. You can go home with what you carry, or follow it down.' },
      ] },
      buoy: { at: 'pin:1', beats: [
        { art: 'scenes/sc_buoy1', pos: '32% center', wide: 'center 35%', zoom: 1.04, sfx: 'bell',
          text: 'The Tolling Buoy rocks one last time and lies still. It rang off Saltmere\'s rocks before there was a lighthouse. Now the water it held runs away down the last stair.' },
        { art: 'scenes/sc_buoy2', pos: 'center', wide: 'center 60%', zoom: 1.04,
          text: 'At the bottom, the water does not drain. Below Dark Water is one more chamber, and it is under the sea: a tower with its bell at the bottom. The keepers called it the Belfry. Down there the Bellwether is ringing, and the Lantern Heart burns under it.' },
        { art: 'scenes/sc_buoy3', pos: '38% center', wide: 'center 30%', zoom: 1.04, found: 'suit',
          text: 'An open lantern cannot go there, and neither can you. But on the wall above the last dry step hangs an old keeper\'s diving dress, with a sealed lamp on its helmet. Its seams have rotted and its lamp is dry. It cannot go down tonight. Carry it home.' },
      ] },
      dress: { at: 'dress', beats: [
        { art: 'scenes/sc_mend', pos: '45% center', wide: 'center 30%', zoom: 1.04,
          text: 'At home, in the boathouse on the harbour, Hester hangs the lamp over the bench. You sew up the seams with waxed thread and proof them with lamp oil. You fill the sealed lamp and try it with the glass shut. It burns. Wear the dress in your Rig place on your next expedition, and the last stair is open.' },
      ] },
      // the first time Wren goes down into the Belfry, in the dress (v0.40.0, the user's request); the second picture says
      // why there are so many bells, which the user asked to have made clear
      below: { at: 'in:2', beats: [
        { art: 'scenes/sc_belfry1', pos: '21% center', wide: 'center 25%', zoom: 1.04, sfx: 'bell',
          text: 'On the last dry step you seal the helmet and light its lamp from your lantern. The open lantern stays on the step, and Bosun lies down beside it to wait. Then you walk down the keepers\' stair, into the sea.' },
        { art: 'scenes/sc_belfry2', pos: '40% center', wide: 'center 30%', zoom: 1.04,
          text: 'The Belfry is full of bells. Every bell on this coast was cast to answer the Bellwether, and a bell the sea takes never stops answering. The harbour bell and the old bell-buoy held the water because they rang with the great bell. Down here, a hundred lost bells still do.' },
        { art: 'bg/bg_belfry_boss', pos: '55% center', wide: 'center 40%', zoom: 1.04,
          text: 'Whatever lives down here has learned it too. Its young wear broken bronze for shells, and look for bigger bells as they grow. Far below, the Bellwether rings with no hand on its rope, and the Lantern Heart burns under it.' },
      ] },
      // the first fall (v0.44.0, the user's request): Bosun brings her out of the surf; every later fall's end screen shows it
      fall: { at: 'fell', beats: [
        { art: 'scenes/sc_fall', pos: '58% center', wide: 'center 35%', zoom: 1.04, // v0.46.0's picture: Bosun on the shore side
          text: 'The cold water closed over your lantern, and the sea gave you back. Bosun went in after you and hauled you up out of the surf by your collar, barking until Hester came down the rock with a lantern and a blanket. In your lantern an ember was still alight.' },
      ] },
      unbound: { at: 'rise:bell', beats: [
        { art: 'scenes/sc_heart1', pos: 'center', wide: 'center 35%', cue: 'pin2',
          text: 'The Bellwether’s bronze breaks. Something with one eye and many arms pulls itself from the wreck. The Heart’s light reaches your lantern. It mends you and gives you one more Light each turn.' },
      ] },
      heart: { at: 'heart', beats: [
        { art: 'scenes/sc_heart1', pos: 'center', wide: 'center 35%', zoom: 1.04, cue: 'home',
          text: 'The Thing lets go of the Lantern Heart and sinks into the dark under the Belfry floor. All the little bells go still. For the first time since you came down, you can hear your own breath.' },
        { art: 'scenes/sc_heart2', pos: '68% center', wide: 'center 25%', zoom: 1.04,
          cue: 'home', text: 'You carry the Heart up three levels of stairs. The water runs away in front of it.' },
        { art: 'scenes/ev_heartglow', pos: 'center', wide: 'center 60%', zoom: 1.04, cue: 'home',
          text: 'A faint light stays behind where the Heart lay. Things still grow toward it. Saltmere will need a keeper who goes down.' },
        { art: 'scenes/sc_heart3', pos: 'center', framed: true, song: 'bells',
          text: 'By dawn the great light of Saltmere is turning again. Hester and Bosun watch from the path below the tower. The sea has stopped rising, and the boats go out past the rocks.' },
      ] },
      // the first time Wren beats her own fear (v0.37.0)
      watch: { at: 'quiet', beats: [
        { art: 'scenes/sc_watch1', pos: 'center', wide: 'center 30%', zoom: 1.04, sfx: 'bell',
          text: 'Under the broken bell, the keeper in your coat lowers your harpoon. For a moment its lantern is lit, from yours, and you see its face. Then it goes out like a pinched wick, and there is only water where it stood.' },
        { art: 'scenes/op_lighthouse', pos: '78% center', wide: 'center top', zoom: 1.08,
          text: 'You climb home. The great light is turning, as it has every night since the Heart came home. In the keeper\'s room you turn the watch glass over, and for the first time since that night you sleep through to morning, with Bosun across the foot of the bed.' },
      ] },
      knocking: { at: 'lead:mateo', beats: [
        { art: 'scenes/end_home_lit', pos: '55% center', wide: 'center 35%', cue: 'haul',
          text: 'The great light has been turning for days. Last night Wren dreamed she heard three knocks from inside a cask. This morning, Bosun stopped at the stair to Dark Water and listened. Something knocked back. Look for the marked Dread in Dark Water, and bring home whatever you find.' },
      ] },
      cask: { at: 'dread:mateo', beats: [
        { art: 'bg/bg_dark_boss', pos: 'center', cue: 'fog',
          text: 'The last stave splits. An oilskin packet slips out with a note inside. Break the Tolling Buoy, then take the note home to Hester.', quote: BL.CASK_NOTE },
      ] },
      mateo: { at: 'keeper:mateo', beats: [
        { art: 'scenes/workshop', pos: 'center', cue: 'haul', quote: BL.CASK_NOTE,
          text: 'Wren reads the note aloud and hands it to Hester. Neither can place the handwriting or say who the signal was meant for.' },
        { art: 'scenes/end_home_lit', pos: 'center', cue: 'reach', night: true, next: 'Wait until morning',
          text: 'They leave the note on the table. Hester puts out the kitchen lamp, and the great light keeps its watch.' },
        { cue: 'reach', sfx: 'knock', next: 'Open the door',
          text: 'At first light there are three knocks at the lighthouse door.' },
        { art: 'scenes/sc_mateo_door', pos: '65% center', wide: 'center 24%', together: true, cue: 'haul',
          text: 'A cooper named Mateo stands on the step. “I’ve been dreaming about a cask,” he says. Wren shows him the note. He knows the signal. Hester asks him in and pulls a chair up to the table.' },
        { art: 'scenes/sc_mateo_memory', pos: '52% center', wide: 'center 29%', cue: 'reach',
          text: '“My brother and I used three knocks when we couldn’t see each other. During the flood I stayed in the rescue boat. The line was tied around my waist. He held the other end.”' },
        { art: 'scenes/sc_mateo_memory', pos: 'center 70%', wide: 'center 60%', cue: 'reach',
          text: '“The water took him. It pulled me hard against the side and I cut the line. I know we’d both have drowned. Some nights I still wake up feeling it go tight.”' },
        { art: 'scenes/op_lighthouse', pos: '74% center', wide: 'center top', cue: 'haul',
          text: 'Mateo lights his workshop lamp at the Heart. There’s no spare room in the lighthouse, so he takes one at the Saltmere inn. At the next low tide he’ll come back to go all the way to the Belfry. He wants to hear those knocks himself.' },
      ] },
      hoop: { at: 'quiet:mateo', beats: [
        { art: 'bg/bg_belfry_boss', pos: 'center', wide: 'center 40%',
          text: 'The last hoop gives. Mateo lifts the lid and waits for the three knocks. Only water comes out. He coils the loose end of the rescue line and carries it up the stair. This time he’ll tell Hester who was holding the other end.' },
        { art: 'scenes/sc_mateo_lamp', pos: 'center 31%', wide: 'center 32%', together: true,
          text: 'After Mateo gives Hester his brother’s name for the harbour record, Wren shows him how to trim his wick. Mateo smiles at her across the lantern. “Just the blackened tip,” she says. He makes the cut and she nods. “That’ll do.”' },
        { art: 'scenes/sc_mateo_tea', pos: 'center 22%', wide: 'center 37%', together: true,
          text: 'Mateo brings two mugs to the step. “Tea for the keeper on duty. Harbour regulations,” he says. “Since when?” Wren asks. “Since I put the kettle on. I was hoping I’d see you.” Wren thanks him and goes up to take the watch. “Good watch,” he calls.' },
      ] },
    },
    chapters: [
      { id: 'night', title: 'The night the light went out', opening: true },
      { id: 'fall', title: 'The sea gives you back', when: 'fell', lock: 'Fall in the Reach.', scene: 'fall', text: [
        'The cold water closed over your lantern, and you went under. The water the bell holds keeps everything it takes. The open sea does not: past the bell\'s reach it gives back what it takes, and it gave you back.',
        'Bosun went in after you and would not let go of your scarf. He swam you in to the shingle below the lighthouse, and barked until Hester saw your ember from the door and came down the rock with a blanket. You woke under it, alive, with your harpoon beside you. Your lantern had burned down to an ember, but it was still alight.',
        'The bell calls back the keepsakes a keeper carries. The most you can hold on to is one, in a shut fist. The lighthouse is still dark, and the water stands a little higher on the stairs. You trim your lantern and go down again, and Bosun goes with you.',
      ] },
      { id: 'home', title: 'The harbour bell', when: 'won:0', lock: "Break the Shallows' pin.", scene: 'hermit', text: [
        'On the last landing of the Shallows waited a hermit crab as big as a rowing boat. It wore Saltmere\'s old harbour bell for a shell: the bell that rang the boats home in fog, until a winter storm tore it off the harbour wall. When the bell cracked, the crab let go of the water, and the water ran away down a stair that had been under the sea for a hundred years.',
        'The Lantern Heart was not there. The harbour bell only answers a bigger one. Far below, something was still ringing, and the glow of the fire went on down the stair toward it.',
        'You can go home from there with what you carry. But before the next tide the water comes back over the landings, something answers the bell again, and the next expedition starts from the shore.',
      ] },
      { id: 'sunk', title: 'Why the bell was sunk', when: 'won:1', lock: "Break Dark Water's pin.", scene: 'buoy', text: [
        'The bell ringing in Dark Water was not the Bellwether either. It was Saltmere\'s old bell-buoy, lost before the lighthouse was built, in the winter storm that also tore the harbour bell off its wall. It answers the great bell now, and it held the water over the last stair.',
        'The keepers made the Bellwether. A hand-bell like yours moves the water in a pool. They cast a bell big enough to move the sea, and sank it at the bottom of the cliffs to hold the water off their low stairs and their quay. In those days they kept their fire there too, under the bell. The Lantern Heart burns in water as well as in air.',
        'A bell that size has to be tended. At the lowest tides of the year keepers went down to it, in a diving bell at first and later in diving dresses. Then the storm took both of the town\'s bells, and ships had nothing to hear the rocks by. Saltmere built the lighthouse, and the keepers carried the fire up to it, where ships could see it.',
        'The lamplighter who lit the great lamp went down once more to tend the bell. That was a hundred years ago. He drowned on the low stair, under the sea, and nobody went down after him. The keeping was in the tower by then.',
      ] },
      { id: 'belfry', title: 'The diving dress', when: 'won:1', lock: "Break Dark Water's pin.", scene: 'dress', text: [
        'Below Dark Water there is one more chamber, and its floor is under the sea. The keepers called it the Belfry. A lighthouse keeps its light at the top of a tower. The keepers hung their bell at the bottom of one.',
        'The Belfry is full of water and it does not drain, and an open lantern cannot go there. But on the wall above its stair hung an old keeper\'s diving dress, with a sealed lamp on its helmet. Its seams had rotted and its lamp was dry, so you carried it home and mended it in the boathouse, under the lamp Hester hung over the bench.',
        'Pack the dress in your Rig place, and the last stair is open. It does nothing in a fight, and it takes the place of anything else you would wear.',
      ] },
      { id: 'below', title: 'Into the Belfry', when: 'in:2', lock: 'Go down into the Belfry.', scene: 'below', text: [
        'On the last dry step you sealed the helmet, lit its lamp from your lantern, and walked down the keepers\' stair into the sea. Bosun lay down beside the open lantern to wait for you.',
        'The Belfry is full of bells. Every bell on this coast was cast to answer the Bellwether, and a bell the sea takes never stops answering. The harbour bell and the old bell-buoy held the water because they rang with the great bell, and down here a hundred lost bells still do.',
        'Whatever lives in the Belfry has learned it too. Its young wear broken bronze for shells, and look for bigger bells as they grow.',
      ] },
      { id: 'heart', title: 'The Heart comes home', when: 'heart', lock: 'Bring the Heart home.', scene: 'heart', text: [
        'The Bellwether hung in the Belfry over the Lantern Heart, and it rang with no hand on its rope. When its bronze broke, the Heart\'s light poured out through the water, and something came out of the bell with it: a thing with one eye and many arms, which had grown into the bronze in the hundred years nobody came down.',
        'You do not know if you killed it. When it let go of the Heart, it sank away into the dark under the floor.',
        'You carried the Heart up three levels of stairs. By dawn the great light of Saltmere was turning again, and the water stopped rising. Hester and Bosun watched from the path below the tower.',
      ] },
      { id: 'followed', title: 'Why the fire followed', when: 'heart', lock: 'Bring the Heart home.', text: [
        'Every keeper\'s hand-bell is tuned to the Bellwether, and every keeper\'s lantern is lit from the Lantern Heart. The great bell leads and the small ones follow. That is what a bellwether is: the sheep that wears the bell, and the flock walks behind it.',
        'For as long as the fire burned under the bell, keepers tended both. Then they carried the fire up into a tower, and for a hundred years ships came home by it. The bell stayed below, alone.',
        'Nobody rang it that night. The tide swings its clapper, and its ringing holds the tide, so it cannot stop by itself. For a hundred years nobody went down to still it, and it rang a little louder every year. Something was living in it by then. Whether that made it louder, nobody knows.',
        'When it rang loud enough, the Lantern Heart did what a keeper\'s light does. It answered the lead bell and went down, back to the place under the bell where it burned before there was a tower.',
      ] },
      { id: 'after', title: 'What stays below', when: 'heart', lock: 'Bring the Heart home.', text: [
        'The Bellwether is silent and the lighthouse is lit, and the sea has stopped climbing toward the town. But the Reach has soaked in brinelight for a hundred years, and the magic in it is still strong. Something still answers in the pins, the water still comes back over the landings, and new things fill the caves.',
        'Brinelight grows toward the brightest light near it. For a hundred years that was the glow the Heart left in the stone under the bell. Now it is the lantern of whoever goes down, and a wick keeps a little of whoever carries it. What grows below takes its shape from what the keeper brings down: grief, regret, fear. In the Belfry the Dreads are not what they were.',
        'Saltmere still needs a keeper who goes down. Quiet the Belfry, and bring home what you find. The sea is wide awake now, and it can choose its moods: once the Heart is home you can choose currents on shore, for a harder expedition and a higher score.',
      ] },
      { id: 'watch', title: 'The Dark Watch', when: 'quiet', lock: 'Quiet the Belfry as Wren after the Heart comes home.', scene: 'watch', text: [
        'On the Belfry\'s last landing, under the broken bell, a keeper was waiting for you. She wore your oilskin and your scarf. She carried your harpoon and your hand-bell, and your lantern, unlit.',
        'The light went out on your watch. You have not said it to anyone, not even Hester. Down there it had grown a body, and the body wanted the lighthouse dark again. When it was hurt it called for help, and what came was a diving dress with nobody in it.',
        'It went out like a pinched wick. You do not know if it was ever really there. The deep will grow it back, the way the bell brought back the water. Next time you will know its face. You climbed home, and the great light was turning.',
      ] },
      { id: 'mateo', title: 'A Second Lamp', when: 'keeper:mateo', lock: 'Follow the strange knocking in Dark Water after the Heart comes home.', scene: 'mateo', text: [
        'Wren brought a note home from the Split Cask. She and Hester puzzled over it until dark. At first light Mateo knocked at the lighthouse door. He had been dreaming about a cask, and the three knocks in the note were a signal he and his brother used.',
        'Mateo was in the rescue boat, with the line tied around his waist. His brother held the far end. When the flood took his brother, the line pulled Mateo against the gunwale. He cut it before it dragged him over. His brother never came back.',
        'Mateo lit his workshop lamp at the Heart and took a room at the inn in Saltmere. He means to go all the way down to the Belfry and hear the knocks himself.',
      ] },
      { id: 'hoop', title: 'The Last Hoop', when: 'quiet:mateo', lock: 'Quiet the Belfry as Mateo.', scene: 'hoop', text: [
        'The cask beneath the silent bell was larger than any he had made. Every time he reached for its lid, he heard the three knocks. When it finally opened, only water came out.',
        'Mateo told Hester his brother’s name for the harbour record. Upstairs, Wren showed him how to trim his lamp wick.',
        'Mateo invented a harbour regulation about tea on watch and brought Wren a mug. He’d been looking forward to seeing her. To her, it was tea with a fellow keeper, and that suited him. She thanked him and went up to take the watch.',
      ] },
    ],
    /* The world: a glossary. An entry has ONE text, and it never changes as the player gets further (v0.63.0, the
       user's rule: "I dont want to change texts in glossary throughout progress, only unlock new ones"). So each text
       has to be true on the first night and after the Heart is home, and what is only learned later is its own entry,
       which opens with its third field: { level } once that level is known (ui.js, levelKnown), or { when } once
       that story mark is earned ('heart', 'keeper:mateo'). An entry open from the start names no level below the
       Shallows. Until v0.62.0 five entries had a shorter `before` text that was swapped for the full one. */
    world: [
      { group: 'Places', items: [
        ['Saltmere', 'A harbour town on a rocky headland. Its lighthouse stands on a rock off the end of the headland and warns ships off the rocks.'],
        ['The lighthouse', 'It stands on its own rock off the harbour, and you keep it. You live there with Hester, who kept it before you, and Bosun. At low tide you can walk across to the town. The Lantern Heart is the fire of its great lamp.'],
        ['The Drowned Reach', 'The sea-caves, stairs and rock terraces under the cliffs, below the lighthouse. They are flooded with seawater that bells hold in place.'],
        ['Expeditions', 'Every expedition starts on the shore and goes down through the Reach a level at a time, from the Shallows. You can go home after any pin, with everything you carry. The next expedition starts on the shore again.'],
        ['Dark Water', 'The level below the Shallows. Its water has been held still for a hundred years, so the brinelight in it has nowhere to go, and things there have learned to live on it. Its pin is the Tolling Buoy.', { level: 1 }],
        ['The Belfry', 'The last level, below Dark Water: a chamber at the bottom of a tower, under the sea. It never drains. The Bellwether hangs there, over the place where the Lantern Heart burned before there was a lighthouse. You can only go down in a diving dress. It is a short way down: past two Dreads, coming up for air under the lesser bells that hang in the tower.', { level: 2 }],
        ['The last dry step', 'Where the keepers\' stair goes under the sea, below Dark Water. An open lantern cannot go further. Yours stays there, lit, and Bosun lies down beside it to wait for you.', { level: 2 }],
        ['Landings', 'The stops on the way down through a level. A boss waits on the last one: in the Shallows, the Harbour Hermit.'],
        ['Currents', 'Moods of the sea that make an expedition harder and its score higher. You choose them on shore, once the Heart has come home.'],
        ['The Lazaret', 'The locked store room at the lighthouse where keepers shut keepsakes away. It keeps their Roil inside, so many can lie there together. Hester keeps its key, and gives it to you the first time you come home.'],
      ] },
      { group: 'People', items: [
        ['Wren', 'You. The lighthouse keeper of Saltmere. On the night the light went out, you were the last keeper it had.'],
        ['Hester', 'The old keeper. She kept the light for forty years and taught you. The lantern you carry was hers: when her knees gave out on the tower stairs she gave it to you, and the keeping with it. She never went down the stair. She knows the Reach only from the keepers\' book, and she waits for you at home.'],
        ['Bosun', 'A big golden dog with a soft mouth, Hester\'s first and yours now. He goes down the Reach with you and keeps back from a fight. When the sea gives you back, he is the one who pulls you out of it.'],
        ['Keepers', 'The people who tend the light and the bell. A keeper carries a lantern lit from the Lantern Heart and a hand-bell tuned to the Bellwether.'],
        // v0.62.0: who the Tide-Witch is, and that there is one of her, not a world of witches (WORLD.md, "Before the keepers")
        ['Tide-wives', 'Before the keepers cast their bell, Saltmere paid tide-wives to sing the water for its boats. The bell ended the trade. One hut is left in the Shallows, and the town calls the crone in it the Tide-Witch.'],
        ['The oilskin', 'A keeper\'s coat, proofed with the oil that burns in the great lamp under the Heart\'s fire. Brine runs off it, and so does brinelight, so the Reach never soaks into a keeper the way it soaks into lost things. No keeper goes down without one. Everything else you wear goes over it, in your Rig place.'],
        ['Barnaby', 'A hermit crab who keeps a shop in his shell. He sells cards, keepsakes and tonics for pearls.'],
        ['The diving dress', 'An old keeper\'s diving suit with a sealed lamp on its helmet. You find it the first time you break Dark Water\'s pin and carry it home. Pack it in your Rig place to go down into the Belfry.', { level: 2 }],
        ['Mateo', 'A cooper from Saltmere, with a mallet and a barrel lid for a shield. In the flood he lost his brother off the other end of a rescue line. He lit his workshop lamp at the Heart, and he is the second keeper who goes down.', { when: 'keeper:mateo' }],
      ] },
      { group: 'Light and bell', items: [
        ['The Lantern Heart', 'The magic fire of Saltmere\'s great light. Every keeper\'s lantern is lit from it.'],
        ['Light', 'The fire in your lantern. You spend it to play cards, and it comes back at the start of each turn.'],
        ['The Bellwether', 'An enchanted bronze bell. Its ringing holds seawater in place. Keepers sank it under the cliffs long ago to hold the sea back. Nobody tended it for a hundred years, and it learned to ring by itself.'],
        /* One entry since v0.62.0 (Places had a second, shorter "Pins"). "Lost bells", not "lesser bells": the lesser
           bells are the Belfry's own, where air is caught. Dark Water's entry names its pin. */
        ['Pins', 'Lost bells that answer the Bellwether and do its work. A pin holds the water in its own part of the Reach, over the stair down, and it is the boss of that level. Silence it and the water runs away down the stair. The harbour bell in the Shallows is a pin.'],
        ['Why so many bells', 'Every bell on this coast was cast to answer the Bellwether, and a bell the sea takes never stops answering. Saltmere\'s old harbour bell was lost in a storm. Under the water it rang whenever the great bell rang, and held its water for it, and a hermit crab wore it for a shell.'],
        ['The lost bells', 'Saltmere\'s old harbour bell and its bell-buoy were lost in one winter storm, a hundred years ago, and under the water both went on answering the great bell. The Belfry is full of bells the sea took. Things that grow in the Heart\'s light take to them: in the Belfry young things wear broken bronze and look for bigger bells.', { level: 2 }],
        ['Tide-bell', 'Your hand-bell. Ring it and the water near you moves. Keepers call it a tide-bell because it is tuned to the Bellwether, the bell cast to hold the tide.'],
        ['The Swell', 'The water around the enemies in a fight. You stand on stone and they stand in the wash. Surge raises the water until a wave breaks on them: a Crest. Ebb pulls it away until they are left on bare rock: a Strand.'],
        ['The broken bell', 'The Bellwether is broken and silent, and the Lantern Heart is home. The lost bells have not stopped: something still answers in the pins, and the water comes back over the landings before the next tide. A faint light stays where the Heart lay. What grows below grows toward it, and toward the lantern of whoever goes down.', { when: 'heart' }],
      ] },
      { group: 'Magic in the water', items: [
        ['Brinelight', 'The glow in the water of the Reach. It is light from the Lantern Heart that has soaked into the seawater the bells hold.'],
        ['Keepsakes', 'Lost things that have lain in brinelight until they took on a magic of their own. The deeper they lay, the stronger they are.'],
        ['The aether', 'The unseen stuff that carries magic, the way air carries sound. Every keepsake stirs it. Roil is how much.'],
        ['Calm and Roiled', 'The aether around you can take a certain amount of Roil: your Hold. Up to that it is Calm. Past it the aether is Roiled. First seawater comes out of it into your pack: Seep. Then the aether thrashes, and it strikes you each turn unless your Ward is still up: Thrash. Then the noise carries, and a Bell Minnow comes to look. A Roiled aether also shakes Pearls loose: every fight in it pays more.'],
        ['Pearls', 'Brinelight gone hard. They grow wherever the light pools: in shells, in wrecks, and in whatever has been eating it, which is why you find them after fights. In the Reach they are money.'],
        /* v0.63.0: a flask filled on the stair gives the same tonics ("You fill a flask with brinelight"), so the Witch's
           brews are not the only source: the held water keeps what it takes, her bottles among it, and brinelight copies. */
        ['Tonics', 'Brews in small bottles. Each works once. The Tide-Witch brews them. The ones you find in the Reach are bottles she sold to sailors, and the held water kept them. It remembers them, too: where brinelight stands deep, on a stair down, an empty flask fills with one of her brews.'],
      ] },
    ],
    notes: [
      { id: 'barnaby', title: 'Barnaby', when: 'shop', lock: 'Found at a shop.', art: 'units/trader',
        text: 'Barnaby is a hermit crab, and his shell is both his house and his shop: Barnaby\'s Drifting Emporium. He says everything in it came down with a wreck, and that it still works, mostly. He trades fairly and will not haggle. He also asks that you do not bite. Ask how a crab learned to talk and he says he had good company: he keeps the lanterns of keepers who did not come back up, and a wick lit from the Heart keeps a little of whoever carried it. Those he will not sell. What he does with the Pearls he does not say, but his shell is a little brighter every year.' },
      { id: 'cove', title: 'Sheltered Coves', when: 'cove', lock: 'Found at a Cove.', art: 'scenes/rest',
        text: 'Here and there the caves have a dry hollow above the reach of the tide. The keepers stocked each one with a blanket, a kettle and a coil of rope, and no keeper has been down for a hundred years. Somebody still does it: the blanket is dry, and the kettle has been scoured with sand. Barnaby, the crab who keeps the shop, says he would not know anything about that. The bell\'s water cannot reach you there, and a lantern burns steadily.' },
      { id: 'chest', title: 'Sea chests', when: 'wreck', lock: 'Found at a Wreck.', art: 'scenes/treasure',
        text: 'On an ordinary coast the sea breaks a wreck up and washes the pieces ashore. The water the bell holds keeps everything it takes. Chests lie where they sank, and what is inside has soaked in brinelight for years. That is why it glows.' },
      { id: 'toll', title: 'Toll bells', when: 'toll', lock: 'Pass a toll bell.', art: 'scenes/ev_toll',
        text: 'Where the keepers\' way down narrowed, they hung a bell across it, low, so that nothing could come up out of the deep without ringing it. The Bellwether\'s water has those bells now, and like every lost bell on this coast they answer it. Each one swings over the only way on and lets nothing pass for free. It strikes whoever wades under it. Pearls are brinelight gone hard, and it drinks them if you throw them into its mouth. Or you can squeeze past it through the barnacled rock beside it, and the barnacles come with you.' },
      { id: 'keepsake', title: 'How a keepsake is made', when: 'keepsake', lock: 'Carry a keepsake.', art: 'icons/k_whaletooth',
        text: 'A keepsake starts as something somebody lost: a fish hook, a gull\'s feather, a whale\'s tooth. It lies in brinelight for years, and when it is found it works a small magic of its own. Nobody knows why some lost things turn and others do not. A keepsake also drinks a little from your lantern in every fight you carry it through. Throw it back into the bell\'s water, at a Cove or on the stair, and the sea gives that light back: it closes your wounds and tempers a piece of gear. The old light stays in the keepsake and goes down with it. The keepers called it giving one to the sea.' },
      { id: 'seep', title: 'A Roiled aether', when: 'roiled', lock: 'Carry more Roil than your Hold.', art: 'cards/c_seep',
        text: 'One keepsake stirs the aether a little. Many together stir it more than it can take. First seawater beads on your gear and soaks into your pack. Keepers call that Seep. Stir it further and the aether thrashes like a hooked fish. It has no aim. It strikes whoever stands nearest, again and again, and each blow takes a little of you unless you are still braced for it. That is Thrash. Further still, and the noise carries: a Bell Minnow hears it, and comes to find what is calling. A thrashing aether also shakes Pearls loose from the rock and from whatever you fight in it, so a keeper who can stand it comes home richer. To calm it, drop a keepsake, give one to the sea at a Cove, or bring fewer from home.' },
      { id: 'lazaret', title: 'A night in the Lazaret', when: 'home', lock: 'Come home from an expedition.', art: 'scenes/lazaret',
        text: 'A lazaret is a ship’s store locker, and also a house where the sick are kept apart. The keepers’ Lazaret is a little of both. Hester locks the keepsakes inside to shut in their Roil. If you take one down again, the sea can claim it. Every keepsake you bring back goes into the store.' },
      { id: 'hester', title: 'Hester', when: 'home', lock: 'Come home from an expedition.', art: 'scenes/op_home',
        text: 'Hester kept the light for forty years. She taught you to trim a wick, to read the tide and to ring a hand-bell so the water listens. When her knees gave out on the tower stairs she gave you her lantern, and the keeping with it, so she is not a keeper any more. Like every keeper since the Lost Lamplighter, she never went down the stair. What she knows of the Reach is in the keepers\' book, which she keeps and you read. When you come home, the kettle is on.' },
      { id: 'bosun', title: 'Bosun', when: 'fell', lock: 'Fall in the Reach.', art: 'scenes/sc_fall',
        text: 'Bosun was Hester\'s dog first. He is big and golden and soft-mouthed, and he has pulled gulls, oars and once a fisherman\'s boy out of the harbour. He goes down the Reach with you and keeps back from a fight. When the held water takes you he goes in after you, and he does not let go of your scarf until the sea gives you back.' },
      { id: 'kelp', title: 'The old coast', when: 'ev:ambush', lock: 'Found in the Fog.', art: 'scenes/ev_ambush',
        text: 'Not everything in the Reach serves the bell. Crabs, eels, gulls and kelp lived on this coast long before it rang by itself. The flooding gave them more room, and they guard what they find in it.' },
      { id: 'deckhand', title: 'Drowned Deckhands', when: 'en:sailor', lock: 'Found in a fight.', art: 'units/sailor',
        text: 'The open sea carries the drowned back to shore. The water the bell holds does not. The crews of its wrecks are still down there, and they still work their watch.' },
      /* v0.62.0: the creatures left from before the game had a world each get a place in it (WORLD.md, "Before the
         keepers" and "People and creatures"). The Wisp is brinelight out of the water, the Siren a tide-wife's note with
         nobody singing it, the Hulk something old Saltmere fed, the Twins deep-water fish the flood let up. */
      { id: 'wisp', title: 'Fog Wisps', when: 'en:wisp', lock: 'Found in a fight.', art: 'units/wisp',
        text: 'Brinelight does not stay in the water. On cold nights it comes off the pools as a glowing fog, and that fog is what hides so much of the Reach. Some of it holds together and drifts after a lantern. Its touch is cold, and it leaves fog in your pack: Fog Bank. Hester says it is only light and cold air. But the light in that water came out of keepers\' lanterns, and a Wisp stands like someone in a hood.' },
      { id: 'siren', title: 'The Hollow Siren', when: 'en:siren', lock: 'Found at a Dread.', art: 'units/siren',
        text: 'She sings one flat note, and the water goes flat with it. It is the slack-water note that Saltmere\'s tide-wives sang for the fishing boats, for a price, before the keepers cast a bell to do their work. Nobody is singing it. The bell\'s water keeps what it takes. It kept the note and grew a shape around it, the way a pearl grows around grit, and the shape is the one sailors always said was out there. That is why the keepers\' book calls her hollow. While she sings, your Swell is dragged back to the middle, and no wave can build.' },
      { id: 'hulk', title: 'The Reefback Hulk', when: 'en:hulk', lock: 'Found at a Dread.', art: 'units/hulk',
        text: 'The fishers of old Saltmere called it the Hulk, and left it the first fish of every season so that it would leave their boats alone. It slept under the low rocks for years at a time, long enough for a reef to grow on its back. The bell\'s water has kept it wet and awake for a hundred years, and nobody feeds it now. Nobody knows what it is under the reef. The reef is its armour, and whatever strikes it is cut: Spines.' },
      { id: 'angler', title: 'The Angler Twins', when: 'en:angler', lock: 'Found at a Dread.', art: 'units/angler',
        text: 'Anglerfish belong in deep water, where the only light is the one they carry. The bell\'s flood let these two up the stairs, pool by pool, and now they hunt the Shallows the way you walk them: by a small light held out in the dark. They have never hunted alone. Kill one, and the other goes mad and hits far harder.' },
      { id: 'lamplighter', title: 'The Lost Lamplighter', when: 'ev:ghost', lock: 'Found in the Fog.', art: 'scenes/ev_ghost',
        text: 'Saltmere remembers him as the lamplighter: the keeper who lit the great lamp on the night the lighthouse was finished. Afterwards he went down once more to tend the bell, and he was the last keeper who did. He drowned on the low stair a hundred years ago, and he has kept the keepers\' stairs ever since, with a lantern that went out when he did. A keeper can light another lantern from their own, but it takes something out of the one who gives. That is why sharing your light hurts.' },
      { id: 'goddess', title: 'The forgotten goddess', when: 'ev:shrine', lock: 'Found in the Fog.', art: 'scenes/ev_shrine',
        text: 'Saltmere is older than its keepers. Before it had a light or a bell, it asked the sea for what it needed, and paid for it here in blood. Then the keepers held the sea back, and nobody needed to ask. Her stone hands are still held out, and they are empty. She still answers an offering: the water around the altar turns warm. Hester says that is only brinelight. The old town had another name for it, and that is the name nobody remembers.' },
      { id: 'witch', title: 'The Tide-Witch', when: 'ev:witch', lock: 'Found in the Fog.', art: 'scenes/ev_witch',
        text: 'Before the keepers cast their bell, Saltmere paid tide-wives to sing the water: a slack tide to cross the bar, a fair wind tied into a knot. A bell does not ask to be paid, and the trade died. One hut is left, on stilts below the tide line, and there has been a crone in it for as long as Saltmere remembers. Nobody likes to ask whether it has always been the same one. Her brews cost pearls. Her lessons are the old craft, and they cost what it always cost: years off your life, knotted into her shawl. That is why your Max HP drops.' },
      { id: 'gull', title: 'The Gilded Gull', when: 'ev:wreck', lock: 'Found in the Fog.', art: 'scenes/ev_wreck',
        text: 'A merchant ship, split open in a rock basin. Her captain\'s cabin is still sealed and her hold is still flooded. Something long and cold has made the hold its home.' },
      { id: 'pool', title: 'The Glimmering Pool', when: 'ev:pool', lock: 'Found in the Fog.', art: 'scenes/ev_pool',
        text: 'The turquoise glow in the pool is brinelight. There is so much of it here that the water is warm, and the light seems to listen. It mends wounds and sharpens gear. It has also given the pearls in the pool a bite. And it copies: lean over the water and your reflection leans back a moment late, and it has been known to reach up. The keepers\' book says not to look long.' },
      { id: 'bottle', title: 'The message in the bottle', when: 'ev:bottle', lock: 'Found in the Fog.', art: 'scenes/ev_bottle',
        text: 'A sailor wrote down what he knew about fighting at sea, corked the note in a bottle and threw it over the side. The open sea would have carried it to a beach. The bell\'s water kept it here, and the glass has started to glow.' },
      { id: 'bellwether', title: 'The Bellwether, up close', when: 'en:bell', lock: 'Found on the last landing of the Belfry.', art: 'units/bell',
        text: 'A hundred years untended have changed the bell. Coral and weed grow on its bronze, and something with one eye and many arms has grown into it. When the bronze cracks, a shoal of Bell Minnows comes to its call.' },
      // Dark Water
      { id: 'lighteaters', title: 'What eats the light', when: 'en:leech', lock: 'Found in Dark Water.', art: 'units/leech',
        text: 'Below the Shallows the water has been held still for a hundred years. The brinelight that soaks into it has no tide to carry it away, so it gathers, and things have learned to live on it. Leeches, pale stalks and long glowing chains all shine with what they have eaten. They all turn toward an open flame. A keeper\'s lantern is the brightest thing they have ever seen. When one drinks from it, you start each turn with less Light until the water swings hard enough to fan the flame again, at a Crest or a Strand: you are Doused.' },
      { id: 'hermit', title: 'Lamp Hermits', when: 'en:hermit', lock: 'Found in Dark Water.', art: 'units/hermit',
        text: 'Keepers carried lanterns down the stair, and not all of them came back up. The hermit crabs of Dark Water grew too big for whelk shells long ago. They live in the keepers\' lanterns now, and they keep their Ward from turn to turn the way the lanterns kept their glass. A Strand still strips it.' },
      { id: 'strider', title: 'The Garden Strider', when: 'en:strider', lock: 'Found at a Dread in Dark Water.', art: 'units/strider',
        text: 'A sea spider is mostly legs. Its body is too small to hold its own gut, so the gut runs down inside the legs. It lives by sucking the soft animals of the sea floor. The one in Dark Water is taller than a man. At night it walks the Glimmer Garden on its stilt legs and grazes the beads, and the light it drinks shows through its skin. It is what tends the garden: it sows Glimmer Leeches among the stalks, and it notices what is taken. The keepers who wrote about it called it the Gardener.' },
      { id: 'buoy', title: 'The Tolling Buoy', when: 'en:buoy', lock: 'Found on the last landing of Dark Water.', art: 'units/buoy',
        text: 'Before there was a lighthouse, Saltmere had a bell-buoy. It rocked on its chain off the harbour rocks and rang in the swell, so ships heard the rocks before they saw them. A storm broke its chain and it sank. Now it rings for the Bellwether. It is a pin: while it rings, it holds the water in Dark Water. The light-eaters in its cage have grown together into one shape, like a woman kneeling with her arms round the bell. It sings what the bell rings. It still rocks on the water. The further you push the Swell from the middle, the harder its Toll swings, and every Toll is louder than the last. Hurt, it snaps its chain and swings free, and then it rings wild. A breaking wave smothers a bell, and a bell on dry rock cannot swing.' },
      { id: 'tideboard', title: 'The tide-board', when: 'ev:tideboard', lock: 'Found in the Fog in Dark Water.', art: 'scenes/ev_tideboard',
        text: 'For as long as there have been keepers, they cut a line for the highest tide of the year. While they still tended the Bellwether, the lines go up and down. For the last hundred years every line is higher than the one before. No living keeper came down to cut those, and they are all in one hand. The drowned on this coast still work their watch. The bell holds the sea off the town by holding it under the cliffs, and the water it holds grows every year.' },
      { id: 'garden', title: 'The Glimmer Garden', when: 'ev:garden', lock: 'Found in the Fog in Dark Water.', art: 'scenes/ev_garden',
        text: 'The stalks are not plants. They are animals rooted to the stone like barnacles, and each bead is a mouth full of brinelight. Picked, a bead hardens into a pearl. The garden grows around whatever glows brightest, and sometimes that is a keepsake. Something in the water tends it, and it notices what you take.' },
      { id: 'divingbell', title: 'The diving bell', when: 'ev:divingbell', lock: 'Found in the Fog in Dark Water.', art: 'scenes/ev_divingbell',
        text: 'Before the lamplighter, keepers went down to the Bellwether in a diving bell, with a pump on the stair above feeding them air. One of them stayed down. His tally runs to two hundred and twelve days. Nobody knows what kept him alive that long, or why he stopped counting.' },
      // the Shallows' pin
      { id: 'harbour', title: 'The Harbour Hermit', when: 'en:harbour', lock: 'Found on the last landing of the Shallows.', art: 'units/harbour',
        text: 'Saltmere\'s harbour bell hung on the harbour wall and rang the boats home in fog, until a winter storm tore it down. A hermit crab grew into it as it would into any shell, and kept growing. Now it answers the Bellwether, and it holds the water over the Shallows\' stair. It pulls into the bell and stays there, and its Ward stays with it. A Crest rings the bell around its ears, and a Strand leaves it stuck on the rock: either one shakes it out.' },
      { id: 'splitcask', title: 'The Split Cask', when: 'dread:mateo', lock: 'Beat the Dread that knocks in Dark Water.', art: 'units/splitcask',
        text: 'The cask has a cooper’s stamp on one stave and a warp in the wood where a rope bit into it. You heard three knocks from inside. An oilskin packet fell out when the staves split. Bring the note inside it home to Hester.' },
      { id: 'lasthoop', title: 'The Last Hoop', when: 'en:lasthoop', lock: 'Found in the Belfry.', art: 'units/lasthoop',
        text: 'Left in the held water, the cask swelled until only the last hoop held it. When it gives way, the water it has held rushes out. Strip its Ward with a Strand to ease the blow.' },
      // the Belfry
      { id: 'thing', title: 'The Thing in the Bell', when: 'en:bellthing', lock: 'Found in the Belfry.', art: 'units/bellthing',
        text: 'It has one eye and many arms, and it grew into the Bellwether\'s bronze the way a hermit crab grows into a shell. Nobody knows what it eats. It drinks from a keeper\'s light through its arms, so cut the arms and it drinks less. When its eye opens it can be hurt, and then it glares.' },
      { id: 'spawn', title: 'Bellspawn', when: 'en:spawn', lock: 'Found in the Belfry.', art: 'units/spawn',
        text: 'Small things with one eye and many arms. They are young, and you do not want to know what they grow into. They wrap around the dress and squeeze the air out of it, and a keeper who cannot breathe cannot think: you draw fewer cards.' },
      { id: 'belljelly', title: 'Bell Jellies', when: 'en:belljelly', lock: 'Found in the Belfry.', art: 'units/belljelly',
        text: 'Jellyfish shaped like little bells, with a glowing clapper inside. When one chimes, the Belfry rings with it, and whatever hears it does its next thing twice.' },
      { id: 'bladder', title: 'Glimmer Bladders', when: 'en:bladder', lock: 'Found in the Belfry, after the Heart comes home.', art: 'units/bladder',
        text: 'Light-eaters that found the Heart. They have drunk so much of its light that they cannot hold it, and they burst when they die. Brace before you kill one, or kill it next to its friends.' },
      { id: 'listener', title: 'Listeners', when: 'en:listener', lock: 'Found in the Belfry, after the Heart comes home.', art: 'units/listener',
        text: 'They have no eyes. Nothing that was born under the bell has needed them. They have two fans of thin skin where the eyes would be, and with those they heard the Bellwether through a mile of rock. Now they hear you. Every card you play is a sound, and a Listener that is about to pounce hits harder for each one. Sometimes the right thing to do is less.' },
      { id: 'diver', title: 'The Hollow Divers', when: 'en:diver', lock: 'Found in the Belfry, after the Heart comes home.', art: 'units/diver',
        text: 'Keepers went down to the bell in diving dresses like yours, and some of the dresses are still walking. There is no keeper in them. Pale things grew in through the rotted seams and filled the canvas the way a hand fills a glove, and they have learned to walk it. The lamp on the helmet still glows, cold, and it drinks from yours.' },
      { id: 'yearling', title: 'The Bell Yearling', when: 'en:yearling', lock: 'Found at a Dread in the Belfry, after the Heart comes home.', art: 'units/yearling',
        text: 'Too big for Bellspawn and too small for a bell. It wears a piece of broken bronze on its head, as a hermit crab wears a shell it means to grow out of, and it is looking for a bigger one. It has one eye. When the eye opens it can be hurt, and then it glares. Remember that. Something larger down here does the same.' },
      { id: 'ringer', title: 'The Drowned Ringers', when: 'en:ringer', lock: 'Found at a Dread in the Belfry.', art: 'units/ringer',
        text: 'Keepers who went down to tend the bell and stayed. They still carry their hand-bells, and they still ring them for the Bellwether. When a Ringer rings out, every creature that hears it does its next thing twice. One of them may be the keeper from the diving bell, who stopped counting at two hundred and twelve days.' },
      { id: 'oarfish', title: 'The Crowned Oarfish', when: 'en:oarfish', lock: 'Found at a Dread in the Belfry.', art: 'units/oarfish',
        text: 'Sailors called the oarfish the king of herrings, for the red crest it wears like a crown. This one came in from the open sea through the Belfry\'s broken arch. It coils around a diver and squeezes, and its crest is sharp.' },
      { id: 'lanterns', title: 'The Lost Lanterns', when: 'ev:lanterns', lock: 'Found in the dark around a lesser bell, in the Belfry.', art: 'scenes/ev_lanterns',
        text: 'Every keeper who went down carried a lantern lit from the Heart. When a keeper drowned, the lantern rolled on down the stairs, toward the fire it was lit from, and it stopped where the Belfry floor stopped it. A wick lit from the Heart keeps a little of whoever carried it. Light one from yours, and for a moment you know what they knew.' },
      { id: 'heartglow', title: 'The glow under the bell', when: 'ev:heartglow', lock: 'Found in the dark around a lesser bell, in the Belfry.', art: 'scenes/ev_heartglow',
        text: 'The Lantern Heart burns in water as well as in air. It burned here, under the bell, before there was a lighthouse. When the keepers carried it up, a little of its light stayed in the stone where it had lain. That glow warmed the Belfry for a hundred years, and everything down there grew toward it, the way a plant grows toward a window. When the Heart goes home again it is the same: a little stays, and they still grow toward that.' },
      { id: 'rope', title: 'The bell-rope', when: 'ev:rope', lock: 'Found in the dark around a lesser bell, in the Belfry.', art: 'scenes/ev_rope',
        text: 'The keepers rang the Bellwether by hand once, with a rope that ran up the tower to the stair. The top of it rotted away long ago. The rest hangs in the water, and the creatures of the Belfry climb it, nest in it, and hide what they find in its weed. Pull it, and something in the tower gives one slow note, and everything near it hears.' },
      { id: 'choir', title: 'The Drowned Choir', when: 'en:cantor', lock: 'Found at a Dread in the Belfry, after the Heart comes home.', art: 'units/cantor',
        text: 'With the Bellwether silent, the drowned keepers gather under it and try to ring it again. The Cantor leads them. Silence the Cantor and the others stop, and drift back into the dark. You know some of their faces from the keepers\' book. You wonder if they are really there, or if you brought them down with you.' },
      { id: 'darkwatch', title: 'The Dark Watch', when: 'en:darkwatch', lock: 'Found on the Belfry\'s last landing, after the Heart comes home.', art: 'units/darkwatch',
        text: 'It wears your oilskin and your scarf, and it carries your harpoon, your hand-bell and your lantern, unlit. It rings your own bell against you and sets the Swell back where you started. It pinches the wick, and its Lights Out comes harder every time. Hurt it badly and it calls Nobody Comes Home: a diving dress with no keeper in it. The light went out on your watch. Down there, that grew a body.' },
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
    longwatch: { name: 'The Long Watch', desc: 'Once the Heart is home, beat the Dark Watch and quiet the Belfry.', met: (r) => r.keeper !== 'mateo' && !!r.quieted && r.screen === 'victory' },
    lasthoop: { name: 'The Last Hoop', desc: 'Quiet the Belfry as Mateo.', met: (r) => r.keeper === 'mateo' && !r.cheated && !!r.quieted && r.screen === 'victory' },
  };
})();
