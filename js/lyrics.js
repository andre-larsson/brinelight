/* Brinelight — the words of the songs, for their pages in the Jukebox (one page a song). Keys are the keys of SONGS
   in js/ui.js. Each is plain text: a line in [brackets] heads a part of the song, a blank line separates parts.
   They are the words written for each song, in the order Gemini sang them (checked against whisper.cpp
   transcripts, since v0.45.0 of the full song and of its voice alone, split off with Demucs, and since v0.51.1 with
   tools/lyrics-check.py, which also uses Qwen3-ASR, and by ear on its review page); where Gemini sang a line
   differently or left a part out, the words here follow what it sang. Every line starts with a capital letter.
   Harbour Bells at Dawn (wordless voices) and High Tide Departure (instrumental) have none. */
(function () {
  'use strict';
  const BL = (globalThis.BL = globalThis.BL || {});
  BL.LYRICS = {
    title: `[Verse 1]
No hand on the rope,
And still the bronze is ringing;
The tide swings the tongue
And the bell holds the tide.

[Pre-Chorus]
A hundred years untended,
Louder every year.

[Chorus]
Burn low, my lantern, burn low,
Down the drowned stair I go.
The sea gives back what it takes,
But the held water won't let go.

[Verse 2]
What grew in the bell
Has no name I know;
It doesn't hate us,
It only holds.

[Pre-Chorus]
A hundred years untended,
Louder every year.

[Chorus]
Burn low, my lantern, burn low,
Down the drowned stair I go.
The sea gives back what it takes,
But the held water won't let go.

[Bridge]
We cast the bell.
We made it hold.

[Final Chorus]
Burn low, my lantern, burn low,
Up the drowned stair I go;
The Heart in my hands and the dawn on the tide,
And the great light turning slow.`,

    shop: `[Verse 1]
Down past the landing where the kelp grows thick,
There's a shell with a door and a lamp on a stick;
A sign says EMPORIUM, the paint's half gone,
And a voice from inside says "Come on, come on."

[Spoken]
Say, keeper. Step inside. Mind the doorframe.
I see pearls in that pocket, and I like what I see.
Everything in here came down with a wreck,
And it all still works. Mostly.
Prices are fair. Prices are firm.
No haggling. And please... no biting.

[Chorus]
Barnaby! (Barnaby!)
Barnaby's Drifting Emporium!
Barnaby! (Barnaby!)
Cards and keepsakes and tonics in the back!

[Verse 2]
She counted her pearls and she started to bargain,
He clicked one claw and he said "Beg pardon?"
So she set down her scales, all honest and true,
And the old crab sighed, 'cause what else could he do?

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

[Hook]
Pop the shell, let the brinelight show,
Wreck-salvage shinin' in the undertow;
Pearls on the counter, keeper, count 'em slow,
No hagglin', no bitin', that's how it go.

[Verse 1]
Sideways walkin' with a shop on my back,
Brass on the door and the sign paint cracked,
Sea glass hangin' like a chandelier,
Every lost thing glowin' 'cause it soaked down here.
Drifting Emporium, open every tide,
Tonics on the shelf and the keepsakes inside,
Cards in a stack, fresh up off the wreck,
Pearls that glow hangin' round my neck.
Eight legs, two claws, and two rules too:
No hagglin', no bitin', and I'm lookin' at you.
Shell so bright that the eels go blind,
Brinelight drippin' off a crab this fine.

[Hook]
Pop the shell, let the brinelight show,
Wreck-salvage shinin' in the undertow;
Pearls on the counter, keeper, count 'em slow,
No hagglin', no bitin', that's how it go.

[Verse 2]
Started out small in a whelk by the stair,
Traded it up for a conch, fair and square,
Traded the conch for a shell with a door,
Now I'm the biggest little shop on the floor.
Every wreck that went down, I was there when it landed,
Pickin' through the hold while the cargo was stranded;
Lamps that went dark with the keepers before ya,
I don't sell those, keeper. I'm keepin' 'em for ya.
Down where it's black and the pistol shrimp snap,
I drift on the current, I don't need a map;
When the big bell rings and the whole Reach hums,
I pull in my legs till the quiet comes.
Then I'm back in the window with a shine and a grin:
Door's on the latch, keeper. Come on in.

[Bridge]
No hagglin'... (no hagglin')
No bitin'... (no bitin')
Come back up, keeper...
In one piece.

[Hook]
Pop the shell, let the brinelight show,
Wreck-salvage shinin' in the undertow;
Pearls on the counter, keeper, count 'em slow,
No hagglin', no bitin', that's how it go.`,

    hermit: `[Verse 1]
There's a crab down under the harbour wall,
Big as a rowing boat, and that's not all:
He's wearing the bell that rang the boats home,
The storm tore it loose and he made it his own.

[Chorus]
Clang, clang (clang, clang), the Harbour Hermit,
Took the harbour bell and he won't return it;
It used to ring the boats home through the fog,
Now it answers something deeper down.

[Verse 2]
Shake up the water and he pulls inside,
He's holding the stair and he's holding the tide;
Every crush comes harder than the crush before,
Hurt him and he rings, and the mites hit the floor.

[Chorus]
Clang, clang (clang, clang), the Harbour Hermit,
Took the harbour bell and he won't return it;
It used to ring the boats home through the fog,
Now it answers something deeper down.

[Bridge]
Crack goes the bell, and the water runs away,
Down an old stair that's been drowned a hundred years.

[Final Chorus]
Clang, clang (clang, clang), the Harbour Hermit,
Lost the harbour bell, so we stapled it with brass;
Now the keeper wears it when the big waves pass,
And the Hermit's looking for a brand-new shell.`,

    buoy: `[Verse 1]
I've got a little bell, brass gone green,
Tuned to the biggest bell you've ever seen;
It leads and I follow, that's the keepers' way,
But I'm the one who's ringing today.

[Pre-Chorus]
Ring it up (clang!) and the water climbs:
Three, four, five...

[Chorus]
Six! Here comes the Crest!
The wave goes over and it does the rest;
Three, two, one, and the water's gone,
Strand 'em on the rocks, and the light burns on.

[Verse 2]
The big bell's ringing with nobody near,
The tide swings its tongue and it's louder every year;
But a little bell can answer, and a little bell can call,
And a little bell can make the big one fall.

[Pre-Chorus]
Ring it up (clang!) and the water climbs:
Three, four, five...

[Chorus]
Six! Here comes the Crest!
The wave goes over and it does the rest;
Three, two, one, and the water's gone,
Strand 'em on the rocks, and the light burns on.

[Bridge]
Go on, then. Answer me.
Louder.
Louder!

[Final Chorus]
Six! Here comes the Crest!
The wave goes over and it does the rest;
Three, two, one, and the water's gone,
Strand 'em on the rocks, and the light burns on.

[Outro]
Hush now.`,

    deep: `[Hook: both]
We used to ring you home,
Now we ring for the deep;
Two old bells of Saltmere
With a stair to keep.
Come down if you want it,
Bring a light if you dare;
We been holdin' this water
Since the storm put us there.

[Verse 1: the Harbour Hermit]
Big as a rowboat, got a bell for a shell,
Storm tore it off of the wall, and I caught it when it fell;
Used to call the boats in when the fog got thick,
Now it answers the deep with every clang and every lick.
Shake up the water, I pull into the brass,
What I'm holdin' don't wash off, and I don't let it pass;
Every crush that I throw hits harder than the last,
Hurt me and I ring, and the mites come fast.
Yeah, a wave'll ring my ears, and a Strand'll leave me dry,
But you gotta move the water first, keeper. Try.

[Hook: both]
We used to ring you home,
Now we ring for the deep;
Two old bells of Saltmere
With a stair to keep.
Come down if you want it,
Bring a light if you dare;
We been holdin' this water
Since the storm put us there.

[Verse 2: the Tolling Buoy]
Before the light on the rock, it was me on a chain,
Off the harbour rocks, ringin' through the wind and the rain;
You heard me 'fore you saw 'em, that's how the ships got by,
Then a storm snapped the chain and I sank, but I didn't die.
Now I rock in the dark where the water stands still,
Push the swell way high, push it low, and I will
Swing harder and harder with every push, every lean,
Got the light-eaters livin' in my cage, and they're lean.
Knock a third off of me and I snap my chain clean,
Then I ring the Wild Peal like you never have seen;
Smother me with a wave, or go strand me up high,
'Cause a bell can't swing when the rock runs dry.

[Bridge]
Hermit: Hold the stair.
Buoy: Hold the tide.
Hermit: Lantern comin'.
Buoy: Let her try.

[Hook: both]
We used to ring you home,
Now we ring for the deep;
Two old bells of Saltmere
With a stair to keep.
Come down if you want it (come down),
Bring a light if you dare;
We been holdin' this water
Since the storm put us there.`,

    bell: `[Verse 1]
My bell is tuned to the one below,
It leads, and every keeper follows;
A hundred years nobody came,
And it learned to ring without a hand.

[Pre-Chorus]
I hear it in the stair,
I hear it in my mind.

[Chorus]
Ring, and the sea stands up,
Ring, and the sea lies down;
I am the last flame lit from the Heart,
And I will not drown.

[Verse 2]
We cast you and we sank you
To hold the sea off the stairs;
We never asked what grows
In a bell that never sleeps.

[Pre-Chorus]
I hear it in the stair,
I hear it in my mind.

[Chorus]
Ring, and the sea stands up,
Ring, and the sea lies down;
I am the last flame lit from the Heart,
And I will not drown.

[Bridge]
Answer me.
Do you even hear me?
Answer me!

[Final Chorus]
Ring, and the sea stands up,
Ring, and the sea lies down;
I am the last flame lit from the Heart,
And I will not drown.

[Outro]
Give it back.`,

    watch: `[Verse 1]
Let me be honest: I'm not who you'd pick,
I'm the girl in the lamp room who trims the wick,
Who knows every gull by the way that it cries,
Who can smell when the fog's coming in on the tide.
Then a bell nobody living had heard
Rang under the cliff, and the whole town stirred;
No hand on its rope, and the great lamp gasped,
And the fire went down like it slipped my grasp.
Now the harbour's quiet and the windows are dark,
And every face on the quay is a question mark;
Nobody says it, but nobody has to, it's true:
It went dark on my watch, so what else would I do?

[Hook]
It went dark on my watch,
So it's mine to bring back;
One flame in my hand
And the water all black.
I'm not brave, I'm just here,
And the stair goes down;
If I don't, then who?
There's no other keeper in town.

[Verse 2]
First time on the stair, I won't lie to you,
My knees were like water, my breath came through
In small white clouds in the lantern's glow,
And the dark down there didn't want me below.
Crabs on the rocks with their claws up high,
Eels in the kelp sliding silently by,
And every swing that I take, every ring of the bell,
Costs a little more light, so I count it well.
Ring it up, and the water comes over the wall;
Ring it down, and they're stranded, the big and the small.
People call that magic; I just call it my chore,
Like the lamp and the glass and the oil before.

[Hook]
It went dark on my watch,
So it's mine to bring back;
One flame in my hand
And the water all black.
I'm not brave, I'm just here,
And the stair goes down;
If I don't, then who?
There's no other keeper in town.

[Verse 3]
And yeah, I've gone under. I'm not gonna hide it:
The cold closed over and I couldn't fight it.
I woke on the shingle with salt in my hair,
My lantern an ember, but the ember was there.
The bell called back every bright thing I'd found,
And the sea stood a step closer up to the town;
So I dry out my boots and I patch what I tore,
And I'm back on the stair, one time more.
That's the whole of the secret, if you wanted the trick:
There's no trick, there's a stair, and a lamp, and a wick.
I'm not the bravest keeper this rock ever had,
But I'm the last one it's got, and that's not so bad.

[Hook]
It went dark on my watch,
So it's mine to bring back;
One flame in my hand
And the water all black.
I'm not brave, I'm just here,
And the stair goes down;
If I don't, then who?
There's no other keeper in town.`,
    /* v0.45.0. The Buoy's singer: What the Bell Is Saying lost its sung stage directions (the file has them cut), and
       Gemini sang its bridge "sinking" and "falling" for "singing" and "calling". */
    hush: `[Verse 1]
Off the harbour rocks I swung on my chain,
I rang so the boats would hear,
I rang through the fog and I rang through the rain,
And I rang for the one who was late that year.

[Chorus]
Hush now, hush, the tide is turning,
Rest on the bronze, the water's clear,
I only sing what the bell is saying,
Deep in the blue where the lights appear.

[Verse 2]
Then the wind came up and the chain swung free,
And I settled down where the deep tides go,
And the little lights came to sing with me,
And they took the shape of someone I know.

[Chorus]
Hush now, hush, the tide is turning,
Rest on the bronze, the water's clear,
I only sing what the bell is saying,
Deep in the blue where the lights appear.

[Bridge]
Swing, the chain is sinking,
Swing, the tide is falling,
Ring it out, ring it out,
Ring till the water's falling.

[Final Chorus]
Hush now, hush, the tide is turning,
A lantern is coming down the stair,
I only sing what the bell is saying,
And the bell says: she is nearly there.`,

    chain: `[Verse 1]
Down on the chain I swing and I swing,
The rocks are close and I ring and I ring,
A hundred years under the black,
And the boat I rang for never came back.

[Pre-Chorus]
Hold on, hold on, the iron is cold,
Hold on the way the drowning hold.

[Chorus]
Ring for the rocks, ring for the reef,
Ring for the boat that was out that night,
I sing what the bell sings, slow and deep,
Down where the dark is eating the light.

[Verse 2]
The light-eaters came through the bars like rain,
They learned to kneel, they learned the chain,
They found a shape and they held it fast,
Like a hand that held on to me last.

[Pre-Chorus]
Hold on, hold on, the iron is cold,
Hold on the way the drowning hold.

[Chorus]
Ring for the rocks, ring for the reef,
Ring for the boat that was out that night,
I sing what the bell sings, slow and deep,
Down where the dark is eating the light.

[Bridge]
Let the lantern come down the stair,
I will let go when it gets there.

[Final Chorus]
Ring for the rocks, ring for the reef,
Ring for the boat that was out that night,
I sing what the bell sings, slow and deep,
Down where the dark is eating the light.`,

    // the Garden Strider's two takes: Gemini left out the bridge of the sung one and the breakdown of the half-spoken one
    gardener: `[Intro]
Someone's been in my garden.
Put it back!

[Verse 1]
Up on my stilts in the still black pool,
I tend every bead, I keep one rule,
Every bead's a light and every light is mine,
I count them every night, and they're all in line.

[Pre-Chorus]
Something tends the garden,
Something walks the rows,
Something counts the beads at night,
And something always knows.

[Chorus]
I'm the Gardener, I keep what grows,
I plant the leeches in the rows,
The light I drink glows through my skin,
So put it back where it's always been.
Put it back! Keep off!

[Verse 2]
Then a lamp on the stair and a step on the stone,
A keeper in the garden who should leave it alone,
You picked one bead and it hardened to a pearl,
You took a little light from the Gardener's world.

[Pre-Chorus]
Something tends the garden,
Something walks the rows,
Something counts the beads at night,
And something always knows.

[Chorus]
I'm the Gardener, I keep what grows,
I plant the leeches in the rows,
The light I drink glows through my skin,
So put it back where it's always been.
Put it back! Keep off!

[Breakdown]
Tend the garden! (Tend!)
Graze the light! (Graze!)
Stilts in the water! (Step!)
Every single night!

[Final Chorus]
I'm the Gardener, I keep what grows,
I plant the leeches in the rows,
The light I drink glows through my skin,
So put it back where it's always been.

[Outro]
I noticed.`,

    putback: `[Intro]
Someone's been in my garden.
Someone's been in my garden.

[Verse 1]
Up on my stilts in the still black pool,
I tend every bead and I keep one rule,
Every bead's a light and every light is mine,
I count them every night and they're all in line.
Then a lamp on the stair and a step on the stone,
A keeper in the garden who should leave it alone,
You picked one bead and it hardened to a pearl,
You took a little light from the Gardener's world!

[Pre-Chorus]
Something tends the garden,
Something walks the rows,
Something counts the beads at night,
And something always knows.

[Chorus]
Put it back! (Put it back!)
Keep off! (Keep off!)
I'm the Gardener, I keep what grows,
I plant the leeches in the rows,
The light I drink glows through my skin,
Put it back where it's always been!

[Verse 2]
Legs like a ladder, I'm taller than you,
I've walked this garden a hundred years through,
Step, step, step, I'm coming down the row,
Three steps, three stamps, and here I go!
The keepers wrote me down in their little books,
They kept their lanterns low and they took one look,
"Leave the garden be" was the keepers' rule,
And you broke it, you broke it, you little fool!

[Pre-Chorus]
Something tends the garden,
Something walks the rows,
Something counts the beads at night,
And something always knows.

[Chorus]
Put it back! (Put it back!)
Keep off! (Keep off!)
I'm the Gardener, I keep what grows,
I plant the leeches in the rows,
The light I drink glows through my skin,
Put it back where it's always been!

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
The light I drink glows through my skin.`,

    herring: `[Verse 1]
The sailors of Saltmere told it true,
Of a fish as long as a ship and a crew,
A silver ribbon with a crown of red,
That rises when there's a storm ahead.

[Pre-Chorus]
They call him king of the herrings,
They swore he led the shoals.

[Chorus]
King of the herrings, crowned in red,
In from the open sea,
Through the broken arch in the Belfry wall,
The king has come for me!
(Whoa-oh, whoa-oh!)

[Verse 2]
He coils around the diving dress,
He squeezes till the air runs thin,
His crest is sharp as a sailmaker's knife,
And he rams like a ship coming in.

[Pre-Chorus]
They call him king of the herrings,
They swore he led the shoals.

[Chorus]
King of the herrings, crowned in red,
In from the open sea,
Through the broken arch in the Belfry wall,
The king has come for me!
(Whoa-oh, whoa-oh!)

[Verse 3]
What brings a king from the open sea
So far from the waves he knows?
Is it the glow that comes up through the floor,
Where everything down here grows?

[Final Chorus]
King of the herrings, crowned in red,
In from the open sea,
Through the broken arch in the Belfry wall,
The king has come for me!
(Whoa-oh, whoa-oh!)`,

    // the user's words; Gemini sang the last line of the first chorus twice, and "where currents flow" without "dark"
    eye: `[Verse 1]
I was all arms and one watchful eye,
I squeezed the air from a diver's dress,
With a broken bell on my head,
I heard a deeper voice inside the stone.

[Pre-Chorus]
It's calling, it's calling, from somewhere below,
I'm diving, I'm diving where currents flow.

[Chorus]
Greater bell, greater bell,
I hear you tolling far below,
Greater bell, greater bell,
I'll find a voice to call my own,
I'll find a voice to call my own.

[Verse 2]
One eye, I used to keep it shut,
Safe under bronze where you couldn't see,
Now I open it, keeper, and face the dark,
Whatever waits there will answer me.

[Pre-Chorus]
It's calling, it's calling, from somewhere below,
I'm diving, I'm diving where currents flow.

[Chorus]
Distant bell, distant bell,
I hear you singing through the deep,
Distant bell, distant bell,
You call to me beneath my sleep.

[Bridge]
Remember the eye. Remember the eye.
Something larger down here does the same.

[Breakdown]
Dive deep! Reach high!
Dive deep! Reach high!

[Final Chorus]
Mighty bell, mighty bell,
Your thunder rolls beneath the sea,
Mighty bell, mighty bell,
One day your voice will answer me.`,

    // Gemini left out the bridge ("Brothers, sisters, come out of the dark") and the outro's first line
    cantor: `[Verse 1]
We rang it by the rope when the tower stood dry,
We rang it when the water came,
We went down the stair to tend the bell,
And the bell kept every name.

[Pre-Chorus]
Now the bell is silent, the glow is gone,
Who told it to stop? Who told it to stop?

[Chorus]
Ring it once again! (Ring it once again!)
Every toll a little harder than the last,
Ring it once again! (Ring it once again!)
We will not let the silence pass.

[Verse 2]
Little keeper with your lantern lit,
You carried the light away,
You took the Heart up the stair to the town,
But we were told to stay.

[Pre-Chorus]
Now the bell is silent, the glow is gone,
Who told it to stop?

[Chorus]
Ring it once again! (Ring it once again!)
Every toll a little harder than the last,
Ring it once again! (Ring it once again!)
We will not let the silence pass.

[Final Chorus]
Ring it once again! (Ring it once again!)
Every toll a little harder than the last,
Ring it once again! (Ring it once again!)
We will not let the silence pass.

[Outro]
Go back into the dark, and rest.`,

    // the Hollow Divers, at the Dark Watch's call
    nobody: `[Intro]
Is anybody in there?

[Verse 1]
Canvas and brass and a window of glass,
Boots full of lead on the stone below,
The seams went soft in a hundred years,
And we came in where the stitches go.

[Pre-Chorus]
W-w-we learned the boots, we learned the stride,
We-we-we learned to fill it from the inside.

[Chorus]
There's nobody in the dress,
Nobody behind the glass,
We fill it like a hand in a glove,
And walk it where the keepers passed.

[Verse 2]
Our lamp is cold and your lamp is bright,
Come a little closer, give us your light,
You wear a dress the same as this,
And seams go soft in the deep like this.

[Pre-Chorus]
W-w-we learned the boots, we learned the stride,
We-we-we learned to fill it from the inside.

[Chorus]
There's nobody in the dress,
Nobody behind the glass,
We fill it like a hand in a glove,
And walk it where the keepers passed.

[Bridge]
Who wore it first? Who wore it first?
We don't know. We don't know.
We only know the way to walk.

[Final Chorus]
There's nobody in the dress,
Nobody behind the glass,
We fill it like a hand in a glove,
And walk it where the keepers passed.`,
  };
})();
