# Deploying and fetching sounds from a cloud session (2026-10-16)

## Questions

1. How do we get a static site with about 1.2 MB of images onto Vercel from a cloud session?
2. How do we get Pixabay sound files into the project?

## Deploy: what was tried

- **Vercel connector `create_deployment` / `upload_file`.** Both take file contents inline (base64). Fine for a few text files, not workable for images totalling about 1.6 MB of base64. Rejected.
- **Vercel CLI on Shauna's computer (device shell).** The shell is a Linux VM, not her Mac session: `vercel whoami` said logged out, and `api.vercel.com` returned 403 through its proxy. Rejected.
- **`gh` in the cloud workspace.** `GH_TOKEN` was invalid, and sessions cannot create repositories anyway.
- **What worked:** Shauna created the empty repo `shaunagits/tropichop`; the session attached it, pushed, then created the Vercel project with `create_project` and `gitRepository: {type: github, repo: shaunagits/tropichop}`, `outputDirectory: public`, `framework: null`. The next push deployed to production within about a minute. `tropichop.vercel.app` was publicly reachable even though the project defaults to `ssoProtection: all_except_custom_domains`.

## Sounds: what was tried

- `curl` to `pixabay.com` and `cdn.pixabay.com` returns 403 from both the cloud workspace and the device shell. WebFetch can read search pages but not download audio.
- **What worked:** Claude in Chrome, in Shauna's own browser.
  - Search pages and detail pages can be fetched same-origin from a pixabay.com tab with `fetch()`. The detail page HTML contains the direct file URL: `https://cdn.pixabay.com/download/audio/.../audio_xxx.mp3?filename=<author>-<name>-<id>.mp3`.
  - The mp3 can be fetched and decoded in the page (`OfflineAudioContext.decodeAudioData`) to measure real length, onset, tail and number of separate hits. The listed duration on the search page is not reliable for picking short clips.
  - Do long analysis loops as a background promise stored on `window` and poll; a single `javascript_tool` call times out at about 45 s.
  - Saving: create a Blob URL and click an `<a download>`. Chrome blocks every download after the first from a site until the user allows "multiple downloads" for it (address bar icon). Shauna allowed it for pixabay.com on 2026-10-16.
  - Files land in `~/Downloads`; the session then asked for access to that folder and copied them to `assets/sounds-src/` in the local project folder.
- Downloading counts as an action that needs Shauna's OK in chat: list file names, source and sizes first.

## Processing

- Trim leading silence, cut to the first hit for multi-knock clips, fade the end, level to about -19 dB RMS, cap peaks at 0.89, mono 44.1 kHz mp3 at 96 kbps. A small numpy plus ffmpeg script did this (not kept in the repo; easy to rebuild from these numbers).

## Check before redoing

- Whether the Vercel connector has gained a way to upload from a URL or a repo path.
- Whether Pixabay is still blocked from the workspace (`curl -s -o /dev/null -w "%{http_code}" https://cdn.pixabay.com/`).
