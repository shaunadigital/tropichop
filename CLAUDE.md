# TropiChop

Swipe-to-chop Hawaiian fruit game. Live at https://games.shauna.digital/tropichop/ (mounted from https://tropichop.vercel.app by a rewrite in the `shaunagits/games` repo). Read `README.md` for the file layout and sounds, then `_docs/PROJECT_STATUS.md` for what is live, the decisions and why, and what is next.

- Plain static site. `public/` is what deploys: `index.html`, `game.js` (all game code, one IIFE), `img/*.webp`, `sounds/`. No build step, no framework, no dependencies.
- Repository `shaunagits/tropichop`, Vercel project `tropichop`, team `shaunagits-projects`. Output directory `public` (set in `vercel.json` and the project). Every push to `main` deploys to production.
- All asset paths are relative so the game works under `/tropichop/`. Keep them relative.
- Art: Shauna made it with an image generator, using one prompt style for the whole set (prompts were written fruit by fruit to keep the look consistent). Originals live only in her local folder (`assets/`, not in git). `tools/prep_art.py <source_dir> public/img` removes the white backgrounds, builds each fruit's sliced "inside" image (cross-section fitted inside the whole fruit), and writes webp. Per-fruit fit values are in the `FRUITS` table at the top of that script.
- Sounds: `public/sounds/manifest.json` lists the recordings in use; anything not listed falls back to the synth in `game.js` (`SFX`). Sources and processing are in `README.md`.
- Gameplay tuning lives in `game.js`: `FRUITS` and `HAZARDS` tables (size, hit radius, points, hits needed, spawn weight, hazard start score and chance), `gravity()`, and `spawnWave()` (wave size and interval). `UNLOCK_SCORE` (250) unlocks the Beach Sunset background.
- Saves (best score, unlocked backgrounds, chosen background, sound on/off) are in localStorage under `tropichop.*`, per web address. The vercel.app address and games.shauna.digital do not share saves.
- `window.__tropichop` is a small test hook used by `tools/playtest.py`. Keep it.
- No test suite. Check changes with `python3 <repo>/tools/playtest.py https://games.shauna.digital/tropichop/ <screenshot_dir>` (Playwright, desktop and phone sizes; prints score, lives, state and page errors). Point it at a local server for unpushed work: `python3 -m http.server 8765 -d <repo>/public`, then pass `http://localhost:8765/`.
- Shauna's local folder `~/Desktop/claudecode/tropichop` is NOT a git clone. It holds the original art and sound downloads plus a copy of the site. GitHub is the source of truth for code.
- No em dashes in any text. No AI or assistant credit in code, commits, or docs.
- "Fruit Ninja" and its art and sounds belong to Halfbrick. Use only the game's own name and original art.
