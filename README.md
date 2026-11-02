# SQUEELODY

Squeektoshi's live mixtape: a single-page web app that turns the Squeekchain hamster's live wheel telemetry into generated music (Web Audio, all synthesized), a 60fps glowing wheel, and a free downloadable SVG vinyl for every round.

An independent fan project, not an official Squeekchain product. Data comes from `api.squeekchain.com`; the hamster and the official livestream are at <https://squeekchain.com/>.

## What's here

| Path | What it is |
| --- | --- |
| `site/index.html` | The whole app: inline CSS and JS, no dependencies, no build step needed to run it |
| `site/og.png` | 1200x630 share image (only used by link unfurls) |
| `dist/` | The production export (a copy of `site/`), committed for static hosting |
| `scripts/build.mjs` | Checks that the page is self-contained and copies `site/` to `dist/` |
| `scripts/typecheck.mjs` | Runs TypeScript in strict `checkJs` mode over the inline script |
| `scripts/preview.mjs` | A tiny static server for `dist/` |
| `scripts/validate-revision.mjs` | Browser regressions, real API comparisons and SVG interaction checks; accepts an external Playwright module path |
| `DESIGN.md` | Tokens, type, layout and components |
| `artifacts/validation.md` | What was checked, how, and the results |

The app is plain HTML, CSS and JavaScript. `typescript` is a dev dependency, used only for the typecheck. Nothing from npm ships to the browser.

## Install, preview, rebuild

Requires Node 18 or newer.

```sh
npm install          # dev dependency only (typescript, for the typecheck)
npm run typecheck    # strict checkJs over the inline <script>
npm run build        # validates site/index.html, writes dist/
npm run preview      # serves dist/ at http://localhost:4173/  (Ctrl+C to stop)
```

You can also open `site/index.html` straight from any static host; it needs no build. Asset URLs are relative (`og.png`) and the favicon is inline, so `dist/` works under a gateway subpath or an ENS name.

To change the app, edit `site/index.html`, then run `npm run check` (typecheck plus build) and commit `site/` and `dist/` together.

## How it works

- **Data**: every 15 seconds the app GETs `/v1/status`, `/v1/settlements?range=24h` and `/v1/economy/state`. Each endpoint is parsed strictly; one that fails keeps its last good value and its own successful-fetch timestamp. The last good reading is cached in `localStorage`, so the page still shows it after an offline reload. The status pill reads "API live" when all three answered, and "reconnecting" otherwise. Stale wheel readings show "Cached wheel reading" with their original date and time; successes from other endpoints cannot refresh that time. Legacy caches use the wheel observation time when available, never their unreliable aggregate save time.
- **Mapping** (`buildPattern`): RPM = `rpmMilli / 1000`. Tempo = `40 + (rpm/600)^0.9 × 128`, capped at 168. Mood: NAPPING at 0 RPM or when `coreStatus` is IDLE (40 BPM lullaby, no drums), JOGGING below 500 (A minor pentatonic), ZOOMIES from 500 (A major, with extra kicks on steps 10 and 14). The melody's mulberry32 seed hashes `distanceMm|cumulativeWorkUnits` from this browser's first usable wheel reading paired with the round reported by the economy endpoint. That round keeps its seed as counters advance and across reloads; the last 32 round seed snapshots are cached locally. Tempo, mood voicing, bass and drums still follow current telemetry. The bass root is `blockHeight mod 8` steps up the scale. Kicks fall on steps 0/4/8/12; offbeat hats fill in with `settlementCount` over the last 24 hours.
- **Audio** (`class Engine`): a 16-step sequencer with a 40ms `setTimeout` lookahead scheduler that schedules up to 120ms ahead. Triangle melody, triangle bass on steps 0 and 8, a sine kick swept 150→38 Hz, high-passed noise hats, a convolver reverb with a generated exponential-decay impulse, and a feedback delay. LISTEN is the only action that initializes the AudioContext, and it requires live or explicitly identified cached wheel telemetry. Before that opt-in, POKE only animates the wheel and explains how to enable sound. After opt-in it can squeak while music is paused. Resuming uses the latest pattern; immediately applied patterns clear obsolete queued bars.
- **Vinyl** (`vinylSvg`): a 400x400 SVG whose grooves are seeded by round + block height + distance + work units, so the same reading always presses the same record. The label shows block height and round; the caption shows mood, km, block and the reading's UTC timestamp.
- **Round** is `lifecycle.currentRound` from `/v1/economy/state`.

No wallet, no minting, no fees, no analytics.

## Validation (summary; full record in `artifacts/validation.md`)

Revision checks run on 2026-11-02 against the final source and production export:

- `npm run typecheck`: 0 errors.
- `npm run build`: passed (`dist/index.html` 54,826 bytes, `dist/og.png` 270,260 bytes).
- All five reopened reports were reproduced before editing (`artifacts/revision-baseline.json`). All five are answered in `.imd-responses.json`.
- Playwright revision suite (Chromium, headless): 47 of 47 checks passed. It verifies same-round melodies across polls and reloads, live tempo/mood/bass/drums, bar queues and resume, both audio gates, stale timestamps, offline cache migration and recovery, SVG downloads, keyboard operation, and responsive layout at 320/390/768/1440. Comparisons against the exact three HTTP 200 responses received by the page confirmed RPM, km, block, round, SQK, work, settlements, mood and BPM. Test fixtures are explicitly identified as synthetic; the production page contains no fixture data.
- taste@1 design probe on `dist/`: 15 of 16 checks passed. The one failure (`casing`) is the button labels POKE THE HAMSTER and PRESS THIS ROUND TO VINYL, which the brief quotes in capitals and which were kept on purpose.
- Not performed: WebKit/Safari (the installed browser could not launch because its runtime dependencies were unavailable), real audio listening, screen readers, physical devices, native 200% browser zoom, and animation-panel slow-motion inspection. No results or telemetry were fabricated.

To rerun the browser suite without adding browser tooling to the repository:

```sh
npm install --prefix /tmp/squeelody-test-tools --cache /tmp/squeelody-test-cache --ignore-scripts --no-audit --no-fund playwright@1
PLAYWRIGHT_BROWSERS_PATH=/tmp/squeelody-test-browsers node /tmp/squeelody-test-tools/node_modules/playwright/cli.js install chromium
npm run build
PLAYWRIGHT_BROWSERS_PATH=/tmp/squeelody-test-browsers node scripts/validate-revision.mjs /tmp/squeelody-test-tools/node_modules/playwright/index.mjs
```

The suite owns its preview server and closes it on completion. It writes actual results and screenshots to `artifacts/`. `--hold` optionally keeps the preview available for a bounded browser inspection. The first snapshot is defined per browser because these endpoints supply no historical round-start snapshot; different browsers first joining a round at different times can capture different initial counters. When round metadata is unavailable, status remains playable from its actual reading and is identified with an unknown round.
