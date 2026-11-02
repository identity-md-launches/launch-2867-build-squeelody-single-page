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

- **Data**: every 15 seconds the app GETs `/v1/status`, `/v1/settlements?range=24h` and `/v1/economy/state`. Each endpoint is parsed strictly; one that fails keeps its last good value. The last good reading is cached in `localStorage`, so the page still shows it after an offline reload. The status pill reads "API live" when all three answered, and "reconnecting" otherwise.
- **Mapping** (`buildPattern`): RPM = `rpmMilli / 1000`. Tempo = `40 + (rpm/600)^0.9 × 128`, capped at 168. Mood: NAPPING at 0 RPM or when `coreStatus` is IDLE (40 BPM lullaby, no drums), JOGGING below 500 (A minor pentatonic), ZOOMIES from 500 (A major, with extra kicks on steps 10 and 14). Melody notes come from mulberry32, seeded with a hash of `distanceMm|cumulativeWorkUnits`. The bass root is `blockHeight mod 8` steps up the scale. Kicks fall on steps 0/4/8/12; offbeat hats fill in with `settlementCount` over the last 24 hours.
- **Audio** (`class Engine`): a 16-step sequencer with a 40ms `setTimeout` lookahead scheduler that schedules up to 120ms ahead. Triangle melody, triangle bass on steps 0 and 8, a sine kick swept 150→38 Hz, high-passed noise hats, a convolver reverb with a generated exponential-decay impulse, and a feedback delay. The AudioContext is created only when you press LISTEN (or POKE).
- **Vinyl** (`vinylSvg`): a 400x400 SVG whose grooves are seeded by round + block height + distance + work units, so the same reading always presses the same record. The label shows block height and round; the caption shows mood, km, block and the reading's UTC timestamp.
- **Round** is `lifecycle.currentRound` from `/v1/economy/state`.

No wallet, no minting, no fees, no analytics.

## Validation (summary; full record in `artifacts/validation.md`)

Run on 2026-11-02 against the final source:

- `npm run typecheck`: 0 errors.
- `npm run build`: passed (`dist/index.html` 51,875 bytes, `dist/og.png` 270,260 bytes).
- Playwright interaction suite (Chromium, headless): 39 of 39 checks passed. It compared the page with the three live endpoints (RPM, km, block, round, SQK minted, work units, settlements, mood, BPM all matched). It then used mocked ZOOMIES, JOGGING and IDLE readings to test LISTEN on and off (AudioContext running, kicks scheduled), POKE, and PRESS: download name, 400x400, label, caption, the same reading gives an identical file, a new reading gives a different one, and the SVG parses. It also tested offline fallback and offline reload from cache, the empty first-load state, tab order, Space on LISTEN, and no horizontal scroll at 320.
- taste@1 design probe on `dist/`: 15 of 16 checks passed. The one failure (`casing`) is the button labels POKE THE HAMSTER and PRESS THIS ROUND TO VINYL, which the brief quotes in capitals and which were kept on purpose.
- Not performed: WebKit/Safari (Playwright's WebKit cannot launch on this machine because of missing system libraries), real audio listening, screen readers, physical devices, and 200% browser zoom.
