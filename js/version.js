/* Brinelight — version number and player-facing changelog (newest first).
   Shown on the title screen ("What's new") and at the foot of the menu.
   For every player-facing change: bump BL.VERSION, add an entry at the top, and match package.json.
   Minor (0.x.0) for new rules, content or features; patch (0.x.y) for fixes only. */
(function () {
  'use strict';
  const BL = (globalThis.BL = globalThis.BL || {});
  BL.VERSION = '0.7.0';
  BL.CHANGELOG = [
    { v: '0.7.0', date: '2026-11-11', items: [
      'The Workshop: every finished run turns its score into Salvage. Spend it on gear that lasts across runs.',
      'Pack gear before each dive. The Shallows hold 3 spaces and each deeper depth 1 more, so you choose what to bring.',
      '9 pieces of gear: Coin Purse, Cork Vest, Spare Flask, Flood Chart, Ebb Chart, Shell Gorget, Barnaby\'s Marker, Storm Lens and Whetstone.',
      '6 achievements unlock gear, such as Crest three times in one turn, or win 3 fights in a run without losing HP.',
    ] },
    { v: '0.6.0', date: '2026-11-11', items: [
      'The version number and this list of changes are on the title screen.',
      'Turning down a reward is worth more: +50 score for a card or an event\'s Leave, +80 for a Dread\'s card, +20 for a tonic. It was +20 for each.',
      'The map runs downward: you start at the top and the boss waits at the bottom.',
      'Fix: the title screen overlapped itself on landscape phones.',
    ] },
    { v: '0.5.0', date: '2026-11-11', items: [
      'Turning down a reward (a card, a tonic, an event\'s Leave) adds to your final score.',
      'You must take one of the offered keepsakes before you move on.',
      'The Gilded Gull\'s flooded hold pays 150 Pearls when the dive goes well (was 90).',
      'Barnacle Growth says what it does: an unplayable curse that stays until you remove it.',
      'Fix: Bell Minnows and other summoned enemies stayed on the field after they died.',
    ] },
    { v: '0.4.0', date: '2026-11-11', items: [
      'Low Water reworked: the enemies lose all their Ward and you gain 1 Light. It no longer gives you Ward.',
      'New bonus, Deep Ebb: 2 or more Low Waters in one turn. Tidal Fury and Deep Ebb are announced the moment you earn them.',
      'The score counts Low Waters the same way as Crests.',
      'Kelp Bracelet gives 8 Ward at Low Water. Tidal Memory now works on Crests only. Spring Tide reaches Low Water, then Crests.',
      'Card choices list the keywords on the offered cards.',
    ] },
    { v: '0.3.0', date: '2026-11-11', items: [
      'The shop asks before you buy.',
      'Enemy intents show the Ward they will gain. The CREST badge shows how many Crests a card makes.',
      'Clearer events, map, rewards and end screens, and fewer messages that repeat the screen.',
    ] },
    { v: '0.2.0', date: '2026-11-10', items: [
      'A guided first fight teaches the basics and the Tide. Short hints explain new things the first time you meet them.',
      'Larger text and a clearer fight screen. How to Play is five short tabs.',
      'Fix: Soaked on the keeper wore off before the enemies attacked. Soaked enemies now hit as hard as their intent says.',
      'Fix: long card text was cut off on phones.',
    ] },
    { v: '0.1.0', date: '2026-11-10', items: [
      'First playable version: a descent of 11 stops to the Drowned Bellwether, with 38 cards, 13 enemies, 19 keepsakes, 7 tonics, 7 events and 4 depths.',
    ] },
  ];
})();
