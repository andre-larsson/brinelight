# Brinelight world

This file describes the target setting and story for Brinelight. Future game design, cards, events, and screens should follow the agreed details here. Some of them are not in the game yet. Rules and balance are in README.md and GAME_NOTES.md. Card and enemy lists are in js/data.js.

Add a detail here when future game text will need to stay consistent with it. When a screen changes, update the relevant detail in the same commit. Each detail has a status:

- **In the game:** Already stated or shown in the current game, or in the README where noted. These details document the starting point and can differ from the target.
- **Agreed:** A decision for the target world. Where it differs from the current game, the game needs to change to match it.
- **Open:** An unanswered question. When it is answered, record the decision and remove the question from the open list.

## The situation

Wren is the last lighthouse keeper of Saltmere. The lighthouse has gone dark, and the Lantern Heart has sunk into the Drowned Reach. Wren goes down the coast to bring it back.

The current game screens tell an older version of this story. In that version, every depth ends with the Drowned Bellwether, and defeating it restores the lighthouse by dawn. The agreed story puts the Bellwether and the Heart at the end of a longer expedition.

- **In the game:** The title screen says that something below the waves rang a bell, and the Lantern Heart sank with the tide. The player takes a harpoon and goes after it.
- **In the game:** The README says that Wren dives into the Drowned Reach to take the Lantern Heart back from the Drowned Bellwether.
- **In the game:** On a win, the Bellwether cracks and falls silent. The Heart is still burning in its bronze wreckage. Wren carries the Heart up, and Saltmere's great light turns again by dawn. The screen is titled "The Lantern Heart rises" and its button says "Dive again".
- **In the game:** On a loss, the cold closes over Wren's lantern and the lighthouse stays dark a little longer. The screen says keepers are stubborn and the sea eventually gives back what it takes. It is titled "The tide takes you" and its button says "Try again".
- **Agreed:** Each boss above the final depth holds water in its own area, covering a stair or tunnel. Defeating the boss drains the area and opens the passage down. The Heart remains deeper down, and the lighthouse is restored by dawn only after Wren clears the final drowned depth.
- **Open:** Whether Wren dies or becomes unconscious when she falls. An earlier idea was that the sea returns her and she wakes up.

## The coast and the tides

Saltmere stands on a headland beside a working sea. The Drowned Reach is a series of coastal rock terraces, or bands. These are above the outside sea level, not holes in the seabed. A bell is holding seawater in the inner chambers.

- **Agreed:** The lighthouse warns ships away from the rocks. It can do that whether or not the Reach is dry. Ordinary low tide uncovers the Shallows: rock, pools, and the sea below the cliff.
- **Agreed:** Below the Shallows, the coast has been wet for a long time. Its old stairs, quay, wrecks, and cold-shore animals existed before the current ringing and its pins. The Lost Lamplighter's cold lantern belongs to that older coast.
- **Agreed:** Each shallower band boss is a "pin", a ringer that carries out the bell's work. It holds seawater in its own area, above the level reached by the ordinary tide. The water covers a stair or tunnel leading deeper. Keepers once walked these routes during the lowest spring tides. Those opportunities no longer occur.
- **Agreed:** Wren reaches the boss by walking and climbing along exposed paths, stairs, and ledges. She fights from stone while water surrounds parts of the area. She carries an open-flame lantern, so she cannot use the submerged passage. Waiting on shore uncovers only the Shallows.
- **Agreed:** When Wren defeats the boss, it stops holding the water. The water drains from its area and exposes the passage down. Ordinary high tide still wets the Shallows but does not reach the inner lip. The drained area remains wet, with pools and shallow water.
- **Agreed:** The water held in a chamber does not move because of an ordinary fight. It drains when the pin goes silent.
- **Agreed:** Wren can always return home safely after defeating a boss. The Bellwether starts drawing water back as she retreats, but her route home remains safe.
- **Agreed:** Returning to the lighthouse ends the expedition. Wren unloads her haul, rests, and prepares before setting out again. By then the Bellwether has restored the water in the opened areas. It calls back a surviving boss or draws a similar creature to replace it. The boss or its replacement holds water in the area again, and other sea creatures return with the water. Wren cannot make a quick visit home and resume the same expedition.
- **Agreed:** The final chamber has no lip above the sea. Its floor is below the waterline, and its opening leads to the sea. Water is held around the Heart there. Wren enters in the diving suit, and the chamber does not drain.
- **In the game:** Saltmere's great light can go out. Bringing the Lantern Heart up can set it turning again by dawn.
- **In the game:** The Lantern Heart sank with the tide, still burns, and was held in the Bellwether's bronze.
- **Open:** Who rang the bell, and whether the Bellwether made that first ringing. The title screen says only "something".
- **Open:** What the Lantern Heart is, beyond a light Wren can carry.

### The tide in a fight

- **Agreed:** The fight's tide gauge represents water in front of Wren, moved with the Brass Tide-Bell. Wren stands on stone, and enemies are in the wash.
- **Agreed:** Surge builds water onto the enemies. A Crest is a wave breaking on them. After it breaks, the water falls back to slack, represented by the gauge resetting to the middle. Another Surge in the same turn raises a new wave from that slack, and it breaks harder.
- **Agreed:** Ebb pulls water off the enemies. Low Water strands them and removes their cover. The opening gives Wren 1 Light. The surrounding sea then seeps back to slack.
- **Agreed:** The Hollow Siren flattens the gauge so a wave cannot build. The Bellwether can pull the water in the other direction. If it pulls the water all the way out, whoever is in it is stranded.
- **Agreed:** A Crest at the top of the gauge is a wave Wren has raised. The sea takes her when she falls, not when the gauge Crests.

## The expedition

Every expedition starts on shore in the Shallows and can continue through every band Wren is willing to risk. Wren packs once on shore and carries the same pack throughout. Starting a new expedition at a deeper band is not possible.

- **Agreed:** After defeating a band boss, Wren can always return home safely or continue through the newly opened passage.
- **Agreed:** Returning home ends the expedition. Wren keeps everything collected on that expedition, but depth progress resets. The next expedition begins in the Shallows.
- **Agreed:** Continuing is the only way to reach richer finds and make progress farther down in that expedition. The expedition also ends if Wren completes the game or falls.
- **Agreed:** Keepsakes are kept between expeditions, as the name says. If Wren falls, she loses the keepsakes she found on that expedition. She keeps the ones she brought from home.
- **Open:** What else Wren loses if she falls, and how the rest of what she brings home is kept or used between expeditions.
- **Agreed:** The pack does not grow and cannot be repacked after breaking a pin. If Wren brings the diving suit, it occupies a worn slot from the first band onward and has no effect in fights. Carrying it therefore makes every band above the last harder. She cannot enter the final depth without it.
- **Agreed:** Wren receives the suit when she reaches the Abyss, the last walkable band. It is an old keeper's diving dress with a sealed lamp. Her open lantern establishes that the bands above the final depth contain air.

## People and creatures

- **In the game:** Wren, the Keeper, is the last lighthouse keeper. She wears an oilskin, a scarf, and boots, and carries a harpoon and an open lantern until the last depth.
- **Agreed:** Wren's control of the tide comes from the keeper's craft. Keepers use the Brass Tide-Bell, a hand-bell, to move water in a pool, stair, or cut. The Drowned Bellwether is the same kind of tool, operating across the coast. It is sunk, still ringing, and holding the sea over the Heart.
- **In the game:** The Drowned Bellwether is bronze. It rings, swings its clapper, tolls, and pulls the tide. At half health, it cracks and calls a shoal of Bell Minnows. On the current screens it is the boss of every depth.
- **Agreed:** The Bellwether itself waits in the final chamber. Shallower band bosses are pins: ringers that answer the Bellwether. They are separate from the Bellwether and the Heart. Crabs, kelp, eels, gulls, and the drowned are part of the coast's existing life, not pins. A draining chamber strands them.
- **In the game:** Barnaby is a hermit crab. His shell is both his home and his shop, Barnaby's Drifting Emporium, also called Barnaby's Shop. He sells goods for pearls and refuses haggling and biting. He says everything in the shop came down with a wreck and mostly still works.
- **In the game:** The Tide-Witch is a crone who wears a shawl of fishing net and lives in a hut on stilts. She takes years of your life in exchange for a rare lesson, and pearls in exchange for a brew.
- **In the game:** The Lost Lamplighter is drowned and waits on a submerged stair. His lantern has not burned in a hundred years. He says the deep is kind to the light and advises Wren to carry less. A hundred years is the only span of time stated in the game.
- **In the game:** An unnamed sea goddess has been forgotten. At the Sunken Shrine, her stone hands are still held out. She accepts blood or pearls, and the water warms when she accepts an offering.
- **Open:** Whether there are other keepers later. The progression notes mention them as an example. The README calls Wren the last keeper, while the loss screen says "keepers".

## Places

Wren walks, wades, and climbs while the slow tide is out. Her coat and open lantern are suitable for every band except the final depth.

- **In the game:** Saltmere has a lighthouse and its great light above the dive. Saltmere is named in the README and on the win screen.
- **Agreed:** The Workshop is on the shore at Saltmere and is used between expeditions. Salvage, Workshop, Gear, and Pack are working names in `BL.META_TEXT` in js/data.js. The Workshop has no scene yet.
- **In the game:** The Drowned Reach is the map of a single depth. **Agreed:** It will refer to the whole coast, crossed band by band during one expedition.
- **In the game:** Sheltered Cove is a dry hollow above the tide line. The lantern burns steadily there, and the deep cannot reach Wren for a little while.
- **Agreed:** The Shallows are the foreshore at ordinary low tide. They contain wet stone, pools, and the first stair. There is no sill yet.
- **Agreed:** Dark Water is the first held chamber. Once its pin breaks, it is a dripping cave stair that Wren can wade through, and her lantern matters.
- **Agreed:** Riptide is a cut where the current continues after the chamber drains. The opportunity to pass through it is short.
- **Agreed:** The Abyss is the last terrace Wren can walk, a hall under the bell. Clearing it gives her the suit.
- **Agreed:** Beyond the Abyss is one unnamed drowned depth, a chamber open to the sea. Wren can enter only in the suit. A Crest there is still a wave she raises onto things in the water. The diving dress keeps it out of her helmet. Low Water is a drop in pressure, not a dry floor.
- **In the game:** The Wreck of the Gilded Gull is a merchant ship on the seabed. Its cabin is sealed and its hold is open. The text says Wren can swim past, and the painting shows the wreck fully underwater.
- **Agreed:** The Gilded Gull lies in a basin exposed by the tide. Wren can stand and search the cabin and cargo. Only the flooded hold requires a dive. Pearls are found still dry, and something long and cold lives in the hold. Forcing the cabin leaves barnacles on Wren.
- **In the game:** A treasure stop contains a different wreck: a half-buried sea chest with greened iron bands and something still glowing inside.
- **In the game:** The Glimmering Pool is a warm cave pool with a gentle turquoise glow. Its light seems to listen, a reflection can reach out of the water, and its pearls bite.
- **In the game:** At Eyes in the Kelp, something in the fronds guards a cache.
- **In the game:** A faintly glowing glass bottle contains a sailor's notes.
- **In the game:** The four depth names currently describe difficulty only: more HP, harder hits, and less rest in the Abyss.

## Words and objects

- **In the game:** The on-screen voice is short and concrete. Its vocabulary includes harpoon, bilge, gaff, brace, slack water, pearls, brine, and barnacles. New story text should use the same voice.
- **In the game:** Pearls are money during a dive. Barnaby accepts them, and Wren can find them in wrecks and after fights.
- **In the game:** Light is the resource spent on cards. The game also uses the word for lanterns and Saltmere's great light.
- **Open:** Whether the Light spent on cards and the lighthouse's light are the same substance.
- **In the game:** Tide, Surge, Ebb, Crest, Low Water, Ward, Brine, Soaked, Chilled, Sink, Float, Rite, Echo, Dread, and Fog already have meanings in play. Story text must use them consistently with their definitions in the README.
- **Agreed:** Keepsakes are small trinkets with strong magical effects. Gear is worn equipment, separate from keepsakes. The suit is gear and has no magical effect.
- **Agreed:** Closer to the bell, the water left behind holds more before it condenses into a keepsake. The drained terraces contain wet stone and pools. The charge is in the remaining water, rather than in a larger volume of seawater. What the water holds and how it becomes a keepsake are not explained.
- **Agreed:** A keepsake gives off its charge into the air around it. The user's word is "pollutes". Whether that is the air or an ether is open. Every keepsake Wren carries counts, worn or not. Her surroundings can hold only so much charge, and they hold more closer to the bell. Past that limit, the extra charge condenses as Seep: seawater that clogs her pack. In a fight, Seep is an unplayable card.
- **Agreed in principle:** A safe room at the lighthouse has a store for keepsakes. It keeps their charge in, so nothing around it takes Seep. That is how Wren can keep many keepsakes close together at home. Its form and name are open.

## Open questions

- Does Wren die or become unconscious when she falls? Besides that expedition's keepsakes, what does she lose?
- Besides keepsakes, how is everything brought home kept or used between expeditions?
- Does a keepsake's charge go into the air or into an ether?
- What is the keepsake store in the lighthouse's safe room, and what is it called?
- Does Wren receive the suit on reaching the Abyss or on clearing it? Both are stated above.
- What does the remaining water hold, and how does it become a keepsake?
- What is the drowned depth beyond the Abyss called?
- Who rang the bell, and was that first ringing the Bellwether?
- What is the Lantern Heart?
- Are the Light spent on cards and the lighthouse's light the same substance?
- How do the README's "last lighthouse keeper", the loss screen's "keepers", and possible later keepers fit together?
- What is the goddess's name? Leave it forgotten unless an event needs it.
- What did the Gilded Gull carry, and what lives in its hold?
- What should the fight's Tide, Surge and Ebb be called? Wren's local water-working is separate from the tide that affects the whole coast. She raises waves, gathers and pins water, and pushes water masses. A Crest collapses a water mass onto the enemies. Low Water is a small local drought that strands them. The user asked for new words (2026-11-12).
