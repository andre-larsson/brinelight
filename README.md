# Brinelight

A single-player roguelike deckbuilder for the browser. The great light of Saltmere has gone dark: something far below the waves rang a bell, and the Lantern Heart sank with the tide. You play Wren, the last lighthouse keeper, diving through the Drowned Reach to take it back from the Drowned Bellwether.

**Play it:** <https://andre-larsson.github.io/brinelight/>

One run is a complete demo: about 11 stops on a branching map, ending with the boss. It takes roughly 15 to 25 minutes. Winning unlocks deeper, harder starting depths, and every run ends with a score to beat.

**New here?** The first time you start a descent, the game offers a short guided fight (about 2 minutes) that teaches the basics and the Tide. You can skip it, and replay it any time from the title screen or the menu. After that, short hints explain new things the first time you meet them.

## Running it

It's plain HTML, CSS and JavaScript, with no build step and no dependencies.

- **Static server (recommended):** from this folder run `npm start` (or `python3 -m http.server 8000`), then open <http://localhost:8000>.
- **No server:** open `index.html` directly in a browser.

**Debug mode (for testing):** add `?debug` to the address. A DEBUG tab appears at the left edge, and the `` ` `` key opens the same panel. It can add Salvage and kit, unlock achievements and depths, reset progress, give Pearls, cards, keepsakes and tonics, turn on god mode, set the Tide, win or lose a fight, and visit any kind of stop. A run where you use a cheat keeps no best score and unlocks no depth. Add `?debug=0` to turn the mode off, or use the panel.

Progress is saved automatically in your browser, at the start of every turn and between map stops. **Continue** on the title screen resumes the run. To replay a specific map and card sequence, add `?seed=12345` to the URL before starting a new run.

## Controls

| | Play a card | Other |
|---|---|---|
| **Mouse** | Click a card to raise it, then click an enemy (or click the card again for cards without a target). You can also drag a card onto an enemy, or up into the sea. | Hover anything (statuses, intents, keepsakes, the Tide gauge) for a tooltip. Click the draw or discard pile to see it. Between fights, click a keepsake to drop it. |
| **Touch** | Tap a card to raise it and read it, then tap an enemy, or tap the card again. Dragging works too. | Tap an enemy or the keeper to see HP, intent and effects. Tap a keepsake to read it, or between fights to drop it. |
| **Keyboard** | `1`-`9`, `0` pick a card; `←` `→` choose the target; `Enter` / `Space` / `↑` play it; `Esc` / `↓` cancel. | `E` end turn, `D` view deck, `Z` `X` `C` use tonic slots 1-3. On the map: arrow keys and `Enter` (or `1`-`9`). On reward screens: `1`-`3` pick a card. `Tab` reaches every button. |

The menu (top right) has the tutorial, How to Play, sound effects on/off, music on/off, fast animations, save and quit, and abandon run.

## Rules

**Fights.** Each turn you get 3 **Light** and draw 5 cards. Each card costs the Light shown in its corner. Cards you don't play are discarded at the end of the turn, and your discard pile is reshuffled into the draw pile when that runs out. Enemies show their **intent** above their heads (the number is the damage they're about to deal). Your keeper shows how much of that will get past your Ward. The screen edges glow red when the incoming hit would be lethal.

**Ward** blocks damage and washes away at the start of your next turn. Enemies can have Ward too; theirs lasts until they act again.

**The Tide** is the game's central mechanic. It's a gauge from 0 to 6 that starts every fight at 3.
- **Surge** raises it and **Ebb** lowers it.
- At 6 the wave **Crests**: it deals 6 damage to every enemy, then the Tide resets to 3.
- At 0 you hit **Low Water**: the sea pulls back and strands the enemies. They lose all their Ward, and you gain 1 Light. Then the Tide resets to 3.
- **Extra Surge or Ebb carries over.** It keeps flowing from 3, so Surge 6 from Tide 3 Crests twice.
- **Chains:**
  - Every extra Crest in the same turn hits 3 harder (6, 9, 12, 15...).
  - Every Low Water gives 1 Light, so a turn that reaches it twice gets 2 back.
  - Saving up Surges for one big turn is the core skill.
- Your bell draws when you Crest or hit Low Water. You start with the Brass Tide-Bell, which draws a card on every one. Other bells from the Workshop draw differently.
- Some cards scale with the Tide (Undercurrent, Tsunami, Lighthouse Beam) or with chains (Toppled Tower costs 1 less per Crest this turn).

**Feedback while you play.**
- Cards in your hand show a live badge for what they would do right now: **CREST x2**, **LETHAL**, **VICTORY**, **LOW WATER** or **ECHO**. The game works this out by simulating the play. The number on **CREST** is how many Crests that card makes.
- Selecting a card previews its effect on the Tide gauge, along with a glossary of its keywords.
- End Turn lights up when you have nothing left to play.

**Other keywords.**
- **Sink:** the card is gone for the rest of the fight once played.
- **Float:** the card stays in your hand at the end of the turn.
- **Rite:** stays in effect for the rest of the fight.
- **Echo:** your next card is played twice.
- **Might:** +damage per hit.
- **Spines:** damage back to attackers.
- **Soaked:** takes 50% more damage from attacks and Crests. On the keeper, it lasts through the enemy turn that follows.
- **Chilled:** deals 25% less attack damage.
- **Brine:** loses HP each turn, decreasing by 1.

**Between fights.** Choose your route on the map:
- **Skirmishes:** normal fights.
- **Dreads:** elites. They're harder, and you may take 1 of 2 keepsakes as the reward.
- **Fog:** events with choices, some of them gambles.
- **Barnaby's shop:** buy cards, keepsakes and tonics, or pay to remove a card.
- **Sheltered Coves:** rest to heal 30% of your HP, or upgrade a card.
- **Wrecks:** a chest of pearls where you may take 1 of 3 keepsakes.

**Keepsakes, Charge and Seep.** A keepsake lasts the whole run, and it gives off **Charge** (shown on each keepsake). Every keepsake you carry counts.
- The water around you holds a set amount of Charge, your **Hold**: 30 in the Shallows, and 5 more at each deeper depth (Dark Water 35, Riptide 40, The Abyss 45).
- Past your Hold, every 5 Charge over (or part of 5) adds 1 **Seep** to every fight. Seep is an unplayable card shuffled into your draw pile at the start of the fight, and it's gone after the fight. It never joins your deck.
- A keepsake pick shows what taking it would do to your Charge. You can take one, or leave them.
- Between fights you can drop a keepsake for good. Scallop Charm takes its 10 Max HP with it.

After each fight you get Pearls, maybe a tonic, and a choice of 3 cards. Reward cards are sometimes already upgraded, and rares shimmer. You can skip the cards; a lean deck draws its best cards more often.

Turning down a reward adds to your final score:
- **+50** for skipping a card (after a fight or in an event), or choosing an event's Leave or Decline.
- **+80** for skipping the card after a Dread, or for leaving the keepsakes after a Dread or at a Wreck.
- **+20** for leaving a tonic behind when you have a free slot.

Fights also pay bonus Pearls for:
- **Flawless:** no HP lost.
- **Swift:** won within 3 turns (4 for elites).
- **Tidal Fury:** 2 or more Crests in one turn (6 Pearls per Crest in the chain).
- **Deep Ebb:** 2 or more Low Waters in one turn (6 Pearls per Low Water in the chain).

Both are announced the moment you earn them. The score counts Crests and Low Waters, and the best chain of each, the same way.

**Depths and score.** Every run ends with a score, and your best is kept. Beating the boss unlocks the next starting depth:
- Shallows → Dark Water → Riptide → The Abyss.
- Each depth has tougher enemies and a higher score multiplier.

**The Workshop (lasts across runs).** Every finished run turns its score into **Salvage**: 1 for every 50 points. Abandoning a run earns nothing.
- Spend Salvage in the Workshop on the title screen. **Kit** you buy is yours for good. Kit is the mundane gear Wren wears and carries; keepsakes are the magic.
- Kit goes in five places, one piece each, and you choose before each dive. The game remembers your choice.
  - **Harpoon:** the Honed Harpoon (your first Harpoon Jab in each fight deals 2 more damage) or the Barbed Harpoon (it applies 1 Brine).
  - **Bell:** always one. The Brass Tide-Bell draws 1 card on every Crest and Low Water. The Flood Bell draws 2 on a Crest and none on Low Water; the Ebb Bell the other way round. The Cracked Bell draws nothing on the first Crest or Low Water of a turn and 2 on every one after.
  - **Coat:** Cork Vest (+5 Max HP) or Shell Gorget (4 Ward at the start of each fight).
  - **Pocket:** Coin Purse (+30 Pearls at the start), Gleaner's Pouch (+10 Pearls after each fight) or Barnaby's Marker (your first card removal at Barnaby's is free).
  - **Ditty Bag:** Spare Flask (a tonic at the start), Pearl Scales (Barnaby's prices are 25% lower), Gleaning Net (+3 Pearls whenever you Crest) or Spare Wick (rests heal 10 more HP).
- Some kit is locked until an **achievement**, such as Crest three times in one turn or defeat an enemy with Brine. Achievements are checked after every fight you win and when a run ends, so they count even if you lose the run later. The tutorial doesn't count.
- Kit never changes the map: the same seed gives the same map with any kit.

## Content

- **Hero:** Wren, the keeper. 70 HP, 3 Light, and a 10-card starting deck: 4 Harpoon Jab, 4 Brace, Rising Swell, Slack Water.
- **38 collectible cards:**
  - 14 common, 16 uncommon, 8 rare.
  - Every card has an upgraded version.
  - There are also 4 status cards: 3 that enemies add to your deck, and Seep. And 1 curse (Barnacle Growth: unplayable, and it stays in your deck until you remove it).
  - The cards support several builds:
    - Crest chaining (Storm Surge, Siren's Echo, Toppled Tower, Maelstrom, Spindrift).
    - Low Water tempo: Ebb to strip enemy Ward and win back Light (Riptide Cut, Bilge Pump, Depth Charge, Abyssal Pull).
    - Ward (Sea Wall, Deep Guard, Breakwater).
    - Brine (Brine Bloom, Brine Spear, Salt Ward).
    - Might multi-hits.
- **13 enemies:**
  - 8 normal: Kelp Lurker, Brine Crab, Lantern Eel, Drowned Deckhand, Gloom Jelly, Barnacle Mite, Fog Wisp, Salt Gull.
  - 3 elite encounters:
    - Reefback Hulk, which has Spines.
    - Hollow Siren, whose lullaby calms your Tide back to 3.
    - Angler Twins, where the survivor enrages when its twin dies.
  - The boss, The Drowned Bellwether. At half health it cracks, calls a shoal of Bell Minnows, and the music shifts.
- **14 keepsakes, 7 tonics, 7 events.**
- **14 pieces of kit (plus the Brass Tide-Bell) and 7 achievements** in the Workshop.
- **Endings:** win and lose screens with run stats and score, best score, depth unlocks, and a one-click new run.

Sound effects and music are synthesized at runtime with the Web Audio API, so there are no audio files. The music is a generative pad-and-pluck score over an ocean bed, and it changes mood for fights, the boss, and the boss's second phase.

The illustrations were generated for this project with an image-generation tool. Some keepsake, tonic and newer card images are crops or recolors of those illustrations.

Working on the game? See [AGENTS.md](AGENTS.md) for commands and [GAME_NOTES.md](GAME_NOTES.md) for design notes.
