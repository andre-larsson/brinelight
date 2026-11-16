# The Tolling Buoy's song: the singer in the cage (request for Gemini, v0.36.0)

Pending: the user generates it. Until it exists, the Buoy's fight plays the music-box cue `buoy` ("The Rocking Toll" in
the Jukebox). It is in A minor, 6/8, at 52, so the song is in the same key and time.

Who sings it: the singer in the cage (WORLD.md, "the singer in the cage"). The light-eaters in the Buoy's cage have
grown into the shape of a woman kneeling with her arms round the bell. She sings what the bell rings. She never leaves
the cage. Whose shape it is stays open; the words only hint that it is the shape of whoever the bell last rang for
(verse 1's last line, verse 2's last line). They name nothing.

## Style prompt

A slow, haunting sea waltz in 6/8, about 52 BPM, in A minor. One female voice, soft, breathy and close, like a lullaby
sung with her cheek against cold metal, with long sliding notes. No harmonies until the bridge. Under her: the creak of a
rocking chain; an old bell-buoy's bell that strikes on each swing, a little unsteady, as if the sea rocks it; a low cello
and a bowed double bass holding a drone on A; slow waves far off; once in a while a huge bell, very far below. Sparse and
wide, with long reverb, like a cave over still black water. The bridge builds into a wild peal: the bell on every beat,
timpani, swelling gongs and low brass, and her voice rising to a cry. Then a wave breaks over everything and swallows
it, and the quiet rocking comes back for the last chorus. Dark folk, ethereal, cinematic. No drum kit, no guitar, no
synth pads. About 3 minutes.

## Words

[Intro]
(humming, no words)

[Verse 1]
Off the harbour rocks I swung on my chain,
I rang so the boats would hear,
I rang through the fog and I rang through the rain,
and one came late, and did not steer clear.

[Chorus]
Hush now, hush, the tide is turning,
lean on the bronze, it is cold and near,
I only sing what the bell is saying,
down in the dark where nobody's here.

[Verse 2]
Then the storm came down and the chain gave way,
and I sank with my song for a hundred years,
and the little lights came in through the bars,
and they took the shape that the bell holds dear.

[Chorus]
Hush now, hush, the tide is turning,
lean on the bronze, it is cold and near,
I only sing what the bell is saying,
down in the dark where nobody's here.

[Bridge]
Swing, the chain is broken,
swing, the deep is calling,
ring it wild, ring it wild,
ring till the water's falling.

[Final Chorus]
(quiet again, after the wave)
Hush now, hush, the tide is turning,
let the lantern come down the stair,
I only sing what the bell is saying,
and the bell says: she is nearly there.

[Outro]
(humming, one last bell, the chain creaks)

## When the file comes

- Level it as the other songs (GAME_NOTES.md, "Songs and the Jukebox": trim, two-pass loudnorm to about -16.4 LUFS,
  128 kbit/s MP3) into `music/songs/`.
- Add it to `SONGS` in `js/ui.js`, open it in the Jukebox when the Buoy is first met, and put its words in
  `js/lyrics.js` as Gemini sang them (transcribe with whisper.cpp, model large-v3-turbo, `-mc 0`).
- **Keep the music-box piece** (the user: "we should include it somewhere even if we replace boss music"). The Buoy's
  fights take turns, as the Hermit's two songs do (`pinSong`): the song at the first meeting, "The Rocking Toll" at
  the second, then one of the two at random, each for the whole fight. Both stay in the Jukebox.
- Check the words against WORLD.md. "She is nearly there" is Wren coming down the stair; it says nothing new.
