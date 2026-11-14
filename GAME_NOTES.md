# Brinelight: game notes

Working notes for whoever picks this up next. Player-facing rules are in README.md; commands are in AGENTS.md.

## Where this came from

- Brinelight was one of two builds made from the same brief (an original roguelike deckbuilder inspired by Slay the Spire) in a blind test. Both builds landed on a lighthouse keeper and a tide gauge.
- The user slightly preferred this one. The other build's first fight felt drawn out: it had raised enemy HP about 1.5x so the tide had time to play out, and weakened the starting attacks.
- The user's feedback, which applied to this build too: functional and nice-looking, but flat visual hierarchy (many equally weighted elements and texts), small text, and crucial rules buried in a long How to Play page. They asked for a tutorial that teaches the basics (HP on both sides, attacking, Ward on both sides, the Tide, how many cards you draw and how the discard pile comes back) before the game's own mechanics.

## Decisions the user made

- **Expedition and depth direction (2026-11-12; not built):** Every run starts in the Shallows and proceeds through the depths in one expedition. A band boss holds water in its own area. Defeating it drains the area and reveals a stair or tunnel down. After a boss, the player can continue or return home, ending the run with everything collected but resetting depth progress. A run also ends on completing its final objective or falling. Starting a new run at a deeper depth is not possible. WORLD.md establishes that Wren survives a fall and loses that expedition's fresh keepsakes; other losses remain open. The initial scope is now three levels, described below.
- **Return after a boss (2026-11-12; not built):** Wren can always get home safely after defeating a boss. Before the Heart is recovered, the Bellwether starts drawing water back as she retreats, without blocking her way home. Returning ends the expedition. Wren unloads, rests, and prepares, and by her next departure the Bellwether has restored the water and called back the boss or a similar replacement. There is no quick lighthouse visit that resumes the same expedition. Safe return also applies after the Heart comes home; the cause of later water and boss recurrence remains open.
- **Story direction (2026-11-12; not built):** Subtle environmental themes and cosmic horror, an ambiguous ending with a definite immediate victory, and continued expeditions in the altered Reach afterward. See "Current story and expedition scope" below and WORLD.md.
- **Current game versus this direction:** Since v0.19.0 the game has expeditions with the two existing levels (slice A of the plan in "Expedition proposal"): every run starts in the Shallows, and after the Shallows' pin the player goes home or goes deeper into Dark Water. Starting depths, Riptide and the Abyss are gone; currents replace them. Depth unlock and per-depth Hold notes further down are history. The third level, the suit and the new Shallows pin are slice B.
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

## Current story and expedition scope (2026-11-12; agreed direction, not built)

Saved from the lore and replayability discussion. WORLD.md holds the target fiction. This section records scope, implementation implications and ideas that remain proposals. The current game still has single-depth runs and four starting difficulty choices; these plans have not changed its behaviour.

**Agreed direction:**

- The keepers changed the Reach to make Saltmere safer. Something has grown in the conditions they created. Use that one central cause to carry the environmental theme and cosmic horror. Other ideas can remain implications instead of becoming several explicit pollution plots.
- Progress has real benefits alongside unintended consequences. Keep the lighthouse, useful equipment and the town's livelihoods worth preserving. Show the environmental meaning through discoveries and effects in the world, with a concrete adventure on the surface.
- Wren's first full victory brings the Heart home and saves Saltmere. Leave uncertainty about what survives below and what the Reach is becoming. The exact ending image is open; light remaining in the Belfry was an example, not a fixed scene.
- Subsequent expeditions continue in the same changed world. The lighthouse stays lit and the Bellwether stays silenced. Wren deals with continuing disturbances, salvage and discoveries. Individual successes should matter; later runs must not simply erase the first victory.
- Initially plan only three levels: the Shallows; a second, unnamed walkable level whose first boss clear gives the diving suit; and the final drowned Belfry, which requires bringing the suit from shore. Add intermediary levels later. Dark Water, Riptide and the Abyss are earlier location concepts, not a requirement to build three more levels now.
- Keep the existing suit rule: take it home after finding it, then carry it in a worn slot from the start of a later expedition. Keep safe return after bosses and a fresh start in the Shallows for every expedition.

**Suggested first implementation, not yet a detailed design:**

- Reuse combat, cards, route generation, shops, keepsakes and equipment before and after the first full victory.
- Record the first recovery of the Heart, then change expedition introductions, outcomes and a few story entries. A simple later objective could be to quiet a disturbance in the Reach and bring useful things home.
- Provide an appropriate repeatable final encounter after the Bellwether's defeat. One alternative encounter was suggested as a way to limit initial content work; its identity, art and mechanics remain open.
- The main underlying work is still connecting levels into one expedition, supporting continue-or-return after a boss, banking a safe return, and enforcing the suit requirement. These are larger changes than adding story state and alternate text afterward. Save compatibility and rule/UI checks belong in that implementation.
- Tracked rescues, permanent harbour or fishing-ground improvements, several mission types, and a town simulation are optional expansion ideas. They are not required for the initial version. Likewise, literal time loops and separate retellings were discussed as alternatives, not chosen as the explanation for later runs.

**Open before implementation:** the second level's name and length; level encounters and bosses; what restores water and ringers after the Bellwether is silenced; the later final objective and encounter; and how fresh-keepsake recall and Roil-following Bell Minnows fit that later world. The larger entity and exact ending can remain ambiguous. A chronology question also remains: objects have soaked in brinelight for years although the Heart descends tonight; gradual leakage from older keeper practices is only a suggestion.

## Earlier paused plan and open questions (2026-11-12)

The user paused the earlier item-design discussion here. Some of it has since shipped; retain the discussion as history and use the versioned implementation notes for current behaviour. For the latest story and level scope, start with the section above and WORLD.md. Unresolved names and numbers remain open.

**Where things stand.**
- v0.22.0 (2026-11-14, not pushed): slice C, more kit and keepsakes, and the Hold grows by the deepest level reached. See "More kit and keepsakes, slice C (v0.22.0, 2026-11-14)". v0.20.0 (slice B, the Belfry) and v0.21.0 (deeper Dreads are harder) are committed and not pushed either.
- v0.19.0 (2026-11-13, not pushed): expeditions, slice A. See "Expeditions, slice A (v0.19.0, 2026-11-13)". Slice B (the Belfry, the suit, the Shallows' new pin, the story rewrite) is next.
- v0.18.0 (2026-11-13, not pushed): the user's notes on v0.17.0: Slack Water 4 Ward, the bells pay Light or Ward, a Roil step every 12, the Buoy's Wild Peal, and the Gulper's Retch. See "Playtest notes on v0.17.0 (v0.18.0, 2026-11-13)". The expedition is next and waits for the user's answers: see "Expedition proposal (2026-11-13; waiting for the user)".
- v0.17.0 (2026-11-13, pushed with v0.15.0 and v0.16.0): Bail and Stir, and Ebb 2 on four cards. See "Bail and Stir (v0.17.0, 2026-11-13)" below.
- v0.16.0 (2026-11-13): the user's playtest notes on v0.14.0. The Shallows are harder, Dreads give less, the pins call for help sooner, and there are the RITE label, the score lines, purple unlock boxes, and backup, restore and reset. See "Playtest notes on v0.14.0 (v0.16.0, 2026-11-13)" below. Two notes are proposals, not built: Strands are hard to reach, and a weak standard action.
- v0.15.0 (2026-11-12, committed 2026-11-13): Dark Water is a band of its own, step 1 of the expedition work. See "Dark Water (v0.15.0, 2026-11-12)" below.
- The live build is v0.14.0, pushed on 2026-11-12: Scour is renamed Thrash, hits every turn from the first, and Ward stops it; `tools/measure.js` measures in parallel. See "Scour changed in v0.14.0".
- Before it came v0.13.0, pushed the same day: the Lazaret, the Roil ladder, the title-screen button levels, the Logbook and two debug switches. See "The Lazaret (v0.13.0, 2026-11-12)" and "The Roil ladder, title levels and Logbook (v0.13.0, 2026-11-12)".
- Before it came v0.12.0 (the opening and Story so far) and v0.11.0 (the lore and names pass), pushed together in one commit on the same day, and v0.10.0: kit in five places, the bells, and keepsake Roil (then called Charge), Hold and Seep.
- The item-rework plans below (plans 1 and 2) record earlier design discussion. Kit and keepsake changes have since shipped in the versioned sections below; they do not set the next implementation priority.
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

**Build order** (the user said "start building" on 2026-11-12):
1. **Kit in slots.** This replaces the pack, capacity and overburden. **Built in v0.10.0.**
2. **Charge, Hold and Seep** in the current one-depth game. Until the expedition exists, the Hold follows the depth level. Keepsake picks become optional again. **Built in v0.10.0.** See "Kit and keepsake Charge (v0.10.0)".
3. **The keepsake cabinet.** Keepsakes from a won run are kept, and you bring them within your Hold. New ones are lost on defeat. **Built in v0.13.0** as the Lazaret. See "The Lazaret (v0.13.0, 2026-11-12)".
4. **The expedition:** bands, going home after a boss, and currents.

**Belt (2026-11-12):**
- The user asked whether "the Belt holds one item" meant one potion. It doesn't: tonics keep their 3 slots, and the Belt holds one piece of kit.
- The user then pointed out that an earring or an astrolabe isn't belt gear.
- **Proposal:** kit is mundane gear. Jewelry and curios would blur kit with keepsakes again, so the moved keepsakes are remade as things hung at the waist. Their effects stay the same:
  - Pearl Earring → Gleaner's Pouch
  - Merchant's Astrolabe → Pearl Scales (honest weights, so Barnaby, who won't haggle, can't overcharge)
  - Pearl Strand → Gleaning Net (catches the pearls a breaking wave shakes loose)
  - Spare Lantern, Coin Purse, Spare Flask and Barnaby's Marker already fit.
- This needs 3 new icons.
- **Decided (2026-11-12):** the slot holds **two items**. It needs a name that says it holds things, rather than being a belt. Suggested: **Satchel** (my pick), Pouches, or Ditty Bag, a sailor's small bag for tools and odds and ends. The name isn't chosen yet.
- **Decided (2026-11-12): two different spaces, a Pocket and a Ditty Bag.** A ditty bag is a sailor's small drawstring bag for a sewing kit, small tools and odds and ends. It is a second container, not a strap.
- **Proposed split:**
  - **Pocket:** coins and tokens. Coin Purse, Gleaner's Pouch, Barnaby's Marker.
  - **Ditty Bag:** small tools and supplies. Spare Flask, Pearl Scales, Gleaning Net, and Spare Wick, renamed from Spare Lantern because a lantern doesn't fit in a ditty bag. Its art file is already `k_sparewick`.
  - With named spaces, "Satchel" is no longer needed. The kit becomes Harpoon, Bell, Coat, Pocket and Ditty Bag.

### Later slices of meta-progression (planned 2026-11-11)

These are earlier expansion ideas. Their named-depth unlocks need revisiting under the initial three-level scope; they are not additional requirements for that first version.

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
- **More levels**: add intermediary bands after the initial three-level version. See "Current story and expedition scope".
- **More characters**: unlockable keepers. WORLD.md has the open question about other keepers.
- **A lore overhaul:** done in v0.11.0 for the story and the names. See "Lore and names (v0.11.0)".
- **Art and sound to match the new lore (2026-11-12; art done in v0.23.0, sound in v0.25.0):**
  - Update the art that tells the old story. Done: see "Art review (v0.23.0)".
  - Add sound effects, for example for a bell that changes the water. Done: see "Music and sound (v0.25.0)".
- **Rename the fight's Tide words: built in v0.11.0.** The gauge is the Swell and Low Water is a Strand. See "Lore and names (v0.11.0)".

### Lore and names (v0.11.0, 2026-11-12)

The user handed the world-building and lore to the agent ("it is yours to adapt and change as required"), chose the Roil words and the Lazaret, and said to implement the rest. WORLD.md holds the full story. Rules and balance did not change.

**Chosen by the user:** the aether, Roil (was Charge), Calm and Roiled for its two states, and the Lazaret for the keepsake store room. The user dropped Even because it can be misread.

**The agent's calls (each can be undone on its own):**
1. **Tide → Swell** for the fight gauge. Surge, Ebb and Crest keep their names. The coast keeps the word "tide".
2. **Low Water → Strand.** The chain bonus Deep Ebb is now High and Dry. The achievement is Double Strand.
3. **Depth 3/11 → Landing 3/11** for the map row. "Depth" now means only the Shallows, Dark Water, Riptide and the Abyss.
4. **The story:** the Bellwether is the keepers' own great bell, nobody rang it, the Heart followed it down, and the light went out on Wren's watch. The title, win and loss texts and the README intro say so.
5. **Walking text:** "Swim on", "seabed", "submerged stair", "Dive", "Dive again" and "First dive?" are gone. The button before a run says "Set out". Only the Gilded Gull's flooded hold is a dive.
6. **"aether" is lower-case** in game text, like "the sea". Roil, Hold, Seep, Calm and Roiled are capitalised.
7. **Names that keep "tide":** the Brass Tide-Bell, Tide Reading, Spring Tide, Tidal Memory, Tidewatch, Tidal Fury and Slack Water.
8. **Not in the game yet, WORLD.md only:** the Belfry (the last depth), the Lazaret, the pins, falling without dying, the suit found on first clearing the Abyss, and the later keepers.

**The code keeps the old names:** `tide`, `low` and `lowWater`, `charge`, `floor`, the `dive` action, and the `charge` hint id. Saved runs and seen hints carry over unchanged.

**A new rule test** fails if card, keepsake, kit, status, tonic or achievement text uses Tide (other than Tide-Bell), Low Water or Charge.

**Still to do:**
- The Wreck painting shows the Gilded Gull fully underwater, and the title art shows a sea, not stairs. Art and sound for the new lore are still planned. (v0.23.0 repainted the Wreck; the title art is unchanged.)
- The tide bar and the keepsake chip have no new art or sound.
- Sent but not chosen, for later: names for Roil (Strain, Pressure, Fret, Wake), for the store (the Salt Cellar, the Lamp Room), and for the aether's states (Fair and Foul, Quiet and Unquiet).

### The opening and Story so far (v0.12.0, 2026-11-12)

The user asked for a title story that is more engaging and higher in stakes, then for one that is "less cryptic, more concrete" and does not assume the player knows the world. They chose the title line and the four-part opening, and proposed the rest: more story unlocked as levels are added, reached from a "story so far" button on the title screen, with a glossary, explanations of concepts and tidbits about the world.

**Chosen by the user:** the title line, the opening text, and the idea and name of Story so far.

**The agent's calls (each can be undone on its own):**
1. **The opening is four full-screen pictures** with Next and Skip. It plays once, before the first descent, ahead of the tutorial offer. It reuses the title, boss and Cove paintings and the keeper sprite. The bell sound plays on "Tonight the bell rang by itself".
2. **Story so far has three tabs:** Story (chapters), The world (glossary, always open) and Keeper's notes (15 tidbits). It is on the title screen and in the menu.
3. **What unlocks:** chapter 2 on the first fall, chapters 3 to 6 on the first clear of each depth, and each note on first meeting its subject. Locked chapters show their title and what opens them. Locked notes show only where to find them.
4. **New entries are announced:** a toast during a run, a button on the end screen, and a New mark on the title button and inside the screen until read.
5. **Chapter 3 bridges the current game and the agreed story:** after a win the bell rings again from deeper down and the fire goes back to it. That is why Wren goes down again.
6. **Chapter 6 names the Belfry and the diving dress,** and says the story stops there for now. Neither is in the game yet.
7. **The loss screen is plainer,** and Wren's lantern now burns down to an ember when she falls. It does not go out, because it holds the last of the fire.
8. **The title buttons sit two to a row on narrow phones,** so six buttons fit.
9. **How to Play fix:** an old style rule kept the Keywords, map and Controls lists at 14px and two columns on phones. It is removed, so they are 16px and one column on phones.

**How it is built:** the text and the unlock marks are in `BL.STORY` (js/data.js). `E.storyMarks(run)` reads marks off a run, and `E.storyOpen(entry, marks)` says whether an entry is open (js/engine.js). The UI stores marks, read entries and "opening seen" in `brinelight.story.v1`. Depths cleared before v0.12.0 count, read from the deepest unlocked depth. The tutorial and debug-cheated runs open nothing. The debug panel has "Unlock all story". `tests/story.test.js` covers the content and the marks, and the UI smoke test has a story scenario.

**Still to do:**
- The opening has no art of its own. The fourth picture puts the keeper sprite on the Cove painting. (v0.23.0 gave the first three pictures their own art.)
- "Tonight" in the opening and "by dawn" on the win screen fit one run. The planned expeditions with trips home will need different words.
- Offered and not built: a different title line after the first win, and a count of stairs lost on the loss screen.

### The Lazaret (v0.13.0, 2026-11-12)

Step 3 of the build order. The user played v0.10.0 and their recent feedback comes from that playthrough.

**Chosen by the user (2026-11-12):**
- You may bring **any number** of kept keepsakes.
- A win keeps **every** keepsake Wren carries.
- The Lazaret **opens after the first Shallows win**.
- **Not decided:** the user is "not sure if we should be allowed to stack keepsakes of same type/sell them".

**The agent's calls (provisional; each can be undone on its own):**
1. **No stacking.** The Lazaret holds one of each keepsake. No keepsake effect was written to stack, and two Whale Teeth or two Storm Bottles would need new balance work.
2. **A duplicate brought home becomes Salvage:** half its Roil, rounded up (3 to 10). At full Roil a win with two duplicates almost doubled a run's Salvage, and kit costs 8 to 35.
3. **Nothing else can be sold.** A sold keepsake would have to be found and won again, and Salvage has few things to buy.
4. **A run can still offer a keepsake that is at home.** Without that, the offers would shrink as the Lazaret fills.
5. **Keepsakes in the Lazaret are never lost.** A brought keepsake that Wren drops is out of that run only. WORLD.md has the reason: a night in the Lazaret makes it answer her.
6. **The Hold is unchanged** (30 in the Shallows, +5 per depth). The Lazaret adds choice more than power, because the Hold caps what comes along.
7. **Depths unlocked before v0.13.0 count as the first win,** so those players find the Lazaret open and empty.
8. **A debug-cheated win keeps nothing.** The debug panel has "Fill the Lazaret".
9. **The title screen's smaller buttons sit two to a row at every size.** A landscape phone also puts Continue and New Descent side by side. Seven buttons did not fit in one column.
10. **Before a descent, keepsakes come first and kit second,** because bringing too many keepsakes has a cost and the player should see it without scrolling.

**Measured** (bot, 1000 seeds; the bot brings the set, then plays and picks as usual; scratch `lazaret.js`):

| Brought from the Lazaret | Shallows, no kit | Shallows, full kit | Dark Water, no kit |
|---|---|---|---|
| nothing | 23.3% | 34.5% | 14.4% |
| Whale Tooth + Kelp Bracelet (Roil 30) | 32.8% | 40.6% | 21.9% |
| Storm Bottle + Tidewatch (30) | 32.2% | 39.3% | 21.8% |
| Drowned Anchor + Scallop Charm (30) | 31.4% | 39.5% | 18.8% |
| Whispering Conch + Scallop Charm (29) | 28.9% | 37.8% | 19.0% |
| Conch of Echoes + Tidewatch (29) | 28.3% | 37.2% | 20.2% |
| Barnacle Plate + Tidewatch (26) | 29.0% | 36.8% | 17.7% |
| Moon Shard, Gull Feather, Coral Branch, Salted Hook (29) | 23.5% | 30.1% | 15.9% |
| Whale Tooth alone (19) | 30.2% | 37.1% | 18.7% |
| Kelp Bracelet alone (11) | 29.5% | 37.5% | 20.2% |
| Whale Tooth + Storm Bottle (37: 2 Seep in the Shallows, 1 in Dark Water) | 27.3% | 35.7% | 22.2% |
| Whale Tooth, Storm Bottle, Drowned Anchor (55: 5 Seep, 4 in Dark Water) | 13.9% | 20.8% | 10.5% |
| all 14 (177) | 4.2% | 6.1% | 1.9% |

- A full Hold from home is worth 5 to 10 points in the Shallows without kit and 3 to 6 with a full kit. One keepsake from home is worth 6 to 7, because the run still picks up about one more.
- A bot that brings a full Hold takes about 0.25 keepsakes on the way, against 1.7 when it brings nothing. Found keepsakes then cost Seep, so Dreads and Wrecks pay less. **Open:** is that a good tension or a dull one? A person can drop a brought keepsake for a found one at no lasting cost.
- Going far over the Hold is worse than bringing nothing, so "any number" is safe.
- The four cheap keepsakes together add nothing for the bot. It does not build around Coral Branch or Salted Hook.

**How it is built:** `meta.lazaret`, `meta.bring` and `meta.lazOpen` in `brinelight.meta.v1`. `E.newRun(seed, level, kit, bring)` carries the chosen keepsakes and records them in `run.brought`. `E.storeKeepsakes(meta, run)` runs on a win. `E.foundKeepsakes(run)` lists what a fall loses. `E.toggleBring`, `E.bringCharge` and `E.duplicateSalvage` do the rest. The UI has `showLazaret()`, a keepsake section in the pre-descent screen, and a box on the end screen. `tests/lazaret.test.js` covers the rules, and `node tests/ui-smoke.js --only lazaret` plays three runs through the browser.

**Debug switches for playtesting (asked for by the user, 2026-11-12):** "Skip fights" wins every fight the moment it starts. "Cheats count as real runs" stops cheats from marking the run, so a skipped run can still unlock depths, story and the Lazaret. The second switch is the agent's addition: without it, a skipped run could not test the Lazaret or the story. Both are kept in `brinelight.debugopts.v1`.

**Still to do:**
- The Lazaret has no picture.
- The stacking and selling question is the user's to settle.
- With expeditions, "win" becomes "come home", and the Lazaret is where going home or going on starts to matter.

### The Roil ladder, title levels and Logbook (v0.13.0, 2026-11-12)

**The user's direction (2026-11-12):** the Lazaret is "good so far", but the penalties for too much Roil "could be even more creative", with room to deepen the lore. Their example ladder: Seep first, then damage each round from unstable aether, then something more severe such as extra enemies in each fight, then one more Seep, reusing penalties. "If easy to implement."

**Built:** every 5 Roil past the Hold (or part of 5) is one step, as before. The steps now go round a ladder of three (`E.roilFor`):

| Step | Adds to every fight |
|---|---|
| 1, 4, 7... | 1 Seep (an unplayable card in the draw pile) |
| 2, 5, 8... | 1 Scour: from the 4th turn of a fight, lose that much HP at the start of each turn. Ward does not stop it. (Changed in v0.14.0, see below.) |
| 3, 6 | 1 Bell Minnow as an extra enemy, at half health (6 or 7 HP in the Shallows). 2 at most. |

**The agent's calls (provisional; each is one constant in js/engine.js):**
1. **Scour starts on turn 4** (`E.SCOUR_FROM_TURN`). The user said "each round". Every turn from turn 1 was far too harsh for the bot (see the table), and turn 4 means a Swift fight is never Scoured, so it pushes toward fast fights.
2. **The Minnow arrives at half health** (`E.ROIL_MINNOW_HP = 0.5`). A full Bell Minnow cost the bot 25 points on its own.
3. **Two Minnows at most** (`E.MAX_ROIL_MINNOWS`). The boss calls two more, and five enemies is what the phone layout was checked with.
4. **The names:** Scour for the HP loss (a tide scours rock). The extra enemy has no keyword of its own: the text says "a Bell Minnow".
5. **The reason in the fiction:** the Bellwether listens for Roil and sends a minnow. WORLD.md has it as Agreed.

**Measured** (bot, Shallows, 1000 seeds; the penalty is forced in every fight and the bot takes every keepsake freely, so compare the rows with each other and not with other tables):

| In every fight | Win rate |
|---|---|
| nothing | 28.9% |
| 1 Seep / 2 / 3 / 4 Seep (the old ladder) | 22.2% / 18.9% / 13.7% / 9.4% |
| Scour 1 from turn 1 / 2 / 3 / 4 / 5 | 8.4% / 11.1% / 13.3% / 16.4% / 19.0% |
| Scour 2 from turn 1 / from turn 4 | 1.7% / 9.0% |
| 1 Bell Minnow at full / 50% / 25% health / 1 HP | 4.2% / 14.6% / 18.1% / 18.7% |
| 2 Bell Minnows at full health | 0.2% |
| **the ladder as built, step 1 / 2 / 3 / 4 / 5 / 6** | **22.2% / 11.1% / 4.7% / 2.4% / 0.8% / 0.1%** |

Real runs that bring keepsakes from the Lazaret (the bot picks as usual):

| Brought | Shallows, old ladder | Shallows, new | Dark Water, new |
|---|---|---|---|
| nothing | 23.3% | 23.8% | 14.2% |
| Whale Tooth + Kelp Bracelet (30, Calm) | 32.8% | 30.6% | 21.4% |
| Whale Tooth + Storm Bottle (37) | 27.3% | 23.5% | 20.1% |
| Whale Tooth + Storm Bottle + Coral Branch (43) | not measured | 13.2% | 14.6% |
| Whale Tooth + Storm Bottle + Drowned Anchor (55) | 13.9% | 7.1% | 6.1% |

- **The ladder is steeper than the old one from step 2 on.** Step 1 is unchanged. For the bot, step 2 is about as bad as 3 or 4 Seep were. The bot's fights are long (5 turns at the median), so Scour hurts it more than it would hurt a player who wins in 3 or 4.
- **Even a 1 HP Minnow costs the bot 10 points,** because it spends a card on it and takes a bite first. A player with a Crest deck kills a half-health Minnow with one wave.
- **Open for the playtest:** is step 2 too big a jump from step 1? The knobs are the three constants above.

**Scour changed in v0.14.0 (2026-11-12).** The user asked whether a Scour that Ward stops had been tested. It had not, so it was measured, in two timings: at the start of the turn before last turn's Ward washes away, and at the end of the turn before the enemies act.

| Scour rule (ladder step 2 / 3 / 4 / 5 / 6; Calm 28.9%, step 1 22.2%) | Win rate |
|---|---|
| v0.13.0: Ward does not stop it, from turn 4 | 11.1% / 4.7% / 2.4% / 0.8% / 0.1% |
| start of turn, Ward stops it, from turn 4 | 14.9% / 7.6% / 3.7% / 1.7% / 0.4% |
| **start of turn, Ward stops it, from turn 1 (the user's choice, built)** | **10.5% / 4.9% / 1.9% / 0.5% / 0.0%** |
| end of turn, Ward stops it, from turn 4 | 17.0% / 8.4% / 4.4% / 2.5% / 0.6% |
| end of turn, Ward stops it, from turn 1 | 12.1% / 6.2% / 2.6% / 0.9% / 0.1% |

- **The user's choice:** "start of turn, Ward stops it, from turn 1". `E.SCOUR_FROM_TURN` is gone. Scour is now ordinary damage (`dealDamage`) dealt in `startPlayerTurn` before the keeper's Ward is cleared.
- **The bot understates Ward.** It plays Ward only to cover the attacks it sees, so it stops a Scour by accident. A bot that warded for Scour on purpose did slightly worse (Scour 1 alone, from turn 1: 10.3% against 14.1%), because it spent a whole card on 1 damage. A player who has Ward to spare loses nothing.
- **The agent's calls (provisional):**
  1. **The Shell Gorget stops the first Scour.** Its 4 Ward now goes up before the first turn, and Ward is not cleared at the start of turn 1. Without this the first Scour of every fight could not be stopped by anything. With Scour 1 alone the Gorget takes the bot from 14.1% to 21.3%, and with Scour 2 from 5.8% to 12.2%, so it is the kit answer to Scour. That may be too strong for a 25 Salvage piece.
  2. **A stopped Scour keeps the fight Flawless,** because no HP is lost.
  3. **The fight shows it:** a Scour chip on the keeper, and the incoming damage number adds the Scour that lands at the start of the next turn. Enemy hits and the Scour both come off the same Ward, so the number is what the keeper will lose if she ends the turn now.
- **Real runs with the built rule** (bring from the Lazaret, bot picks as usual): Shallows nothing 23.8%, Whale Tooth + Kelp Bracelet (30, Calm) 30.8%, Whale Tooth + Storm Bottle (37, step 2) 20.7%, with Coral Branch (43, step 3) 12.2%, with Drowned Anchor (55, step 5) 4.5%. Dark Water: 14.2% / 21.4% / 20.2% / 13.2% / 5.4%.
- **Scour is now Thrash (the user's pick, 2026-11-12).** They asked for a name that implies a chaotic force you can defend against at a cost. The agent offered Thrash (its pick), Buffet, Batter, Churn and Brunt; Lash, Breaker, Squall, Riptide and Undertow were already cards, enemy moves or places. The fiction: the aether thrashes like a hooked fish and strikes whoever is nearest. The code says `thrash` too (`roil.thrash`, `c.thrash`), and `E.migrateRun` carries over a fight saved as `scour`. The v0.13.0 notes above and the v0.13.0 changelog entry keep the old name.
- **Measuring is parallel now:** `tools/measure.js` (`npm run measure`) runs each row of a table in its own process. The 35 settings above took 40 seconds on 22 cores, against about 7.5 minutes one after another, with the same numbers.

**The title screen (the user, 2026-11-12):** "New Descent being most prominent/largest" is right; other action buttons such as the Workshop should be secondary, and the story, tutorial and How to Play buttons tertiary. Built as three levels: Continue and New Descent (large, filled), the Workshop and the Lazaret (medium, outlined), and Story so far, the Logbook, the Tutorial and How to Play (small, text only).

**The Logbook (the user asked for "a very simple stat screen"):** a title-screen button once there is anything to show. It lists descents finished (won and lost), the deepest landing reached, depths cleared, best score, Salvage now and earned in all, kit owned, keepsakes in the Lazaret, achievements, and Story so far entries open. The name is the agent's: a lighthouse keeper keeps a logbook. `meta.record = { runs, wins, deep }` is new, so descents and the deepest landing are counted from v0.13.0; the rest is read from what was already stored. Abandoned, tutorial and debug-cheated runs are not counted.

### Dark Water (v0.15.0, 2026-11-12)

Step 1 of the expedition work: the second level's content, playable first in the Dark Water slot so it can be balanced before the expedition exists. The user asked for "the best next things to implement", got a ranked list (1: a second level with its own enemies, pin and events; 2: the expedition itself; 3: currents; 4: a bot that shops and uses tonics), and said "Implement step 1."

**Built:**
- **Bands** (`BL.BANDS` in js/data.js): each has its encounter tables, Fog event list, boss name, two fight paintings and win text. `E.LEVELS[i].band` says which a starting depth uses; `E.band(run)`, `E.bandId(run)`, `E.eventPool(run)`. The Shallows band is `BL.ENCOUNTERS` and the seven old events, unchanged: all 1000 Shallows bot seeds play exactly as in v0.14.0 (checked seed by seed).
- **Dark Water's creatures:** Glimmer Leech (Latch heals it by the HP it takes), Pistol Shrimp (Cock the Claw 4, then Flash Snap 14), Murk Ray (Sting, Sink: Submerged, Rise 15), Lamp Hermit (Shell: keeps its Ward). With the Lantern Eel, Gloom Jelly, Drowned Deckhand and Fog Wisp. Dreads: Glimmer Chain (Drink the Light: Doused 1), Pale Gulper (Gulp swallows the last card you played that turn until it dies), and the Angler Twins.
- **The pin: the Tolling Buoy**, 165 HP. Haul the Chain (12 Ward, Doused 1), Rocking Toll (12 + 2 per earlier Toll + 4 per step the Swell is from 3), Clang (8 x2), Rocking Toll again. At half health The Cage Opens: two Glimmer Leeches and 1 Might.
- **Three Fog events:** the Tide-Board (1 of 3 cards that Surge or Ebb, or +5 Max HP), the Glimmer Garden (lose 9 HP for a random keepsake, or 45 Pearls and a Glimmer Leech follows you into your next fight), the Diving Bell (heal 18, or 1 of 3 cards). Dark Water's Fog also has the Shrine, the Pool and the Lamplighter.
- **New rules in the engine:** a move's `drain`, `submerge` and `swallow`; the `shell` status; the keeper's `doused` status (used up at the start of the next turn, `c.dousedTurn` marks it for the hint); move damage that reads the fight (`dmg(e, c)`, `E.moveDamage`); `E.targets(c)` and `E.reachable(e)` for what can be aimed at or attacked; `run.followers` for the Garden's leech.
- **Riptide and the Abyss** use the Dark Water band, at 5% more HP and 10% harder hits (Riptide) and 10% and 15% (the Abyss, rests 25%). Dark Water itself has no multiplier now.
- **Story:** the win text per band; chapter 4 opens with the Buoy; glossary entries for Dark Water and pins; six new notes; the Bellwether's note opens on `en:bell` instead of any boss. WORLD.md has the fiction.
- **Art:** 7 creatures, 2 fight paintings, 3 event scenes (Codex, queue lines in `assets-src/wanted-images.tsv`). The Pale Gulper came back with a grey haze in its alpha; it was cleaned by ramping alpha 60–140 (`assets-src/units/gulper-clean.png`). The Buoy is the second of two variants: its top glows with eaten light instead of a warm lamp.
- **UI:** fight and reward backgrounds per band, boss names per band, a sunk look and no targeting for a Submerged enemy (with a message), a Swallowed chip listing the card, a doused Light orb, toasts for the swallow and the leech that followed you, and first-time hints for Doused, Submerged, Shell and Swallowed. How to Play lists Doused, Submerged and Shell under "In Dark Water".

**The agent's calls (provisional; each can be undone on its own):**
1. **The name stays Dark Water.** Players know it and chapter 3 points to it. WORLD.md records it as the second level, which means the suit and chapters 5–6 move there when the expedition is built.
2. **The Buoy is Dark Water's pin**, from WORLD.md's three pin ideas. The hermit crab wearing a harbour bell is kept for the Shallows' own pin in step 2, and the drowned ringer for later.
3. **The Shallows keep the Bellwether as their boss for now.** Moving it to the Belfry is part of step 2.
4. **Riptide and the Abyss use Dark Water's creatures,** because they are deeper. Their multipliers were reset so their bot win rates stay close (table below).
5. **The Rocking Toll is symmetric:** it punishes a Swell left far from 3 at either end, so Crest and Strand decks both have to finish their waves before ending the turn. It never favours one end (the user's rule from the Low Water rework).
6. **Submerged blocks all attacks and aiming, not waves.** Crests, Abyssal Pull, Spindrift, Lighthouse Beam and Brine still reach it, and a Strand brings it up, so both ends of the Swell answer it.
7. **Shell favours Strand decks a little** (a Strand strips it). Allowed as a small one-sided trait on one normal creature; the Pistol Shrimp's spike and the leeches' swarms favour Ward and Crests.
8. **The Gulper swallows the last card played that turn**, so the player chooses what it eats. Enemies act after the hand is discarded, so "a card from your hand" was not possible. A Rite or a Sink card is not in the discard pile and is safe.
9. **Event numbers:** the Garden's keepsake costs 9 HP (the Wreck gives one plus a curse); its beads pay 45 Pearls and a leech; the Diving Bell heals 18 (the Pool's drink heals 20); the Tide-Board's +5 Max HP is worth about one small perk.
10. **Brinelight is older than tonight** (WORLD.md): keepers' lanterns lit from the Heart were lost below for centuries, and the held water keeps light. This answers the chronology question the lore left open.

**Measured** (bot, 1000 seeds, no kit unless named):

| | v0.14.0 | v0.15.0 |
|---|---|---|
| Shallows | 23.8% | 23.8% (identical seeds) |
| Dark Water | 14.2% | 14.5% |
| Riptide | 3.2% | 3.9% |
| The Abyss | 1.3% | 1.3% |
| Dark Water, Honed Harpoon + Cork Vest | 20.0% | 20.9% |
| Dark Water, Honed Harpoon + Shell Gorget | 21.4% | 18.7% |
| Dark Water, bring Whale Tooth + Kelp Bracelet | 21.4% | 15.6% |
| Dark Water, bring Whale Tooth + Storm Bottle (1 Seep) | 20.2% | 21.7% |

Per fight in Dark Water (HP the bot loses, its turns): easy fights 1–7 HP; hard fights 4–23 HP (Lantern Eel + Pistol Shrimp is the worst at 23); Dreads 12.5–19 HP (the Glimmer Chain is the hardest); the Buoy 55.5 HP in 11.4 turns, and 84% of falls are to it. In the Shallows the Bellwether costs 52 HP in 11.2 turns. A first version of the Buoy had 195 HP and lasted 13.4 turns at the same win rate; it was cut to 165 HP and made to hit harder so it isn't a slog.

Single keepsakes brought into Dark Water (points over 14.5%; v0.14.0's Dark Water in brackets): Storm Bottle +8.2 (+5.9), Conch of Echoes +3.9 (+2.9), Kelp Bracelet +3.4 (+5.6), Whispering Conch +2.8 (+4.6), Drowned Anchor +2.5 (+6.0), Scallop Charm +2.5 (+4.3), Whale Tooth +2.0 (+5.5), Tidewatch +1.7 (+3.7), Barnacle Plate +1.0 (+6.9), Moon Shard 0.0 (+3.7). Noise is about ±2 points.

**Open (for the user and the playtest):**
- **Keepsakes are worth different amounts in different bands.** Roil was set from Shallows values. In Dark Water the Storm Bottle answers Doused, and the Moon Shard starts every fight at Swell 5, which makes the Buoy's Toll hit 8 harder until you Crest. Most others are worth less there, Barnacle Plate and Whale Tooth most of all. Is that variety good, or should Roil differ by band?
- Does the Rocking Toll read clearly? Its intent number changes as you play Surge and Ebb cards.
- Is the Murk Ray's sunk turn interesting (build the Swell, or Ward up for its Rise), or just a lost turn?
- Is the Pale Gulper's "last card played" swallow a real choice, or easy to forget?
- On the smallest phones (360 px), three enemies' names run into each other and a Ward badge covers part of the next HP bar. The layout already did this for the Shallows' three-enemy fights (`.unit .info` has a minimum width of 84–96 px), but Dark Water has more of them, and the Lamp Hermit's Shell keeps a Ward badge up.
- No sound of its own for Dark Water, the Buoy, a douse or a swallow, and no music change. (v0.25.0 gave Dark Water its music layer, ambience and echo, and a douse its own sound. The Buoy and a swallow still have none.)

### Playtest notes on v0.14.0 (v0.16.0, 2026-11-13)

The user played v0.14.0 and sent ten notes. Their words, shortened: a Reset Progress button with a confirmation; Rites marked in the hand; "reducing Swell to Strand still feels too hard to do. Not sure what to do about this"; maybe a weak standard action for a hand with no good cards ("very unsure"); Dread rewards may be too much ("maybe keepsake only is enough"); Lighthouse Beam "a tad too strong"; the Bellwether's backup comes too late to be dangerous; a clearer breakdown of the score and Salvage; the Lazaret's unlock box should be purple like the others; and the first depth is "a bit too easy": add challenge "in a fun way, while preserving pace", no HP sponges, and lower the Shallows' Hold from 30 to "maybe 20". Mid-build they added: "maybe also add option to export save if possible".

**Built:**
- **Hold:** `E.HOLDS = [20, 35, 40, 45]` (it was 30 + 5 a depth). Only the Shallows changed.
- **Dreads** pay Pearls and 1 of 2 keepsakes; no card and no tonic. The reward screen leaves out the card section. A Dread reward saved before v0.16.0 with a card still skips for +80.
- **Pins call sooner:** `BL.PIN_CALL = 2/3`. The Bellwether calls its shoal, and the Buoy opens its cage, at two thirds of their health instead of half.
- **Lighthouse Beam:** 2 per Swell (upgraded 3), from 3 (4).
- **The Shallows' challenge:** the Kelp Lurker's Lash hits 2 harder each time (8, 10, 12...), and the Barnacle Mite's Burrow is 5 Ward and 1 Might (was 6 Ward). Only the Shallows' own creatures changed, so Dark Water's tables stay as measured.
- **RITE label** in the hand: the type pill shows for Rites only, on the lower left of the picture, where the next card in a crowded hand never covers it. Other types still show their pill only outside the hand.
- **Score lines:** `E.scoreParts(run, won)` gives each line, the sum, the depth multiplier and the total; `E.score` is its total. The end screen lists the lines in an open `<details>`, the Salvage line says "1 for every 50 score (N ÷ 50, rounded down)", and the stats grid keeps only what is not in the score (landing, fights won, damage, deck, time).
- **Unlock boxes:** the Lazaret box uses the purple `.unlock-box` look; only a fall's "the bell calls back" box keeps its own red.
- **Back up or reset progress** (title-screen menu only, not during a run): a dialog with Download a backup (a JSON file of every `brinelight.*` key except the debug switches: `{ kind: 'brinelight-backup', version, saved, data }`), Restore from a backup (checks the file, asks, replaces, reloads), and Reset progress (asks, lists what goes, offers a backup, then erases everything but the settings, the What's new marker and the debug switches, and reloads).

**The agent's calls (provisional; each is one constant or one line):**
1. **Keepsake only for Dreads, as the user suggested,** though it is the biggest cut for the bot (-5.7 points in the Shallows). If Dreads feel thin, the first thing to give back is the card (the tonic costs the bot nothing, because it never drinks one).
2. **Two thirds for the pins,** not 0.6 (-2.1 points) or three quarters (-6.0). At two thirds the minnows arrive around turn 4 of about 11.
3. **The Buoy follows the Bellwether** (the user hasn't played it yet). The same pattern had the same problem, and without it Dark Water (12.7%) was no harder than the new Shallows for the bot.
4. **The Hold of the deeper depths stays** at 35, 40 and 45. Only the first depth was named.
5. **The Shallows' challenge is pressure, not HP:** a Lurker that tightens rewards killing it first, and a Mite that burrows and comes out bolder makes three Mites a kill-order question (and a Strand strips the Burrow Ward). Brine Crab and Salt Gull number bumps were measured (-0.8 and -1.4 points) and left out as plain stat raises.
6. **Beam at 2 per Swell** puts it level with the other strong rares instead of above them (table below).
7. **Backup also restores:** a backup you can't load back isn't much use. Settings travel with a backup but survive a reset.

**Measured** (bot, 1000 seeds a row, no kit; v0.15.0 → v0.16.0):

| | v0.15.0 | v0.16.0 |
|---|---|---|
| Shallows | 23.8% | 11.4% |
| Dark Water | 14.5% | 8.4% |
| Riptide | 3.9% | 1.2% |
| The Abyss | 1.3% | 0.6% |

Each Shallows change alone (points off 23.8%): Dread keepsake only -5.7, Bellwether at 2/3 -4.6, Hold 20 -3.6 (the bot takes fewer keepsakes), Kelp Lurker -1.4, Barnacle Mite +0.6 (noise), Beam about -1.4. Dark Water: Dread cut -1.8, the Buoy at 2/3 another -4.1. Per fight in the Shallows (HP lost, turns): easy 3.0 → 3.4 HP in 4.3 → 4.5 turns; hard 8.6 → 10.1 HP in 5.2 → 5.4; Dreads 20.2 → 19.7 in 6.4 → 6.5; the Bellwether 51.7 → 53.6 HP in 11.2 → 10.6 turns. Pace is kept. The first fight (aggressive bot, 500 seeds): 3.22 → 3.19 turns, 10.7 → 10.5 actions, median HP lost 8 → 7. The bot loses most runs to the boss, which a planning player handles far better, so read these as before/after, not as difficulty.

Rares added to the starter deck (Shallows, v0.15.0 rules otherwise): none 23.8%; Lighthouse Beam 55.9%, at 2 per Swell 43.5%, at cost 3 36.7%; Leviathan's Call 45.1, Storm Surge 43.1, Spring Tide 40.3, Gale Heart 39.8, Tsunami 37.9, Moon Pull 35.0, Spindrift 32.9, Abyssal Pull 30.3, Maelstrom 23.7, Toppled Tower 22.7, Tidal Memory 20.0 (the bot doesn't build for the last three).

**Proposals, not built (the user was unsure; these need a choice):**
- **Strands are hard to reach.** For the bot the two ends are about as common (0.69 Strands and 0.62 Crests a fight). The card pool is about symmetric too. But attacks Surge and Ward cards mostly don't Ebb, so a deck that attacks drifts toward Crest, and a Strand means holding back. Prototypes with the bot (Shallows, v0.15.0 otherwise; scratch `nudge.js`, a hidden 0-cost card the bot plays):
  - **Bail** (agent's pick): once a turn, spend 1 Light to Ebb 1. A Strand gives 1 Light back, so Bail is free when it completes a Strand. Strands per fight ×2.1 (0.79 → 1.65), win 23.8 → 29.6%, turns per fight 5.20 → 5.37. It also gives spare Light a use, which is part of the standard-action idea. It is Ebb only, on purpose: it helps the end that is harder to reach, and it doesn't push any strategy, because playing for Crest is unchanged.
  - Both ways (1 Light: Surge 1 or Ebb 1): 29.2%, but it doubles Crests too, so it doesn't close the gap.
  - Ebb 2 (from 1) on Riptide Cut, Saltspray, Sea Wall and Whirlpool: Strands +16%, win 25.2%. Safe but small.
  - Rejected: discard a card for Surge 1 or Ebb 1 (52.4%: the card would be discarded at the end of the turn anyway, so it is free); Ebb 1 on Brace (47.2%, Strands ×3, Crests fall to 0.48); sink a card for Ebb 1 (44.3%: thinning the deck is a reward, not a cost).
- **A weak standard action.** The bot ends only 3% of turns with Light it couldn't spend, so "no playable card" is rare; the user's "no good cards" is about weak hands. A standard attack or Ward for Light (for example 1 Light: 3 Ward) would be a weaker Brace, and every hand would end with it. Bail covers the useful part. If a general action is still wanted: 1 Light, discard a card, draw a card (a mulligan), once a turn. Not measured yet.

**Open (for the playtest):** Is the Shallows now "somewhat" harder, or too much? The dials, in order: give Dreads their card back, then move the pins' call to 0.6. Do the minnows now matter in the Bellwether fight? Is the Kelp Lurker's growing Lash readable from its intent (it shows the next hit's number and a tip)? Does the end screen's score list make the score clear, or is it too long on a phone (it can be folded)?
- Seen in screenshots, not changed: on phones the Lethal and Crest badges over hand cards render at about 11.5px (the screens check flags them), and a 13px floor made them so wide that the next card covered them. They need a different place, not a bigger size.

### Bail and Stir (v0.17.0, 2026-11-13)

The user read the proposal above and chose: "Change to Ebb 2 instead of 1 on four existing cards. Add Bail, but we would also need something that a Crest deck could use." Then: "when done, commit and push".

**Built:**
- **Ebb 2** (from 1) on Riptide Cut, Saltspray, Sea Wall and Whirlpool.
- **Bail and Stir** (`E.SWELL_ACTS`, `E.canSwellAct`, `E.swellAct`): once a turn, without a card, spend 1 Light to Ebb 1 (Bail) or Surge 1 (Stir). They share the one use a turn (`c.swellActTurn`). A Bail that makes a Strand pays for itself, because the Strand gives 1 Light; a Stir that makes a Crest does not. They are a real Ebb and Surge, so Spindrift, Kelp Bracelet, the bells and chains all count them. They are not cards: no Echo, no Gulper, no card count. `run.stats.bails` and `stirs` count them.
- **The interface:** a button at each end of the Swell bar, outside the Strand and Crest labels, with an arrow and a 1-Light coin (the arrows drop on phones under 480 px). Disabled when it can't be used, faded once used. Keys `B` and `S`. A first-time hint (`swellacts`) the first time the Swell is one step from either end with Light to spend. How to Play: a line in the Swell tab, both words in Keywords, both keys in Controls.
- **The tutorial teaches Bail** on turn 3, in place of Riptide Cut, which now Ebbs 2 and would carry the Swell past 0 (so Storm Surge would Crest only once). Turn 3 draws a Harpoon Jab instead. The crab has 11 HP left, and Bail then Storm Surge's double Crest (15) still ends the fight. The steps are the same count (16). The gate refuses cards at the Bail step and Bail at other steps.
- **The bot** Bails at Swell 1 during the turn (free), and with Light left at the end of the turn Stirs at 5 or Bails at 2 or lower (`chooseSwellAct` in tools/bot.js; `opts.noSwellActs` turns it off).

**The agent's calls (provisional):**
1. **The Crest-side answer is a mirror, Stir,** sharing the once-a-turn use with Bail, so the choice each turn is a direction. A separate Crest-only action would let a turn spend 2 Light on both for nothing new.
2. **Only the Strand refunds the Light.** It already gave 1 Light, so this needed no new rule, and it keeps the help weighted toward the harder end.
3. **The name Stir** (Churn was the first idea): the same length as Bail, so the two buttons match, and `S` was a free key. Wren stirs the water up into a wave.

**Measured** (bot, 1000 seeds a row, no kit):

| | v0.16.0 | + Ebb 2 cards | + Bail and Stir | both (v0.17.0) |
|---|---|---|---|---|
| Shallows | 11.4% | 12.4% | 14.3% | 15.8% |
| Dark Water | 8.4% | 10.2% | 10.3% | 13.2% |

In the Shallows, Strands per fight 0.68 → 1.74 and Crests 0.57 → 0.72. Per fight: easy 3.4 HP in 4.7 turns (4.5 before), hard 9.9 HP in 5.3 turns, Dreads 19.5 in 6.5, the Bellwether 52.4 HP in 10.6 turns. The first fight (aggressive bot): 3.19 turns, 10.5 actions, the same as v0.16.0.

**Open (for the playtest):** Is an Ebb deck now worth building, and does a Crest deck use Stir? Strands now outnumber Crests for the bot by more than 2 to 1. The bot Bails whenever it's free, so a player who builds for Crests will see fewer Strands. Are the buttons found without the tutorial (the hint fires once)? Is the Swell bar still readable at 360 px with the buttons (the cells are about 18 px wide)?

### Playtest notes on v0.17.0 (v0.18.0, 2026-11-13)

The user played v0.17.0. Their notes, shortened:
- Strands now outnumber Crests, "as Strand gives back a light, so its essentially a free action. However, I like it. Stir is still a nice ability that could be used sometimes." They found the Bail and Stir buttons without the tutorial. They could not test 360 px.
- Slack Water: "reduce Ward gained to 4? Now a bit too strong compared to Brace."
- "Challenge now better." They got the final boss to 20 HP and died; "it felt like it could have went either way".
- "Flood/Ebb/Bell effects feel a bit weak. Drawing two cards at once is not that useful, since player likely does not have Light to use more cards anyway."
- Roil: "increase the gaps between too much roil negative effect. Such that adding an average-cost item only adds 1 more effect."
- Dark Water: they like the level, the new enemy abilities and the balance. The Tolling Buoy should not reuse the Bellwether's call for help: give it a "FUN and new ability", and let one of Dark Water's Dreads call for help instead.
- "Maybe each level is a bit too long, but maybe also not. Should feel like a small investment starting a new run."
- Next change: the expedition (see "Expedition proposal" below).

**Built:**
- **Slack Water** gives 4 Ward (7 upgraded), from 5 (8).
- **Bells** are a table now (`E.BELLS`, `E.bellGain`; `E.bellDraw` stays for the card count). The Flood Bell draws 1 and gives 1 Light on a Crest. The Ebb Bell draws 1 and gives 3 Ward on a Strand. The Cracked Bell gives nothing on the first Crest or Strand of a turn, then 2 cards and 1 Light on each one after. The Brass Tide-Bell is unchanged.
- **Roil:** one step for every 12 Roil past the Hold (`E.SEEP_STEP`, was 5). 12 is the median keepsake Roil (the mean is 12.6), so a keepsake of 12 always adds exactly one step.
- **The Tolling Buoy** no longer calls for help. At two thirds of its health it plays **Slip the Chain** (15 Ward, 1 Might). From then on its round is Wild Peal, Rocking Toll, Clang, Rocking Toll. Haul the Chain and its douse are gone: it has no chain left to haul. **Wild Peal** (`BL.PEAL`) is 30 damage, minus 10 for each Crest or Strand made that turn. At 0 it does not hit at all, so its Might does not get through either. A move whose damage falls to 0 no longer hits (`enemyAct`), and its intent shows 0. Its intent number drops live as you make waves. A first-time hint (`peal`) explains it.
- **The Pale Gulper** calls for help instead. At half its health (`BL.DREAD_CALL`) it plays **Retch**: two Glimmer Leeches, and every card it swallowed goes back to the discard pile (`disgorge`, shared with its death). Its HP is 62–66, from 70–74.
- **The bot** (tools/bot.js): when it needs Ward, it now values a card's Surge or Ebb by 1 per point, and a wave the card makes by 3. Before, Slack Water and Brace tied at 5 Ward and the order of the hand decided. With Slack Water at 4, that bot always picked Brace and stopped Stranding: it lost 5 points in Dark Water for that reason alone. Every number in this section uses the new bot, including the v0.17.0 column.

**The agent's calls (provisional):**
1. **Slack Water upgraded is 7,** to keep the +3 of an upgrade. The user named only the base.
2. **The bells pay Light or Ward in place of the second card**, as the user's note suggests. The Ebb Bell gives Ward, not Light. A Strand already gives 1 Light, and a second Light made every free Bail at Swell 1 pay 1 Light and 1 card. The bot then won 27% in the Shallows and 29% in Dark Water with it, against 17% and 10% with the Brass bell.
3. **The step is 12, not 10 or 15.** At 10, a 12-Roil keepsake adds one or two steps depending on where you are, and at 15 most keepsakes add none. The table below has all three.
4. **The Buoy's new ability is the Wild Peal,** because it uses the Swell from either end. A Crest deck and a Strand deck both answer it, and so does Ward. At 30/10 the Buoy fight costs the bot the same HP (55 against 56) in the same turns (11.1 against 11.2) as the old one. Measured alternatives: 24/8 made Dark Water 3 points easier for the bot and 36/12 made it 2 points harder.
5. **The Gulper calls, not the Glimmer Chain.** The Chain was already the hardest Dread, and with the call it cost the bot 29.6 HP a fight, against 19.2 without it. The Gulper was the easiest, and with the call and less HP it costs 16.4 HP in 9.0 turns, against 14.6 HP in 9.7 turns before. The Dreads are now closer together: Chain 19.1, Gulper 16.4, Angler Twins 14.0. Getting the swallowed cards back when it retches is the fun part: the call for help also brings back what it took.

**Measured** (bot, 1000 seeds a row; the v0.17.0 column uses the new bot too):

| | v0.17.0 | v0.18.0 |
|---|---|---|
| Shallows, no kit | 17.9% | 19.2% |
| Dark Water, no kit | 14.1% | 11.8% |
| Riptide, no kit | 3.8% | 4.6% |
| Shallows, Flood / Ebb / Cracked Bell | 15.1 / 18.7 / 13.5% | 22.0 / 25.0 / 16.8% |
| Dark Water, Flood / Ebb / Cracked Bell | 9.9 / 13.3 / 9.9% | 19.1 / 19.6 / 13.3% |
| Shallows, bring Whale Tooth + Kelp Bracelet (30) | 18.6% | 33.5% |
| Shallows, bring Whale Tooth + Storm Bottle (37) | 3.6% | 18.0% |
| Shallows, bring Whale Tooth + Storm Bottle + Coral Crown (43) | 1.8% | 20.3% |
| Shallows, bring Whale Tooth + Storm Bottle + Drowned Anchor (55) | 1.6% | 27.6% |

- **Slack Water at 4 costs the bot 1 point in the Shallows and 3 in Dark Water** (each alone, v0.18.0 otherwise). The Roil step gives the Shallows back more than that, because the bot pays less for what it picks up. The Buoy and Gulper changes are within 1 point of neutral. The net change: Shallows +1.3, Dark Water -2.3.
- **Before v0.18.0 every special bell was worse for the bot than the free Brass bell.** That confirms the user's note. Now each is better in its own kind of deck: Flood +3 and Ebb +6 in the Shallows over Brass.
- **Roil step sizes** (Shallows, bring as above; nothing / 30 / 37 / 43 / 55): step 5 16.9 / 17.1 / 2.8 / 1.0 / 1.3; step 10 18.6 / 33.0 / 16.9 / 9.2 / 13.3; **step 12 19.2 / 33.5 / 18.0 / 20.3 / 27.6**; step 15 19.9 / 38.5 / 22.1 / 21.8 / 29.3. With 12, bringing a full pack from the Lazaret is now worth more than it costs. The dials are the Hold (`E.HOLDS`) and the step.
- **The opening is unchanged:** first fight 3.19 turns, 10.5 actions. The median HP lost is 8 (7 before), from the 1 Ward less on Slack Water.

**Open (for the playtest):** Do the bells now feel worth their Salvage? Is a Wild Peal readable (it has a hint, a tip, and an intent number that falls as you make waves)? Does the Gulper's Retch feel like a reward and a threat at once? Is bringing keepsakes now too generous at a step of 12? The first dial is a Hold of 15 in the Shallows.

### Expedition proposal (2026-11-13; answered the same day)

The user's direction: an expedition is one longer, coherent run through levels in order. "Choose your depth" goes. Enemy HP and damage multipliers move into the current system. Three levels: the Shallows, Dark Water, and an underwater last level that needs the diving suit, found in the second level. More kit and keepsakes after that, and intermediary levels in later updates. Their note on length: starting a run "should feel like a small investment".

**Prototype** (bot, 1000 seeds, v0.18.0; a throwaway script that plays a Shallows run and, on a win, sets `run.level = 1` and gives the run a fresh Dark Water map): the bot clears the Shallows, then goes on into Dark Water with the same deck (15.7 cards on average), keepsakes (1.6) and HP.

| Between the levels | HP on arrival | Dark Water cleared, if the Shallows were |
|---|---|---|
| nothing | 27% | 17.7% |
| a rest (30% of Max HP) | 57% | 38.5% |
| a full heal | 100% | 60.4% |

From a fresh start the bot clears Dark Water 11.8% of the time. A built deck makes the second level much easier, so the later levels need more pressure in an expedition. How you get from one level to the next matters as much as the enemies.

**Critique and proposed changes** (the agent's recommendations; each needs the user's yes):
1. **Shorter levels: 8 landings, from 11** (7 stops and the pin). A Shallows-only trip takes about 15 minutes and the full expedition about 45, against about 25 and 75 now. Going home after a pin keeps every trip small.
2. **The stair down is a Sheltered Cove:** rest (30%) or upgrade, as in the rest of the game. No free full heal: with a full heal, Dark Water is no threat to a built deck.
3. **Retune Dark Water for a built deck.** Use pressure, not HP (the user's rule): harder Dreads and normal fights, measured with the prototype. The last level gets the same treatment.
4. **Continuing has to pay, or players will farm the Shallows.** A fall loses only the fresh keepsakes and still earns Salvage, so the risk of going deeper is small. Score each landing by level: Shallows ×1, Dark Water ×1.5, the last level ×2. The deeper levels also have the better finds (the agreed "richer finds").
5. **Currents replace Riptide and the Abyss.** Two to start, chosen on shore with the kit: enemies have 10% more HP, and enemies hit 15% harder (names to come; about the old Abyss). Each adds ×1.25 to the score, and they stack. They unlock on the first expedition that brings the Heart home. A player who already unlocked Riptide or the Abyss gets them at once. The old depth multiplier on the score goes.
6. **The Hold rises with the level** (20, 35, 45), and the pack is fixed on shore (agreed). A heavy pack is Roiled in the Shallows and Calm deeper, which gives packing a real choice.
7. **The suit** (agreed rules): found the first time Dark Water is cleared, then carried home. From then on it can be packed on shore, in the Coat place (it replaces the Cork Vest or the Shell Gorget). It has no effect in fights. Without it, the passage after Dark Water's pin stays shut, so the first clear always ends at home.
8. **The Bellwether moves to the last level,** and the Shallows get their own pin: the giant hermit crab wearing a harbour bell (WORLD.md).
9. **The underwater level:** its identity comes from its creatures, Dreads and events, the way Dark Water has Doused, Submerged and Shell, with no global rule at first. A global rule tends to favour one way of playing, and the suit already costs a kit place. The alternative is an Air rule: the suit holds so many turns of air per fight, and after that you lose HP each turn.
10. **After the first Heart, the last level needs a repeatable final encounter.** Agreed lore says the Bellwether stays silenced. The proposal is the thing with one eye and many arms that grew into the bell (already in a keeper's note).
11. **Build in slices, each playable:**
    - **A:** the expedition flow with the two existing levels: no depth choice, 8 landings, Go deeper or Go home after each pin, the Cove between levels, currents, the new score, Dark Water retuned, old saves carried over, bot and `measure.js` support. The Bellwether stays the Shallows' pin for now.
    - **B:** the last level: the suit, the underwater band (about 6 creatures, 3 Dreads, events, art), the Bellwether moves there, the Shallows' new pin, the repeatable final encounter, and the story chapters rewritten.
    - **C:** more kit and keepsakes.

**The user's answers (2026-11-13):**
1. 8 landings: "Try this."
2. The Cove at the stair, no full heal: yes.
3. Asked what "built deck" means, whether only a built deck should find it harder, and how. Answer (in the v0.19.0 section below): nobody arrives in Dark Water with the starter deck any more, so Dark Water as a whole is tuned for the deck the Shallows built. With 8 landings it measured harder than the Shallows already, so it was not retuned.
4. Landing scores by level: yes.
5. Currents: yes. "Could add more currents as well, and allow player to combine currents for even greater challenge/score."
6. The rising Hold: yes, but the player picks up keepsakes along the way anyway, so "maybe we should have same hold in all levels". Built: 20 everywhere.
7. The suit: yes.
8. The Bellwether to the last level and the hermit crab as the Shallows' pin: yes. The final boss "should also have cool special abilities, and be a longer boss fight. Perhaps two phases. Maybe even include healing player (to allow for longer fight)."
9. No global rule underwater at first: "Yes, try this."
10. A repeatable final encounter after the first Heart: yes, "could also be even more options".
11. Slices: yes. "No need to make old saves work. Replace and rewrite, the codebase is ours to update as we see fit."

### Expeditions, slice A (v0.19.0, 2026-11-13)

**Built:**
- **The expedition** (`E.LEVELS` = Shallows, Dark Water). `E.newRun(seed, level, kit, bring, currents)` always starts at level 0 in the game; `level` stays for tests and the bot. Breaking a pin records it in `run.cleared`. On the last level it sets `run.heart` and ends at 'victory'. Before that the screen is 'pin': `E.goHome` ends at 'victory' without the Heart, and `E.goDeeper` moves to the next level with a new map and the same deck, keepsakes and HP, and opens a Cove (`run.passage`) first. 'victory' now means "came home": the Lazaret, Salvage and the Logbook treat both kinds the same; only the score and the end text differ.
- **8 landings a level** (`MAP_ROWS` 7, `E.LANDINGS` 8, the Wreck on row 3 (`E.WRECK_ROW`), the Cove on row 6). Elites from row 2, rests in rows 2-4, shops from row 1. With 7 rows a run of Fog and shops could leave a row with no fight, and seed 117 had no Dread at all: each open row now gets a fight from its Fog if it has none, and a Dread may replace a Fog stop when no fight is free.
- **The score:** landings per level (`E.landed`), 40 in the Shallows and 60 in Dark Water (`E.LEVELS[i].landing`). HP left (×5) for any expedition that comes home, and 600 for the Heart only. The old depth multiplier is gone; `E.scoreMult` is the currents'.
- **Currents** (`E.CURRENTS`, `E.mods`, `E.scoreMult`): Fat Year (enemy HP ×1.1), Hungry Deep (enemy damage ×1.15), Cold Coves (rests heal 20%), Backwash (from the second turn of a fight, each turn starts with the Swell 1 step closer to 3). Each adds 0.25 to the multiplier and they combine. They open with the first Heart (`meta.record.hearts`), are chosen in the pack screen and remembered in `meta.currents`.
- **One Hold** (`E.HOLD` 20, `E.hold()`), the user's call.
- **The Bellwether has 130 HP** (from 160), for the shorter level (below).
- **Story:** the Shallows chapter is now "The stair below" (won:0): the Bellwether breaks, the Heart is not in it, the glow goes on down. "Why the bell was sunk" opens on won:1. "Why the fire followed" and "Under the last stair" open with the Heart. The Lazaret note opens on coming home. Bands have a `pin` text. This is a stopgap: slice B moves the Bellwether and rewrites the chapters.
- **Logbook:** expeditions finished (came home or fell), Hearts brought home, pins broken. **Debug:** "Open the currents" replaces "Unlock all depths".
- **Old saves:** a run saved before v0.19.0 is dropped (`version` 3). The old-run migration (`E.migrateRun`, `BL.RETIRED_KEEPSAKES`, `kitExtra`) is gone. Lasting progress (Salvage, kit, the Lazaret, the Logbook) carries over.
- **Bot and measure:** the bot goes deeper after every pin unless `opts.home` says which level to go home after. `tools/measure.js` rows take `home` and `currents`, and the table shows home %, the Shallows' pin %, and the share of those that also brought the Heart home.

**The agent's calls (provisional):**
1. **The Bellwether is 130 HP.** With 8 landings the bot reaches it with 13.2 cards and 0.9 upgrades (15.5 and 1.6 with 11) and beat it on 8% of arrivals, against 23% before: the Shallows fell from 19.2% to 7.7%. Measured Shallows-only: 160 7.7%, 145 12.6%, 135 17.7%, 125 22.6%, 115 29.9%. 130 is about the v0.18.0 level. Slice B gives the Shallows a new pin anyway.
2. **Dark Water is not retuned** (question 3). Of the expeditions that break the Shallows' pin, the bot also breaks Dark Water's in 16%, against 18.5% for the Shallows from the start: the deeper level is already the harder one for the deck the Shallows built. The prototype's 38.5% was with 11 landings a level. Levers if it should be easier: the Buoy at 150 HP gives 20%, at 140 22%. The Cove at the stair matters most: without its heal, 5%.
3. **Four currents, not two,** as the user suggested more: the two proposed, plus Cold Coves (the old Abyss rest rule) and Backwash. Backwash is the Swell that moves on its own, which the user accepted as an opt-in current but not as a base rule. It pulls toward 3 from both ends, so it costs a Crest deck and a Strand deck the same. It was named Backwash because the Bellwether already has a move called Undertow.
4. **Additive multiplier:** ×1.25 with one current, ×1.5 with two, ×2 with all four.
5. **Going home is a win** for the Lazaret, Salvage and the Logbook (agreed lore: Wren can always get home after a pin and keeps everything). Only the Heart opens the currents.

**Measured** (bot, 2000 seeds a row unless noted):

| | v0.18.0 | v0.19.0 |
|---|---|---|
| The Shallows' pin broken | 19.2% | 18.5% |
| Dark Water's pin, if the Shallows' was broken | (11.8% from a fresh start) | 16.2% |
| The Heart brought home (whole expedition) | - | 3.0% |
| Dark Water from a fresh start (bot and tests only) | 11.8% | 4.3% |

- **Where the bot falls** (Bellwether 130): 8% before the Bellwether, and it beats it on 20% of arrivals (61 of 70 HP, 13.2 cards, 1.6 keepsakes). In Dark Water a third fall before the Buoy, and a quarter of the rest beat it (49 of 71 HP, 16.1 cards, 2.6 keepsakes).
- **The Hold** barely matters to the bot: 15 / 20 / 25 / 30 give 1.8 / 3.0 / 3.0 / 3.5% Hearts. It seldom carries more than it can hold.
- **Bringing keepsakes is strong in the shorter Shallows:** Whale Tooth + Kelp Bracelet (30 Roil) 35.1%, Whale Tooth + Storm Bottle (37) 22.9%, + Drowned Anchor (55) 36.0%, against 18.5% with nothing. Still the open question from v0.18.0.
- **Currents** (2000 seeds; Shallows' pin / Dark Water's if the Shallows' broke / the Heart): none 18.4 / 15.7 / 2.9%; Fat Year 10.5 / 8.1 / 0.8%; Hungry Deep 7.4 / 8.8 / 0.7%; Cold Coves 16.1 / 7.2 / 1.1%; Backwash 13.1 / 11.5 / 1.5%; all four 1.4 / 3.6 / 0.1%. Hungry Deep is the hardest, Backwash the mildest. Players who have brought the Heart home also own kit and a stocked Lazaret, which the bot rows here don't use.
- **The opening is unchanged:** first fight 3.11 turns, 10.3 actions, median HP lost 7.

**Next:** slice B: the Belfry (third level, about 6 creatures, 3 Dreads, events, art), the suit, the Bellwether there as a longer two-phase final fight, the hermit crab as the Shallows' pin, a repeatable final encounter (more than one option, the user suggests), and the chapters rewritten.

### The Belfry, slice B (v0.20.0, 2026-11-13)

**Built:**
- **The Belfry** (`E.LEVELS[2]`, landing 80, `needs: 'suit'`; `BL.BANDS.belfry`). Easy and hard fights mix 3 new creatures with Dark Water's:
  - the Bell Jelly: its Chime gives another creature Echo, so that creature's next move happens twice (`echoOne`, `c.echoNext`);
  - the Bellspawn: its Squeeze makes you Breathless, so you draw 1 card fewer next turn;
  - the Glimmer Bladder: it has Burst 8 (`BL.BURST`), so when it dies it hits you and every other creature for 8.
- **The Belfry's Dreads:**
  - the Drowned Ringer with one Minnow; its Ring Out gives every creature Echo;
  - the Crowned Oarfish: Spines 2, Coil (Breathless 1), Ribbon Lash, Ram;
  - the Glimmer Chain from Dark Water.
- **Fog events:** three new ones (the Lanterns, the Heartglow, the Rope), plus the Shrine and the Garden.
- **Art:** backgrounds `bg_belfry`, plus `bg_shallows_boss` for the Hermit. Wren wears the dress in the Belfry (`keeper_suit`).
- **The Diving Dress** (`BL.KIT.suit`, Coat place, `found: true`, never for sale).
  - Dark Water's pin can only be passed with the dress on (`E.canGoDeeper`).
  - The first time, the dress hangs above the stair (`run.found`) and Go home carries it home (`E.carryHome` → `res.found`). The end screen says so.
  - From then on it is worn from the kit like any Coat. The Workshop shows it as "Not for sale".
- **The Bellwether is the Belfry's pin** (160 HP).
  - When its HP runs out it doesn't die. It rises (`next: 'bellthing'`): the same unit becomes the Thing in the Bell (150 HP), and its shoal scatters.
  - At the rise, `BL.HEART_RISE` heals Wren 30% of her Max HP, and she gets Heartfire (1 more Light every turn for the rest of the fight).
  - The UI swaps the sprite and name in place (`setUnitForm`), plays a 'reborn' animation and switches the music to the second phase.
  - The Thing in the Bell:
    - Reach: grows up to 2 Grasping Arms;
    - Drink the Light: 7 damage, and Wren starts her next turn with 1 less Light for each arm;
    - The Eye Opens: 8 Ward, and it is Soaked until it acts again, so it takes 50% more damage;
    - Glare: 26.
  - Beating the Thing brings the Heart home: 600 points and the currents.
- **The Harbour Hermit is the Shallows' pin** (150 HP, Belled).
  - Belled: its Ward stays from turn to turn until a Crest or a Strand shakes it out (`f.stripped`, shown as a shattered ward).
  - Its moves:
    - Pull In: 20 Ward;
    - Pinch: 6 ×2;
    - Bell Crush: 15, then 3 more each time;
    - at two thirds of its HP, it rings the Harbour Bell: 2 Barnacle Mites and 1 Might.
  - The Bellwether's old Shallows place is gone.
- **Repeatable finals** (`enc.finals`, used once `run.heartHome`):
  - the Thing in the Bell grown back (170 HP) with two Grasping Arms;
  - or the Drowned Cantor (160 HP):
    - Lead the Peal: 12 Ward, and Echo for every creature;
    - Toll: 10, then 2 more each time;
    - Call the Choir: grows 1 Drowned Ringer.

  Beating either quiets the Belfry (`run.quieted`): 600 (`E.FINAL_SCORE`). The Logbook counts `record.quiets`.
- **Story:** Story so far has 8 chapters, rewritten for three levels, and 33 keeper's notes (11 new). WORLD.md has the Hermit, the dress, the Belfry, the Thing and the Cantor.
- **Old runs:** `E.RUN_VERSION` 4, so a run saved by v0.19.0 is dropped. Lasting progress carries over.
- **Small phones** (360x640, 375x667). The field there is narrow but wider than tall, so the portrait rules don't apply. Two problems came from that:
  - Every pin's intent badge and the Oarfish's sat 3 to 13 px under the top bar. The Buoy and the Bellwether had this before v0.20.0.
  - In three-creature fights the HP bars overlapped.

  A container rule now caps the creatures' height at 52% of the field there (it was 62%) and lets their info shrink below 96 px. The badges now clear the top bar by 14 to 26 px. The 390x844 and 412x915 phones are unchanged. The two Grasping Arms' badges still touch each other at 360 px.
- **Bug found while testing:** `loadSave` in js/ui.js still checked for version 3. It would have thrown away every new run on reload. It now checks `E.RUN_VERSION`.

**The agent's calls (provisional):**
1. **Bellwether 160, Thing 150.** The first draft (130 / 120) was won by 49.6% of the bot runs that reached it, more than any other pin. The bot reaches it at 49.8 HP with a Dark Water deck. At 160 / 150, 35.9% win, in 16.8 turns on average. The Buoy is beaten by 26.6% of the runs that reach it. A last boss a bit easier than the Buoy felt right because:
   - it is the third pin in a row;
   - a fall there loses the most.

   The heal matters most. Without the heal and Heartfire, 8.4% win. With the heal at 20%, 17.0%.
2. **The finals at about the Heart's level.**
   - **The Thing alone at 170 HP** (with its arms): 34.8%.
   - **The Cantor alone at 160 HP** (calls 1 Ringer, Toll 10 + 2): 35.2%.
   - **The Cantor's first draft was nearly unwinnable** (1.7%): a Cantor with two Ringers that each gave everything Echo. The Echoes stacked into double Tolls.
   - **With a Ringer beside the Cantor from the start:** 17.5% at 140 HP. That is why the Cantor fights alone.
3. **The Belfry's Dreads come down** (they killed 32% of the bot runs that fought them, against 15.8% for Dark Water's):
   - the Ringer comes with 1 Minnow, not 2;
   - the Oarfish has 66–70 HP (from 74–78), Coil gives Breathless 1 (from 2), and Ram deals 13 (from 16).

   They now cost about 10 HP a fight, and 23% of fights are lost. Dark Water's cost 8.8 HP, and 15.8% are lost.
4. **The Chain stays as the easy Dread** (15% lost). Pairing it with a Bell Jelly gave 48% lost, so the Chain fights alone.
5. **The Hermit: 150 HP, Pull In 20, Bell Crush 15 + 3.** The Shallows' pin is broken in 18.5% of bot runs, the same as with the 130 HP Bellwether in v0.19.0.
6. **Echo, Breathless and Burst are Belfry-only.** No rule applies everywhere underwater: the user agreed to try that.

**Measured.** Paired replays: one process snapshots the runs that arrive in the Belfry (972 of 30,000 seeds), then replays each variant 3 times on those snapshots (2,916 fights a row). The whole expedition is 2,000 seeds a row with `node tools/measure.js <spec> --workers 1`.

| | |
|---|---|
| Belfry arrivals that break its pin | 21.0% |
| Bellwether fights won (rose in 61.5%, at turn 9.7) | 34.2% |
| HP at the Bellwether / at the rise / at the end | 49.5 / 48.1 / 26.9 |
| Finals won (Thing or Cantor) | 33.4%, 9.0 turns |
| Shallows' pin, whole expedition | 18.5% |
| Dark Water's pin, if the Shallows' broke | 18.6% |
| Belfry's pin, if Dark Water's broke | 31.9% (about 69 runs; the replay above is the better number) |
| The Heart brought home, whole expedition | 1.1% (v0.19.0: 3.0% over two levels) |
| Home after Dark Water's pin, without the dress | 3.5% |

- **Currents after the Heart.** Each row is Shallows' pin / Dark Water's if the Shallows' broke / the finals if Dark Water's broke / home with the Belfry quiet:

  | Current | Shallows | Dark Water | Finals | Home |
  |---|---|---|---|---|
  | none | 18.5 | 18.6 | 20.3 | 0.7% |
  | Fat Year | 10.3 | 15.5 | 12.5 | 0.2% |
  | Hungry Deep | 5.7 | 8.8 | 20.0 | 0.1% |
  | Cold Coves | 15.8 | 12.7 | 12.5 | 0.3% |
  | Backwash | 13.6 | 18.1 | 20.4 | 0.5% |

  The Belfry columns rest on 10 to 70 runs, so they are rough.
- **Most bot runs end before a pin, not at it.** Of the runs that reach a pin, 27% beat the Buoy and 34% the Bellwether. I didn't measure the Hermit's share.
- **Decided by the user (2026-11-13): the deeper levels don't open gently.** `run.normalFights` keeps counting across levels. After the Shallows, every normal fight uses the hard table, so in an expedition Dark Water and the Belfry never use their easy tables (only the bot and the tests do, from a fresh start at that level). The user: "the new enemies in these levels should be inherently harder".
- **Are they? With the same decks:** 1,058 runs that reached the Belfry (39.8 of 70 HP, 13.4 cards), each played against every encounter in each table (scratchpad `fights.js`; each table's encounters weighted evenly). Each cell is HP lost / fights lost:

  | | Shallows | Dark Water | Belfry |
  |---|---|---|---|
  | easy (unused after the Shallows) | 2.0 / 0% | 2.5 / 0% | 9.6 / 2.8% |
  | hard | 7.4 / 1.4% | 10.5 / 3.0% | 15.8 / 10.1% |
  | Dreads | 15.4 / 10.9% | 10.8 / 3.1% | 17.2 / 11.9% |

  - **Normal fights:** yes. Each level's hard table costs about 40–50% more than the one above it.
  - **Dreads: no.**
    - Dark Water's Dreads are easier than the Shallows': the Chain costs 12.0, the Gulper 10.7, and the Angler Twins 9.6. The Twins are the Shallows' own Dread, reused.
    - The Shallows' Hulk is the hardest Dread in the game (26.4 HP lost, 31% of fights lost). The Siren costs 10.1 and the Twins 9.7.
    - The Belfry: the Ringer costs 21.0, the Oarfish 18.2, and the Chain 12.4.
  - This is a balance call, left to the user. Options: replace Dark Water's Angler Twins with a Dread of its own, strengthen the Chain and the Gulper, or bring the Hulk down toward the other Shallows Dreads. The user asked for both; done in v0.21.0 (below).

**The crashes during this work.** The machine froze three times on 2026-11-13 (20:43, 20:49 and 21:07), while I ran 22, 22 and then 8 bot processes at once. Each time it stopped responding for over a minute, and the user had to power it off.
- **Checked:** no memory leak in the engine or the bot. In one capped process over 30,000 seeds:
  - the heap after GC grew from 6.6 to 13.2 MB;
  - RSS stayed at 160 MB;
  - the slowest step took 36 ms;
  - no run hit the step cap.
- The kernel log has nothing before the freezes.
- 7.0.0-43 was the first boot of a new kernel that day. All-core jobs had run fine on it earlier.
- So the cause is not found.
- **Since then:** every bot or measure job runs as 1 process, under `systemd-run --user --scope -p MemoryMax=2G -p MemorySwapMax=0 -p CPUQuota=100% nice -n 19`.
  - `tools/measure.js` gives each worker a 1 GB heap cap.
  - Use `--workers 1` for one process.
  - The UI test runs under the same cap with 3 GB, because Chrome needs several processes.
  - That way the full UI test took 264 s. Once, in the Dark Water descent, the second click on a raised card didn't register ("card 6 (click) was not played"). With the same seeds it passed on the rerun, so it was timing on the one shared CPU. If it happens again, give `playCard` in tests/ui-smoke.js a longer settle time when the CPU is capped.

**Next:** the user's playtest of the Belfry. Open questions:
- Does the Bellwether's rise read as a second phase?
- Is the heal enough?
- Are Echo and Breathless clear from their chips and hints?
- Do the finals feel different from each other?

### Deeper Dreads are harder (v0.21.0, 2026-11-13)

The user asked for both recommendations from the same-deck table above ("Implement both recommendations"): Dark Water gets a Dread of its own and a stronger Chain or Gulper, and the Hulk comes down toward the other Shallows Dreads.

**Built:**
- **The Garden Strider** (`strider`, 72–76 HP, Dark Water's Dread table in the Angler Twins' place; the Twins stay in the Shallows).
  - A giant pale sea spider that walks the Glimmer Garden on stilt legs. The Garden event already said "something in the water tends it, and it notices what you take": this is it.
  - Tend the Garden: calls Glimmer Leeches until two are alive (`grow`), and 8 Ward.
  - Graze: 10 damage, and it heals by what it takes (`drain`, like the Leech's Latch).
  - Stilt Legs: 4, three times.
  - It opens with Tend the Garden (no random start), so the fight reads at once: it calls two Leeches, then grazes.
  - It uses only existing move features, so no new rule. Art: `img/units/strider.webp` (variant A of two; the other is kept in `assets-src/units/strider-b.png`). A keeper's note, "The Garden Strider", opens when you meet it (34 notes).
- **The Pale Gulper's Bite** hits 14, up from 12. I chose Bite over HP because 70–74 HP would have undone the HP cut that came with its Retch in v0.18.0. The Chain stays as it is, because it is also the Belfry's easy Dread.
- **The Reefback Hulk:** Spines 2 (from 3), and Rouse gives 1 Might (from 2).
- **The intent text for `grow`** says "Call 2 Glimmer Leeches" instead of "Bring back 2 Glimmer Leechs". `E.plural(id)` uses a creature's `plural` (the Leech has one) or adds an s. The follower toast uses it too.
- **A test that went stale in v0.20.0:** the bot test in tests/darkwater.test.js expected every win without the dress to bring the Heart home. Without the dress a win ends at Dark Water's pin and carries the dress home. None of its 40 seeds got that far until now.

**Measured.** Each cell is HP lost / fights lost.

- **Same decks:** the 932 runs that arrived in Dark Water, each against every Dread encounter of each level.

  | Dreads | Shallows | Dark Water | Belfry |
  |---|---|---|---|
  | v0.20.0 | 15.4 / 10.9% | 10.8 / 3.1% | 17.2 / 11.9% |
  | v0.21.0 | 13.4 / 5.0% | 15.5 / 10.3% | 17.2 / 11.7% |

  - The Shallows: the Hulk 20.2 / 13.7% (26.4 / 31.3% before), the Siren 10.2, the Twins 9.9.
  - Dark Water: the Strider 20.5 / 20.7%, the Gulper 13.5 / 5.4% (10.7 before), the Chain 12.6 / 4.7%.
  - The Belfry: the Ringer 21.4 / 20.4%, the Oarfish 17.8 / 10.5%, the Chain 12.4 / 4.2%.
  - The Belfry's decks give the same order.
- **Whole expeditions:** the Shallows' Dreads where they are met, 2,000 seeds a variant.

  | | HP lost / fights lost |
  |---|---|
  | The Hulk, v0.20.0 | 40.2 / 19.0% |
  | Spines 2 | 31.9 / 8.6% |
  | Rouse Might 1 | 36.0 / 11.0% |
  | Both (built) | 27.2 / 4.6% |
  | The Siren | 13.2 / 1.2% |
  | The Twins | 16.3 / 3.4% |

  In Dark Water the bot arrives with little HP, so there all three Dreads lose 18–26% of their fights: the Strider 26%, the Chain 25%, and the Gulper 18.6% with Bite 14 (12.9% before; 70–74 HP gave 17.1%).
- **The whole expedition** (`node tools/measure.js <spec> --workers 1`, 2,000 seeds):

  | | v0.20.0 | v0.21.0 |
  |---|---|---|
  | The Shallows' pin | 18.5% | 19.9% |
  | Dark Water's, of those | 18.6% | 15.9% |
  | The Belfry's, of those | 31.9% | 30.2% |
  | The Heart | 1.1% | 0.9% |
  | Home after Dark Water's pin without the dress | 3.5% | 3.1% |

  After the Heart with each current (pins 1/2/3, home): Fat Year 10.9/15.6/14.7, 0.3%; Hungry Deep 5.9/5.9/28.6, 0.1%; Cold Coves 16.9/10.9/13.5, 0.3%; Backwash 14.3/17.5/26.0, 0.7%. The Belfry columns rest on about 20 to 50 runs.

**The agent's calls (provisional):**
1. **The Strider is the hardest Dread in Dark Water,** as hard as the Belfry's Ringer with the same decks. Dark Water's average is still below the Belfry's. If it should sit lower, its HP is the lever (72–76).
2. **The Hulk stays the Shallows' hardest Dread,** but it now loses 4.6% of its fights where it is met, near the Twins' 3.4%, against 19% before.
3. **Dark Water's pin falls from 18.6% to 15.9%** and the Heart from 1.1% to 0.9%. The user asked for deeper levels to be harder; the Shallows' pin rises a little because of the Hulk.

**Open for the playtest:**
- Does the Strider read as a fight about its Leeches: kill them, or race it?
- Does the Hulk still feel like the Shallows' hardest Dread?

### More kit and keepsakes, slice C (v0.22.0, 2026-11-14)

The user said "implement phase C": slice C of the expedition plan, "more kit and keepsakes". While it was being built they added: "not sure if Hold should really increase as you go deeper. maybe reaching new depth should result in permanent increase in hold instead." (The Hold was already the same at every level since v0.19.0; WORLD.md still said the aether "holds more closer to the bell".) Their idea is built here.

**Built:**
- **Richer finds** (agreed in the expedition proposal, item 4; WORLD.md: "the keepsakes found there are stronger").
  - `BL.KEEPSAKES[k].deep` is the first level where a keepsake can be found (`E.keepsakeDepth`). `E.keepsakePool` holds the keepsakes of the run's level and the levels above it.
  - Below the Shallows, `E.keepsakeChoices` puts one of the level's own keepsakes first while any are left. Wrecks, Dreads and Barnaby's shop (now `E.keepsakeChoices(run, 2)`) all use it.
  - In the Shallows the draw is the same as before, so Shallows runs replay unchanged (tested).
- **Six deeper keepsakes:**
  - Dark Water: the Hollow Whelk (Roil 27: your Ward no longer washes away at the start of your turn), the Glimmer Bulb (30: a Strand gives 2 Light) and the Leech Jar (22: whenever a creature dies, +1 Max HP and heal 4; the Max HP is taken back if the jar is dropped, `run.leechHp`);
  - the Belfry: the Bell Clapper (41: the first Crest or Strand of a turn makes the next card play twice), the Powder Horn (26: every creature that dies bursts for 12 on the others, never on you, and bursts chain) and the Heart Cinder (42: 1 more Light on turns 1, 3, 5 and so on).
  - Echo now replays a card only if it was waiting before that card was played (`echoReady` in `E.playCard`). Without that, the Clapper would echo the very card that made the Crest. Nothing else gave Echo mid-card, so nothing else changed.
- **The Hold grows for good** (the user's idea): `E.HOLD` 20 plus `E.HOLD_STEP` 10 for the deepest level ever reached (`E.holdAt`): 20, 30, 40.
  - `run.hold` is set by `E.newRun(..., deepest)` from `meta.reached`, and `E.goDeeper` raises it on a first arrival (`run.holdRose`, a toast).
  - The UI stores the arrival at once (`E.noteReached`), so it counts even if Wren falls or the run is abandoned. `E.recordRun` notes it too. Tutorial and debug-cheated runs count for nothing.
  - `meta.reached` comes from the Logbook's deepest landing for older saves. A saved run without `run.hold` uses the Hold for its level.
  - `E.hold(run)`, `E.roilFor(charge, hold)`; before a run the UI uses `E.metaHold(meta)`. The Logbook shows the Hold and what it grows to. Debug: "Next Hold".
- **Five pieces of kit**, each unlocked by a new achievement:
  - Toggle Iron (Harpoon, 30): the first Harpoon Jab of a fight applies 2 Soaked. Unlocked by Still Water (break the Tolling Buoy).
  - Harbour Bell (Bell, 25): 3 Ward on every Crest and Strand, no card. Unlocked by Out of Its Bell (break the Harbour Hermit).
  - Plated Dress (Coat, 50): counts as the Diving Dress (`as: 'suit'`, `E.wears`), and 3 Ward at the start of each fight. Unlocked by The Light Returns (bring the Heart home). The Gorget's 4 Ward and the dress's 3 are now a `ward` field on the coat.
  - Bailer (Ditty Bag, 30): Bail or Stir twice a turn (`E.swellActsPerTurn`, `c.swellActN`). Unlocked by Both Ends (Crest and Strand in one turn, `stats.bothEnds`).
  - Safety Line (Ditty Bag, 35): the first time Wren would fall on an expedition she is left with 5 HP and the fight goes on (`lineHolds`, `run.lineUsed`). Unlocked by Close Call (win a fight with 5 HP or less, `stats.closeCall`).
  - Old saves: `E.migrateMeta` grants Out of Its Bell and Still Water from the deepest level reached, and The Light Returns from the Hearts brought home.
- **Art:** 11 icons from Codex (`assets-src/wanted-images.tsv`, keepsakes in `assets-src/keepsakes/`). The Lazaret lists where each keepsake not yet brought home is found, and reward and shop tiles tag a deeper one "From Dark Water" or "From the Belfry".
- **Fixed in passing:** the chosen currents were saved but never loaded, so a reload forgot them. `meta.currents` is now read back.
- **Tests:** `tests/finds.test.js` (19 tests), and `node tests/ui-smoke.js --only finds` on desktop and phone.
- **Fixed while testing:** the toast stack holds three messages, and going deeper also unlocks Story so far entries, so their toasts pushed the Hold toast out. The Hold toast now comes last.

**Measured** (the bot, one capped process each time; spec files in the session scratchpad):
- **Keepsake value:** the Shallows' pin with the keepsake carried from the start, the Hold out of the way (999). Baseline 23.5% over 1000 seeds, 23.9% over 2000. On this scale the Shallows keepsakes cost about 1.1 Roil per point: the Whale Tooth gives +16.1 at Roil 19, the Storm Bottle +17.0 at 18, the Tidewatch +11.9 at 12. Each deeper keepsake was tuned until it was worth more than the Whale Tooth, then given 1.1 Roil per point.

  | Keepsake | First version | Gain | Built | Gain | Roil |
  |---|---|---|---|---|---|
  | Hollow Whelk | half your Ward stays | +9.2 | all your Ward stays | +24.4 | 27 |
  | Glimmer Bulb | a Strand gives 2 Light | +27.0 | the same | +27.0 | 30 |
  | Leech Jar | heal 3 a death | +7.6 | heal 4 and +2 Max HP a death | +18.7 | 21 |
  | Bell Clapper | first Crest or Strand: next card twice | +37.7 | the same | +37.7 | 41 |
  | Powder Horn | bursts for 5 | +9.6 | bursts for 12 | +23.5 | 26 |
  | Heart Cinder | +1 Light every turn | +64.9 | +1 Light on turns 1, 3, 5... | +38.2 | 42 |

  Also tried: Leech Jar heal 5 (+11.2), heal 7 (+14.2), heal 4 and +1 Max HP (+14.7), heal 3 and +2 (+16.2), heal 5 and +2 (+20.4); Powder Horn 8 (+16.1); Heart Cinder every third turn (+22.9).
- **Kit:** the Shallows' pin at Hold 20, empty kit 20.3% (1000 seeds; noise about ±1.3):

  | Piece | Pin | Piece | Pin |
  |---|---|---|---|
  | Honed Harpoon | 22.0 | Flood Bell | 26.4 |
  | Barbed Harpoon | 20.5 | Ebb Bell | 25.7 |
  | Toggle Iron | 24.8 | Harbour Bell, 5 / 4 / 3 Ward | 37.2 / 33.3 / 30.3 |
  | Shell Gorget | 19.0 | Bailer | 19.7 |
  | Plated Dress | 21.5 | Safety Line, 10 / 5 / 1 HP | 33.4 / 30.7 / 29.2 |

  The bot never plans two Swell acts in a turn, so the Bailer is worth nothing to it (it learned to on 2026-11-14; see "The bot shops, drinks tonics and uses the Bailer"). Most of the Safety Line's value is the second chance itself: at 1 HP it still gives +8.9.
- **The Hold:** the Shallows' pin carrying the Whale Tooth, Storm Bottle and Kelp Bracelet (Roil 48), 2000 seeds: 35.0% at Hold 20, 47.5% at 30, 56.7% at 40 (nothing carried: 19.9%).
- **The expedition,** wearing the dress, 2000 seeds:

  | | Shallows' pin | Dark Water's after it | Belfry's after that | Heart home |
  |---|---|---|---|---|
  | v0.21.0 rules (no deeper keepsakes, Hold 20) | 19.9 | 15.9 | 30.2 | 0.9 |
  | v0.22.0, first expedition (Hold 20, then 30, then 40) | 19.9 | 17.9 | 45.1 | 1.6 |
  | v0.22.0, been to the Belfry before (Hold 40) | 23.2 | 20.7 | 53.1 | 2.5 |
  | after the Heart, Hold 40, Plated Dress | 23.7 | 27.2 | 57.4 | 3.7 (quieted) |

  A first expedition's Shallows are unchanged: they offer nothing new and the Hold is still 20. These rows were played with the Leech Jar's earlier version (+1 Max HP, Roil 22); its final +2 was measured after.

**My provisional calls** (rules and numbers are the user's; each is a dial):
1. `E.HOLD_STEP` 10: the Hold is 20, 30, 40. It counts on arrival, even if Wren falls later.
2. Deeper keepsakes are priced like the old ones (1.1 Roil per point), and the cheapest (the Leech Jar, 21) is above the dearest Shallows keepsake (the Whale Tooth, 19). Their numbers were raised until each is worth more than any Shallows keepsake. The Heart Cinder went the other way: +1 Light every turn won 88% of the Shallows' pins.
3. One of the level's own keepsakes comes first in every offer below the Shallows, while any are left.
4. Harbour Bell 3 Ward (+10 for the bot; 5 Ward was +17). Safety Line 5 HP. Plated Dress 3 Ward.
5. Prices and unlocks: Toggle Iron 30 (Still Water), Harbour Bell 25 (Out of Its Bell), Plated Dress 50 (The Light Returns), Bailer 30 (Both Ends), Safety Line 35 (Close Call).
6. Echo replays only a card it was waiting for before the card was played. It changes nothing that existed before.

**Findings for the user (not changed):**
1. **The Belfry got easier.** Its pin share rose from 30.2% to 45.1% on a first expedition, and to 53.1% for a veteran, because its own keepsakes are the strongest and the Hold is 40 by then. The user asked for deeper levels to stay hard from their first fight. Levers: the Belfry keepsakes (the Clapper and the Cinder are the strongest), or the Belfry's enemies.
2. **Two Shallows keepsakes are underpriced** on today's scale: the Kelp Bracelet (+25.6 at Roil 11) and the Drowned Anchor (+23.4 at 18).
3. The Shell Gorget measured below an empty kit (19.0 against 20.3), inside the noise.

**Open for the playtest:**
- Do the deeper keepsakes feel worth going down for? Does the "From Dark Water" tag read?
- Did you see the Hold toast on the stair? Does a bigger Hold feel like progress?
- Does the Hollow Whelk's stacking Ward make fights slow?
- Can you follow the Powder Horn's chain bursts, and see which card the Bell Clapper doubles?
- Did you Bail and Stir in one turn with the Bailer?

### Art review (v0.23.0, 2026-11-14)

The user asked to "review game art, fill in any gaps, and fix any art that does not make sense given story/setting". All 152 images were checked against WORLD.md. Most of the art from the starting point was painted for an older story in which Wren swam, so it showed the Shallows under water. The user owns the lore since 2026-11-12, so the picture calls below are the agent's; each image can be reverted on its own from git.

**Replaced because it contradicted the setting:**
- `bg_battle` (the Shallows' fights and the tutorial): was a sunlit seabed with a sunken lighthouse. Now the foreshore at night at low tide, the keepers' stair on the left, the lighthouse dark on the headland. Its faint lit window was painted out by hand (`assets-src/bg/bg_battle-v2-dark.png`).
- `bg_shallows_boss` (the Hermit, the pin screen, falls in the Shallows): was under water, made that way on purpose in v0.20.0. Now a rock basin held brim-full above the tide over a drowned stair, with the torn-off bell bracket on the ledge.
- `units/bell` (the Bellwether): showed the Thing's eye and arms, so the two phases looked the same. Now a cracked bronze bell with a golden glow and only a hint of tendrils.
- Brace and Deep Guard showed an old bearded man (Brace also had the lighthouse lit). Now Wren. Toppled Tower showed a sunken lighthouse; now a sea tower toppled by a wave.
- Events: the Gilded Gull (was fully sunk), Eyes in the Kelp (was a diver in a helmet), the Lost Lamplighter (under water, lantern lit; WORLD.md says it has not burned in a hundred years), the Sunken Shrine (sunlit seabed with a shipwreck), the bottle (the lighthouse was shining tonight), and the Wreck's sea chest (gold coins on a sunlit seabed).

**Gaps filled:**
- The Belfry's boss fights and finals used `bg_boss`, a generic blue cathedral that was not the Belfry. Now `bg_belfry_boss`. `bg_boss` is deleted, and so is `c_coralspines` (unused since the starting point).
- The opening's first three pictures were crops of the title art and of `bg_boss`. Now `scenes/op_lighthouse`, `op_bell` and `op_fire`.
- The end screen showed the dark lighthouse even after the Heart was home, and its text said "The lighthouse is still dark". After the Heart, a homecoming shows `op_lighthouse` lit, and the fall and homecoming texts say the great light still turns.
- The Workshop and the Lazaret have a banner picture (`.ws-art`). The Lazaret's form was an open question; the agent's answer is in WORLD.md (a ship's locker of barred compartments at the foot of the lighthouse).
- The three keeper's notes without a picture now have one: How a keepsake is made (the Whale Tooth), A Roiled aether (the Seep card), A night in the Lazaret.
- The 7 tonics were one bottle in 7 colours (and the same picture as the Storm Bottle). 8 keepsakes were crops of card art (Storm Bottle, Moon Shard, Conch of Echoes, Whispering Conch, Salted Hook, Drowned Anchor, Scallop Charm, Coral Branch). Each now has its own icon.

**Kept on purpose:** the title art (a dark lighthouse over a sunken bell; a loose cut-away, but it agrees with the story), Lighthouse Beam (a lit lighthouse is what the card means), Spring Tide's boat, Riptide Cut's blade, the Drowned Deckhand's pirate look.

**Tooling:** `tools/build.js` now also checks the opening and Story so far pictures. The prompts are the last block of `assets-src/wanted-images.tsv`; the style preambles there are the ones to copy.

**Open for the user:** does the new Shallows read well behind the fight (it is lighter and busier than the old seabed)? Do the Workshop and Lazaret banners help, or push the lists too far down on a phone?

### The bot shops, drinks tonics and uses the Bailer (2026-11-14; tools only, no version)

The user asked to "teach the bot to shop, drink tonics and use two Swell moves in a turn, for better testing". Before this, the bot never shopped and never drank a tonic. It also Bailed or Stirred only when it had nothing left to play, so it never used a second act. Pearls, the shop, tonics, the money kit (Coin Purse, Gleaner's Pouch, Barnaby's Marker, Pearl Scales), the Spare Flask and the Bailer were all worth zero to it. Nothing in the game changed. The work is in `tools/bot.js`, with tests in `tests/bot.test.js`.

**What the bot does now** (it still keeps no state of its own, so save/continue still plays the same run):
- **Barnaby's shop:** it buys in this order while the Pearls last, then leaves.
  1. It takes out a curse or status card.
  2. It buys the keepsake it values most, if it can afford it.
  3. It takes out a starter Brace (one removal a visit).
  4. It buys a rare card.
  5. It buys a tonic if a slot is free.
- **Tonics in a fight:**
  - It drinks any tonic that wins the fight or kills an enemy at once.
  - If the turn would end with Wren falling, it drinks Shell, Kelp Tea, Ink, or a Squall that kills, in that order.
  - Other uses are only in a pin or Dread fight, or when all 3 slots are full:
    - turn 1: Ink on the hardest hitter, Brine on the enemy with the most HP plus Ward, Squall when there are 2 or more enemies;
    - Lamp Oil when the hand costs more than the Light;
    - Moonwater at Swell 2 to 4.
- **Tonics on the map:** Kelp Tea at half HP or less, with at least 15 HP missing.
- **Swell acts:** the end-of-turn rule is the same as before, but it now looks as far as its acts and Light reach, so with the Bailer it Stirs twice into a Crest, or Bails twice to a Strand. Mid-turn, it Stirs into a Crest when the wave kills, and Bails twice from Swell 2 when an enemy has Ward or is Submerged.
- **Options** for `step`, `playRun` and a measure row's new `bot` field: `noShop`, `noTonics`, `noSwellActs`, `lateSwellOnly`, `shopOrder`, `removeId`. `{ noShop: true, noTonics: true, lateSwellOnly: true }` plays exactly like the old bot. At 2000 seeds every number matched.

**Before and after** (expedition with the Diving Dress, Hold 20, 2000 seeds; pin 2 and pin 3 are shares of the pin before):

| Bot | Shallows' pin | Dark Water's after it | Belfry's after that | Heart home | Spent at shops a run |
|---|---|---|---|---|---|
| old (= all three options) | 19.9 | 17.6 | 40.0 | 1.4 | 0 |
| new, no tonics | 24.8 | 26.2 | 67.7 | 4.4 | 99 Pearls |
| new, no shopping | 27.0 | 26.7 | 61.1 | 4.4 | 0 |
| **new** | **33.8** | **32.9** | **70.7** | **7.8** | 117 Pearls |

Shopping and tonics each give about half of the gain. The new bot finishes a run with 0.12 tonics left on average (the old bot had 1.18). Over 2000 runs its purchases were 1335 removals, 634 tonics, 506 keepsakes and 190 cards. It uses most tonics in pin and Dread fights: Lamp Oil 487, Brine 460, Ink 452, Shell 365, Moonwater 271, Squall 183. Kelp Tea was used 275 times on the map and 188 times in fights.

**Kit with the new bot** (the same expedition, dress plus one piece, 2000 seeds). Noise is about ±1 point on the Heart, ±1.5 on the Shallows' pin, ±2 on Dark Water's share and ±3 on the Belfry's, because fewer runs get that far:

| Kit piece | Shallows' pin | Dark Water's | Belfry's | Heart | Heart, old bot |
|---|---|---|---|---|---|
| dress only | 33.8 | 32.9 | 70.7 | 7.8 | 1.4 |
| Coin Purse | 35.1 | 34.9 | 66.5 | 8.2 | 1.4 |
| Gleaner's Pouch | 34.0 | 37.6 | 69.9 | 8.9 | 1.4 |
| Barnaby's Marker | 39.6 | 38.1 | 69.9 | 10.6 | not measured |
| Pearl Scales | 35.8 | 36.2 | 71.8 | 9.3 | 1.4 |
| Spare Flask | 37.6 | 31.3 | 69.8 | 8.2 | 1.9 |
| Gleaning Net | 33.9 | 33.9 | 67.0 | 7.7 | not measured |
| Spare Wick | 37.0 | 44.5 | 79.3 | 13.1 | not measured |
| Bailer | 33.5 | 34.0 | 75.0 | 8.6 | 1.4 |
| Safety Line | 46.2 | 37.4 | 69.1 | 11.9 | not measured |

With the old bot, the Purse, Pouch and Scales played exactly the same runs as the dress alone. Now each piece has a value.

**My calls (each is a dial):**
1. **Remove a Brace, not a Jab.** This was +3.5 points on the Shallows' pin at 1000 seeds, and the same deeper down.
2. **Shop order:** none of the orders I tried was clearly better: removal first, tonics first, any card instead of a rare, or no cards. I kept the order above.
3. **No "Crest as soon as possible" rule.** It added about 0.7 points on the Heart, but with it the Bailer measured below the dress alone. It also changes how the bot plays, which is a separate question from what was asked.
4. Card picks, routes, rests and events are unchanged. The bot still takes the first card of a reward, goes to the first stop on the map and does not look for shops.

**Findings for the user (not changed):**
1. **The Spare Wick (12 Workshop coins) is the strongest Ditty Bag piece for the bot**: +5.3 on the Heart, and +11.6 on Dark Water's pin share. It does more than the Safety Line (35) for a whole expedition. The bot rests at every Cove, so it may overvalue resting, but it is a lot for the price.
2. **Barnaby's Marker** (+2.8 on the Heart) is worth more than the Coin Purse (+0.4, inside the noise) or the Gleaner's Pouch (+1.1).
3. **The Bailer is still small:** +0.8 on the Heart and +4.3 on the Belfry's pin share, both inside the noise, and nothing on the Shallows' pin. Without the mid-turn rules it made 1983 double acts in 2000 expeditions; with them, 5539.
4. **The Gleaning Net does nothing** (+0 on every column). 3 Pearls a Crest is too little.
5. **Every earlier bot number in these notes is from the old bot.** The new bot is much stronger, so compare old numbers only with a measure row that uses `bot: { noShop: true, noTonics: true, lateSwellOnly: true }`. The v0.22.0 balance findings ("The Belfry got easier", the underpriced keepsakes) should be measured again with the new bot before anyone acts on them.

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

## Kit and keepsake Charge (v0.10.0, 2026-11-12)

Built from the decisions in "Paused plan and open questions". It replaces the pack, capacity and overburden described under "The Workshop" below.

**Kit:**
- **Five places, one piece each:** Harpoon, Bell, Coat, Pocket and Ditty Bag (`BL.KIT_PLACES`, `BL.KIT`, `E.fitKit`, `E.equipKit`, `E.applyKit`).
- **The Bell always holds a bell.** The Brass Tide-Bell is free and owned by everyone.
- **The run carries its kit** in `run.kit = { place: id }`.
- **Lasting state** is `brinelight.meta.v1 = { salvage, earned, owned, kit, ach }`.

**Charge, Hold and Seep:**
- **Charge:** every keepsake has one (`BL.KEEPSAKES[k].charge`).
- **Hold:** `E.hold(level)`, which is 30 + 5 per depth.
- **Seep:** 1 per started 5 Charge over the Hold (`E.seepCount`), shuffled into the draw pile at the start of each fight. It is never added to the deck.
- **Keepsake picks are optional:** `E.leaveKeepsakes` scores 80. `E.dropKeepsake` works between fights.
- **Moved to kit:** the money keepsakes and the Tide-Bell. Flood Chart, Ebb Chart, Storm Lens and Whetstone became the Flood, Ebb and Cracked Bells and the Honed Harpoon.

**Provisional calls (each can be undone on its own):**
1. **Hold 30 in the Shallows, +5 per depth.** The bot settled it. At a Hold of 10 (my first proposal), a new player's Shallows dropped to 16%. At 30, it stays close to v0.9.0 (23.3% against 24.2%).
2. **Charge is the keepsake's bot value:** win-rate points when the keepsake is carried from the start, on top of the Brass Tide-Bell and the bot's normal picks (baseline 24.7%).

   | Charge | Keepsake |
   |---|---|
   | 19 | Whale Tooth |
   | 18 | Storm Bottle, Drowned Anchor |
   | 17 | Conch of Echoes, Whispering Conch |
   | 14 | Barnacle Plate |
   | 12 | Tidewatch, Scallop Charm |
   | 11 | Kelp Bracelet |
   | 10 | Angler's Lure |
   | 8 | Moon Shard, Gull Feather |
   | 7 | Salted Hook |
   | 6 | Coral Branch |

   These are higher than the 4–15 I proposed, because the bot now picks keepsakes better and the pool lost its weak money keepsakes.
3. **Barnacle Plate gives 1 Spines (was 3).** With the bot's normal picks, 3 Spines gives 70.5%, 2 gives 53.9%, and 1 gives 38.5%. The rest of the keepsakes land at 30–44%.
4. **The harpoons are small.** The Honed Harpoon adds +2 damage to the first Jab of each fight, and the Barbed Harpoon applies 1 Brine. With the real engine, the first Jab gives:

   | First Jab | Win rate |
   |---|---|
   | +2 damage | 28.7% |
   | +3 damage | 30.4% |
   | +5 damage | 31.4% |
   | 1 Brine | 26.5% |
   | 2 Brine | 33.2% |

   The baseline is 23.3%. The scratch `harpoon.js` numbers above, from a patched v0.9.0 engine, are superseded.
5. **Prices.** Carried-over pieces keep their price. The Honed Harpoon keeps the Whetstone's 35, and the bells keep the charts' and Storm Lens's 20, 20 and 30. New pieces: Barbed Harpoon 25, Gleaner's Pouch 15, Pearl Scales 15, Gleaning Net 10, Spare Wick 12.
6. **Leaving the keepsakes scores +80**, the same as a Dread's card. A pick left open by some other path is lost and scores nothing.
7. **Dropping a keepsake** works only between fights and is for good. Scallop Charm's 10 Max HP go with it, and its text now says "While you carry it".
8. **New kit is worn as soon as it's bought** if its place is empty. A new bell never replaces the worn bell by itself.
9. **The kit screen before a dive** is skipped while you own nothing to choose. Since v0.24.0 it and the Workshop show the kit view described under "Kit view" below.
10. **The HUD:**
    - The bell is a square medal.
    - The rest of the kit sits behind the pack button.
    - A Charge chip ("37/30") turns red when you're over the Hold.
    - On phones these move to the second row.
    - The bell and the Gleaning Net flash when they act.
11. **Old saves carry over:**
    - Owned gear becomes kit, and the old pack becomes the worn kit (`E.migrateMeta`).
    - A run in progress keeps its retired keepsakes and gear working as kit (`run.kitExtra`, `E.migrateRun`).
    - The charts' and Storm Lens's effects end in such a run.
12. **New achievement: Salt the Wound** (an enemy dies to Brine; `stats.brineKills`). It unlocks the Barbed Harpoon.
13. **The bot's keepsake rule** is the offered keepsake with the highest Charge, minus 10 per Seep it adds. It takes that keepsake if the result is above 0; otherwise it leaves them. One Seep alone costs about 5 points, but Seep stacks badly with a second keepsake, so −10 picks better.
14. **A first-time hint** explains Charge the first time you carry a keepsake.
15. **Art:**
    - 9 kit icons and the Seep card were made with Codex (`assets-src/wanted-images.tsv`).
    - The Spare Wick has its own icon. The old Spare Lantern art is retired.
    - 8 unused icons were removed.

**Bot measurements** (1000 seeds a row; real engine, real bot):

Shallows (Hold 30):

| Kit | Win rate |
|---|---|
| empty | 23.3% |
| Honed Harpoon | 28.7% |
| Cork Vest | 28.2% |
| Barbed Harpoon | 26.5% |
| Shell Gorget | 26.3% |
| Honed Harpoon + Cork Vest | 34.5% |
| Honed Harpoon + Shell Gorget | 33.0% |
| Barbed Harpoon + Cork Vest | 32.0% |
| Barbed Harpoon + Shell Gorget | 30.4% |
| no Hold at all, empty kit | 28.9% |

Bells, with Honed Harpoon + Cork Vest:

| Bell | Win rate |
|---|---|
| Brass Tide-Bell | 34.5% |
| Ebb Bell | 34.5% |
| Flood Bell | 31.0% |
| Cracked Bell | 29.8% |

The bot never plans a chain, so it can't use the Cracked Bell well.

Deeper depths (Hold 35, 40 and 45):

| Depth | Empty kit | Full kit |
|---|---|---|
| Dark Water | 14.4% | 19.9–20.2% |
| Riptide | 3.3% | 5.8–6.6% |
| The Abyss | 1.3% | 2.6–3.1% |

- **A full kit in the Shallows lands at 30–34.5%.** v0.8.0's 1-space pack gave 28–29.5%, and v0.7.0's 3-space pack gave 35–42% (too generous for the user). So it's a bit more generous than v0.9.0.
- **The bot can't value the Pocket and Ditty Bag,** so a person's kit is worth more than these numbers show.
- **The keepsake Hold took back about 5.6 points** for an empty kit (28.9% → 23.3%).
- **A full kit is worth about one depth,** as the old pack was.

## The Workshop (v0.7.0, 2026-11-11): first slice of meta-progression

Superseded in part by v0.10.0: the pack, capacity and overburden are gone, and gear became kit. The decisions and measurements below are kept as history.

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

## Music and sound (v0.25.0, 2026-11-14)

The user asked for the musicbox score and the sound kit to go into the game. They listened to both in the musicbox editor and `sound/lab.html` while drafting, but not yet in the game.

- **Where it is.**
  - The score is `music/brinelight.scrim`, in musicbox's format. Its reference is `docs/PROMPT.md` in musicbox. `npx -y github:andre-larsson/musicbox link music/brinelight.scrim` opens it in the editor, which can mute and solo each voice.
  - After you edit the score, run `node tools/music.js` to write `js/music-score.js`. `tests/music.test.js` fails until you do. It also checks that the score compiles with no warnings, that it has every cue the game asks for, and that every sound the game plays is in the kit.
  - musicbox is bundled as one classic script, `js/vendor/musicbox/musicbox.js`, with its LICENSE and NOTICE (Apache 2.0), because ES modules don't load from `file://`.
    - The current bundle is musicbox `e371a2c` (2026-11-14), and the file's header names the commit.
    - To update it, pull musicbox, then run `node tools/music.js --vendor ../musicbox`.
  - The sound effects are `js/sfx.js`. `sound/lab.html` plays each one, plays it three times to show how it varies, and plays the sound the game made before v0.25.0. The lab is not shipped.
- **What plays when** (`updateSound` in `js/ui.js`):
  - Cues: `title` outside a run (the title, the opening, the Workshop, Story so far). `reach` on the map and every stop that isn't a fight. `fight` for an easy or hard fight, `dread` for an elite, `pin` for a boss, and `pin2` from its second phase. `home` on the win screen, `fallen` on the loss screen.
  - The score's intensity is the depth: 0 in the Shallows (and the tutorial), 1 in Dark Water, 2 in the Belfry. The same number sets the kit's depth (a lower low-pass and a longer, darker echo).
  - The place's sounds (`kit.ambience`) come every 4 to 11 s on the map and its stops, half as often in fights and Dreads, and not at all in pins, on the title or on the end screens. This is a provisional call.
- **One AudioContext**, made on the first click or key press. Sound effects and music each go through a bus set by the player's switch and slider. The kit has its own limiter. The score has musicbox's master: eq, compressor and limiter.
- **Levels.** Measured 2026-11-14 by rendering offline in headless Chrome, with BS.1770 loudness. "Momentary" is the loudest 400 ms.

  | Sound | Old (v0.24.3), momentary LUFS | New kit, momentary LUFS |
  |---|---|---|
  | Hit (6) | -32.4 | -31.1 |
  | Hit (18) | -32.4 | -23.2 |
  | Hurt (6) | -40.2 | -29.1 |
  | Play an Attack | -45.0 | -41.3 |
  | Draw 5 | -45.8 | -36.2 |
  | Crest | -35.5 | -22.6 |
  | Blocked | -43.0 | -34.7 |
  | Your Turn | -35.5 | -27.3 |
  | Select | -52.3 | -49.7 |
  | Pearls | -43.9 | -38.3 |
  | The great bell | -24.1 | -17.6 |
  | Fight won | -33.1 | -25.2 |

  - The old music played at about -32 LUFS integrated in every mood, level with an ordinary blow.
  - At musicbox's default volume of 0.8, the score plays at -12.9 (title), -16.2 (reach), -15.2 (fight), -14.7 (dread), -13.9 (pin), -12.4 (pin2), -14.0 (home) and -15.7 (fallen). That is mastered like a record and would bury the sound effects.
  - So the game plays the score at musicbox volume 0.12 (`MUSIC_LEVEL`), which is 16.5 dB down. A fight is then about -31.7 LUFS, the old balance, and the cues run from -28.9 (pin2) to -32.7 (reach).
  - Both sliders default to 80%, which is this balance. The level is (slider / 0.8)²: 100% is +3.9 dB, 50% is -8.2 dB, 25% is -20 dB, and 0 is silent.
  - The whole game stays about as quiet as before (around -32 LUFS), which is well under most web audio (-14 to -23). An open question is whether to raise both together.
- **Open questions for the user to listen to:**
  - Is 80/80 the right balance of music to blows?
  - Should the place's sounds play in fights at all? (A gull in a fight?)
  - The flute's 400 to 800 Hz bump in `title` and `home`.
  - The dip near 100 Hz in the quiet cues.

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
- **Bot run outcomes** with the bot that shops, drinks tonics and uses the Bailer (2026-11-14), v0.24.0, 2000 seeds, first expedition in the dress: the Shallows' pin 33.8%, Dark Water's after it 32.9%, the Belfry's after that 70.7%, the Heart 7.8%. The same seeds with the old bot: 19.9%, 17.6%, 40.0%, 1.4% (see "The bot shops, drinks tonics and uses the Bailer"). Every number below is from the old bot.
- **Older bot run outcomes** (careful bot, before 2026-11-14): v0.22.0, 2000 seeds, first expedition: the Shallows' pin 19.9%, Dark Water's after it 17.9%, the Belfry's after that 45.1%, the Heart 1.6%; with Hold 40 from earlier expeditions 23.2%, 20.7%, 53.1%, 2.5% (see "More kit and keepsakes, slice C"). v0.21.0, 2000 seeds: the Shallows' pin 19.9%, Dark Water's after it 15.9%, the Belfry's after that 30.2%, the Heart 0.9% (see "Deeper Dreads are harder"). v0.20.0, 2000 seeds:
  - the Shallows' pin 18.5%;
  - Dark Water's after it 18.6%;
  - the Belfry's after that 34% (paired replay);
  - the Heart 1.1%.

  See "The Belfry, slice B". v0.19.0, 2000 seeds: the Shallows' pin 18.4%, Dark Water's after it 15.7%, the Heart 2.9% (see "Expeditions, slice A"). Before expeditions (1000 seeds, the Shallows): win 19.2% in v0.18.0, with the bot that values Swell moves when it guards (17.9% for v0.17.0 with that bot; 15.8% with the old one). Older: 11.4% in v0.16.0, 23.8% in v0.14.0 and v0.15.0, 24.2% before v0.10.0, 21.1% before the Low Water rework), average landing 10.5 of 11. Bots aren't people: use these for before/after comparisons, not as difficulty targets. `npm run measure` gives the current table.

## Tools

- `tests/rules.test.js`: every rule in README.md and How to Play, plus determinism and save/continue. `tests/tutorial.test.js`: the scripted tutorial fight.
- `tests/ui-smoke.js`: headless Chrome through the real UI (desktop mouse and keyboard, phone touch, tutorial with mouse, touch and keyboard, tutorial from inside a run). Checks for JS errors, stuck screens, horizontal overflow, Continue, the keeper's incoming number and End Turn lighting up.
- `tools/bot.js`: loads the engine in Node and plays runs with a deterministic policy that shops, drinks tonics and uses the Bailer. Its options turn each part off, and `{ noShop, noTonics, lateSwellOnly }` plays like the bot before 2026-11-14. A measure row passes them as `bot`. `tests/bot.test.js` checks its shopping, tonics and double Swell acts, and that whole runs stay deterministic across a save.
- `tools/opening.js`: the opening measurements above.
- `tools/screens.js`: screenshots of every screen at the four sizes, plus the small-text list. `tools/tutorial-shots.js`: one screenshot per tutorial step.
- `tools/serve.js`, `tools/cdp.js`: static server and a tiny Chrome DevTools client (launches its own headless Chrome on a free port).
- `tools/build.js`: assembles `_site/` for Pages and checks every referenced file exists.
- `tools/music.js`: writes `js/music-score.js` from `music/brinelight.scrim`, and with `--vendor DIR` bundles musicbox into `js/vendor/musicbox/`. `tests/music.test.js` checks the score and the kit. `node tests/ui-smoke.js --only audio` plays with sound and music on, on desktop and phone. It checks that nothing starts before a click, that the cue and depth follow the screen, that the menu's switches and sliders work and are saved, and that a whole fight's sounds raise no error. See "Music and sound (v0.25.0)".
- `tests/workshop.test.js`: the Workshop, kit, Charge, Hold and Seep rules, and old saves carrying over. `node tests/ui-smoke.js --only workshop` runs only the Workshop flow in the browser: old lasting state carried over, buy, wear, dive, the Charge chip, dropping a keepsake, Seep in a fight, Salvage at the end, and abandoning a run earns nothing.
- `tests/lazaret.test.js`: the Lazaret rules. `node tests/ui-smoke.js --only lazaret` plays a first win, a fall and a second win in the browser.
- `tests/darkwater.test.js`: the bands and every Dark Water rule (drain, Submerged, Shell, Doused, swallow, the Rocking Toll, the Garden's follower, the events). `node tests/ui-smoke.js --only darkwater` starts a Dark Water descent on desktop and phone, checks the backgrounds, aims at a Submerged Ray, feeds a card to the Gulper, gets doused, reads the Buoy's intent at two Swells, then plays a few stops. `tools/screens.js` shoots Dark Water as screens 31–36.
- `tests/belfry.test.js`: the Hermit, Echo, Breathless, Burst, the Bellwether's rise, the dress, the finals, the Cantor and the Belfry's events. `node tests/ui-smoke.js --only belfry` runs these on desktop and phone:
  - meets Dark Water's pin without the dress, carries the dress home, and wears it from the kit;
  - goes down the stair, and checks the Belfry's background and Wren in the dress;
  - breaks the Bellwether, then checks that the Thing in the Bell takes its place and Wren is healed.

  `tools/screens.js` shoots the dress on the pin as screen 35, the Belfry as screens 40–46, and the Garden Strider as screen 47.
- `tests/story.test.js`: the title line, the opening, and what opens each Story so far entry. `node tests/ui-smoke.js --only story` runs only the story flow in the browser. `tools/screens.js` also shoots the three Story so far tabs and the opening.
- `tools/cut-icon.py`: crops a generated icon to its object and saves a 160 px WebP (needs Python with Pillow).
- `tools/wren-art.py`: Wren's shared 400x600 canvas. `input` makes the 1024x1536 edit input from plain Wren, `compose` pastes back only the changed part of an edit inside the given polygons, and `place` puts a whole new picture on the canvas at her scale, or with `--tall` at another keeper's height (needs Python with Pillow and numpy). See "Art" for how it was used.
- `tools/swap-shots.js`: screenshots of a desktop fight, a phone fight and the Workshop's kit view with Wren's picture swapped for another 400x600 picture in the browser, to judge a keeper or costume draft in the game. See "Keeper and costume drafts".

## Determinism and saves

- All game randomness goes through a mulberry32 RNG whose state lives in the run (`run.rng`), so a save restores it exactly. Same seed and same decisions give the same run; tested, including a save/reload mid-fight.
- `Math.random` is used only for a fresh seed and in the UI (music, particles, float positions).
- The tutorial is a separate run object (`run.tutorial`) that is never saved and never scores. A run in progress is saved before the tutorial starts and reloaded after.
- localStorage keys: `brinelight.save.v1`, `brinelight.prefs.v1`, `brinelight.best.v1`, `brinelight.maxlevel.v1`, `brinelight.tutorial.v1`, `brinelight.hints.v1`, `brinelight.version.v1`, `brinelight.meta.v1` (`{ salvage, earned, owned, kit, ach }` since v0.10.0, plus `lazaret`, `bring`, `lazOpen` and `record` since v0.13.0; the older `packed` list is converted on load), `brinelight.debug.v1`, `brinelight.debugopts.v1` (the debug panel's Skip fights and Cheats count switches). Every project site on the Pages origin shares storage, so keep the `brinelight.` prefix on anything new.

## Art

- Painterly oil-paint look: deep teal and sea-green, cold turquoise brinelight glows, warm lantern-gold and brass light from the left. Units and gear icons on transparent backgrounds; keepsake and tonic icons are full-bleed squares; cards are full-bleed squares. All images are WebP in `img/`.
- **Style preambles:** copy them from the latest lines of `assets-src/wanted-images.tsv` (background, scene, unit, card, keepsake icon, tonic icon, gear icon). The queue file and the PNG originals are git-ignored; Codex keeps copies in `~/.codex/generated_images/`.
- **What the art has to agree with** (WORLD.md; the original art was made for an underwater game and broke these, see "Art review (v0.23.0)"):
  - The Shallows and Dark Water are open air. Wren stands on stone with an open lantern; the water is pools, held basins and still black water. No sunbeams through water, no divers, no fish in the air. Only the Belfry is under the sea, and there Wren wears the diving dress.
  - Saltmere's lighthouse is dark (no beam) until the Heart comes home, and lit after.
  - Wren is a young woman with dark brown hair, an ochre oilskin, a faded red scarf, boots, a harpoon and an open brass lantern.
  - Money is pearls, not gold coins.
  - The Bellwether is a bronze bell (crack, clapper, golden glow inside, at most a hint of tendrils). The one eye and the arms belong to the Thing, which comes out only when the bronze breaks.
  - The Lost Lamplighter's lantern is cold.
- Gear icons (v0.7.0): see "The Workshop" above.
- **Wren's pictures (v0.24.0):** her picture follows her coat (`E.keeperArt`). A coat's `look` is her picture on shore and on the open-air levels; a dress also has `lookUnder` for the Belfry. Pictures: `keeper` (no rig), `keeper_cork`, `keeper_gorget`, `keeper_packed` and `keeper_plated_packed` (a dress carried: helmet at her hip, suit rolled on her back), `keeper_suit` and `keeper_plated` (in the Belfry, and on the kit screens since v0.24.3). **A new coat needs its own picture** (two for a dress), made as below. Without one she shows as plain Wren, and the build fails if a named picture is missing. Other places never change her picture: that is deliberate, so a new harpoon, bell or pocket item needs only its icon. Painting Wren in stacked layers was rejected: layers from the image generator don't line up, and the cost grows with items times pictures.
- **One canvas, and coats as edits of plain Wren (v0.24.1, 2026-11-14).** The user saw that Wren changed size between pictures and that the coats looked almost the same. Each picture had been a fresh prompt, trimmed to whatever stuck up highest and scaled to 560 px tall, so her body varied: chin to sole was about 488 px plain, 460 with the dress carried and 445 in the Belfry. Each prompt also redrew her face and pose, and the item came out small (the Shell Gorget was a necklace you couldn't see in a fight).
  - Every Wren picture is now 400x600, with her soles on row 596, her face centred at x 227 and 513 px from eye level to sole. The top 40 px are empty except for the Belfry helmet. Boxes that show her are still sized for 560 px, and the picture overflows them upward by `--wren-tall` (`style.css`): the fight sprite, the kit view and the opening's fourth picture. One set of `at` points now fits every shore picture. `BL.WREN_POINTS` only moves the Coat and Pocket points on `keeper_packed`, where the roll and the helmet cover them.
  - Plain Wren (`keeper.webp`) is the master. She now carries the Brass Tide-Bell on her belt, left of the buckle against the dark jumper, where brass reads better than on the ochre coat. It was painted in from the bell's own icon (WORLD.md: the bell hangs at her belt, never in the lantern's hand).
  - The Cork Vest, the Shell Gorget and the carried dress are edits of the master, made with Codex's built-in image tool, which edits a picture but has no mask. The edit comes back aligned (0 px shift, 1024x1536, real alpha), but Codex repaints everything slightly (mean 6.8/255 outside the item, with visible changes to the lantern and harpoon tip). `tools/wren-art.py compose` pastes back only what changed inside an allowed polygon, so her face, lantern, harpoon and bell are the master's own pixels. The prompts are the 2026-11-14 `edit` lines of the queue file. Two variants were made of the vest and the dress: vest B (the cork blocks read clearly, and the scarf goes behind it) and dress A (the bigger helmet).
  - The new Shell Gorget is a wide collar of pale shells over her throat and shoulders. The vest is bulkier, and the rolled dress and its copper helmet are bigger and paler. All three still read at fight size (220 px).
  - The Belfry pictures were placed on the canvas from their originals (`wren-art.py place`) at 1.06 times their old scale, matched on eye level to sole. Her face is now 29-30 px from eye to chin in all six pictures. Her eyes sit 5-7 px lower in the dress, about 1% of her height. That was left as it is: moving them up would push the helmet lamp off the canvas.
  - Codex's image fallback script takes a real mask, but it bills the `OPENAI_API_KEY` account, and its gpt-image-2 can't make a transparent background. It wasn't used.
  - v0.24.2: the user asked for the two dresses to look more different. The Diving Dress was kept, because it matches its icon, the Workshop picture and the rolled canvas Wren carries. The Plated Dress is now a masked edit of `keeper_suit` (`--base`, allowed area everything below the helmet line at y 142), so the pose is identical and only the armour differs: broad shell pauldrons, a shell breastplate, and shell plates on the forearms, thighs, knees and shins, pale cream and coral with dark leather straps. The old shells were pale on pale canvas and almost vanished in a fight. Variant A was used, because its plates vary in size and have deep gaps; B (`assets-src/units/keeper_plated-edit-b.png`) was more uniform, like fish scales. The item text now says the plates run from shoulders to shins.
- **The Rig, and dresses worn on the kit screens (v0.24.3, 2026-11-14).** The user saw that the dresses changed Wren too little on the kit screens (both showed the same rolled-up picture), and that the Shell Gorget is not a coat while her yellow coat never changed.
  - The user's calls: the kit screens show a dress worn (`E.keeperArt(kit, 'kit')` returns `lookUnder`, else `look`); fights in the Shallows and Dark Water keep the carried picture, because she has air and her open lantern there. The place is renamed **Rig** (the user asked for names other than "Armour" and picked Rig from Rig, Shoulders, Outerwear and Garb). The id stays `coat` in code and saves. Lore (the user's pick of two): the oilskin is proofed with the oil that burns in the great lamp under the Heart's fire, so brine and brinelight run off it, and a keeper never takes it off; it is a World tab entry and in the Rig's description.
  - `keeper_plated_packed` is new: `keeper_packed` with the rolled canvas turned into a bundle of shell plates with a pauldron strapped on top (masked edit, `--base img/units/keeper_packed.webp`, allowed area the roll only; the helmet stays the same copper one). Variant A was used, like the Plated Dress; B (`assets-src/units/keeper_plated_packed-edit-b.png`) was almost the same. At fight size the difference is the colour: a pink, scaled bundle against a pale canvas roll.
  - `BL.WREN_POINTS` now corrects all five points on `keeper_suit` and `keeper_plated` (another pose: harpoon raised, bell lower, no coat pocket, so Pocket points at her right hip). `keeper_packed` is no longer on a kit screen, so its correction is gone. A test checks that every corrected picture is one the kit screens show, and that no two rig pieces share a kit picture.

### Kit view (v0.24.0, 2026-11-14)

- The Workshop and Pack for the expedition share one view (`kitDoll` in `js/ui.js`): Wren in the middle, a slot for each place (`BL.KIT_PLACES`) around her, and a tray under her with every piece for the chosen slot. Owned pieces come first (tap to wear, tap again to take off), then those for sale (tap to buy), then locked ones with their achievement.
- On a wide screen each slot has a line to where the piece sits on her: `side` and `at` on each place in `BL.KIT_PLACES`, with `BL.WREN_POINTS` to correct a point for one picture (since v0.24.3 the two worn dresses; see "The Rig" under Art). On a phone (600px and narrower) the slots stand in one column beside her and there are no lines.
- In the Workshop, a slot with something you can afford shows a small Salvage badge.
- Changes from before: you can wear kit in the Workshop and buy it while packing; the Pack screen puts the kit first, then keepsakes and currents.
- A new piece of kit in an existing place needs no screen work. A new place needs `side`, `at`, `none` (the empty slot's name) and an empty-slot glyph (`ICON.slot_<id>` in `js/ui.js`).
- Open: do the trays read well on a small phone, and is choosing a slot first slower than the old long list when you change several pieces?

### Keeper and costume drafts (2026-11-14; not in the game)

The user asked how more characters could be added, and wanted to judge the look first. I proposed a foundation (`BL.KEEPERS`, a keeper choice on the Pack screen, a Logbook per keeper) and five ways keepers could differ: numbers and loadout, own cards, an own water rule, own kit places, companions. None of that is decided. Three rounds of Codex samples followed. They were compared on a private artifact page (https://claude.ai/artifact/39b2dzv4LmqunJR8TmhdsJ), with each picture swapped into the real fight and Workshop (`tools/swap-shots.js`). The user keeps the drafts below and will choose later which to build.

- **Keeper drafts** are in `assets-src/drafts/keepers/`, placed on Wren's canvas with `tools/wren-art.py place SRC --eye Y --head X --tall F`. Sources are in `assets-src/units/samples/`.

  | Draft | Who | Source | eye, head, tall |
  |---|---|---|---|
  | josiah | Josiah, a retired harbour pilot, late 70s, tall and thin, Black | josiah.png | 144, 566, 1.06 |
  | dev | Dev, a ship's boy of about 14, South Asian (the user's pick of two tunings) | dev-tuned-b.png | 155, 526, 0.78 |
  | tavita | Tavita, a giant Samoan hauler with an anchor | tavita.png | 124, 552, 1.14 |
  | rook | Rook, an androgynous Latin American whaler with a peg leg | rook.png | 150, 592, 1.0 |
  | abena | Abena, a big Black anchor-smith with a sledgehammer | abena.png | 145, 565, 1.06 |
  | esi | Esi, a slim Black rigging runner with a rope dart (ochre trousers, so she shows on a phone) | esi-tuned-b.png | 228, 588, 1.03 |
  | engine | The Lamp Engine, the keepers' clockwork bell-tender | engine.png | 90, 572, 1.1 |
  | gulp | Gulp, a sea monster who wants to be a keeper | gulp.png | 160, 610, 0.9 |
  | winkle | Winkle, Barnaby's youngest, living in an old brass bell | winkle-a.png | 650, 622, 0.47 |
  | lan | Old Lan, a Chinese ferry-woman in her 80s with a sculling oar | lan.png | 480, 542, 0.68 |
  | kamala | Kamala, an Indian lascar sailor with a boarding axe | kamala.png | 136, 560, 1.06 |
  | raman | Dr. Raman, an Indian ship's surgeon in his 60s with an umbrella | raman.png | 124, 522, 0.95 |
  | remedios | Remedios, a Mexican salt-raker in her 50s | remedios.png | 104, 556, 0.95 |
  | mateo | Mateo, a Cuban cooper with a barrel-lid shield | mateo-2b.png | 103, 560, 1.06 |

- **Mateo:** the user kept the concept, but in the first picture his arm went through the shield and one hand held both the shield and the mallet. It was redrawn twice, with the anatomy spelled out in the prompt. In 2b the shield is strapped to his left forearm and the mallet is in his right hand.
- **Set aside:**
  - Tamsin, Abel and Ness (round 1, too alike: all white, all in similar coats);
  - Hae-won, Wei, Setsuko and Kenji;
  - Kaito, a manga hero, in both styles;
  - Barnaby, who keeps his shop. Winkle goes down in his place.
- **Wren's costume drafts** are in `assets-src/drafts/costumes/`, on her canvas.
  - Oilskin recolours (tarred, harbour blue, the Lamplighter's green). The user wants these as a cheap unlock or open from the start.
  - Secret joke costumes:
    - bathing: an 1890s bathing dress, the at-home one;
    - beach: a bikini with her boots on;
    - the lobster suit and the lighthouse;
    - the shell bikini, the barbarian and the barrel.
  - Dropped by the user: ballerina and brass mech. Codex's image tool refused a skimpy fantasy-armour parody.
  - The secret costumes are whole-picture Codex edits, so her face and pose are close but not identical, and the light is warmer. To ship one, paste it back with a mask like the Rig pictures, or inpaint it locally.
  - The recolours are a scripted hue swap of the ochre, with a mask that keeps out the lantern, rope coils, bell, face and harpoon hand. In the game a recolour needs 5 pictures: plain, Cork Vest, Shell Gorget and both carried dresses. The worn dresses hide the oilskin.
- **What the samples showed:**
  1. The ochre oilskin is what reads on a phone. Dark outfits fade into the water: all the round 1 B samples, Esi's first trousers, and tarred Wren.
  2. The 400x600 canvas caps height. Josiah, Tavita, Abena, Esi and the Lamp Engine were shrunk to fit, so a really big keeper needs a taller canvas, which means changing the fight layout.
  3. Odd shapes (the robot, the monster, the crab) read best at fight size.
  4. Anime-style art reads well but looks pasted onto the painted scenes.
  5. Codex drew every age, body and skin colour asked for.
  6. A knee-high Winkle vanished on a phone, so it is drawn at about half Wren's height.
- **Originals:** `assets-src/units/samples/*.png` (git-ignored; Codex keeps copies in `~/.codex/generated_images/`). Prompts: the 2026-11-14 sample and edit lines in `assets-src/wanted-images.tsv`.
- **Local generation:** ComfyUI is installed in `~/code/ComfyUI`, outside the repo, to test Qwen-Image 2.1, Z-Image Turbo and FLUX.2 Klein 4B. It can do masked inpainting and has no refusals. Qwen-Image 2.1 is under the Qwen Research License (check it before selling the game); Z-Image and FLUX.2 Klein 4B are Apache 2.0.

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
