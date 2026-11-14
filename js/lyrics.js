/* Brinelight — the words of the songs, for their pages in the Jukebox (one page a song). Keys are the keys of SONGS
   in js/ui.js. Each is plain text: a line in [brackets] heads a part of the song, a blank line separates parts.
   They are the words written for each song, in the order Gemini sang them (checked against whisper.cpp
   transcripts); where Gemini sang a line differently, the words here follow what it sang.
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
  };
})();
