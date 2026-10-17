# Project status

Last updated 2026-10-16.

## Live now

Everything below is committed to `main` and deployed to https://games.shauna.digital/tropichop/ (and https://tropichop.vercel.app). Play-test passed on the live site at desktop and phone sizes, no page errors (2026-10-16).

- 8 fruits: lilikoi, guava, lychee, mango, dragon fruit, pineapple (2 hits, 2 pts), coconut (3 hits, 3 pts), starfruit (rare, 5 pts, star slices fly out). Each splits along the swipe line and shows its own cross-section, with its own juice, seeds and a fading stain.
- Hazards: wana (from score 3) and Aunty's slippah (from score 15). A hit costs a life, shakes the screen and shows "Ouch, wana!" or "Ho, Aunty!".
- 3 hibiscus lives. A dropped fruit costs one. Game over screen says "Pau!".
- Combos (3 or more fruit in one swipe), pause, best score, sound on/off.
- Backgrounds: Koa Board (default) and Beach Sunset (unlocks at 250 points in one round, with a toast). Both are blurred and darkened during play.
- Sounds: real recordings for slices, coconut thunk and crack splash, slippah slap, wana crunch and fast-swipe swoosh. Synth for combo, lucky, life lost, miss, game over, unlock and taps.
- Menu has a "More games" link to https://games.shauna.digital/.
- Card on the games page: logo over the beach sunset, first in the list with the "New" sticker (that change lives in the `shaunagits/games` repo).
- A private preview artifact from before the Vercel deploy also exists (Claude artifact "TropiChop"). It is the first, easier version and is not kept up to date.

## Decisions

Append new rows. If a row stops being true, mark it superseded rather than deleting it.

| Date | Decision | Why |
|---|---|---|
| 2026-10-16 | Name is TropiChop. | Shauna's pick. The slicing idea is fair game, but the Fruit Ninja name, art and sounds are Halfbrick's. |
| 2026-10-16 | The cut follows the exact swipe angle. | Feels earned and every slice looks different. Shauna agreed. |
| 2026-10-16 | Fruit insides use Shauna's generated cross-section images, clipped along the swipe line, not code-drawn insides. | Her art came out painterly; code-drawn insides would look flat next to it. |
| 2026-10-16 | Starfruit halves show plain pale flesh; the star image is used for the flying star slices. | A star cross-section cannot fit inside the oblong whole fruit. |
| 2026-10-16 | Papaya dropped, lychee added. | Papaya looked too close to mango at game speed. |
| 2026-10-16 | Guava regenerated greener. | The first one was yellow and speckled, too close to lilikoi. |
| 2026-10-16 | Hazards are Aunty's slippah and the wana (no lava rock). | Shauna's pick. Slippah is bright blue because no fruit is blue. |
| 2026-10-16 | 3 lives; hazard hit or dropped fruit costs one. | Friendlier than instant game over for casual players. |
| 2026-10-16 | Coconut takes 3 hits, pineapple 2, starfruit is rare and lucky. | Shauna liked it. Gives the set variety. |
| 2026-10-16 | Koa is the default background; Beach Sunset unlocks at 250. | Koa is calmer to play on; the unlock gives a reason to keep playing. 250 is a first guess, tune after play-testing. |
| 2026-10-16 | Best score and unlocks saved per device only, no shared leaderboard. | A leaderboard needs a database and cheat protection. Later, if wanted. |
| 2026-10-16 | Sound effects only, no music. | Shauna's call. |
| 2026-10-16 | Difficulty raised before launch: waves every 1.7 s down to 0.7 s by about 90 s (was 2.3 to 0.85), bigger waves (up to 7), bursts from 15 s, faster gravity ramping 35% over 160 s, hazards from score 3 and 15 with higher chances, no extra hit forgiveness on fruit. | Shauna found the first version too easy. Aims for the usual arcade curve: easy first 10 to 20 s, busy by 1 minute, near max by 2 to 3 minutes. |
| 2026-10-16 | Mouse slices on movement without holding a button; touch slices while the finger is down. A segment must move faster than 420 px/s to cut. | Hover slicing is friendlier on desktop; the speed floor stops slow drags from cutting. |
| 2026-10-16 | Deployed through GitHub (repo `shaunagits/tropichop`) connected to Vercel, not through direct Vercel uploads. | The Vercel connector needs file contents passed inline, about 1.6 MB of images; not workable. Shauna's computer had no Vercel login. See `_docs/findings/2026-10-16-deploy-and-sounds.md`. |
| 2026-10-16 | Sounds come from Pixabay (free, no credit needed), downloaded through Shauna's Chrome. | The cloud workspace and her computer's shell both get 403 from Pixabay. |
| 2026-10-16 | Slices are three short splashes picked at random, with a quiet synth swish on top. | Repeating one clip sounds robotic; splashes alone lacked a knife edge. |

## Queue

1. Shauna to play-test the harder difficulty and the new sounds, then tune: any sound too loud or wrong (each has a backup downloaded, see README), wave speed, hazard rates, the 250 unlock.
2. Optional: more unlockable backgrounds (lava field, rainforest, lanai at night) at later score milestones.
3. Optional: a shared leaderboard (needs a database and cheat protection).
4. If art changes: rerun `tools/prep_art.py` against the originals in Shauna's local `assets/fruit` folder; the file-to-fruit mapping is the hash prefix table in that script.
