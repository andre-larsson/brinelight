# Brinelight: game notes

Working notes for whoever picks this up next. Player-facing rules are in README.md; commands are in AGENTS.md.

## Where this came from

- Brinelight was one of two builds made from the same brief (an original roguelike deckbuilder inspired by Slay the Spire) in a blind test. Both builds landed on a lighthouse keeper and a tide gauge.
- The user slightly preferred this one. The other build's first fight felt drawn out: it had raised enemy HP about 1.5x so the tide had time to play out, and weakened the starting attacks.
- The user's feedback, which applied to this build too: functional and nice-looking, but flat visual hierarchy (many equally weighted elements and texts), small text, and crucial rules buried in a long How to Play page. They asked for a tutorial that teaches the basics (HP on both sides, attacking, Ward on both sides, the Tide, how many cards you draw and how the discard pile comes back) before the game's own mechanics.

## Decisions the user made

- **Expedition and depth direction (2026-11-12; not built):** Every run starts in the Shallows and proceeds through the depths in one expedition. A band boss holds water in its own area. Defeating it drains the area and reveals a stair or tunnel down. After a boss, the player can continue or return home, ending the run with everything collected but resetting depth progress. A run also ends on completing the game or falling. Starting a new run at a deeper depth is not possible. Whether a fall is death or unconsciousness, what it costs, and how the collected items are retained between runs remain open. See WORLD.md for the story.
- **Return after a boss (2026-11-12; not built):** Wren can always get home safely after defeating a boss. The Bellwether starts drawing water back as she retreats, without blocking her way home. Returning ends the expedition. Wren unloads, rests, and prepares, and by her next departure the Bellwether has restored the water and called back the boss or a similar replacement. There is no quick lighthouse visit that resumes the same expedition.
- **Current game versus this direction:** The current game still ends a run after one boss and unlocks deeper starting depths. Existing Workshop capacity and depth unlock notes below describe the current implementation or earlier plans, not a decision to retain deeper starting depths.
- Keep this build's rules and balance. Don't retune them. (Lifted for Low Water on 2026-11-11: see "Low Water rework".)
- Add a guided first fight (tutorial).
- Do a layout and text-size pass.
- Add rule tests and a UI smoke test so later changes are safe.
- Keepsake picks (Dread reward, Wreck): you can't move on until you take one. Before, you could leave with nothing. (2026-11-11. The user first asked for a random keepsake when none is chosen, then said you shouldn't be able to continue without choosing. The engine still takes one at random if something leaves the pick unchosen; the UI never does.)
- Turning down a reward adds to the final score (2026-11-11): skipping a card, leaving a tonic when a slot is free, or an event's Leave or Decline. The random keepsake fallback doesn't count.
  - **Tiered (2026-11-11, v0.6.0), provisional numbers.** The user found a flat 20 small next to a typical ~1600 run. `E.DECLINE_SCORE`: a fight's card 50, a Dread's card 80 (the same as an elite kill), an event card pick 50, an event Leave/Decline 50, a tonic 20. The bot sees about 5 card rewards, 0.7 Dread rewards and 1.7 events a run, so skipping everything is worth about 350 now (about 100 before), half the win bonus. Skipping is costly for the bot: if it skips every card it wins 2.1% of runs, against 24.2%. A person who skips 2 or 3 cards in a winning run gets about 100 to 150, 6 to 9% of the score.
  - Runs keep the points (`stats.declineScore`) as well as the count (`stats.declined`). Saves from v0.5.0 have only the count; `E.declinePoints` values those at 20 each. The end screen shows "Rewards declined: 3 (+150)".
- The flooded-hold dive (Wreck of the Gilded Gull) paid 90 Pearls or cost 12 HP, half and half. That is the same 45 Pearls on average as the safe salvage, minus 6 HP, so it was never the better pick (the user's point). It now pays 150 (a rare card or a keepsake at the shop): 75 Pearls on average for 6 HP, about the Glimmering Pool's sure rate of 30 Pearls for 5 HP. Healthy players should dive and hurt ones should salvage.
- Barnacle Growth now says what it does, on the card, in the event option, in How to Play and in the README. It used to say only "A curse that clings to your deck".
- The map runs downward (2026-11-11): the first stops are at the top and the boss is at the bottom, so the route reads as a descent. When choosing a stop, the map scrolls so those stops are near the top with the row just left above them, and the route ahead is below. The map hint says "The boss waits at the bottom, deepest down."

## Paused plan and open questions (2026-11-12)

The user paused the design work here. Nothing in this section is built. Names and numbers stay open until the final version. Start the next session with this section, then WORLD.md.

**Where things stand.**
- The live build is v0.9.0: the Workshop, 9 pieces of gear, 6 achievements, overburden and debug mode. It was pushed on 2026-11-12.
- The next big change is the item rework below (plans 1 and 2). It replaces the current gear, the pack capacity and the gear overburden.
- The expedition direction (top of "Decisions the user made") came after the item plan was written. It answers some of the questions below and changes others. The notes say where.

### Plan 1: worn kit in body slots (chosen by the user, 2026-11-11)

- Gear becomes worn kit. There are four slots: Head, Hands, Body and Belt. Each slot holds one item and is always open. The pack capacity and gear overburden go away.
- **One rule:** kit changes Wren herself: her HP, her starter cards, what she carries. It never changes the sea (the Tide, Crests, enemies). Keepsake magic does that.
- Example items. This is a sketch the user hasn't agreed to:

| Slot | Example items |
|---|---|
| Head | Diving Helmet (Soaked wears off 1 turn sooner on you), Lantern Hood (draw 1 more card on your first turn) |
| Hands | Honed Harpoon (Harpoon Jabs +2 damage), Barbed Harpoon (Jabs apply 1 Brine), Padded Mitts (Brace +2 Ward) |
| Body | Cork Vest (+5 Max HP), Shell Gorget remade as armour (the first hit each fight deals 4 less) |
| Belt | Spare Flask (+1 tonic slot), Coin Purse, Merchant's Astrolabe (moved from keepsakes) |

- Flood Chart, Ebb Chart and Storm Lens change the Tide or Crests and copy keepsakes, so they would be dropped (question 4).
- The Workshop, Salvage, prices and achievements stay. About half of the icons can be reused.
- **Expedition direction:** WORLD.md says Wren packs once on shore and keeps that pack for the whole expedition. The diving suit takes a worn slot from the first band on. It does nothing in fights, and Wren needs it for the final depth (question 6).

### Plan 2: a keepsake limit, "magic capacity" (the user's idea, 2026-11-11)

- Keepsakes stay small trinkets with strong magic. Carrying more than the capacity brings a strong penalty. This replaces gear overburden.
- Capacity grows deeper down. The user's analogy is warm air, which holds more water before it condenses. WORLD.md has it in the fiction: closer to the bell, the water left behind holds more before it condenses into a keepsake.
- The bot measurements are in the table under "Direction from the user" in "The Workshop".
- **The critique sent to the user, not answered yet:**
  1. **Deeper capacity is barely felt.** A run finds about 2 keepsakes besides the Tide-Bell, so a capacity of 3 or 4 rarely limits anything. There are two fixes: offer more keepsakes deeper down, or let capacity grow within a run as Wren descends. The expedition direction favours the second fix.
  2. **With one slot, the best keepsake is the obvious pick.** Barnacle Plate alone gives 57.5% as the starter. Whale Tooth (36.8%) and Drowned Anchor (35.2%) are also strong. They need rebalancing first, because the user wants no single best choice.
  3. **The money keepsakes would never earn a slot.** Pearl Earring, Merchant's Astrolabe, Pearl Strand and Spare Lantern aren't magic anyway. Move them into kit.
  4. **The Tide-Bell fills the only Shallows slot from the start.** Either it doesn't count toward capacity, or it becomes kit.
  5. **Keepsake picks must become optional again.** With a limit, a forced pick (v0.5.0) makes no sense. The choices would be to leave it (for a score bonus), swap one out, or carry it overloaded.
  6. **The penalty must be strong and visible, and it must fit the story.** These are the candidates for each keepsake over capacity. Size them with the bot, as with overburden:
     - **Seep** (my favourite): an unplayable card joins the deck and clogs draws. It leaves when you're back within capacity.
     - **The deep notices you:** enemies get +15% HP.
     - **Soaked:** start each fight Soaked for 1 turn.
     - **Max HP loss,** like the current overburden.

### Open questions for the user

1. **Should magic capacity grow by dive depth, within the run as Wren descends, or both?** There are no deeper starts in the expedition direction, so "within the expedition" is the likely answer. Still open: the numbers, and what happens to keepsakes when Wren goes home. WORLD.md leaves open how things brought home are kept.
2. **Which overload penalties should be prototyped?** The candidates are Seep, enemy HP, Soaked and Max HP (critique point 6).
3. **Should the Tide-Bell become kit (Hands?), or a keepsake that doesn't count toward capacity?**
4. **Can these changes go ahead?**
   - Move the money keepsakes into kit.
   - Drop Flood Chart, Ebb Chart and Storm Lens.
   - Rebalance Barnacle Plate, Whale Tooth and Drowned Anchor.
5. **Should v0.9.0 get a git tag before the rework,** so the old and new versions can be compared side by side?
6. **Which slot does the diving suit take, and does it push out the item in that slot?** This question is new, from WORLD.md.

**The user's answers (2026-11-12):**
- **Question 1, still under discussion. The user proposes a cost per keepsake.**
  - Every keepsake has a magical cost, and stronger keepsakes cost more.
  - Deeper levels raise the capacity.
  - You can equip any number of keepsakes while their total cost stays within capacity.
  - You may go over, with a penalty that grows with the overshoot.
  - Future characters could have a higher or lower capacity.
  - The user isn't sure it's too complex. My response, not decided:
    - Hollow Knight's charm notches are the precedent.
    - The concept moves from gear overburden to keepsakes, so the total complexity stays about the same.
    - Working names: "Charge" for the cost and "Hold" for the capacity.
    - Cost 1 to 3 pips. My first-guess costs come from the bot starter values: about 3 for Whale Tooth, Drowned Anchor, Storm Bottle and Conch of Echoes; 2 for Whispering Conch, Scallop Charm, Tidewatch and Kelp Bracelet; 1 for the rest. Barnacle Plate needs a nerf as well as a high cost. The bot undervalues synergy keepsakes such as Coral Branch and Salted Hook.
    - Hold grows by band within the expedition.
    - Keepsakes brought home could go into a cabinet at the lighthouse. You could start an expedition with some of them, up to the Shallows Hold. Keepsakes Wren carries when she falls would be lost.
- **Question 2:** the user wants a penalty that fits the lore. I proposed two:
  - **Seep**: the charge she can't hold condenses into seawater. Each fight, 1 unplayable Seep card per point over goes into the draw pile, and it leaves after the fight.
  - **A guttering lantern**: water drips onto her open flame, so she has 1 less Light on turn 1 per point over.
  - Measure both with the bot.
- **Question 3:** the user asked what the Tide-Bell does. It is the starter keepsake: "Whenever you Crest or reach Low Water, draw 1 card". The bot rates it at about +2 points. WORLD.md says it is the keeper's own tool, not magic from the deep. My proposal is that it becomes the starting off-hand kit, and the off-hand always holds a bell, with other bells unlocked later.
- **Question 4:** yes. Move the money keepsakes into kit, drop the charts and Storm Lens, and rebalance the outliers. The user suggests an **off-hand** slot next to the weapon. The slots would then be Head, Weapon, Off-hand, Body and Belt. The Belt may need 2 spaces for all the money items.
- **Question 5:** yes. The local tag `v0.9.0` is on 483d635, the build that went live on 2026-11-12. It isn't pushed.
- **Question 6:** the suit replaces the item in its slot. Which slot it takes is postponed until the final depth exists.

**Decided (2026-11-12, second round):**
- **The penalty is Seep.**
- **No pips.** The user finds them too close to Hollow Knight. Keepsake costs use larger, more granular numbers instead.
- **Seep comes in steps.** Each threshold past capacity adds 1 more Seep card.
- **Keepsakes are kept between expeditions**, as the name says. New keepsakes found on an expedition are lost if Wren is defeated.

**Seep measured** (bot, 1000 seeds; N unplayable Seep cards shuffled into the draw pile at the start of every fight; scratch `seep.js`):

| Seep per fight | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Shallows | 24.2% | 18.8% | 13.9% | 11.7% | 7.6% |
| Dark Water | 13.5% | 8.9% | 7.1% | 5.4% | 3.9% |

One Seep costs about 5 points in the Shallows, roughly the worth of a mid keepsake such as Kelp Bracelet or Angler's Lure.

**Proposal sent, not agreed (working names "Charge" and "Hold"):**
- **Charge** is roughly the keepsake's bot value in win-rate points:

| Charge | Keepsake |
|---|---|
| 15 | Whale Tooth |
| 13 | Drowned Anchor |
| 12 | Storm Bottle, Conch of Echoes |
| 10 | Whispering Conch |
| 8 | Scallop Charm |
| 7 | Tidewatch |
| 6 | Kelp Bracelet |
| 5 | Angler's Lure |
| 4 | Moon Shard, Gull Feather, Coral Branch, Salted Hook |

  Coral Branch and Salted Hook are raised above their bot value, because the bot doesn't build decks around them. Barnacle Plate is nerfed first, then priced.
- **Hold** is 10 in the Shallows and +5 per band (15, 20, 25).
- **1 Seep for each started 5 points over the Hold.** Because the Hold grows by 5 per band, each band down removes exactly one Seep. Going over is about break-even for the bot.
- **Open:**
  - Can she drop a keepsake during an expedition?
  - An idea: a Belt kit item, a sealed jar, that carries 1 keepsake without its Charge counting, and without its effect.

**Decided (2026-11-12, third round):**
- **Every keepsake Wren carries counts toward the Hold,** worn or not.
- **Lore:** keepsakes "pollute" the air around them. Whether that is the air or an ether is open. A keepsake store in the lighthouse's safe room keeps their charge in, which is why many can be kept at home. The details are in WORLD.md.

**Slots: under discussion.**
- The user isn't sure about an off-hand slot. Wren always needs the bell, so a bell slot needs bell loot. The user also asked whether there should be a leg slot.
- My proposal: one job per slot.
  - **Harpoon:** your attacks.
  - **Bell:** how the Tide-Bell works.
  - **Coat:** defence.
  - **Belt:** supplies and money.
  - **Boots** later, unlocked by depth: the route.
- Bells vary the bell's own rule, so they don't copy keepsakes. For example, what makes it draw, or where the Tide resets after a Crest or Low Water.
- The alternative is a fixed bell that the Workshop upgrades.

**Decided (2026-11-12, fourth round): a Bell slot holding one of several bells.** The user doubted that boots could show what a Fog holds, and rightly: that is a spyglass's job. Revised Boots examples, all about moving on the route:
- cross to the stop beside yours on a neighbouring path
- slip past one fight
- skip a row

**Bells measured** (bot, Shallows, 1000 seeds; each bell replaces the Brass Tide-Bell; scratch `bells.js` patches the reset and the bell's draw):

| Bell | Win rate |
|---|---|
| none | 22.0% |
| Brass Tide-Bell: draw 1 on a Crest or Low Water | 24.2% |
| Crest draws 2, Low Water draws nothing | 25.7% |
| Low Water draws 2, Crest draws nothing | 23.5% |
| nothing on the first Crest or Low Water each turn, then 2 each | 23.8% |
| Tide settles at 4 after a Crest or Low Water, no draw | 25.4% |
| Tide settles at 4, draw 1 | 34.0% |
| Tide settles at 4 after a Crest only, draw 1 | 29.0% |
| Tide settles at 2, draw 1 | 25.2% |
| Tide settles at 2, no draw | 21.2% |
| Tide settles at 2 after a Low Water only, draw 1 | 24.0% |
| +1 Light on the first Crest or Low Water each turn, no draw | 32.2% |
| +1 Light the first time in each fight, then draw 1 | 27.6% |

The bot favours Crests and never plans for Low Water, so it undervalues the Ebb-side bells. Light is worth far more than a card, so the Light bells run strong.

**Proposed set** (not agreed): all four change only what the bell draws, so kit still never changes the sea. All four land within 23.5–25.7%.
- **Brass Tide-Bell:** a Crest or Low Water draws 1.
- **Flood Bell:** a Crest draws 2, Low Water nothing.
- **Ebb Bell:** a Low Water draws 2, a Crest nothing.
- **Cracked Bell:** the first Crest or Low Water each turn draws nothing, every later one draws 2.

"The Tide settles at 4, no draw" (25.4%) is in range but changes the sea, so it's kept for later.

**Decided (2026-11-12, fifth round):**
- **The slots are Harpoon, Bell, Coat and Belt.** Boots are undecided.
- **The four bells above are the starting set.**

**Harpoons measured** (bot, Shallows, 1000 seeds; scratch `harpoon.js`). Harpoon Jab is 4 of the 10 starter cards, so any change to it compounds. Every Jab +1 damage gives 31.2%, +2 gives 38.8%, 1 Brine gives 44.0%, and 2 Brine gives 75.2%. Once-per-fight versions:

| First Jab each fight… | Win rate |
|---|---|
| +4 damage | 25.8% |
| **+5 damage (Honed Harpoon)** | **28.1%** |
| +6 damage | 33.6% |
| +8 damage | 34.9% |
| 1 Brine | 24.9% |
| **2 Brine (Barbed Harpoon)** | **25.6%** |
| 3 Brine | 32.9% |

The steps are lumpy because of enemy HP breakpoints. For example, 6 + 6 damage kills a 12-HP Barnacle Mite in one Jab.

**Full kit measured** (scratch `kit.js`; Harpoon + Bell + Coat; the bot can't value the Belt):

| Depth | Kit | Win rate |
|---|---|---|
| Shallows | empty | 24.2% |
| Shallows | Honed Harpoon, Flood Bell, Shell Gorget | 30.2% |
| Shallows | Honed Harpoon, Brass Tide-Bell, Shell Gorget | 32.4% |
| Shallows | Honed Harpoon, Brass Tide-Bell, Cork Vest | 33.2% |
| Shallows | Barbed Harpoon, Ebb Bell, Cork Vest | 34.6% |
| Dark Water | empty | 13.5% |
| Dark Water | Honed Harpoon, Flood Bell, Shell Gorget | 20.6% |

- A full kit in the Shallows lands at 30–35%. The 1-space pack the user chose gave 28–30%, and the 3-space pack the user found too generous gave 35–42%.
- The keepsake Hold should take some of that back, so the plan is to build the kit and the Hold close together and measure them together.

**Proposed build order** (sent to the user):
1. **Kit in slots.** This replaces the pack, capacity and overburden.
2. **Charge, Hold and Seep** in the current one-depth game. Until the expedition exists, the Hold follows the depth level. Keepsake picks become optional again.
3. **The keepsake cabinet.** Keepsakes from a won run are kept, and you bring them within your Hold. New ones are lost on defeat.
4. **The expedition:** bands, going home after a boss, and currents.

### Later slices of meta-progression (planned 2026-11-11)

- Starting keepsakes, after the first Shallows win.
- Heirloom starter cards and reward-pool unlocks, after Dark Water.
- Bounties, after Riptide. This is the big unlock.
- Tide Marks are a candidate for another big unlock.
- With the expedition direction, "after Dark Water" means the first time you clear Dark Water on an expedition.

### The user's new ideas (2026-11-12; saved, not designed)

- **Currents** are game modifiers. Each one makes the game harder and raises the score, so it raises Salvage too.
  - The Tide that moves on its own can be one current. The user rejected it as a base rule (see "Low Water rework"), but it is fine as an opt-in challenge.
  - **Why currents:**
    - Workshop prices rise as the game goes on.
    - Plain early runs pay little to a player who has progressed far. That player should still earn useful Salvage from them.
    - With currents, early runs pay again but are much harder. Early bands keep their challenge, and the player still gets objectively stronger.
  - Currents aren't unlocked from the start.
  - Currents must work with the difficulty and score that grow with depth, or replace depth levels. **The user decides which.**
  - **How the expedition direction affects currents:**
    - There are no deeper starts, so depth levels no longer set the difficulty. Depth becomes progress within one expedition.
    - Currents could take over the job of setting difficulty, like the ascension levels in other roguelikes.
    - Still open:
      - Does each current add a fixed score multiplier?
      - Does that stack with the band's multiplier?
      - How much harder is "much harder"? Measure it with the bot.
- **More levels**: more bands or depths.
- **More characters**: unlockable keepers. WORLD.md has the open question about other keepers.
- **A lore overhaul** comes later. WORLD.md has started it.

## Version and What's new (v0.6.0, 2026-11-11)

- `js/version.js` holds `BL.VERSION` and `BL.CHANGELOG` (newest first, player-facing wording). The title foot shows "v0.6.0 · What's new", and the menu has the same link at its foot. It opens a modal listing every version.
- It's marked **New** for a returning player until they open it. `brinelight.version.v1` stores the last version they saw. A first-time player has nothing new to see, so their first visit stores the current version.
- Versions so far were reconstructed from git history: 0.1.0 is the blind-test build, 0.2.0 the tutorial and interface pass, 0.3.0 playtest fixes, 0.4.0 the Low Water rework, 0.5.0 required keepsake picks and decline scoring (the last version pushed before this), and 0.6.0 is this version. Provisional: the user may prefer 1.x.
- Rule: every player-facing change bumps the version (minor for rules, content or features, patch for fixes only), adds a What's new entry, and keeps `package.json` in step. `tests/version.test.js` checks this.
- The title screen scrolls when it doesn't fit, and its foot is in the page flow. On landscape phones (844x390) the logo was cut off, the foot covered How to Play and the best score was off-screen. Landscape now uses a smaller logo, with Tutorial and How to Play side by side.

## Provisional calls (made without the user; each can be judged and undone on its own)

1. **Soaked bug fix changes difficulty a little.** Enemy intents counted the keeper's Soaked, but the keeper's Soaked wore off at the end of the keeper's own turn, before enemies attacked, so enemy-applied Soaked never did anything and intents overstated hits (Hollow Siren's Shriek showed 7x2 and dealt 5x2). Now the keeper's Soaked lasts through the following enemy turn, as the rules, tooltip and intent say. Bot win rate over 1000 seeds went 27.3% -> 21.1%; extra damage per fight: Hollow Siren +3.0, Angler Twins +2.3, Bellwether +2.2; normal fights unchanged. Alternative that keeps the old balance exactly: leave the decay where it was and make intents ignore Soaked that will wear off (Soaked on the keeper would then do nothing). Revert commit "Fix: Soaked on the keeper wore off before enemies attacked" to undo.
2. **Tutorial form:** a scripted guided fight with a pointing bubble and a spotlight ring, 16 steps, about 2 minutes. Wrong cards, wrong targets and early End Turns are blocked with a short reason.
3. **Tutorial content:** Barnacle Mite (12 HP) and Brine Crab (24 HP, hardens for 4 Ward on turn 1), a fixed 13-card deck drawn in order, no Tide-Bell (so hands stay fixed). The reshuffle really happens at the start of turn 3; Storm Surge's double Crest is the finishing blow.
4. **When it's offered:** on the first New Descent ("First dive?" with Play / Skip), not on the title screen. Also a Tutorial button on the title and in the menu. Leaving it mid-way marks it "skipped"; finishing marks it "done". Either way it isn't offered again.
5. **First-time hints:** once ever each, one at a time, a dark bubble with "Got it". They cover the map, Dreads, rewards, the shop, rests, tonics, the Tide-Bell, the lethal warning, Sink/Float/Rite/Echo cards, and each status. A hint is marked seen as soon as it shows and closes when you leave that screen.
6. **Removed:** the old one-off Crest tip in the first fight, and How to Play opening by itself on the first run.
7. **How to Play** is five short tabs (Basics, The Tide, Keywords, The map, Controls). The story paragraph was dropped from it (it's on the title screen). Echo was added to the glossary.
8. **Fight screen hierarchy:** larger, darker-backed intents; taller HP bars with 14px numbers; bigger Ward badges and status chips. The HUD hides its HP during fights (it's on the keeper's bar) and quiets Pearls and Depth. The keeper's name label is gone.
9. **End Turn** is a quiet button that turns amber (and pulses) only when nothing is playable.
10. **Tide bar:** lighter segments, the duplicate "Tide N" label removed (the lit segment shows the number).
11. **Hand cards:** smaller art panel and 12px+ text. The Attack/Skill pill is hidden on hand cards (the border colour still shows the type). On phones, card text wraps inside the part of the card the next card doesn't cover, and the fan is flatter.
12. **Map:** reachable stops carry a text label (Skirmish, Fog, Dread, Shop, Cove, Wreck).
13. **Reward screen:** the card choice comes first and largest; Pearls and bonuses are one row of chips. The title is now "Victory" (was "The deep goes quiet").
14. **Landscape phones:** smaller sprites when the field is short so intents, HP and statuses all fit.

## Bugs found and fixed in this pass

- **Dead minnows stayed on the field** (found by the user, 2026-11-11). The boss's Bell Minnows sat at 0 HP with no intent. The engine had them dead, but the `.unit.summoned` rise animation overrode the `.enemy.dead` fade (same specificity, later in the file), so any summoned enemy that died stayed drawn. The dead rule is now `.unit.enemy.dead`, and the UI smoke test kills two summoned minnows and checks they are hidden. The first-time status hints also skip dead creatures now.
- **Soaked on the keeper** never applied, while intents counted it. Fixed, with a small difficulty change (see provisional call 1).
- **Save and quit during the enemy turn** threw a TypeError (the enemy turn is an async loop over the current run). Starting or leaving the tutorial at that moment let the old loop advance the new run. Those menu actions now wait for the enemy turn to finish.
- **Long card text was cut off** on small cards, including the raised card and the reward choice. The raised card now uses smaller CSS text (it's scaled up 1.6x), and phone reward cards are larger.
- The hand on phones was partly off the left edge (fan rotation), and each card's text was hidden under the next card. The fan is flatter, and text wraps inside the visible part.

## Playtest fixes (2026-11-11)

A full Shallows run plus the tutorial, through the real UI (desktop mouse, a phone fight with touch). Rules and balance unchanged. Fixed:

- **Map:** the sticky header is solid behind its text (nodes showed through). The boss has one label; the "Boss" tag collided with its name.
- **Events and the Wreck:** the picture shrinks (to 130px, 90px on short screens) so the choices fit; at 1280x800 two of the Glimmering Pool's four choices were below the fold. Any scene screen that still scrolls shows a "More below" button.
- **Dread reward and Wreck:** the keepsake panel stays after the pick (pick lit, the rest dimmed). It used to collapse, and the card row jumped up under the pointer.
- **Card names:** the name starts right of the cost coin, whatever size the coin is (`--coin`). Names of 14+ characters are drawn smaller. Upgrade/remove grids had the event `.choice` style leaking onto cards; `.choice` rules now skip `.card`.
- **CREST badge:** the number is how many Crests that card makes (was: the turn's chain so far, so Ebb and Flow could say CREST x2 and make one). README and How to Play say so; tested.
- **Tide bar hint:** says the real damage ("Crest x2! 6 + 9 damage to all", Low Water Ward likewise), moves away from the keyword box, and clears as soon as the card is played.
- **Intents:** guarding moves show their Ward ("⚔3 🛡9", "🛡6"); `intentInfo` now returns `ward`. Tested against what the enemy really gains.
- **Banners:** "Turn N" (and the boss phase banner) sit lower while a Crest / Low Water text is on screen (Moon Pull Crests at the start of a turn).
- **Crowded desktop hand (7+ cards):** a flatter fan, and rules text wraps inside the part the next card doesn't cover, as on phones.
- **Tutorial:** the Brace step explains the LETHAL tag on Harpoon Jab ("Leave it: a wave will sweep it away soon"); the crab step says the mite can wait. A blocked action shows its reason inside the bubble (with a short shake) instead of a toast at the top.
- **Events:** the two result texts that were prompts ("Choose a card to dip into the glow") read as narration, and a line says what happened ("Rising Swell is now Rising Swell+.").
- **Reward Pearls:** "+84 Pearls including ★ Flawless +20 …" (the chips read as extra on top).
- **End screens:** no dark band under a missing HUD.

Provisional calls (each can be undone on its own):

1. **Shop asks before buying** (a modal with the item, price and Pearls left; Enter confirms). One extra click per purchase. Undo: the `buy` case in `handleAct` called `E.buy` directly.
2. **Toasts** stay at the top in fights and go to the bottom elsewhere (they covered screen titles). Toasts that repeated what the screen already shows were dropped: reward card and keepsake taken, shop purchase and removal, event picks.
3. **Phones:** covered hand cards now show a correct but shorter name ("Br…", "H…") instead of one with its first letters under the coin ("race", "Har…"). Tap to raise a card for the full name. A smaller coin would buy one or two letters.
4. **Tutorial text** grew by about 30 words (the LETHAL aside and the reasons).

## Low Water rework (2026-11-11)

**Why.** The user felt Ebb was harder to do than Surge and paid less, and that Ward cards felt flat. The bot agreed. A Crest hit 1.4 enemies for about 10 damage. Low Water gave 6 Ward, and about two thirds of it blocked nothing. The card pool also has 6 Surge attacks against 3 Ebb attacks, and Tidal Fury and the score counted only Crests.

**Decided with the user:**
- **Low Water:** enemies lose all their Ward, and you gain 1 Light. It gives no Ward of its own. It still draws with the Tide-Bell and still resets the Tide to 3.
- **Low Water is rewarded the same way as Crest.** A new bonus, **Deep Ebb**, pays for 2+ Low Waters in one turn, at the Tidal Fury rate (6 Pearls per Low Water in the chain). The score counts Low Waters and the best Low Water chain the same way as Crests.
- **Tidal Fury and Deep Ebb are announced the moment a new best chain earns them.** A ribbon under the CREST / LOW WATER text shows "★ Tidal Fury, +12 Pearls", with a flash and a sound. There's no ribbon where no Pearls are paid (the tutorial and the boss).
- **Low Water says what it did:** "Enemy Ward gone · +1 Light". Each stripped Ward badge cracks and falls away with a "-9 Ward" float, and the Light orb flares with "+1 Light".
- **Keyword legend on card choices.** Rewards, the shop and event card picks list every keyword on the offered cards, once each. Pointing at or focusing a card lights its own entries. The reward and shop first-time hints now sit above the cards so they don't cover the legend.

**Rejected in discussion (don't re-propose without new reasons):**
- A Tide that moves on its own each turn. It locks players into following the flow. (2026-11-12: the user would accept it as an opt-in "current", a harder mode that scores more. It is still rejected as a base rule. See "Paused plan and open questions".)
- Random Surge/Ebb on attack and Ward cards. It breaks plans and the previews.
- Enemy Tide weaknesses or strengths that favour one end. They force a strategy. If enemy Tide traits come back, use ones that disrupt both ends equally (like the Siren's Lullaby), or small one-sided bonuses, never immunities.

**Prototypes tried (bot, 1000 Shallows runs; 21.1% before):**

| Low Water also… | Bot win rate |
|---|---|
| deals half your Ward to all enemies | 44.0% |
| deals a quarter of your Ward to all enemies | 30.4% |
| strips enemy Ward (keeping its 6 Ward) | 21.4% |
| +1 Light (keeping its 6 Ward) | 29.2% |
| Soaked 2 on all enemies, no Ward | 22.4% |
| **strips enemy Ward, +1 Light, no Ward (shipped)** | **23.7% prototype, 24.2% as shipped** |

The shipped figure also includes the Tidal Memory and Spring Tide changes below. The bot doesn't plan move order, so it undervalues stripping Ward before a big hit.

Provisional calls (each can be undone on its own):

1. **Kelp Bracelet** ("Low Water gives 5 more Ward") now reads "Whenever you reach Low Water, gain 8 Ward". That brings back a defensive Low Water for players who want one.
2. **Tidal Memory** ("whenever you Crest or reach Low Water, gain 1 Light") is now Crest only, since Low Water gives Light by itself. Stacking both would make Ebb loops (Bilge Pump plus Riptide Cut) gain Light.
3. **Spring Tide** is now "Reach Low Water, then Crest", so the Crest lands on enemies whose Ward was just stripped.
4. **Low Water chains:** every Low Water gives a flat 1 Light. Crests still grow by 3 per chain.
5. **The tutorial** says what Low Water does ("enemies lose their Ward, and you gain 1 Light"). It doesn't show the strip, because the crab has no Ward on turn 3. Showing it would mean changing the crab's moves.
6. **The Tide bar hint** reads "Low Water! Enemy Ward gone, +1 Light". When the keyword box leaves no room on the bar, the hint lifts above the box.
7. **Old saves and best scores:** a saved run continues under the new rule. Scores are a little higher now that Low Waters count.

## The Workshop (v0.7.0, 2026-11-11): first slice of meta-progression

**Decided with the user** (names and numbers stay open until the final version):
- **Salvage** is the currency. Every finished run earns it from its **score**: 1 per 50 (`E.SALVAGE_PER_SCORE`). Deeper depths pay more through the score multiplier. Abandoning a run earns nothing, and neither does the tutorial.
- A permanent shop, the **Workshop**, sells **gear** for Salvage. Gear stays bought.
- **Achievements** unlock specific gear. New depths will unlock whole categories, planned as: starting keepsakes after the first Shallows win, heirloom starter cards and reward-pool unlocks after Dark Water, Bounties after Riptide. Tide Marks are another candidate for a big unlock.
- **Capacity follows the depth of this dive**: before each dive you pack gear up to `E.capacity(level)`, which is 1 + depth (Shallows 1, Dark Water 2, Riptide 3, The Abyss 4). Each piece weighs 1 or 2. (v0.8.0: the user found 3 in the Shallows too generous; it was 3 + depth in v0.7.0.)
- **Packing must be a hard decision, with no best pack** (the user, 2026-11-11). Keep the pieces within a narrow band of power, and make them suit different plans, so the right pack depends on the build.
- **Prices stay as they are for now** (the user).
- **Overburdened (v0.9.0):** you may pack up to 2 spaces past the capacity (`E.OVERBURDEN_MAX`). The user chose a Max HP cost for each extra space; the amount, **4** (`E.OVERBURDEN_HP`), was set from the bot (below). It lowers Max HP for the dive, so rests heal a little less too. The pack screen shows the cost of each extra piece before you pack it and the total once you're over. The limit of 2 is provisional.
- Deck changes: both heirlooms and pool unlocks (not built yet).

**Built:** 9 pieces of gear and 6 achievements (`BL.GEAR`, `BL.ACHIEVEMENTS` and `BL.META_TEXT` for the working names, all in js/data.js). Rules are in the engine (`E.newRun(seed, level, gear)`, `E.applyGear`, `E.fitGear`, `E.togglePack`, `E.buyGear`, `E.unlockAchievements`) and tested in `tests/workshop.test.js`.
- **Screens:** the title gets a Workshop button once a run has finished. New Descent opens a Pack screen when you own gear. The HUD has one square pack button, with a tooltip listing the gear. The end screen shows "+N Salvage" and what was unlocked. A toast announces an achievement after the fight that earned it.
- **Gear is square with a brass edge; keepsakes are round.** That keeps the two item types apart, which the user asked for.
- Gear is applied after the map is generated, so the same seed gives the same map with any gear. Same seed and same gear give the same run (tested).
- Lasting state is in `brinelight.meta.v1`: `{ salvage, earned, owned, packed, ach }`.

**Open (the user, 2026-11-11): gear and keepsakes feel too alike**, for example Coin Purse and Shell Gorget. Five of the 9 pieces are weaker copies of keepsakes: Storm Lens of Tidewatch, Flood Chart of Moon Shard, Cork Vest of Scallop Charm, Shell Gorget of Barnacle Plate, Coin Purse of Pearl Earring. Proposed: separate them by how they work, not by name or frame. The options are tools you use (recharging each fight or dive), worn kit in body slots, tool cards in the deck, or expedition gear that acts on the map. Waiting for the user to choose.

**Direction from the user (2026-11-11), not built yet:**
- Gear becomes **worn kit in body slots**, and the items get remade.
- **Keepsakes** stay, as small trinkets with strong magical effects.
- You can't carry more than a set number of keepsakes without a strong penalty. This replaces gear overburden.
- **Magic capacity** grows at deeper levels. The user's analogy: warm air holds more water before it condenses.
- A lore overhaul comes later. What the fiction already says, and what is still open, is in WORLD.md.

Bot check for a keepsake limit (no overloading; at the limit the bot keeps the better one by the starter ranking). The Tide-Bell counts:

| Depth | No limit | Limit 1 | Limit 2 | Limit 3 | Limit 4 |
|---|---|---|---|---|---|
| Shallows | 24.2% | 16.8% | 22.1% | 23.6% | |
| Dark Water | 13.5% | 9.1% | 11.1% | | |
| Riptide | 5.7% | | | 5.0% | |
| The Abyss | 1.6% | | | | 1.6% |

A bot run sees about 2 keepsakes plus the Tide-Bell, so it holds 2.6 to 2.9 at the end. A limit of 1 + depth binds hard only in the Shallows and Dark Water.

**Provisional calls (each can be undone on its own):**
1. **Prices** 8 to 35 Salvage, about 210 in all (the user: keep them). That's about 7 runs for a player who scores ~1600 (32 Salvage a run) and about 11 for the bot (18.5 a run). The cheapest piece (Coin Purse, 8) can be bought after almost any first run.
2. **Whetstone** upgrades only Rising Swell, at weight 2. Upgrading Slack Water too took the bot from 24% to 43%, far beyond anything else.
3. **Storm Lens** is weight 1 (it was 2). Alone it's worth +5 to the bot, the same as the other weight-1 pieces.
4. Newly bought gear goes straight into the pack if the Shallows have room (with capacity 1, only while the pack is empty). Gear that no longer fits a shallower dive is dropped from the end of the pack.
5. Achievements are checked after every won fight and at the end of a run, never mid-fight.
6. **The achievement list** covers several play styles: Double Crest (Flood Chart), Double Low Water (Ebb Chart), Triple Crest (Storm Lens), Untouched, i.e. 3 fights without losing HP (Shell Gorget), Dread Hunter (Whetstone), and Travel Light, i.e. a Dread with 12 or fewer cards (Barnaby's Marker).

**Bot measurements** (1000 seeds a row; for comparisons only). The first table is from v0.7.0, with capacity 3 + depth:

| Depth (capacity) | Empty pack | Full pack |
|---|---|---|
| Shallows (3) | 24.2% | 35.3% (Cork Vest + Spare Flask + Shell Gorget) to 41.9% (Storm Lens + Shell Gorget + Cork Vest) |
| Dark Water (4) | 13.5% | 28.7% (Whetstone + Cork Vest + Shell Gorget) |
| Riptide (5) | 5.7% | 10.6% (Whetstone + Cork Vest + Shell Gorget + Spare Flask) |
| The Abyss (6) | 1.6% | 6.2% (the same plus Storm Lens) |

- One weight-1 piece alone at Shallows: 27.8 to 29.5%. Coin Purse shows 24.2% because the bot never shops. Whetstone (weight 2): 31.2%.
- A full pack at a depth does about as well as an empty pack one depth shallower: the offset the user asked for.
- Shallows got the biggest jump, +11 to +18 points. That was too generous for the user, so v0.8.0 uses 1 + depth.

v0.8.0, capacity 1 + depth. **Is there a best pack?** In the Shallows, no: every useful single piece lands at 27.8 to 29.5% (Shell Gorget 29.5, Storm Lens 29.4, Flood Chart 28.5, Cork Vest 28.2, Spare Flask 27.8, Ebb Chart 27.8; empty 24.2). That spread is within noise (about ±1.4 points at 1000 runs). Coin Purse and Barnaby's Marker were left out because the bot never shops.
- **Dark Water (capacity 2):** no best pack either. Six different packs tie at the top: Cork Vest + Ebb Chart 22.8, Cork Vest + Shell Gorget 22.1, Cork Vest + Storm Lens 21.5, Flood Chart + Storm Lens 21.4, Shell Gorget + Storm Lens 21.2, and Whetstone alone 21.1 (empty 13.5). Flood Chart + Ebb Chart cancel out (13.0), an obvious trap.
- **Caution:** the bot never uses tonics, so it can't value **Spare Flask** (or Coin Purse, or Barnaby's Marker). Spare Flask's numbers, and "a random tonic" in the perk yardstick above, only show how far a different random sequence moves the result: up to about 3 points.

**Overburden prototypes** (Shallows, capacity 1, patched engine copy; Shell Gorget alone is 29.5%):

| Penalty per space over | 1 over (+ Cork Vest) | 2 over (+ Cork Vest + Storm Lens) |
|---|---|---|
| none | 33.8% | 41.9% |
| −6 Max HP | 28.0% | 27.2% |
| draw 1 fewer card on turn 1 of each fight | 29.5% | 33.4% |
| 1 less Light on turn 1 of each fight | 27.8% | 23.1% |
| lose 2 HP at the start of each fight | 27.7% | 26.2% |

"Offsets the benefit" means one space over should come out about where packing within capacity does (29.5%). The draw penalty lands there exactly at 1 over, but 2 over still pays. The other three make overpacking a small loss for the bot. They'd suit a player whose extra piece fits their build better than average.

**Sizing the Max HP cost** (the user picked Max HP). The test above overpacked with Cork Vest, whose +5 Max HP cancels the cost, so it was redone without HP gear. Packs within capacity average 28.7% (Shell Gorget 29.5, Storm Lens 29.4, Flood Chart 28.5, Cork Vest 28.2, Ebb Chart 27.8). Packs with extra spaces, averaged over 6 packs at 1 over and 2 at 2 over:

| Max HP per extra space | 1 over | 2 over |
|---|---|---|
| 0 | 33.0% | 37.3% |
| 3 | 29.7% | 29.8% |
| **4 (shipped)** | **28.2%** | **27.9%** |
| 5 | 27.1% | 25.5% |
| 6 | 26.2% | 22.4% |

At 4, overpacking breaks even on average. A pair that suits the plan pays (Shell Gorget + Storm Lens 31.4%); a poor pair costs (Shell Gorget + Ebb Chart 26.4%). At 6 it is a clear loss, especially at 2 over.

**Art:** 10 gear icons (the 9 pieces plus Salvage), generated with Codex from `assets-src/wanted-images.tsv`. That file also holds the style preamble. `tools/cut-icon.py` crops each to the object and saves a 160 px WebP in `img/icons/g_*.webp`. The full-size PNGs in `assets-src/gear/` are git-ignored, because they are about 2 MB each; Codex also keeps copies in `~/.codex/generated_images/`. Nothing is queued.

## Debug mode (v0.8.0, 2026-11-11)

- Asked for by the user, for testing. `js/debug.js`, loaded after ui.js. `?debug` turns it on and it stays on (`brinelight.debug.v1`); `?debug=0` or the panel turns it off. It shows a DEBUG tab at the left edge, and the `` ` `` key opens the panel.
- **Progress:** +100 Salvage, unlock all achievements, own all gear, unlock all depths, reset the Workshop, reset everything (asks first).
- **Run:** +100 Pearls, heal, +10 Max HP, god mode, add any card, keepsake or tonic, meet an achievement (it unlocks after the next won fight), and visit any kind of stop without moving on the map.
- **Fight:** win, lose, +3 Light, draw 3, set the Tide.
- **Any cheat marks the run** (`run.cheated`). Such a run keeps no best score and unlocks no depth, and the end screen says so. It still earns Salvage and achievements, so the Workshop can be tested; reset them from the panel.
- **The engine's only debug hook** is `run.debugGod`: the keeper takes no damage and no Brine (tested).
- `ui.js` exposes what the panel needs on `window.Brinelight` (`save`, `saveMeta`, `toast`, `modal`, `openOverlay`, `closeOverlay`, `onVictory`, `onDefeat`, `setMaxLevel`). `node tests/ui-smoke.js --only debug` checks the panel in the browser.

## For later (from the user)

- **Unlockable permanent effects that last across runs** (meta-progression), so players can reach the deeper Depths. Not started. Open questions: what unlocks them (score, wins, Depth reached, a currency), and whether they're always on or chosen before a run. They also must not make Shallows trivial.
- **Direction agreed (2026-11-11):** permanent progression gives *more options* (for example starting keepsakes, cards in the pools, later keepers) and also makes you *slightly stronger*, and it builds up over time. The offset is that players move on to harder depths. Every completed run gives something small. Whether score feeds progression is undecided; it depends on what score is for. A proposal (a currency spent on lighthouse upgrades with rising prices) is waiting for the user.
- **User's ideas for the shape (2026-11-11):** a permanent shop between runs. Progress achievements unlock new items in it, and a currency earned each run buys them ("Sea Glass" is a placeholder name). Reaching a new depth could unlock a new category of item, or something bigger like a new mechanic (the user knows that may be hard to build and balance). Even if you own everything, you equip only a subset, so there are always trade-offs. The user is unsure whether the permanent shop should change the deck. Proposal sent (capacity per dive depth, heirloom starter cards, a big unlock at Riptide); waiting for answers.
- 2026-11-11: the user also asked about different starting keepsakes, unlockable characters and new systems for variety. Options were proposed in conversation (trinket loadout with slots per depth, starting keepsake choice, unlockable keepers, a currency, unlocks that widen the pools, opt-in run modifiers, Tide marks, bounties, a second act). Waiting for the user to choose.
- **Balance yardstick for permanent power** (bot, 1000 seeds a row; compare these, don't target them). Script: the scratch `perks.js` approach, patching the run right after `E.newRun`.
  - Win rate by depth: Shallows 24.2%, Dark Water 13.5%, Riptide 5.7%, The Abyss 1.6%.
  - One small perk is worth about one depth step. Shallows / Dark Water / Abyss: +5 Max HP 28.2 / 16.5 / 2.3; +10 Max HP 33.1 / 20.5 / 4.0; an upgraded Rising Swell 31.2 / 21.1 / 2.6; one Brace removed 28.2 / 17.1 / 1.8; a random tonic 27.8 / 14.5 / 1.9 (noise: the bot never uses tonics). +50 Pearls does nothing for the bot, because it never shops.
  - Starting keepsake swapped for the Tide-Bell (Shallows): no keepsake 22.0%, so the Tide-Bell is worth about 2 points to the bot (the bot doesn't plan, so it undervalues draw). Close to the Tide-Bell: Coral Branch 23.2, Salted Hook 22.9, Spare Lantern 24.6, Gull Feather 25.8, Moon Shard 26.1, Angler's Lure 26.5. Strong: Kelp Bracelet 28.2, Tidewatch 29.4, Scallop Charm 29.9, Whispering Conch 31.6, Conch of Echoes 34.0, Storm Bottle 34.3, Drowned Anchor 35.2, Whale Tooth 36.8. **Barnacle Plate is an outlier: 57.5% as the starter, 63.4% as a second keepsake.** It may be too strong in normal play too; worth a look. Economy keepsakes (Pearl Earring, Merchant's Astrolabe, Pearl Strand) read low because the bot doesn't shop.

## Measurements (latest)

- **First real fight** (rules unchanged), bot over 500 seeds, median / p90:
  - careful bot (blocks whenever damage would get through): 5 / 6 turns, 17 / 22 actions, 30 / 39 taps on a phone;
  - aggressive bot (attacks first): 3 / 4 turns, 10 / 14 actions, 18 / 25 taps.
  - Animation time in the browser at normal speed, instant decisions: median 12.5 s.
  - Estimated play time with thinking (3.5 s a card, 1.5 s an End Turn, between the two bots): about 54 s.
- **Tutorial fight:** 16 steps = 6 Next taps + 8 card plays + 2 End Turns (24 taps on a phone). 253 words of bubble text. Estimated about 2 minutes (about 100 s reading at 180 wpm, 13 s tapping, 8 s animation).
- **Time to the end of the first real fight:** about 1 minute without the tutorial, about 3 minutes with it.
- **Readability:** rendered text below 12px over every screen at 1280x800, 390x844, 360x640 and 844x390: 161 elements before the interface pass, 1 after (a rotated card measured at 11.7px).
- **Bot run outcomes** (careful bot, 1000 seeds): win 24.2% (21.1% before the Low Water rework), average depth 10.5 of 11. Bots aren't people: use these for before/after comparisons, not as difficulty targets.

## Tools

- `tests/rules.test.js`: every rule in README.md and How to Play, plus determinism and save/continue. `tests/tutorial.test.js`: the scripted tutorial fight.
- `tests/ui-smoke.js`: headless Chrome through the real UI (desktop mouse and keyboard, phone touch, tutorial with mouse, touch and keyboard, tutorial from inside a run). Checks for JS errors, stuck screens, horizontal overflow, Continue, the keeper's incoming number and End Turn lighting up.
- `tools/bot.js`: loads the engine in Node and plays runs with a deterministic policy.
- `tools/opening.js`: the opening measurements above.
- `tools/screens.js`: screenshots of every screen at the four sizes, plus the small-text list. `tools/tutorial-shots.js`: one screenshot per tutorial step.
- `tools/serve.js`, `tools/cdp.js`: static server and a tiny Chrome DevTools client (launches its own headless Chrome on a free port).
- `tools/build.js`: assembles `_site/` for Pages and checks every referenced file exists.
- `tests/workshop.test.js`: the Workshop rules. `node tests/ui-smoke.js --only workshop` runs only the Workshop flow in the browser: buy, pack, dive, Salvage at the end, and abandoning a run earns nothing.
- `tools/cut-icon.py`: crops a generated icon to its object and saves a 160 px WebP (needs Python with Pillow).

## Determinism and saves

- All game randomness goes through a mulberry32 RNG whose state lives in the run (`run.rng`), so a save restores it exactly. Same seed and same decisions give the same run; tested, including a save/reload mid-fight.
- `Math.random` is used only for a fresh seed and in the UI (music, particles, float positions).
- The tutorial is a separate run object (`run.tutorial`) that is never saved and never scores. A run in progress is saved before the tutorial starts and reloaded after.
- localStorage keys: `brinelight.save.v1`, `brinelight.prefs.v1`, `brinelight.best.v1`, `brinelight.maxlevel.v1`, `brinelight.tutorial.v1`, `brinelight.hints.v1`, `brinelight.version.v1`, `brinelight.meta.v1`. Every project site on the Pages origin shares storage, so keep the `brinelight.` prefix on anything new.

## Art

- Painterly underwater scenes: teal deep water, warm lantern and brass highlights, creatures and objects on transparent backgrounds for units. All images are WebP in `img/`.
- Gear icons (v0.7.0): see "The Workshop" above.

## Open questions for the next playtest

- Could you play the first real fight without opening How to Play?
- Is the tutorial too long? Which bubbles felt unnecessary?
- On the fight screen, what did you look at first?
- On a phone, can you read the hand without raising each card?
- Does End Turn staying quiet until you're out of moves help, or did you look for it?
- Do the Hollow Siren, the Angler Twins and the Bellwether feel noticeably harder (Soaked fix)?
- Does the shop's "Buy X for N Pearls?" step feel safe or slow?
- Shallows felt easy in the 2026-11-11 playtest (lowest HP 43/80, won with 66/80). Does it for you?
- Low Water rework: is an Ebb deck now worth building? Do you miss Low Water's Ward? Does the strip read clearly when it happens?
- Do you notice Tidal Fury and Deep Ebb when you earn them?
- On reward screens, does the keyword legend help, or is it clutter?
