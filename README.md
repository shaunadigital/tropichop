# TropiChop

Swipe-to-chop Hawaiian fruit game. Static site, no build step.

- `public/` is the site that gets deployed (index.html, game.js, img/, sounds/).
- `assets/` holds the original generated art. `tools/prep_art.py` turns it into `public/img/*.webp`
  (removes white backgrounds, builds the sliced "inside" images, resizes).
- Sounds: drop real recordings into `public/sounds/` and list them in `public/sounds/manifest.json`,
  for example `{"slice-1": "slice-1.mp3", "coconut-crack": "coconut-crack.mp3"}`.
  Any sound not listed uses the built-in synth placeholder.
  Names: slice-1, slice-2, slice-3, coconut-thunk, coconut-crack, slippah-slap, wana-hit, swoosh.

Deploy: `vercel deploy --prod` from this folder (vercel.json sets `public` as the output).
