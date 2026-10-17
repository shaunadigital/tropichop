# TropiChop

Swipe-to-chop Hawaiian fruit game. Static site, no build step.

- `public/` is the site that gets deployed (index.html, game.js, img/, sounds/).
- `assets/` (only in Shauna's local folder, not in git) holds the original generated art. `tools/prep_art.py` turns it into `public/img/*.webp`
  (removes white backgrounds, builds the sliced "inside" images, resizes).
- Sounds: drop real recordings into `public/sounds/` and list them in `public/sounds/manifest.json`,
  for example `{"slice-1": "slice-1.mp3", "coconut-crack": "coconut-crack.mp3"}`.
  Any sound not listed uses the built-in synth placeholder.
  Names: slice-1, slice-2, slice-3, coconut-thunk, coconut-crack, coconut-splash, slippah-slap, wana-hit, swoosh.

Deploy: push to `main` on GitHub (`shaunagits/tropichop`); Vercel builds production automatically. Live at https://games.shauna.digital/tropichop/.

## Sounds in use

All from Pixabay (Pixabay Content License: free to use, no credit required), trimmed and leveled to about -19 dB. Originals are in `assets/sounds-src/` (not in git).

| Game sound | Source (Pixabay id) | Notes |
|---|---|---|
| `slice-1` to `slice-3` | splash 46048, 102492, 80537 | 0.6 s each, picked at random, quiet synth swish on top |
| `coconut-splash` | Universfield water splash 229315 | 1.1 s, layered under the synth coconut crack |
| `coconut-thunk` | Dragon Studio fist banging on hollow surface 494315 | first knock only |
| `slippah-slap` | alex_jauk slap 237622 | |
| `wana-hit` | plastic crunch 83779 | |
| `swoosh` | Universfield fast swoosh 383967 | plays on fast swipes |

Backups downloaded but not used: slap 46792, simple whoosh 382724, knock on door 86241, big crunch 90138, water splash 46402.
Still synth: combo, lucky starfruit, life lost, miss, game over, unlock, menu taps.
