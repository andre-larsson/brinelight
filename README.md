# Brinelight

A single-player roguelike deckbuilder for the browser. You play Wren, the last lighthouse keeper of Saltmere. An enchanted bell, sunk under the cliffs, has stolen the magic fire from her lighthouse, and it is pulling the sea up toward the town. Wren goes down through the flooded sea-caves of the Drowned Reach to take the fire, the Lantern Heart, back from the Drowned Bellwether.

**Play it:** <https://andre-larsson.github.io/brinelight/>

One run is an **expedition** down through the Reach, one level at a time: the Shallows, Dark Water, then the Belfry, which is under the sea. The Shallows and Dark Water are branching maps of 8 landings; the Belfry is a short dive of 5. Each level's boss, the **pin**, waits on its last landing. After a pin you go home with what you carry, or go deeper. The Shallows take about 15 minutes, and each level below takes a little longer. Every expedition ends with a score to beat.

**New here?** The first time you start a descent, a short opening in five pictures tells the story (Wren, the old keeper Hester who gave her the lantern, and Hester's dog Bosun, who goes down with her), and then the game offers a short guided fight (about 2 minutes) that teaches the basics and the Swell. You can skip it, and replay it any time from the title screen or the menu. After that, short hints explain new things the first time you meet them.

**Story so far**, on the title screen and in the menu, has three tabs. **Story** holds the chapters: the opening, one that opens the first time you fall, one for the Shallows' pin, two for Dark Water's, one for going down into the Belfry, three for bringing the Heart home, one for the first time Wren beats the Dark Watch, and two for Mateo’s arrival and first clear. Several chapters also have a **story scene** in pictures, like the opening: two pictures when you break the Harbour Hermit, three when you break the Tolling Buoy (the flooded stair and the diving dress), one when you carry the dress home and mend it, three the first time you go down into the Belfry (the last dry step, and why the Belfry is full of bells), four when the Heart comes home, and two the first time you beat the Dark Watch. Each plays once, and the chapter's **See it again** button plays it again. **Back** (or the left arrow key) goes to the picture before. Every bell on the coast was cast to answer the Bellwether: the Hermit's scene, the Belfry's and The world's "Why so many bells" say so. **The world** explains the places, people and magic. **Keeper's notes** are 41 short notes, and each opens the first time you meet its subject: Hester (the first time you come home), Bosun (the first time you fall), a shop, a Cove, a Wreck, a toll bell, each Fog event, the Drowned Deckhand, the Hollow Siren, the Harbour Hermit, the Bellwether, the Glimmer Leech, the Lamp Hermit, the Garden Strider, the Tolling Buoy, the Thing in the Bell, each of the Belfry's creatures and Dreads, the Drowned Cantor, the Dark Watch, your first keepsake, the first time you carry more Roil than your Hold, and the first time you come home. The tutorial and debug-cheated runs open nothing. A level you have not reached is not named: the stair, the map, How to Play, the Logbook and The world show "?" for it. Dark Water is named once you break the Harbour Hermit, and the Belfry once you break the Tolling Buoy.

## Running it

It's plain HTML, CSS and JavaScript, with no build step and no dependencies.

- **Static server (recommended):** from this folder run `npm start` (or `python3 -m http.server 8000`), then open <http://localhost:8000>.
- **No server:** open `index.html` directly in a browser.

**Debug mode (for testing):** add `?debug` to the address. A DEBUG tab appears at the left edge, and the `` ` `` key opens the same panel. It can add Salvage and kit, unlock achievements, open the currents, reset progress, give Pearls, cards, keepsakes and tonics, turn on god mode, set the Swell, win or lose a fight, and visit any kind of stop. It can also fill the Lazaret. Two switches at the top of the panel are kept in the browser from run to run. **Skip fights** wins every fight the moment it starts, so you can walk through a whole depth in a minute or two; it waits while a hint or the panel is open. **Cheats count as real runs** is on by default, so a debug run unlocks depths, story and the Lazaret like a real one. Your saved choice is kept. With it off, cheats mark the run: it keeps no best score, opens no currents or story, puts nothing in the Lazaret and carries no Diving Dress home (the pin screen says so). Add `?debug=0` to turn the mode off, or use the panel.

Progress is saved automatically in your browser, at the start of every turn and between map stops. **Continue** on the title screen resumes the run. To replay a specific map and card sequence, add `?seed=12345` to the URL before starting a new run.

**Back up or reset progress** is in the menu on the title screen. **Download a backup** saves everything to a `.json` file: Salvage and kit, the Lazaret, achievements, the currents, best score, the Logbook, Story so far, a run in progress and your settings. **Restore from a backup** loads such a file in place of the progress in the browser. It refuses any other file, and it asks before it replaces anything. **Reset progress** asks first, then erases all progress, the hints and the tutorial. Your sound, music and animation settings stay.

## Controls

| | Play a card | Other |
|---|---|---|
| **Mouse** | Click a card to raise it, then click an enemy (or click the card again for cards without a target). You can also drag a card onto an enemy, or up into the sea. | Hover anything (statuses, intents, keepsakes, the Swell gauge) for a tooltip. Click the draw or discard pile to see it. Between fights, click a keepsake to drop it. |
| **Touch** | Tap a card to raise it and read it, then tap an enemy, or tap the card again. Dragging works too. | Tap an enemy or the keeper to see HP, intent and effects. Tap a keepsake to read it, or between fights to drop it. |
| **Keyboard** | `1`-`9`, `0` pick a card; `←` `→` choose the target; `Enter` / `Space` / `↑` play it; `Esc` / `↓` cancel. | `E` end turn, `B` Bail, `S` Stir, `D` view deck, `Z` `X` `C` (`V` with the Spare Flask) use tonic slots 1-4. On the map: arrow keys and `Enter` (or `1`-`9`). On reward screens: `1`-`3` pick a card. `Tab` reaches every button. |

The title screen has three levels of button: Continue and New Descent first, the Workshop and the Lazaret second, and Story so far, the Logbook, the Tutorial, How to Play and the **Jukebox** third.

The **Jukebox** lists only music you can play, marked Gemini or Music box. **All**, **Songs** and **Music box** filter the list without changing playback. Undiscovered titles stay hidden. When the selected filter has more music to discover, one **Next unlock** hint below the list explains how to find the next piece. It states the exact encounter or milestone required and disappears when that filter's collection is complete. Tracks unlock from game progress, even with music muted, volume at zero or no audio support. No listening time is required. Starting a descent unlocks the map piece; entering fights, encountering Dreads and pins, reaching a pin's second phase, returning home and falling unlock their pieces. Creature songs unlock on their encounter, with alternate tracks on repeat encounters. Existing story and Logbook progress recovers earlier muted encounters; tutorials and uncounted debug runs grant nothing. Eight open from the start: The Great Light Turning Slow, The Hermit's Heavy Toll, Tide Swings Its Tongue, It Went Dark on My Watch, The Keeper's Song, No Haggling, No Biting, Pop the Shell and High Tide Departure (which plays only here). Harbour Bells at Dawn waits for the Heart to come home, even if you heard it before version 0.40.0. Bringing the Heart home also opens the Bellwether's song if you missed it while music was off, since that encounter is replaced afterward.

The player names what plays and has previous, play or pause, next, **shuffle** and the music's volume (the same setting as the menu's Music slider). A song has a position slider, 10-second steps and a **Lyrics** button for its lyrics; the two wordless songs have no Lyrics button. Back from Lyrics keeps your filter and returns focus to that button. A Music box piece instead has **As heard in**, a choice of depths you have reached, and **Open score in Musicbox ↗**, which opens just that piece at the selected depth in Musicbox, without other pieces or deeper layers. The player stays at the top while the list scrolls, except in short landscape windows where it scrolls too so you can reach the list. Previous and next go through all open tracks in their original order, regardless of the browsing filter; previous more than 3 seconds into a song starts it again. With shuffle on, next and the end of a song go through the open songs in a shuffled order, each once before any comes round again; shuffle stays on until you turn it off. What you choose keeps playing until you set out.

The **Logbook** is a short record: expeditions finished, how many came home and how many fell, whether the Lantern Heart is home and how often the Belfry has been quieted since, the deepest landing reached, pins broken, best score, Salvage, kit owned, keepsakes in the Lazaret, achievements, and Story so far entries open. Descents and the deepest landing are counted from version 0.13.0; abandoned runs, the tutorial and debug-cheated runs are not counted.

The menu (top right) has the tutorial, How to Play, Story so far, sound effects and music (each with a switch and a volume slider) and fast animations. During a run it also has save and quit, and abandon run. On the title screen it has Back up or reset progress. At its foot, and at the foot of the title screen, are What's new and **Credits**: who and what made the game, where the music comes from, the source code, and a link to more games and tools at [a403.space](https://a403.space/).

## Rules

**Fights.** Each turn you get 3 **Light** and draw 5 cards. Each card costs the Light shown in its corner. Cards you don't play are discarded at the end of the turn, and your discard pile is reshuffled into the draw pile when that runs out. Enemies show their **intent** above their heads (the number is the damage they're about to deal). Your keeper shows how much of that will get past your Ward. The screen edges glow red when the incoming hit would be lethal.

**Ward** blocks damage and washes away at the start of your next turn. Enemies can have Ward too; theirs lasts until they act again. Ward blocks only damage: a move that also Soaks or Chills you does that even when your Ward takes the whole hit.

**The Swell** is the game's central mechanic. Wren works the water around the enemies with her bell. The Swell is a gauge from 0 to 6 that starts every fight at 3.
- **Surge** raises it and **Ebb** lowers it.
- At 6 the wave **Crests**: it deals 6 damage to every enemy, then the Swell resets to 3. Ward blocks a Crest as it blocks any hit, so a Strand first, then a Crest, hits hardest.
- At 0 you **Strand** the enemies: the water pulls back and they lose all their Ward. Your first Strand each turn also gives you 1 Light. Then the Swell resets to 3.
- **Extra Surge or Ebb carries over.** It keeps flowing from 3, so Surge 6 from Swell 3 Crests twice.
- **Chains:**
  - Every extra Crest in the same turn hits 3 harder (6, 9, 12, 15...).
  - Only the first Strand of a turn gives Light. A second or third Strand still strips every Ward, rings your bell and counts for High and Dry, but gives no Light (the Glimmer Bulb changes that).
  - Saving up Surges for one big turn is the core skill.
- **Bail and Stir:** once a turn, without a card, you can spend 1 Light to **Bail** (Ebb 1) or **Stir** (Surge 1). The two buttons are at the ends of the Swell bar. A Bail that makes your first Strand of the turn is free: that Strand's 1 Light pays it back, so you can make it even with no Light left. A later Strand gives no Light, and a Stir that makes a Crest never pays back. You can Bail or Stir in a turn, not both. With the Bailer in your Ditty Bag you can Bail or Stir twice a turn, in any mix. The tutorial teaches Bail on its third turn.
- Your bell pays out when you Crest or Strand. You start with the Brass Tide-Bell, which draws a card on every one. Other bells from the Workshop pay differently.
- Some cards scale with the Swell (Undercurrent, Tsunami, Lighthouse Beam) or with chains (Toppled Tower costs 1 less per Crest this turn).

**Feedback while you play.**
- Cards in your hand show a live badge for what they would do right now: **CREST×2**, **LETHAL**, **VICTORY**, **STRAND** or **ECHO**. The game works this out by simulating the play. The number on **CREST** is how many Crests that card makes.
- Selecting a card previews its effect on the Swell gauge, along with a glossary of its keywords.
- End Turn lights up when you have nothing left to play.

**Other keywords.**
- **Sink:** the card is gone for the rest of the fight once played.
- **Float:** the card stays in your hand at the end of the turn.
- **Rite:** stays in effect for the rest of the fight. A Rite in your hand is labelled RITE.
- **Echo:** your next card is played twice.
- **Might:** +damage per hit.
- **Spines:** damage back to whatever hits it: attacks, and also your Crests, Strands and Rites.
- **Soaked:** takes 50% more damage from attacks and Crests. On the keeper, it lasts through the enemy turn that follows.
- **Chilled:** deals 25% less attack damage.
- **Brine:** loses HP each turn, decreasing by 1.

**What lives in Dark Water.** Dark Water's creatures bring rules of their own. Each one's intent says what it is about to do.
- **Glimmer Leech:** its Latch heals it by the HP it takes from you. Ward stops both. Leeches **swarm**: a Latch hits 2 harder for each other Glimmer Leech in the fight, so the order you kill them in matters.
- **Pistol Shrimp:** Cock the Claw hits for 4 and braces it behind 6 Ward; Flash Snap follows for 14.
- **Murk Ray:** when it Sinks it is **Submerged** until it next acts. You can't target it, your attacks (on one enemy, on ALL or on a random one) can't reach it, and tonics can't be aimed at it. Crests and other waves still hit it, and a Strand brings it up. If nothing else is in reach, cards that need a target can't be played. When it comes up it Rises for 18.
- **Lamp Hermit:** its **Shell** keeps its Ward from turn to turn, and Withdraw adds 10 each time. A Strand still strips it.
- **Glimmer Chain** (a Dread): It opens with Drink the Light, which **Douses** your lantern: you start each turn with 1 less Light until you Crest or Strand (Doused takes 2 at most). On a turn Doused takes your Light, or Breathless takes a card from your draw, a dashed mark stays on Wren until the turn ends; hover or tap it to read what it took.
- **Pale Gulper** (a Dread): Gulp swallows the last card you played that turn, as long as it went to your discard pile (a Rite stays in play). You get the card back in your discard pile when the Gulper dies. It shows **Full Belly** until then: the moment a blow brings it to half its health, it Retches, out of turn: two Glimmer Leeches come up, and so does every card it swallowed. The Leeches act that turn.
- **Garden Strider** (a Dread): Tend the Garden calls Glimmer Leeches until two are alive, and gives it 8 Ward. Its Graze heals it by the HP it takes from you, like a Leech's Latch.
- **The Tolling Buoy** (the boss): its Rocking Toll hits for 12, plus 4 for each step your Swell is away from 3 when your turn ends, and every Toll hits 2 harder than the one before. Haul the Chain gives it 12 Ward and douses your lantern. At two thirds of its health it Slips the Chain (15 Ward and 1 Might). From then on it rings a **Wild Peal** in place of Haul the Chain: 40 damage, 8 less for each step your Swell is away from 3 when it rings, and 15 less for each Crest or Strand you make that turn. A Bail or a Stir always softens it a little; make three Crests or Strands and it doesn't hit at all. Both attacks have a bell and a wave on their intent. The Swell bar marks the steps where they hit softest (3 for the Toll, 0 and 6 for the Peal), and a note above the bar gives the numbers.
- **The Glimmer Garden** (a Fog event): if you pick the beads, a Glimmer Leech follows you into your next fight.

**What lives in the Belfry.** The Belfry is under the sea: you need the Diving Dress to go down (see Expeditions and score). It is a dive: the Drowned Ringer with a Bell Jelly, then the Crowned Oarfish with a Bellspawn, then the Bellwether. Once the Heart is home its Dreads change (see the last item). Its creatures:
- **Bell Jelly:** its Chime gives another creature **Echo**: that creature's next move happens twice (its attacks, Ward and what it does to you; a call or a summons only once). The intent shows a move that will echo.
- **Bellspawn**, and the Thing's **Grasping Arms:** a squeeze makes you **Breathless**: you draw 1 fewer card at the start of your next turn, never fewer than 1.
- **Listener:** it hears every card. Its Pounce hits 5, and 2 harder for each card you play that turn; the intent counts up as you play. Its other move, Hush, gives it 8 Ward.
- **Hollow Diver:** Cold Lamp hits 6 and Douses your lantern, Leaden Step hits 11, and Seal Up gives it 9 Ward.
- **Glimmer Bladder:** **Burst 8**. When it dies it bursts: 8 damage to you (Ward stops it) and 8 to every other creature.
- **Drowned Ringer** (a Dread, with a Bell Jelly): Ring Out gives it 8 Ward and gives every creature Echo.
- **Crowned Oarfish** (a Dread): Spines 2. Coil hits 6 and makes you Breathless, Ribbon Lash hits 3 four times, and Ram hits 13.
- **Bell Yearling** (a Dread): a young Thing, and it fights as the Thing does. Squeeze hits 9 and makes you Breathless. Then The Eye Opens (Soaked 2 on itself, and 8 Ward), then it Glares for 20, and then it Lashes 5 twice.
- **The Drowned Bellwether** (the boss, 160 HP): at two thirds of its health it calls a shoal of Bell Minnows. When its HP runs out it does not die: its bronze breaks, the shoal scatters, and **the Thing in the Bell** comes out (110 HP) with two Grasping Arms (a Lash hits 8). The Lantern Heart's light heals you 30% of your Max HP and gives you **Heartfire 1**: 1 more Light at the start of each turn for the rest of the fight. The Thing drinks from your lantern (9 damage, and Doused 1 for each living arm), opens its eye (Soaked 2 on itself, and 8 Ward), Glares for 30, and Reaches (its arms grow back, up to 2, and 12 Ward). Kill the Thing to win; its arms go with it. If the bronze breaks in the enemies' turn, the rest of that move is lost and the Thing acts from the next turn. The last landing's fight opens with the pin's name and a deep toll, the bronze cracks before it breaks, and the last blow slows down while the pin goes to light; none of it adds a turn.
- **After the Heart.** Once the Heart is home, the deep grows toward your own lantern. The dive's two Dreads are two different ones of: the Drowned Ringer with a Bell Jelly, the Crowned Oarfish with a Bellspawn, the Bell Yearling with a Listener, **the Drowned Cantor** alone, and the Crowned Oarfish with a Glimmer Bladder. The Cantor (90 to 94 HP): Lead the Peal gives it 12 Ward and gives every creature Echo; its Toll hits 10, and 2 harder each time; and Call the Choir brings a Drowned Ringer, one at a time. When the Cantor falls, the Ringer goes with it.
- **The Dark Watch** waits on the last landing instead of the Bellwether once the Heart is home (180 HP): your own fear, in your coat, with your lantern unlit. Ring Her Bell gives it 14 Ward and sets your Swell back to 3; Her Harpoon hits 9 twice; Pinch the Wick hits 11 and Douses your lantern; Lights Out hits 22, and 4 harder each time. At half its health it calls **Nobody Comes Home**: one Hollow Diver, and 10 Ward. When the Dark Watch falls, the diver goes with it.

**Between fights.** Choose your route on the map:
- **Skirmishes:** normal fights. Their creatures have 15% more HP than the same creatures elsewhere.
- **Dreads:** elites. They're harder. They pay Pearls, and you choose one of three cards or the Dread’s keepsake. At a fork in the Shallows or Dark Water, Bosun names the encounter on one marked Dread route. Use the clue to choose a route or get your tonics ready.
- **Mateo:** once the Heart is home, choose **Follow the knocking**. Beat the marked Split Cask in Dark Water, break the Tolling Buoy, and return safely with the note. Read it on the score screen, then choose **Someone at the door** at the lighthouse. Finish the scene to unlock Mateo in the Pack. A fall before returning loses the note.
- **Keeper abilities:** once Mateo joins, Wren’s First Ring makes her first Bail or Stir of each fight free. Mateo’s Shield Bash (button or `H`) spends 4 Ward and 0 Light to deal 6 base damage to one enemy. It uses one Bail or Stir action and can be used once a turn, including with the Bailer. Both keepers use the same cards and kit. Mateo’s starter Harpoon Jab is called Mallet Strike.
- **Mateo’s final:** the Last Hoop in the Belfry keeps its Ward. Its Give Way adds up to 18 damage from remaining Ward and hits 4 harder each time it is used. A Strand strips that Ward. Beating the Last Hoop opens the Spare Hoop in the Workshop. Either keeper can equip it for 5 Ward on the first Crest or Strand of a fight.
- **Fog:** events with choices, some of them gambles.
- **Barnaby's shop:** buy cards (60 to 72 Pearls for a common, 95 to 112 for an uncommon, 180 to 205 for a rare, and one of the five at half price), keepsakes (150 to 185) and tonics (50 to 65), or pay to remove a card (75, then 25 more each time, up to 100). You set out with no Pearls, so the Shallows have no shop on their first two landings.
- **Sheltered Coves:** rest to heal 30% of your HP, or upgrade a card, or **give a keepsake to the sea**. The keepsake is gone for the rest of the expedition, with its Roil. The sea pays for it: you heal 3 HP for each fight you won while carrying it, never more than a Cove's rest (21 HP at 70 Max HP), and you upgrade a card. A keepsake taken and thrown straight back pays only the upgrade. One you brought from the Lazaret is gone from there too.
- **Wrecks:** a chest of pearls where you may take 1 of 2 keepsakes.
- **Toll bells:** a lost bell hung across the way, on every route right after the Wreck. Nobody passes for free: pay 5 HP (not if that would take your last), 20 Pearls, or take a **Barnacle Growth** into your deck (unplayable; it stays until you remove it). In Dark Water it asks 7 HP or 30 Pearls. The Belfry has none.

**Keepsakes, Roil and a Roiled aether.** A keepsake lasts the whole run, and it stirs the aether around you. How much is its **Roil** (shown on each keepsake). Every keepsake you carry counts.
- The aether around you holds a set amount of Roil, your **Hold**: 20, at every depth and on every expedition. The Workshop can raise it for good (see below). Up to your Hold the aether is **Calm**.
- Past your Hold the aether is **Roiled**. Every 12 Roil over (or part of 12) is one step, and each step adds one thing to every fight. The steps go round a ladder of three:
  - **Step 1: a Seep.** Seep is an unplayable card shuffled into your draw pile at the start of the fight, and it's gone after the fight. It never joins your deck.
  - **Step 2: Thrash 1.** After the enemies act, Thrash deals 1 damage. Ward left over from your turn can block it.
  - **Step 3: a Bell Minnow.** A wounded minnow follows you into the fight with half its full HP, rounded up.
  - **Step 4** is a second Seep, **step 5** is Thrash 2, **step 6** is a second Bell Minnow, and so on. There are never more than 2 Bell Minnows.
- **A Roiled aether pays.** Every fight that pays Pearls pays 4 more for each step the aether was over your Hold when the fight began. The reward screen shows it as "Roiled". It does not count as a bonus in the score.
- The Roil number in the top bar, every keepsake pick and the screen before a descent say what your Roil does at that moment.
- A keepsake pick shows what taking it would do to your Roil. You can take one, or leave them.
- Between fights you can drop a keepsake for good (one you brought from the Lazaret is gone from there too). Scallop Charm takes its 10 Max HP with it.
- **Deeper finds are stronger.** 14 keepsakes can be found anywhere. Three more are found only in Dark Water and deeper (the Hollow Whelk, the Glimmer Bulb and the Leech Jar), and three only in the Belfry (the Bell Clapper, the Powder Horn and the Heart Cinder). They do more, and they carry more Roil (21 to 42). In Dark Water and the Belfry the first keepsake of every Wreck, Dread's pick and shop is one of that level's own, while any are left that you aren't carrying. The Shallows never offer them.
  - **Hollow Whelk:** your Ward no longer washes away at the start of your turn, so it builds up from turn to turn.
  - **Glimmer Bulb:** every Strand gives 1 Light, not only the first of each turn.
  - **Leech Jar:** whenever a creature dies, your Max HP rises by 2 and you heal 4 HP. The Max HP lasts the expedition; dropping the jar takes it back.
  - **Bell Clapper:** the first Crest or Strand of each turn makes the next card you play happen twice (not the card that made it).
  - **Powder Horn:** whenever a creature dies, it bursts for 12 damage on every other creature. It never hurts you, and one burst can kill and set off the next.
  - **Heart Cinder:** 1 more Light on the 1st, 3rd, 5th and every other turn of each fight.

After each Skirmish you get Pearls, maybe a tonic, and a choice of 3 cards. Reward cards are sometimes already upgraded (7.5% of them, and 1% more each landing), and rares shimmer. You can skip the cards; a lean deck draws its best cards more often.

The first Skirmish in the Shallows offers a common **Surge** card, a common **Ebb** card and a **wildcard** from the usual reward pool. You can take one or skip.

When you refit a card by choice, you see two versions side by side. Each copy can be refitted once. For example, **Rising Swell+** deals 8 damage and Surges 2. **High Swell** deals 5 damage and Surges 3, enough to Crest from the starting Swell. Random upgrades and cards found already upgraded use the standard + version.

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

**Expeditions and score.** Every expedition starts on the shore, in the Shallows. The top bar counts the landings you have reached in the level you are in.
- **Hester’s jobs.** Recover the keeper’s log at a marked Fog in the Shallows for **8 Salvage**, the buoy’s nameplate at a marked Fog in Dark Water for **12**, and the lamplighter’s tag under a lesser bell in the Belfry for **16**. Recovery uses the stop’s choice. Clear the depth where you found the item, then bring it home to earn the payment once. You can carry several finds deeper and return them together. A fall loses them and Hester offers those jobs again.
- Each level has 8 landings: 7 rows of stops, then its pin. Every route passes a Wreck on the 4th landing and a toll bell on the 5th. The 7th is Coves, and on most maps one of them is Barnaby's shop instead, where every route still has a Cove to choose.
- The Shallows, Dark Water and the Belfry each have their own creatures, Dreads, pin and Fog events. The Shallows' pin is the Harbour Hermit, Dark Water's is the Tolling Buoy, and the Belfry's is the Drowned Bellwether.
- **The Belfry is under the sea.** To go down into it you must wear the **Diving Dress** in your Rig place, over your oilskin. The first time you break Dark Water's pin without one, it hangs above the stair: go home, and it is yours in the Workshop. It can't be bought, it does nothing in a fight, and it takes the place of the Cork Vest or the Shell Gorget. Once the Heart has come home, the Workshop sells the **Plated Dress**, which opens the Belfry too and gives 3 Ward at the start of each fight.
- After a pin that is not the last, choose: **go home**, which ends the expedition and keeps everything you carry, or **go deeper** with your deck, keepsakes and HP. The stair down is the last shelter before the next level, and it gives more than a Cove. Choose **two** of six, each once: **rest** (heal 30% of your Max HP, as at a Cove; the Spare Wick adds 10), **refit your gear** (upgrade a card), **shed a card** (remove it from your deck, free), **fill your flasks** (a random tonic in up to two empty tonic slots, no two alike), **the keepers' cache** (opening it uses the pick, and then you take 1 of 3 uncommon or rare cards, or none; a reload shows the same three) or **give one to the sea** (as at a Cove: a keepsake for HP by the fights you carried it, and an upgrade). What you don't use is gone when you go down.
- **The Belfry is a dive**: no branches, no shops, no Coves, no Fog on the map. Dread, a lesser bell, Dread, a lesser bell, then the pin: 5 landings. Under a **lesser bell** there is air: choose **one** of six: rest, refit your gear, shed a card, fill your flasks or give one to the sea (each as on the stair down), or **swim out into the dark**, which is one of the Belfry's three Fog events.
- Breaking the Belfry's pin brings the Lantern Heart home. After that, the lighthouse on the title screen is lit, and the Belfry's last landing holds your own fear, **the Dark Watch**. Beating it quiets the Belfry. The first time, a story scene plays and the Workshop can make the **Watch Glass** (Pocket place, 40 Salvage): 1 more Light on the first turn of each fight.
- **One last breath.** On a fall at the final Belfry boss, you can restart that fight once at 85% of your remaining maximum HP, rounded up. You forfeit all carried keepsakes and tonics, the expedition score and its Salvage. A win still advances the story and lets you return any quest finds. If you accept the fall, you keep the fall score and can save one keepsake if the Lazaret is open.
- The score counts each landing reached: 40 in the Shallows, 60 in Dark Water and 128 in the Belfry (its 5 landings pay 640, as 8 at 80 did before it became a dive). Coming home adds 5 for each HP you have left, and bringing the Heart home, or quieting the Belfry after it, adds 600. Your best score is kept.
- **Currents** open once the Heart has come home. Choose any of them on shore before an expedition. Each makes the whole expedition harder and adds ×0.25 to the score's multiplier, and they combine (all four: ×2). **Fat Year**: every creature has 10% more HP. **Hungry Deep**: every creature hits 15% harder. **Cold Coves**: Coves and the stair's rest heal 20% of your Max HP, not 30%. **Backwash**: at the start of each of your turns after the first, the Swell slips 1 back toward 3.

**Wren’s outfits.** Choose one in **Pack for the expedition**. The ochre oilskin and **Harbour Blue** are available on the first descent. Bring Hester the Shallows log to unlock **Lamplighter’s Green**. Break the Harbour Hermit’s bell as Wren and return safely to unlock the **Shell Bikini**. Bring home the Lantern Heart to unlock **Gala**, and beat the Dark Watch as Wren to unlock **Long Johns**. Recorded past completions count. Pack remembers your choice. Outfits change Wren’s look on shore and above water. Your kit still works, and the Belfry shows the Diving Dress or Plated Dress.

**The Workshop (lasts across runs).** Every finished expedition turns its score into **Salvage**: 1 for every 50 points. Abandoning one earns nothing.
- Spend Salvage in the Workshop on the title screen. **Kit** you buy is yours for good. Kit is the mundane gear Wren wears and carries; keepsakes are the magic.
- Kit goes in five places, one piece each, and you choose before each descent. The game remembers your choice.
  - **Harpoon:** the Honed Harpoon (your first Harpoon Jab in each fight deals 2 more damage), the Barbed Harpoon (it applies 1 Brine) or the Toggle Iron (it applies 2 Soaked).
  - **Bell:** always one. The Brass Tide-Bell draws 1 card on every Crest and Strand. The Flood Bell draws 1 card and gives 1 Light on a Crest, and nothing on a Strand. The Ebb Bell draws 1 card and gives 3 Ward on a Strand, and nothing on a Crest. The Cracked Bell gives nothing on the first Crest or Strand of a turn, then draws 2 cards and gives 1 Light on every one after. The Harbour Bell gives 3 Ward on every Crest and Strand, and draws nothing.
  - **Rig** (what you wear over your oilskin): Cork Vest (+5 Max HP) or Shell Gorget (4 Ward at the start of each fight), or the Diving Dress, found in Dark Water (nothing in a fight, but it opens the Belfry), or the Plated Dress (it opens the Belfry, and 3 Ward at the start of each fight).
  - **Pocket:** Coin Purse (+30 Pearls at the start), Gleaner's Pouch (+6 Pearls after each fight), Barnaby's Marker (your first card removal at Barnaby's is free) or the Watch Glass (1 more Light on the first turn of each fight).
  - **Ditty Bag:** Spare Flask (a fourth tonic slot, and two tonics at the start), Pearl Scales (Barnaby's prices are 25% lower), Gleaning Net (+3 Pearls whenever you Crest), Spare Wick (rests heal 10 more HP), Bailer (Bail or Stir twice a turn) or Safety Line (the first time you would fall on an expedition, you are left with 5 HP instead and the fight goes on; once an expedition).
- Some kit is locked until an **achievement**, such as Crest three times in one turn, defeat an enemy with Brine, or break a pin: the Harbour Hermit's opens the Harbour Bell, the Tolling Buoy's the Toggle Iron, bringing the Heart home the Plated Dress, and The Long Watch (beat the Dark Watch) the Watch Glass. Both Ends (Crest and Strand in one turn) opens the Bailer, and Close Call (win a fight with 5 HP or less) the Safety Line. If you broke those pins before these achievements existed, they are yours already. Achievements are checked after every fight you win and when a run ends, so they count even if you lose the run later. The tutorial doesn't count.
- **The lantern.** Below the kit, the Workshop sells a steadier lantern in three steps: each raises your Hold by 5 on every expedition, for good, for 25, 50 and 90 Salvage (20, 25, 30, 35).
- Kit never changes the map: the same seed gives the same map with any kit.

**The Lazaret (lasts across runs).** The Lazaret is the locked store room at the lighthouse, where keepsakes are kept between runs. It opens the first time you come home, and it is on the title screen from then on.
- When you come home, after any pin, every keepsake you carry is kept in the Lazaret. The expedition that opens it counts.
- The Lazaret keeps as many of each keepsake as you bring home. A spare copy (a second or later of the same kind) can be broken down for Salvage there: half its Roil, rounded up (a second Whale Tooth, Roil 19, gives 10). The last one of a kind can't be.
- Before each descent you choose which kept kinds to bring, one of each. You may bring any number of kinds. You carry them from the first landing, and each counts toward your Hold as usual, so bringing too many leaves the aether Roiled in every fight. The game remembers your choice.
- A keepsake you bring **leaves the Lazaret** as you set out. If you come home with it, it goes back. If you fall, drop it, give it to the sea or give up the descent (Abandon, or New Descent over a saved one), it is gone. Copies you left at home are never lost.
- When you fall, you may **hold on to one** of the keepsakes you carried, brought or found: choose it on the end screen, and it goes into the Lazaret. One you brought is chosen to bring again.
- A run can still offer you a keepsake that is in the Lazaret, as long as you aren't carrying it.
- Keepsakes you bring never change the map. The tutorial and abandoned runs keep nothing, and the tutorial takes nothing out.

## Content

- **Hero:** Wren, the keeper. 70 HP, 3 Light, no Pearls (she gathers them on the way down), and a 10-card starting deck: 4 Harpoon Jab, 4 Brace, Rising Swell, Slack Water.
- **38 collectible cards:**
  - 14 common, 16 uncommon, 8 rare.
  - Every refittable card has two upgrade choices.
  - There are also 4 status cards: 3 that enemies add to your deck, and Seep. And 1 curse (Barnacle Growth: unplayable, and it stays in your deck until you remove it).
  - The cards support several builds:
    - Crest chaining (Storm Surge, Siren's Echo, Toppled Tower, Maelstrom, Spindrift).
    - Strand tempo: Ebb to strip enemy Ward and win back Light (Riptide Cut, Bilge Pump, Depth Charge, Abyssal Pull). Only the first Strand of a turn gives Light, and more copies of Abyssal Pull don't add to it.
    - Ward (Sea Wall, Deep Guard, Breakwater).
    - Brine (Brine Bloom, Brine Spear, Salt Ward).
    - Might multi-hits.
- **34 enemies:**
  - The Shallows: 8 normal (Kelp Lurker, Brine Crab, Lantern Eel, Drowned Deckhand, Gloom Jelly, Barnacle Mite, Fog Wisp, Salt Gull) and 3 elite encounters. The Kelp Lurker's Lash hits 2 harder each time, and the Barnacle Mite's Burrow gives it 5 Ward and 1 Might. The elites:
    - Reefback Hulk, which has Spines.
    - Hollow Siren, whose lullaby flattens your Swell back to 3.
    - Angler Twins, where the survivor enrages when its twin dies.
  - The Shallows' boss, the Harbour Hermit (150 HP), a hermit crab wearing Saltmere's old harbour bell. **In its Bell**, its Ward does not wash away from turn to turn. A Crest's wave hits its Ward first, then rings the bell and shakes off whatever Ward is left; a Strand shakes off all of it. It stays in its bell. Pull In gives it 20 Ward, Pinch hits 6 twice, and Bell Crush hits 15, 3 harder each time. At half its health it rings the harbour bell: two Barnacle Mites drop off it (a Mite's Nibble hits for 4), and it gains 1 Might.
  - The Bell Minnow, the Bellwether's, follows a Roiled aether.
  - Dark Water: 4 new normal creatures (Glimmer Leech, Pistol Shrimp, Murk Ray, Lamp Hermit), with the Lantern Eel, Gloom Jelly, Drowned Deckhand and Fog Wisp; 3 elite encounters (Glimmer Chain, Pale Gulper and the Garden Strider, which calls Glimmer Leeches); and its boss, the Tolling Buoy.
  - The Belfry, a dive: 2 Dreads before the Heart (Drowned Ringer with a Bell Jelly, Crowned Oarfish with a Bellspawn) and 5 after it (also the Bell Yearling with a Listener, the Drowned Cantor, and the Oarfish with a Glimmer Bladder); nothing from the levels above comes down; its boss, the Drowned Bellwether, and its second form, the Thing in the Bell with its Grasping Arms; and, after the Heart, the Dark Watch, which calls a Hollow Diver.
- **20 keepsakes** (14 anywhere, 3 from Dark Water down, 3 only in the Belfry), **7 tonics, 13 events** (7 in the Shallows; in Dark Water, 3 of its own and 3 from the Shallows; in the Belfry, its 3 own, from a lesser bell).
- **21 pieces of kit (plus the Brass Tide-Bell) and 13 achievements** in the Workshop. One of them, the Diving Dress, is found, not bought.
- **Endings:** win and lose screens with the score line by line (and how it turns into Salvage), run stats, best score, unlocks in purple boxes, and a button to pack for a new run. When you earn an outfit or another feature opens, **New at the lighthouse** says what it is and where to find it. The notice stays until you close it and is shown once for each unlock.

Sound effects and most of the music are synthesized at runtime with the Web Audio API. The only audio files are ten songs generated with Google Gemini.

- The music is the score in `music/brinelight.scrim`, played by [musicbox](https://github.com/andre-larsson/musicbox) (Apache 2.0, bundled in `js/vendor/musicbox/`). Each kind of screen has its own cue: the opening, the map and rewards, Sheltered Coves and stairs, the Fog (events, wrecks and toll bells), fights in the Shallows, fights in Dark Water, Dreads, a pin and its second phase, the Tolling Buoy's own, the Dark Watch's first phase, coming home early with your haul, dawn over Saltmere and a fall. The music darkens with depth: Dark Water adds a far bell and a low drone, and the Belfry a choir.
- Songs generated with Google Gemini (`music/songs/`) play in place of the score in Barnaby's shop (his two songs take turns, one each visit) and against the Harbour Hermit and the Drowned Bellwether (both its phases), and the Harbour Hermit has two: The Hermit's Heavy Toll at your first meeting, Ring for the Deep at your second, and one of the two at random after that, each for the whole fight; when one ends, it fades out slowly over its last 8 seconds and starts again from the top, fading in over 4 (the title screen goes on to its next song instead). The title screen plays its songs that are open in the Jukebox in turn, round and round: The Great Light Turning Slow, The Hermit's Heavy Toll, Tide Swings Its Tongue and It Went Dark on My Watch, all from the start, and Harbour Bells at Dawn once the Lantern Heart is home: it plays on the screen where you bring it home, and opens then. The pins' songs are compressed a little, so their quiet openings are not lost under the fight. The Tolling Buoy's music-box piece plays 3 dB louder than the rest of the score, which it was quieter than. Each page load starts on one of them at random (The Great Light Turning Slow until it has been heard once). High Tide Departure plays only in the Jukebox. While a song plays, the title screen shows its name at the top left, and tapping it opens the Jukebox. On the way down, a short note names each song as it starts. Unlocked music is kept with the rest of your progress, whether or not it played.
- The sound effects are in `js/sfx.js`, and `sound/lab.html` plays each one. Sounds echo longer and are more muffled the deeper Wren goes. Each place has its own sounds every few seconds: gulls and a bell buoy in the Shallows, drips in Dark Water, bubbles and the bell's hum in the Belfry. They come less often in a fight and not at all in a pin.

The illustrations were generated for this project with Codex (OpenAI), except the title picture, which was generated with Google Gemini (its lit version is a Codex edit of it). Some keepsake, tonic and newer card images are crops or recolors of those illustrations. The game was built with Claude Code (Anthropic), and the world and its lore were worked out in discussions with Grok (xAI, in the Cursor agent CLI) and with Terra and Sol (OpenAI, in Codex). The Credits screen says the same in the game.

Working on the game? See [AGENTS.md](AGENTS.md) for commands and [GAME_NOTES.md](GAME_NOTES.md) for design notes.
