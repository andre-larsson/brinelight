/* Brinelight — the words of the songs, for their pages in the Jukebox (one page a song). Keys are the keys of SONGS
   in js/ui.js. Each is plain text: a line in [brackets] heads a part of the song, a blank line separates parts.
   They are the words written for each song, in the order Gemini sang them (checked against whisper.cpp
   transcripts, since v0.45.0 of the full song and of its voice alone, split off with Demucs); where Gemini sang a line
   differently or left a part out, the words here follow what it sang.
   Harbour Bells at Dawn (wordless voices) and High Tide Departure (instrumental) have none. */
(function () {
  'use strict';
  const BL = (globalThis.BL = globalThis.BL || {});
  BL.LYRICS = {
    title: `[Verse 1]
No hand on the rope,
and still the bronze is ringing;
the tide swings the tongue
and the bell holds the tide.

[Pre-Chorus]
A hundred years untended,
louder every year.

[Chorus]
Burn low, my lantern, burn low,
down the drowned stair I go.
The sea gives back what it takes,
but the held water won't let go.

[Verse 2]
What grew in the bell
has no name I know;
it doesn't hate us,
it only holds.

[Pre-Chorus]
A hundred years untended,
louder every year.

[Chorus]
Burn low, my lantern, burn low,
down the drowned stair I go.
The sea gives back what it takes,
but the held water won't let go.

[Bridge]
We cast the bell.
We made it hold.

[Final Chorus]
Burn low, my lantern, burn low,
up the drowned stair I go;
the Heart in my hands and the dawn on the tide,
and the great light turning slow.`,

    shop: `[Verse 1]
Down past the landing where the kelp grows thick,
there's a shell with a door and a lamp on a stick;
a sign says EMPORIUM, the paint's half gone,
and a voice from inside says "Come on, come on."

[Spoken]
Say, keeper. Step inside. Mind the doorframe.
I see pearls in that pocket, and I like what I see.
Everything in here came down with a wreck,
and it all still works. Mostly.
Prices are fair. Prices are firm.
No haggling. And please... no biting.

[Chorus]
Barnaby! (Barnaby!)
Barnaby's Drifting Emporium!
Barnaby! (Barnaby!)
Cards and keepsakes and tonics in the back!

[Verse 2]
She counted her pearls and she started to bargain,
he clicked one claw and he said "Beg pardon?"
So she set down her scales, all honest and true,
and the old crab sighed, 'cause what else could he do?

[Spoken]
Honest weights. Well, well, well.
A crab can't argue with honest weights.
Twenty-five off, keeper. Don't tell the other crabs.

[Final Chorus]
Barnaby! (Barnaby!)
Barnaby's Drifting Emporium!
Barnaby! (Barnaby!)
Cards and keepsakes and tonics in the back!

[Outro]
Come again, keeper. Come back up in one piece.`,

    shell: `[Intro]
Step inside, keeper. Mind the door frame.

[Verse 1]
Sideways walkin' with a shop on my back,
brass on the door and the sign paint cracked,
sea glass hangin' like a chandelier,
every lost thing glowin' 'cause it soaked down here.
Drifting Emporium, open every tide,
tonics on the shelf and the keepsakes inside,
cards in a stack, fresh up off the wreck,
pearls that glow hangin' round my neck.
Eight legs, two claws, and two rules too:
no hagglin', no bitin', and I'm lookin' at you.
Shell so bright that the eels go blind,
brinelight drippin' off a crab this fine.

[Hook]
Pop the shell, let the brinelight show,
wreck-salvage shinin' in the undertow;
pearls on the counter, keeper, count 'em slow,
no hagglin', no bitin', that's how it go.

[Verse 2]
Started out small in a whelk by the stair,
traded it up for a conch, fair and square,
traded the conch for a shell with a door,
now I'm the biggest little shop on the floor.
Every wreck that went down, I was there when it landed,
pickin' through the hold while the cargo was stranded;
lamps that went dark with the keepers before ya,
I don't sell those, keeper. I'm keepin' 'em for ya.
Down where it's black and the pistol shrimp snap,
I drift on the current, I don't need a map;
when the big bell rings and the whole Reach hums,
I pull in my legs till the quiet comes.
Then I'm back in the window with a shine and a grin:
door's on the latch, keeper. Come on in.

[Bridge]
No hagglin'... (no hagglin')
no bitin'... (no bitin')
come back up, keeper...
in one piece.

[Hook]
Pop the shell, let the brinelight show,
wreck-salvage shinin' in the undertow;
pearls on the counter, keeper, count 'em slow,
no hagglin', no bitin', that's how it go.`,

    hermit: `[Verse 1]
There's a crab down under the harbour wall,
big as a rowing boat, and that's not all:
he's wearing the bell that rang the boats home,
the storm tore it loose and he made it his own.

[Chorus]
Clang, clang (clang, clang), the Harbour Hermit,
took the harbour bell and he won't return it;
it used to ring the boats home through the fog,
now it answers something deeper down.

[Verse 2]
Shake up the water and he pulls inside,
he's holding the stair and he's holding the tide;
every crush comes harder than the crush before,
hurt him and he rings, and the mites hit the floor.

[Chorus]
Clang, clang (clang, clang), the Harbour Hermit,
took the harbour bell and he won't return it;
it used to ring the boats home through the fog,
now it answers something deeper down.

[Bridge]
Crack goes the bell, and the water runs away,
down an old stair that's been drowned a hundred years.

[Final Chorus]
Clang, clang (clang, clang), the Harbour Hermit,
lost the harbour bell, so we stapled it with brass;
now the keeper wears it when the big waves pass,
and the Hermit's looking for a brand-new shell.`,

    buoy: `[Verse 1]
I've got a little bell, brass gone green,
tuned to the biggest bell you've ever seen;
it leads and I follow, that's the keepers' way,
but I'm the one who's ringing today.

[Pre-Chorus]
Ring it up (clang!) and the water climbs:
three, four, five...

[Chorus]
Six! Here comes the Crest!
The wave goes over and it does the rest;
three, two, one, and the water's gone,
Strand 'em on the rocks, and the light burns on.

[Verse 2]
The big bell's ringing with nobody near,
the tide swings its tongue and it's louder every year;
but a little bell can answer, and a little bell can call,
and a little bell can make the big one fall.

[Pre-Chorus]
Ring it up (clang!) and the water climbs:
three, four, five...

[Chorus]
Six! Here comes the Crest!
The wave goes over and it does the rest;
three, two, one, and the water's gone,
Strand 'em on the rocks, and the light burns on.

[Bridge]
Go on, then. Answer me.
Louder.
Louder!

[Final Chorus]
Six! Here comes the Crest!
The wave goes over and it does the rest;
three, two, one, and the water's gone,
Strand 'em on the rocks, and the light burns on.

[Outro]
Hush now.`,

    deep: `[Hook: both]
We used to ring you home,
now we ring for the deep;
two old bells of Saltmere
with a stair to keep.
Come down if you want it,
bring a light if you dare;
we been holdin' this water
since the storm put us there.

[Verse 1: the Harbour Hermit]
Big as a rowboat, got a bell for a shell,
storm tore it off of the wall, and I caught it when it fell;
used to call the boats in when the fog got thick,
now it answers the deep with every clang and every lick.
Shake up the water, I pull into the brass,
what I'm holdin' don't wash off, and I don't let it pass;
every crush that I throw hits harder than the last,
hurt me and I ring, and the mites come fast.
Yeah, a wave'll ring my ears, and a Strand'll leave me dry,
but you gotta move the water first, keeper. Try.

[Hook: both]
We used to ring you home,
now we ring for the deep;
two old bells of Saltmere
with a stair to keep.
Come down if you want it,
bring a light if you dare;
we been holdin' this water
since the storm put us there.

[Verse 2: the Tolling Buoy]
Before the light on the rock, it was me on a chain,
off the harbour rocks, ringin' through the wind and the rain;
you heard me 'fore you saw 'em, that's how the ships got by,
then a storm snapped the chain and I sank, but I didn't die.
Now I rock in the dark where the water stands still,
push the swell way high, push it low, and I will
swing harder and harder with every push, every lean,
got the light-eaters livin' in my cage, and they're lean.
Knock a third off of me and I snap my chain clean,
then I ring the Wild Peal like you never have seen;
smother me with a wave, or go strand me up high,
'cause a bell can't swing when the rock runs dry.

[Bridge]
Hermit: Hold the stair.
Buoy: Hold the tide.
Hermit: Lantern comin'.
Buoy: Let her try.

[Hook: both]
We used to ring you home,
now we ring for the deep;
two old bells of Saltmere
with a stair to keep.
Come down if you want it (come down),
bring a light if you dare;
we been holdin' this water
since the storm put us there.`,

    bell: `[Verse 1]
My bell is tuned to the one below,
it leads, and every keeper follows;
a hundred years nobody came,
and it learned to ring without a hand.

[Pre-Chorus]
I hear it in the stair,
I hear it in my mind.

[Chorus]
Ring, and the sea stands up,
ring, and the sea lies down;
I am the last flame lit from the Heart,
and I will not drown.

[Verse 2]
We cast you and we sank you
to hold the sea off the stairs;
we never asked what grows
in a bell that never sleeps.

[Pre-Chorus]
I hear it in the stair,
I hear it in my mind.

[Chorus]
Ring, and the sea stands up,
ring, and the sea lies down;
I am the last flame lit from the Heart,
and I will not drown.

[Bridge]
Answer me.
Do you even hear me?
Answer me!

[Final Chorus]
Ring, and the sea stands up,
ring, and the sea lies down;
I am the last flame lit from the Heart,
and I will not drown.

[Outro]
Give it back.`,

    watch: `[Verse 1]
Let me be honest: I'm not who you'd pick,
I'm the girl in the lamp room who trims the wick,
who knows every gull by the way that it cries,
who can smell when the fog's coming in on the tide.
Then a bell nobody living had heard
rang under the cliff, and the whole town stirred;
no hand on its rope, and the great lamp gasped,
and the fire went down like it slipped my grasp.
Now the harbour's quiet and the windows are dark,
and every face on the quay is a question mark;
nobody says it, but nobody has to, it's true:
it went dark on my watch, so what else would I do?

[Hook]
It went dark on my watch,
so it's mine to bring back;
one flame in my hand
and the water all black.
I'm not brave, I'm just here,
and the stair goes down;
if I don't, then who?
There's no other keeper in town.

[Verse 2]
First time on the stair, I won't lie to you,
my knees were like water, my breath came through
in small white clouds in the lantern's glow,
and the dark down there didn't want me below.
Crabs on the rocks with their claws up high,
eels in the kelp sliding silently by,
and every swing that I take, every ring of the bell,
costs a little more light, so I count it well.
Ring it up, and the water comes over the wall;
ring it down, and they're stranded, the big and the small.
People call that magic; I just call it my chore,
like the lamp and the glass and the oil before.

[Hook]
It went dark on my watch,
so it's mine to bring back;
one flame in my hand
and the water all black.
I'm not brave, I'm just here,
and the stair goes down;
if I don't, then who?
There's no other keeper in town.

[Verse 3]
And yeah, I've gone under. I'm not gonna hide it:
the cold closed over and I couldn't fight it.
I woke on the shingle with salt in my hair,
my lantern an ember, but the ember was there.
The bell called back every bright thing I'd found,
and the sea stood a step closer up to the town;
so I dry out my boots and I patch what I tore,
and I'm back on the stair, one time more.
That's the whole of the secret, if you wanted the trick:
there's no trick, there's a stair, and a lamp, and a wick.
I'm not the bravest keeper this rock ever had,
but I'm the last one it's got, and that's not so bad.

[Hook]
It went dark on my watch,
so it's mine to bring back;
one flame in my hand
and the water all black.
I'm not brave, I'm just here,
and the stair goes down;
if I don't, then who?
There's no other keeper in town.`,
    /* v0.45.0. The Buoy's singer: What the Bell Is Saying lost its sung stage directions (the file has them cut), and
       Gemini sang its bridge "sinking" and "falling" for "singing" and "calling". */
    hush: `[Verse 1]
Off the harbour rocks I swung on my chain,
I rang so the boats would hear,
I rang through the fog and I rang through the rain,
and I rang for the one who was late that year.

[Chorus]
Hush now, hush, the tide is turning,
rest on the bronze, the water's clear,
I only sing what the bell is saying,
deep in the blue where the lights appear.

[Verse 2]
Then the wind came up and the chain swung free,
and I settled down where the deep tides go,
and the little lights came to sing with me,
and they took the shape of someone I know.

[Chorus]
Hush now, hush, the tide is turning,
rest on the bronze, the water's clear,
I only sing what the bell is saying,
deep in the blue where the lights appear.

[Bridge]
Swing, the chain is sinking,
swing, the tide is falling,
ring it out, ring it out,
ring till the water's falling.

[Final Chorus]
Hush now, hush, the tide is turning,
a lantern is coming down the stair,
I only sing what the bell is saying,
and the bell says: she is nearly there.`,

    chain: `[Verse 1]
Down on the chain I swing and I swing,
the rocks are close and I ring and I ring,
a hundred years under the black,
and the boat I rang for never came back.

[Pre-Chorus]
Hold on, hold on, the iron is cold,
hold on the way the drowning hold.

[Chorus]
Ring for the rocks, ring for the reef,
ring for the boat that was out that night,
I sing what the bell sings, slow and deep,
down where the dark is eating the light.

[Verse 2]
The light-eaters came through the bars like rain,
they learned to kneel, they learned the chain,
they found a shape and they held it fast,
like a hand that held on to me last.

[Pre-Chorus]
Hold on, hold on, the iron is cold,
hold on the way the drowning hold.

[Chorus]
Ring for the rocks, ring for the reef,
ring for the boat that was out that night,
I sing what the bell sings, slow and deep,
down where the dark is eating the light.

[Bridge]
Let the lantern come down the stair,
I will let go when it gets there.

[Final Chorus]
Ring for the rocks, ring for the reef,
ring for the boat that was out that night,
I sing what the bell sings, slow and deep,
down where the dark is eating the light.`,

    // the Garden Strider's two takes: Gemini left out the bridge of the sung one and the breakdown of the half-spoken one
    gardener: `[Intro]
Someone's been in my garden.
Put it back!

[Verse 1]
Up on my stilts in the still black pool,
I tend every bead, I keep one rule,
every bead's a light and every light is mine,
I count them every night, and they're all in line.

[Pre-Chorus]
Something tends the garden,
something walks the rows,
something counts the beads at night,
and something always knows.

[Chorus]
I'm the Gardener, I keep what grows,
I plant the leeches in the rows,
the light I drink glows through my skin,
so put it back where it's always been.
Put it back! Keep off!

[Verse 2]
Then a lamp on the stair and a step on the stone,
a keeper in the garden who should leave it alone,
you picked one bead and it hardened to a pearl,
you took a little light from the Gardener's world.

[Pre-Chorus]
Something tends the garden,
something walks the rows,
something counts the beads at night,
and something always knows.

[Chorus]
I'm the Gardener, I keep what grows,
I plant the leeches in the rows,
the light I drink glows through my skin,
so put it back where it's always been.
Put it back! Keep off!

[Breakdown]
Tend the garden! (Tend!)
Graze the light! (Graze!)
Stilts in the water! (Step!)
Every single night!

[Final Chorus]
I'm the Gardener, I keep what grows,
I plant the leeches in the rows,
the light I drink glows through my skin,
so put it back where it's always been.

[Outro]
I noticed.`,

    putback: `[Intro]
Someone's been in my garden.
Someone's been in my garden.

[Verse 1]
Up on my stilts in the still black pool,
I tend every bead and I keep one rule,
every bead's a light and every light is mine,
I count them every night and they're all in line.
Then a lamp on the stair and a step on the stone,
a keeper in the garden who should leave it alone,
you picked one bead and it hardened to a pearl,
you took a little light from the Gardener's world!

[Pre-Chorus]
Something tends the garden,
something walks the rows,
something counts the beads at night,
and something always knows.

[Chorus]
Put it back! (Put it back!)
Keep off! (Keep off!)
I'm the Gardener, I keep what grows,
I plant the leeches in the rows,
the light I drink glows through my skin,
put it back where it's always been!

[Verse 2]
Legs like a ladder, I'm taller than you,
I've walked this garden a hundred years through,
step, step, step, I'm coming down the row,
three steps, three stamps, and here I go!
The keepers wrote me down in their little books,
they kept their lanterns low and they took one look,
"Leave the garden be" was the keepers' rule,
and you broke it, you broke it, you little fool!

[Pre-Chorus]
Something tends the garden,
something walks the rows,
something counts the beads at night,
and something always knows.

[Chorus]
Put it back! (Put it back!)
Keep off! (Keep off!)
I'm the Gardener, I keep what grows,
I plant the leeches in the rows,
the light I drink glows through my skin,
put it back where it's always been!

[Bridge]
Count the beads.
Count them again.
One is gone.
One is gone.
I noticed.

[Final Chorus]
Put it back! Put it back!
I'm the Gardener, I keep what grows,
I plant the leeches in the rows,
the light I drink glows through my skin.`,

    herring: `[Verse 1]
The sailors of Saltmere told it true,
of a fish as long as a ship and a crew,
a silver ribbon with a crown of red,
that rises when there's a storm ahead.

[Pre-Chorus]
They call him king of the herrings,
they swore he led the shoals.

[Chorus]
King of the herrings, crowned in red,
in from the open sea,
through the broken arch in the Belfry wall,
the king has come for me!
(Whoa-oh, whoa-oh!)

[Verse 2]
He coils around the diving dress,
he squeezes till the air runs thin,
his crest is sharp as a sailmaker's knife,
and he rams like a ship coming in.

[Pre-Chorus]
They call him king of the herrings,
they swore he led the shoals.

[Chorus]
King of the herrings, crowned in red,
in from the open sea,
through the broken arch in the Belfry wall,
the king has come for me!
(Whoa-oh, whoa-oh!)

[Verse 3]
What brings a king from the open sea
so far from the waves he knows?
Is it the glow that comes up through the floor,
where everything down here grows?

[Final Chorus]
King of the herrings, crowned in red,
in from the open sea,
through the broken arch in the Belfry wall,
the king has come for me!
(Whoa-oh, whoa-oh!)`,

    // the user's words; Gemini sang the last line of the first chorus twice, and "where currents flow" without "dark"
    eye: `[Verse 1]
I was all arms and one watchful eye,
I squeezed the air from a diver's dress,
with a broken bell on my head,
I heard a deeper voice inside the stone.

[Pre-Chorus]
It's calling, it's calling, from somewhere below,
I'm diving, I'm diving where currents flow.

[Chorus]
Greater bell, greater bell,
I hear you tolling far below,
greater bell, greater bell,
I'll find a voice to call my own,
I'll find a voice to call my own.

[Verse 2]
One eye, I used to keep it shut,
safe under bronze where you couldn't see,
now I open it, keeper, and face the dark,
whatever waits there will answer me.

[Pre-Chorus]
It's calling, it's calling, from somewhere below,
I'm diving, I'm diving where currents flow.

[Chorus]
Distant bell, distant bell,
I hear you singing through the deep,
distant bell, distant bell,
you call to me beneath my sleep.

[Bridge]
Remember the eye. Remember the eye.
Something larger down here does the same.

[Breakdown]
Dive deep! Reach high!
Dive deep! Reach high!

[Final Chorus]
Mighty bell, mighty bell,
your thunder rolls beneath the sea,
mighty bell, mighty bell,
one day your voice will answer me.`,

    // Gemini left out the bridge ("Brothers, sisters, come out of the dark") and the outro's first line
    cantor: `[Verse 1]
We rang it by the rope when the tower stood dry,
we rang it when the water came,
we went down the stair to tend the bell,
and the bell kept every name.

[Pre-Chorus]
Now the bell is silent, the glow is gone,
who told it to stop? Who told it to stop?

[Chorus]
Ring it once again! (Ring it once again!)
Every toll a little harder than the last,
ring it once again! (Ring it once again!)
We will not let the silence pass.

[Verse 2]
Little keeper with your lantern lit,
you carried the light away,
you took the Heart up the stair to the town,
but we were told to stay.

[Pre-Chorus]
Now the bell is silent, the glow is gone,
who told it to stop?

[Chorus]
Ring it once again! (Ring it once again!)
Every toll a little harder than the last,
ring it once again! (Ring it once again!)
We will not let the silence pass.

[Final Chorus]
Ring it once again! (Ring it once again!)
Every toll a little harder than the last,
ring it once again! (Ring it once again!)
We will not let the silence pass.

[Outro]
Go back into the dark, and rest.`,

    // the Hollow Divers, at the Dark Watch's call
    nobody: `[Intro]
Is anybody in there?

[Verse 1]
Canvas and brass and a window of glass,
boots full of lead on the stone below,
the seams went soft in a hundred years,
and we came in where the stitches go.

[Pre-Chorus]
W-w-we learned the boots, we learned the stride,
we-we-we learned to fill it from the inside.

[Chorus]
There's nobody in the dress,
nobody behind the glass,
we fill it like a hand in a glove,
and walk it where the keepers passed.

[Verse 2]
Our lamp is cold and your lamp is bright,
come a little closer, give us your light,
you wear a dress the same as this,
and seams go soft in the deep like this.

[Pre-Chorus]
W-w-we learned the boots, we learned the stride,
we-we-we learned to fill it from the inside.

[Chorus]
There's nobody in the dress,
nobody behind the glass,
we fill it like a hand in a glove,
and walk it where the keepers passed.

[Bridge]
Who wore it first? Who wore it first?
We don't know. We don't know.
We only know the way to walk.

[Final Chorus]
There's nobody in the dress,
nobody behind the glass,
we fill it like a hand in a glove,
and walk it where the keepers passed.`,
  };
})();
