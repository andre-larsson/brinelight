# Brinelight

A single-player roguelike deckbuilder for the browser. You play Wren, the last lighthouse keeper of Saltmere. An enchanted bell, sunk under the cliffs, has stolen the magic fire from her lighthouse, and it is pulling the sea up toward the town. Wren goes down through the flooded sea-caves of the Drowned Reach to take the fire, the Lantern Heart, back from the Drowned Bellwether.

**Play it:** <https://andre-larsson.github.io/brinelight/>

One run is a complete demo: about 11 stops on a branching map, one on each landing, ending with the boss. It takes roughly 15 to 25 minutes. Winning unlocks deeper, harder starting depths, and every run ends with a score to beat.

**New here?** The first time you start a descent, a short opening in four pictures tells the story, and then the game offers a short guided fight (about 2 minutes) that teaches the basics and the Swell. You can skip it, and replay it any time from the title screen or the menu. After that, short hints explain new things the first time you meet them.

**Story so far**, on the title screen and in the menu, has three tabs. **Story** holds the chapters: the opening, one that opens the first time you fall, and one for each depth you clear. **The world** explains the places, people and magic. **Keeper's notes** are 22 short notes, and each opens the first time you meet its subject: a shop, a Cove, a Wreck, each Fog event, the Drowned Deckhand, the Hollow Siren, the Bellwether, the Glimmer Leech, the Lamp Hermit, the Tolling Buoy, your first keepsake, the first time you carry more Roil than your Hold, and your first win in the Shallows. The tutorial and debug-cheated runs open nothing.

## Running it

It's plain HTML, CSS and JavaScript, with no build step and no dependencies.

- **Static server (recommended):** from this folder run `npm start` (or `python3 -m http.server 8000`), then open <http://localhost:8000>.
- **No server:** open `index.html` directly in a browser.

**Debug mode (for testing):** add `?debug` to the address. A DEBUG tab appears at the left edge, and the `` ` `` key opens the same panel. It can add Salvage and kit, unlock achievements and depths, reset progress, give Pearls, cards, keepsakes and tonics, turn on god mode, set the Swell, win or lose a fight, and visit any kind of stop. It can also fill the Lazaret. A run where you use a cheat keeps no best score, unlocks no depth, opens no story and puts nothing in the Lazaret. Two switches at the top of the panel are kept in the browser from run to run. **Skip fights** wins every fight the moment it starts, so you can walk through a whole depth in a minute or two; it waits while a hint or the panel is open. **Cheats count as real runs** stops cheats from marking the run, so a debug run unlocks depths, story and the Lazaret like a real one. Add `?debug=0` to turn the mode off, or use the panel.

Progress is saved automatically in your browser, at the start of every turn and between map stops. **Continue** on the title screen resumes the run. To replay a specific map and card sequence, add `?seed=12345` to the URL before starting a new run.

**Back up or reset progress** is in the menu on the title screen. **Download a backup** saves everything to a `.json` file: Salvage and kit, the Lazaret, achievements, unlocked depths, best score, the Logbook, Story so far, a run in progress and your settings. **Restore from a backup** loads such a file in place of the progress in the browser. It refuses any other file, and it asks before it replaces anything. **Reset progress** asks first, then erases all progress, the hints and the tutorial. Your sound, music and animation settings stay.

## Controls

| | Play a card | Other |
|---|---|---|
| **Mouse** | Click a card to raise it, then click an enemy (or click the card again for cards without a target). You can also drag a card onto an enemy, or up into the sea. | Hover anything (statuses, intents, keepsakes, the Swell gauge) for a tooltip. Click the draw or discard pile to see it. Between fights, click a keepsake to drop it. |
| **Touch** | Tap a card to raise it and read it, then tap an enemy, or tap the card again. Dragging works too. | Tap an enemy or the keeper to see HP, intent and effects. Tap a keepsake to read it, or between fights to drop it. |
| **Keyboard** | `1`-`9`, `0` pick a card; `←` `→` choose the target; `Enter` / `Space` / `↑` play it; `Esc` / `↓` cancel. | `E` end turn, `D` view deck, `Z` `X` `C` use tonic slots 1-3. On the map: arrow keys and `Enter` (or `1`-`9`). On reward screens: `1`-`3` pick a card. `Tab` reaches every button. |

The title screen has three levels of button: Continue and New Descent first, the Workshop and the Lazaret second, and Story so far, the Logbook, the Tutorial and How to Play third. The **Logbook** is a short record: descents finished, won and lost, the deepest landing reached, depths cleared, best score, Salvage, kit owned, keepsakes in the Lazaret, achievements, and Story so far entries open. Descents and the deepest landing are counted from version 0.13.0; abandoned runs, the tutorial and debug-cheated runs are not counted.

The menu (top right) has the tutorial, How to Play, Story so far, sound effects on/off, music on/off and fast animations. During a run it also has save and quit, and abandon run. On the title screen it has Back up or reset progress.

## Rules

**Fights.** Each turn you get 3 **Light** and draw 5 cards. Each card costs the Light shown in its corner. Cards you don't play are discarded at the end of the turn, and your discard pile is reshuffled into the draw pile when that runs out. Enemies show their **intent** above their heads (the number is the damage they're about to deal). Your keeper shows how much of that will get past your Ward. The screen edges glow red when the incoming hit would be lethal.

**Ward** blocks damage and washes away at the start of your next turn. Enemies can have Ward too; theirs lasts until they act again.

**The Swell** is the game's central mechanic. Wren works the water around the enemies with her bell. The Swell is a gauge from 0 to 6 that starts every fight at 3.
- **Surge** raises it and **Ebb** lowers it.
- At 6 the wave **Crests**: it deals 6 damage to every enemy, then the Swell resets to 3.
- At 0 you **Strand** the enemies: the water pulls back, they lose all their Ward, and you gain 1 Light. Then the Swell resets to 3.
- **Extra Surge or Ebb carries over.** It keeps flowing from 3, so Surge 6 from Swell 3 Crests twice.
- **Chains:**
  - Every extra Crest in the same turn hits 3 harder (6, 9, 12, 15...).
  - Every Strand gives 1 Light, so a turn with two Strands gets 2 back.
  - Saving up Surges for one big turn is the core skill.
- Your bell draws when you Crest or Strand. You start with the Brass Tide-Bell, which draws a card on every one. Other bells from the Workshop draw differently.
- Some cards scale with the Swell (Undercurrent, Tsunami, Lighthouse Beam) or with chains (Toppled Tower costs 1 less per Crest this turn).

**Feedback while you play.**
- Cards in your hand show a live badge for what they would do right now: **CREST x2**, **LETHAL**, **VICTORY**, **STRAND** or **ECHO**. The game works this out by simulating the play. The number on **CREST** is how many Crests that card makes.
- Selecting a card previews its effect on the Swell gauge, along with a glossary of its keywords.
- End Turn lights up when you have nothing left to play.

**Other keywords.**
- **Sink:** the card is gone for the rest of the fight once played.
- **Float:** the card stays in your hand at the end of the turn.
- **Rite:** stays in effect for the rest of the fight. A Rite in your hand is labelled RITE.
- **Echo:** your next card is played twice.
- **Might:** +damage per hit.
- **Spines:** damage back to attackers.
- **Soaked:** takes 50% more damage from attacks and Crests. On the keeper, it lasts through the enemy turn that follows.
- **Chilled:** deals 25% less attack damage.
- **Brine:** loses HP each turn, decreasing by 1.

**What lives in Dark Water.** Dark Water's creatures bring rules of their own. Each one's intent says what it is about to do.
- **Glimmer Leech:** its Latch heals it by the HP it takes from you. Ward stops both.
- **Murk Ray:** when it Sinks it is **Submerged** until it next acts. You can't target it, your attacks (on one enemy, on ALL or on a random one) can't reach it, and tonics can't be aimed at it. Crests and other waves still hit it, and a Strand brings it up. If nothing else is in reach, cards that need a target can't be played.
- **Lamp Hermit:** its **Shell** keeps its Ward from turn to turn. A Strand still strips it.
- **Glimmer Chain** (a Dread): Drink the Light **Douses** your lantern: you start your next turn with 1 less Light.
- **Pale Gulper** (a Dread): Gulp swallows the last card you played that turn, as long as it went to your discard pile (a Rite stays in play). You get the card back in your discard pile when the Gulper dies.
- **The Tolling Buoy** (the boss): its Rocking Toll hits for 12, plus 4 for each step your Swell is away from 3 when your turn ends, and every Toll hits 2 harder than the one before. Haul the Chain gives it 12 Ward and douses your lantern. At two thirds of its health its cage breaks open and two Glimmer Leeches come out.
- **The Glimmer Garden** (a Fog event): if you pick the beads, a Glimmer Leech follows you into your next fight.

**Between fights.** Choose your route on the map:
- **Skirmishes:** normal fights.
- **Dreads:** elites. They're harder. They pay Pearls, and you may take 1 of 2 keepsakes. A Dread offers no card and no tonic.
- **Fog:** events with choices, some of them gambles.
- **Barnaby's shop:** buy cards, keepsakes and tonics, or pay to remove a card.
- **Sheltered Coves:** rest to heal 30% of your HP, or upgrade a card.
- **Wrecks:** a chest of pearls where you may take 1 of 3 keepsakes.

**Keepsakes, Roil and a Roiled aether.** A keepsake lasts the whole run, and it stirs the aether around you. How much is its **Roil** (shown on each keepsake). Every keepsake you carry counts.
- The aether around you holds a set amount of Roil, your **Hold**: 20 in the Shallows, 35 in Dark Water, 40 in Riptide and 45 in the Abyss. Up to your Hold the aether is **Calm**.
- Past your Hold the aether is **Roiled**. Every 5 Roil over (or part of 5) is one step, and each step adds one thing to every fight. The steps go round a ladder of three:
  - **Step 1: a Seep.** Seep is an unplayable card shuffled into your draw pile at the start of the fight, and it's gone after the fight. It never joins your deck.
  - **Step 2: Thrash 1.** At the start of each of your turns, you take 1 damage. Ward stops it: Thrash lands before the Ward from your last turn washes away, so Ward left over after the enemies have acted takes the hit. On the first turn of a fight only the Shell Gorget's Ward is there to stop it.
  - **Step 3: a Bell Minnow.** One of the Bellwether's minnows follows you into the fight as an extra enemy, at half health.
  - **Step 4** is a second Seep, **step 5** is Thrash 2, **step 6** is a second Bell Minnow, and so on. There are never more than 2 Bell Minnows.
- The Roil number in the top bar, every keepsake pick and the screen before a descent say what your Roil does at that moment.
- A keepsake pick shows what taking it would do to your Roil. You can take one, or leave them.
- Between fights you can drop a keepsake for good (one you brought from the Lazaret is only out of that run). Scallop Charm takes its 10 Max HP with it.

After each Skirmish you get Pearls, maybe a tonic, and a choice of 3 cards. Reward cards are sometimes already upgraded, and rares shimmer. You can skip the cards; a lean deck draws its best cards more often.

Turning down a reward adds to your final score:
- **+50** for skipping a card (after a fight or in an event), or choosing an event's Leave or Decline.
- **+80** for leaving the keepsakes after a Dread or at a Wreck.
- **+20** for leaving a tonic behind when you have a free slot.

Fights also pay bonus Pearls for:
- **Flawless:** no HP lost.
- **Swift:** won within 3 turns (4 for elites).
- **Tidal Fury:** 2 or more Crests in one turn (6 Pearls per Crest in the chain).
- **High and Dry:** 2 or more Strands in one turn (6 Pearls per Strand in the chain).

Both are announced the moment you earn them. The score counts Crests and Strands, and the best chain of each, the same way.

**Depths and score.** Every run ends with a score, and your best is kept. The top bar counts the landings you have reached on the way down. Beating the boss unlocks the next starting depth:
- Shallows → Dark Water → Riptide → The Abyss.
- Each depth is harder than the one above it and has a higher score multiplier (+25% for each depth).
- The Shallows and Dark Water each have their own creatures, Dreads, boss and Fog events. In the Shallows the boss is the Drowned Bellwether; in Dark Water it is the Tolling Buoy.
- Riptide and the Abyss are Dark Water made harder. In Riptide its creatures have 5% more HP and hit 10% harder. In the Abyss they have 10% more HP and hit 15% harder, and rests heal 25% of your HP instead of 30%.

**The Workshop (lasts across runs).** Every finished run turns its score into **Salvage**: 1 for every 50 points. Abandoning a run earns nothing.
- Spend Salvage in the Workshop on the title screen. **Kit** you buy is yours for good. Kit is the mundane gear Wren wears and carries; keepsakes are the magic.
- Kit goes in five places, one piece each, and you choose before each descent. The game remembers your choice.
  - **Harpoon:** the Honed Harpoon (your first Harpoon Jab in each fight deals 2 more damage) or the Barbed Harpoon (it applies 1 Brine).
  - **Bell:** always one. The Brass Tide-Bell draws 1 card on every Crest and Strand. The Flood Bell draws 2 on a Crest and none on a Strand; the Ebb Bell the other way round. The Cracked Bell draws nothing on the first Crest or Strand of a turn and 2 on every one after.
  - **Coat:** Cork Vest (+5 Max HP) or Shell Gorget (4 Ward at the start of each fight).
  - **Pocket:** Coin Purse (+30 Pearls at the start), Gleaner's Pouch (+10 Pearls after each fight) or Barnaby's Marker (your first card removal at Barnaby's is free).
  - **Ditty Bag:** Spare Flask (a tonic at the start), Pearl Scales (Barnaby's prices are 25% lower), Gleaning Net (+3 Pearls whenever you Crest) or Spare Wick (rests heal 10 more HP).
- Some kit is locked until an **achievement**, such as Crest three times in one turn or defeat an enemy with Brine. Achievements are checked after every fight you win and when a run ends, so they count even if you lose the run later. The tutorial doesn't count.
- Kit never changes the map: the same seed gives the same map with any kit.

**The Lazaret (lasts across runs).** The Lazaret is the locked store room at the lighthouse, where keepsakes are kept between runs. It opens after your first win, and it is on the title screen from then on.
- When you win a run, every keepsake you carry is kept in the Lazaret for good. The win that opens it counts.
- The Lazaret holds one of each keepsake. If you bring home one it already holds, it becomes Salvage instead: half its Roil, rounded up (a second Whale Tooth, Roil 19, gives 10).
- Before each descent you choose which kept keepsakes to bring. You may bring any number. You carry them from the first landing, and each counts toward your Hold as usual, so bringing too many leaves the aether Roiled in every fight. The game remembers your choice.
- If you fall, you lose the keepsakes you found on that descent. The ones in the Lazaret are never lost, whether you brought them or not.
- If you drop a keepsake you brought, it is out of that run, and it is still in the Lazaret afterwards.
- A run can still offer you a keepsake that is in the Lazaret, as long as you aren't carrying it.
- Keepsakes you bring never change the map. The tutorial and abandoned runs keep nothing.

## Content

- **Hero:** Wren, the keeper. 70 HP, 3 Light, and a 10-card starting deck: 4 Harpoon Jab, 4 Brace, Rising Swell, Slack Water.
- **38 collectible cards:**
  - 14 common, 16 uncommon, 8 rare.
  - Every card has an upgraded version.
  - There are also 4 status cards: 3 that enemies add to your deck, and Seep. And 1 curse (Barnacle Growth: unplayable, and it stays in your deck until you remove it).
  - The cards support several builds:
    - Crest chaining (Storm Surge, Siren's Echo, Toppled Tower, Maelstrom, Spindrift).
    - Strand tempo: Ebb to strip enemy Ward and win back Light (Riptide Cut, Bilge Pump, Depth Charge, Abyssal Pull).
    - Ward (Sea Wall, Deep Guard, Breakwater).
    - Brine (Brine Bloom, Brine Spear, Salt Ward).
    - Might multi-hits.
- **20 enemies:**
  - The Shallows: 8 normal (Kelp Lurker, Brine Crab, Lantern Eel, Drowned Deckhand, Gloom Jelly, Barnacle Mite, Fog Wisp, Salt Gull) and 3 elite encounters. The Kelp Lurker's Lash hits 2 harder each time, and the Barnacle Mite's Burrow gives it 5 Ward and 1 Might. The elites:
    - Reefback Hulk, which has Spines.
    - Hollow Siren, whose lullaby flattens your Swell back to 3.
    - Angler Twins, where the survivor enrages when its twin dies.
  - The Shallows' boss, The Drowned Bellwether. At two thirds of its health it cracks, calls a shoal of Bell Minnows, and the music shifts. The Bell Minnow also follows a Roiled aether.
  - Dark Water: 4 new normal creatures (Glimmer Leech, Pistol Shrimp, Murk Ray, Lamp Hermit), with the Lantern Eel, Gloom Jelly, Drowned Deckhand and Fog Wisp; 3 elite encounters (Glimmer Chain, Pale Gulper and the Angler Twins); and its boss, the Tolling Buoy.
- **14 keepsakes, 7 tonics, 10 events** (7 in the Shallows; in Dark Water, 3 of its own and 3 from the Shallows).
- **14 pieces of kit (plus the Brass Tide-Bell) and 7 achievements** in the Workshop.
- **Endings:** win and lose screens with the score line by line (and how it turns into Salvage), run stats, best score, unlocks in purple boxes, and a one-click new run.

Sound effects and music are synthesized at runtime with the Web Audio API, so there are no audio files. The music is a generative pad-and-pluck score over an ocean bed, and it changes mood for fights, the boss, and the boss's second phase.

The illustrations were generated for this project with an image-generation tool. Some keepsake, tonic and newer card images are crops or recolors of those illustrations.

Working on the game? See [AGENTS.md](AGENTS.md) for commands and [GAME_NOTES.md](GAME_NOTES.md) for design notes.
