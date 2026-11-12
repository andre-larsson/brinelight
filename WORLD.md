# Brinelight world

This file describes the target setting and story for Brinelight. Future game design, cards, events, and screens should follow the agreed details here. Some of them are not in the game yet. Rules and balance are in README.md and GAME_NOTES.md. Card and enemy lists are in js/data.js.

Add a detail here when future game text will need to stay consistent with it. When a screen changes, update the relevant detail in the same commit. Each detail has a status:

- **In the game:** Already stated or shown in the current game, or in the README where noted. These details document the starting point and can differ from the target.
- **Agreed:** A decision for the target world. Where it differs from the current game, the game needs to change to match it.
- **Open:** An unanswered question. When it is answered, record the decision and remove the question from the open list.

On 2026-11-12 the user handed the world-building and lore to the agent. Decisions from that day are marked Agreed like the others, and the user can overrule any of them.

The code and saved games keep some older names: `tide` for the Swell, `low` and `lowWater` for a Strand, `charge` for Roil, and `floor` for the landing.

## The idea

The keeper's craft has two halves: the light and the bell. Wren plays with both. Light is what she spends on cards, and her bell moves the water. The story is what happens when the great bell takes the great light.

## The situation

Wren is the last lighthouse keeper of Saltmere. The lighthouse went dark on her watch. Far below, the Drowned Bellwether rang with no hand on its rope, and the Lantern Heart went down to it. Wren goes down the coast to bring it back.

The current game tells this story in a shorter shape. Every depth ends with the Drowned Bellwether, and defeating it restores the lighthouse by dawn. The agreed story puts the Bellwether and the Heart at the end of a longer expedition.

- **In the game:** The title screen says an enchanted bell, sunk under the cliffs, has stolen the fire from your lighthouse and is pulling the sea up toward the town. You are the last keeper, and you go down to take the fire back.
- **In the game:** An opening in four pictures plays before the first descent. It says who Wren is, what the Lantern Heart and the Bellwether are, that the bell rang by itself tonight and pulled the Heart down, and what Wren carries. Its text is in `BL.STORY.opening` in js/data.js.
- **In the game:** The README says the keepers' great bell rang with no hand on its rope, and that Wren goes down through the Drowned Reach to take the Lantern Heart back from the Drowned Bellwether.
- **In the game:** On a win, the Bellwether cracks and falls silent, and the sea it held lets go. The Heart is still burning in its bronze wreckage. Wren carries the Heart up the dripping stairs, and Saltmere's great light turns again by dawn. The screen is titled "The Lantern Heart rises" and its button says "Go down again".
- **In the game:** On a loss, the cold water closes over Wren's lantern and she goes under. The sea carries her back to shore, alive. The lighthouse is still dark, and the water has risen a little higher toward the town. The screen is titled "The tide takes you" and its button says "Try again".
- **Agreed:** Each boss above the final depth holds water in its own area, covering a stair or tunnel. Defeating the boss drains the area and opens the passage down. The Heart remains deeper down, and the lighthouse is restored by dawn only after Wren clears the final drowned depth.
- **Agreed:** Wren does not die when she falls. Her lantern burns down to an ember but stays alight, because it holds the last of the Heart's fire. The held water takes her. Past the bell's reach the ordinary sea still gives back what it takes, and it returns her to the Shallows alive.
- **Open:** What Wren loses when she falls, besides the keepsakes she found on that expedition.

## The light and the bell

- **Agreed:** The Lantern Heart is the fire of Saltmere's great light. Every keeper's lantern is lit from it. The Light that Wren spends on cards is the same fire.
- **Agreed:** A lantern can be lit from another keeper's lantern, and that costs the giver something. Wren's lantern is the last flame lit from the Heart.
- **In the game:** Sharing her light with the Lost Lamplighter costs Wren 6 HP.
- **Agreed:** The Drowned Bellwether is the keepers' own great bell. Every keeper's hand-bell is tuned to it. It leads and they follow, which is what a bellwether is.
- **Agreed:** Keepers sank the Bellwether under the Reach long ago, to hold the sea off the low stairs. They walked down at the lowest spring tides to tend it.
- **Agreed:** A hundred years ago the Lost Lamplighter drowned on the low stair. He was the last keeper to tend the bell. Nobody went down after him.
- **Agreed:** Nobody rang the bell. The tide swings its clapper and the bell holds the tide, so it cannot stop on its own. It has rung a little louder every year since it was last tended.
- **Agreed:** The keepers cast the Bellwether themselves, as a hand-bell big enough to move the sea.
- **Agreed:** The Heart followed the bell down. A keeper's light answers the lead bell, as a hand-bell does.
- **Agreed:** Brinelight is the Heart's light soaked into the held water. It is the glow in the Glimmering Pool, the bottle, the sea chest, and the pearls.
- **In the game:** Saltmere's great light can go out. Bringing the Lantern Heart up can set it turning again by dawn.
- **In the game:** The Lantern Heart still burns, and was held in the Bellwether's bronze.
- **Open:** What the forgotten sea goddess has to do with the bell and the Heart. Her stone hands are held out and empty.

## Why they go down

- **Agreed:** Wren goes because the light went out on her watch, and because hers is the last flame lit from the Heart.
- **Agreed:** Saltmere needs her to go. The ordinary sea gives back what it takes. Held water gives nothing back, so the wrecks, the drowned, and the Heart stay down. Each spring tide the held water stands a stair closer to the town. The game text says it more simply: the bell lifts the sea toward the town, a little higher with every tide. The rules have no countdown for this.
- **Agreed:** Everything Wren opens closes behind her, because the Bellwether restores the water after each expedition. Only silencing the Bellwether ends it. That is why she has to reach the final depth.
- **Agreed:** Carrying a lantern lit from the Heart is what makes a keeper. Wren is the last keeper when the game starts. Later playable characters become keepers when she lights their lanterns from hers. This is how the README's "last lighthouse keeper" and the loss screen's "keepers" fit together.
- **Agreed:** Each later keeper has something of their own under the same bell.
- **Open:** Who the later keepers are. Three ideas: a salvor after the Gilded Gull's cargo, a fisher whose partner is among the Drowned Deckhands, and the Tide-Witch's apprentice, who wants the bell and not the Heart.

## The coast and the tides

Saltmere stands on a headland beside a working sea. The Drowned Reach is a series of coastal rock terraces, or bands. These are above the outside sea level, not holes in the seabed. The Bellwether is holding seawater in the inner chambers.

- **Agreed:** The lighthouse warns ships away from the rocks. It can do that whether or not the Reach is dry. Ordinary low tide uncovers the Shallows: rock, pools, and the sea below the cliff.
- **Agreed:** Below the Shallows, the coast has been wet for a long time. Its old stairs, quay, wrecks, and cold-shore animals existed before the current ringing and its pins. The keepers built the stairs and the quay. The Lost Lamplighter's cold lantern belongs to that older coast.
- **Agreed:** Each shallower band boss is a "pin", a ringer that carries out the Bellwether's work. Each pin has a bell of its own. It holds seawater in its own area, above the level reached by the ordinary tide. The water covers a stair or tunnel leading deeper. Keepers once walked these routes during the lowest spring tides. Those opportunities no longer occur.
- **Agreed:** A held chamber can be called a lock. A pin holds a lock shut, and breaking the pin opens it.
- **Agreed:** Wren reaches the boss by walking and climbing along exposed paths, stairs, and ledges. She fights from stone while water surrounds parts of the area. She carries an open-flame lantern, so she cannot use the submerged passage. Waiting on shore uncovers only the Shallows.
- **Agreed:** When Wren defeats the boss, it stops holding the water. The water drains from its area and exposes the passage down. Ordinary high tide still wets the Shallows but does not reach the inner lip. The drained area remains wet, with pools and shallow water.
- **Agreed:** The water held in a chamber does not move because of an ordinary fight. It drains when the pin goes silent.
- **Agreed:** Wren can always return home safely after defeating a boss. The Bellwether starts drawing water back as she retreats, but her route home remains safe.
- **Agreed:** Returning to the lighthouse ends the expedition. Wren unloads her haul, rests, and prepares before setting out again. By then the Bellwether has restored the water in the opened areas. It calls back a surviving boss or draws a similar creature to replace it. The boss or its replacement holds water in the area again, and other sea creatures return with the water. Wren cannot make a quick visit home and resume the same expedition.
- **Agreed:** The final chamber is the Belfry. It has no lip above the sea. Its floor is below the waterline, and its opening leads to the sea. Water is held around the Heart there. Wren enters in the diving suit, and the chamber does not drain.
- **Open:** Who the pins are. Three ideas: a giant hermit crab wearing a harbour bell, a rusted bell-buoy on its chain, and a drowned ringer.

### The Swell in a fight

The coast has the tide. A fight has the Swell. The two are kept apart so that Wren's local water-working is not confused with the tide that covers the bands.

- **In the game:** The fight words are Swell, Surge, Ebb, Crest, and Strand. The Swell is the gauge. Surge raises it and Ebb lowers it. It Crests at 6 and Strands the enemies at 0.
- **Agreed:** The Swell is the water around the enemies, moved with the Brass Tide-Bell. Wren stands on stone, and enemies are in the wash.
- **Agreed:** Surge builds water onto the enemies. A Crest is a wave breaking on them. After it breaks, the water falls back to slack, represented by the gauge resetting to the middle. Another Surge in the same turn raises a new wave from that slack, and it breaks harder.
- **Agreed:** Ebb pulls water off the enemies. A Strand leaves them stranded and removes their cover. The opening gives Wren 1 Light. The surrounding sea then seeps back to slack.
- **Agreed:** The Hollow Siren flattens the Swell so a wave cannot build. The Bellwether can pull the water in the other direction. If it pulls the water all the way out, whoever is in it is stranded.
- **Agreed:** A Crest at the top of the gauge is a wave Wren has raised. The sea takes her when she falls, not when the gauge Crests.
- **In the game:** Two or more Crests in a turn earn the Tidal Fury bonus. Two or more Strands in a turn earn High and Dry.
- **Agreed:** Some names keep the word "tide": the Brass Tide-Bell, Tide Reading, Spring Tide, Tidal Memory, Tidewatch, Tidal Fury, and Slack Water. Keepers call a hand-bell a tide-bell because it is tuned to the bell that holds the tide.

## The expedition

Every expedition starts on shore in the Shallows and can continue through every band Wren is willing to risk. Wren packs once on shore and carries the same pack throughout. Starting a new expedition at a deeper band is not possible.

- **Agreed:** After defeating a band boss, Wren can always return home safely or continue through the newly opened passage.
- **Agreed:** Returning home ends the expedition. Wren keeps everything collected on that expedition, but depth progress resets. The next expedition begins in the Shallows.
- **Agreed:** Continuing is the only way to reach richer finds and make progress farther down in that expedition. The expedition also ends if Wren completes the game or falls.
- **Agreed:** Keepsakes are kept between expeditions, as the name says. If Wren falls, she loses the keepsakes she found on that expedition. She keeps the ones she brought from home.
- **Agreed:** A keepsake fresh from the Reach still answers the Bellwether, so the bell calls it back when Wren falls. A night in the Lazaret makes a keepsake hers.
- **Open:** How the rest of what Wren brings home is kept or used between expeditions.
- **Agreed:** The pack does not grow and cannot be repacked after breaking a pin. If Wren brings the diving suit, it occupies a worn slot from the first band onward and has no effect in fights. Carrying it therefore makes every band above the last harder. She cannot enter the Belfry without it.
- **Agreed:** Wren finds the suit the first time she clears the Abyss, the last walkable band. She cannot put it on during that expedition, so she has to carry it home. From then on she can pack it on shore. It is an old keeper's diving dress with a sealed lamp. Her open lantern establishes that the bands above the Belfry contain air.
- **In the game:** The stops down the map are landings. The top bar reads "Landing 3/11", and the boss waits on the last landing. "Depth" means only the Shallows, Dark Water, Riptide, and the Abyss.
- **In the game:** Going down is a descent, and Wren sets out. The game says "dive" only for the flooded hold of the Gilded Gull.

## People and creatures

- **In the game:** Wren, the Keeper, is the last lighthouse keeper. She wears an oilskin, a scarf, and boots, and carries a harpoon and an open lantern until the last depth.
- **Agreed:** Wren's control of the water comes from the keeper's craft. Keepers use the Brass Tide-Bell, a hand-bell, to move water in a pool, stair, or cut. The Drowned Bellwether is the same kind of tool, operating across the coast. It is sunk, still ringing, and holding the sea over the Heart.
- **In the game:** The Drowned Bellwether is bronze. It rings, swings its clapper, tolls, and pulls the Swell down. At half health, it cracks and calls a shoal of Bell Minnows. On the current screens it is the boss of every depth.
- **Agreed:** The Bellwether itself waits in the Belfry. Shallower band bosses are pins: ringers that answer the Bellwether. They are separate from the Bellwether and the Heart. Crabs, kelp, eels, gulls, and the drowned are part of the coast's existing life, not pins. A draining chamber strands them.
- **In the game:** Barnaby is a hermit crab. His shell is both his home and his shop, Barnaby's Drifting Emporium, also called Barnaby's Shop. He sells goods for pearls and refuses haggling and biting. He says everything in the shop came down with a wreck and mostly still works.
- **In the game:** The Tide-Witch is a crone who wears a shawl of fishing net and lives in a hut on stilts. She takes years of your life in exchange for a rare lesson, and pearls in exchange for a brew.
- **In the game:** The Lost Lamplighter is drowned and waits on a dripping stair. He holds a keeper's lantern that has not burned in a hundred years. If Wren shares her light, he shows her an old keeper's trick. He says the deep is kind to the light and advises Wren to carry less. A hundred years is the only span of time stated in the game.
- **In the game:** An unnamed sea goddess has been forgotten. At the Sunken Shrine, her stone hands are still held out. She accepts blood or pearls, and the water warms when she accepts an offering.

## Places

Wren walks, wades, and climbs while the slow tide is out. Her coat and open lantern are suitable for every band except the Belfry.

- **In the game:** Saltmere has a lighthouse and its great light above the descent. Saltmere is named in the README and on the win screen.
- **Agreed:** The Workshop is on the shore at Saltmere and is used between expeditions. Salvage, Workshop, and Kit are working names in `BL.META_TEXT` in js/data.js. The Workshop has no scene yet.
- **Agreed:** The Lazaret is the safe room at the lighthouse where keepsakes are stored. A lazaret is a ship's store locker, and also a quarantine house. It keeps the keepsakes' Roil in, so the aether around it stays Calm and nothing takes Seep. That is how Wren can keep many keepsakes close together at home. The form of the store inside the room is open. The Lazaret is not in the game yet.
- **In the game:** The Drowned Reach is the map of a single depth. **Agreed:** It will refer to the whole coast, crossed band by band during one expedition.
- **In the game:** Sheltered Cove is a dry hollow above the tide line. The lantern burns steadily there, and the deep cannot reach Wren for a little while.
- **Agreed:** The Shallows are the foreshore at ordinary low tide. They contain wet stone, pools, and the first stair. There is no sill yet.
- **Agreed:** Dark Water is the first held chamber. Once its pin breaks, it is a dripping cave stair that Wren can wade through, and her lantern matters.
- **Agreed:** Riptide is a cut where the current continues after the chamber drains. The opportunity to pass through it is short.
- **Agreed:** The Abyss is the last terrace Wren can walk, a hall above the Belfry. Clearing it for the first time gives her the suit.
- **Agreed:** The Belfry is the one drowned depth beyond the Abyss, a chamber open to the sea. The Bellwether hangs there over the Heart. The lighthouse has its light at the top of a tower, and the Reach has its bell at the bottom. Wren can enter only in the suit. A Crest there is still a wave she raises onto things in the water. The diving dress keeps it out of her helmet. A Strand there is a drop in pressure, not a dry floor.
- **In the game:** The Wreck of the Gilded Gull is a merchant ship that lies split in a basin the tide has left. Its cabin is sealed, crates lie spilled across the rock, and the hold below is still flooded. Wren can walk on past it. The painting still shows the wreck fully underwater.
- **Agreed:** Wren can stand and search the cabin and cargo of the Gilded Gull. Only the flooded hold requires a dive. Pearls are found still dry, and something long and cold lives in the hold. Forcing the cabin leaves barnacles on Wren.
- **In the game:** A treasure stop contains a different wreck: a half-buried sea chest with greened iron bands and something still glowing inside.
- **In the game:** The Glimmering Pool is a warm cave pool with a gentle turquoise glow. Its light seems to listen, a reflection can reach out of the water, and its pearls bite.
- **In the game:** At Eyes in the Kelp, something in the fronds guards a cache.
- **In the game:** A faintly glowing glass bottle contains a sailor's notes.
- **In the game:** The four depth names currently describe difficulty only: more HP, harder hits, and less rest in the Abyss.

## Words and objects

- **Agreed:** Story text does not assume the player knows the world. A name comes with what the thing is the first time it appears: "a magic fire called the Lantern Heart", "an enchanted bell, the Bellwether". Stakes are stated as events a newcomer can picture.
- **In the game:** The on-screen voice is short and concrete. Its vocabulary includes harpoon, bilge, gaff, brace, slack water, pearls, brine, and barnacles. New story text should use the same voice.
- **In the game:** Pearls are money during a descent. Barnaby accepts them, and Wren can find them in wrecks and after fights.
- **In the game:** Light is the resource spent on cards. The game also uses the word for lanterns and Saltmere's great light. **Agreed:** They are the same fire.
- **In the game:** Swell, Surge, Ebb, Crest, Strand, Ward, Brine, Soaked, Chilled, Sink, Float, Rite, Echo, Dread, Fog, Roil, Hold, and Seep already have meanings in play. Story text must use them consistently with their definitions in the README.
- **Agreed:** Keepsakes are small trinkets with strong magical effects. Gear is worn equipment, separate from keepsakes. The suit is gear and has no magical effect.
- **Agreed:** A keepsake is a lost thing that has sat in brinelight. Closer to the bell, the held water has more of the Heart's light in it, so the keepsakes found there are stronger. The drained terraces contain wet stone and pools. The brinelight is in the remaining water, rather than in a larger volume of seawater. How a lost thing becomes a keepsake is not explained.
- **In the game:** The aether is the unseen stuff that carries magic, the way air carries sound.
- **Agreed:** A keepsake stirs the aether around it. The user's word is "pollutes". The measure of that is Roil. Every keepsake Wren carries counts, worn or not. The aether around her can hold only so much Roil, and it holds more closer to the bell. That limit is her Hold.
- **Agreed:** Up to the Hold the aether is Calm. Past it the aether is Roiled, and the extra condenses as Seep: seawater that clogs her pack. In a fight, Seep is an unplayable card.
- **In the game:** Each keepsake shows its Roil. The top bar shows Roil against Hold, such as "37/30". Its tooltip says whether the aether is Calm or Roiled.
- **Open:** What else a Roiled aether does. The user's ideas are madness, self-harm, hallucinations, and extra monsters that give no loot.

## Story so far

Story so far is a screen on the title and in the menu. Its text is in `BL.STORY` in js/data.js, and everything in it is **In the game**. Later text has to agree with it.

- **Story tab:** Six chapters. Chapter 1 is the opening and is always open. The others open on the first fall and on the first clear of each depth.
  - *The sea gives you back* (first fall): Wren wakes on the shingle below the lighthouse with her lantern at an ember. The bell called back the keepsakes she found.
  - *The Heart comes home* (Shallows): the light turns again by dawn. Before the next tide a bell rings from deeper down, the fire goes back to it, and the caves fill. This is how the current game, where every depth ends with the Bellwether, fits the agreed story.
  - *Why the bell was sunk* (Dark Water): the keepers cast the bell and sank it to hold the water off their low stairs and quay. The Lamplighter was the last to tend it.
  - *Why the fire followed* (Riptide): hand-bells are tuned to the Bellwether and lanterns are lit from the Heart. The Heart answered the lead bell.
  - *Under the last stair* (the Abyss): the Belfry lies under the Abyss and does not drain. An old keeper's diving dress hangs on the wall of the hall above it. The chapter says the story stops there for now.
- **The world tab:** A glossary of places, people and magic. It is always open.
- **Keeper's notes tab:** 15 notes, each opened by first meeting its subject. New facts in them: somebody has left a blanket, a kettle and a coil of rope in each Sheltered Cove. Seep is seawater that beads on Wren's gear. Something with one eye and many arms has grown into the Bellwether. The Drowned Deckhands still work their watch. Nobody knows why some lost things turn into keepsakes and others do not.
- **Agreed:** As depths and the Belfry are built, each gets a chapter. New people, places and enemies get a note.

## Open questions

- What does Wren lose when she falls, besides that expedition's keepsakes?
- Besides keepsakes, how is everything brought home kept or used between expeditions?
- Besides Seep, what does a Roiled aether do?
- What form does the keepsake store inside the Lazaret take?
- Why does the aether hold more Roil closer to the bell?
- How does a lost thing in brinelight become a keepsake?
- What does the forgotten goddess have to do with the bell and the Heart? Leave her name forgotten unless an event needs it.
- Who are the pins?
- Who are the later keepers?
- What did the Gilded Gull carry, and what lives in its hold?
