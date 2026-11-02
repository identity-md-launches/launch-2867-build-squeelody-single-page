# SQUEELODY design system

Everything lives in one file, `site/index.html`: tokens and components in the `<style>` block at the top, behaviour in the inline `<script>`. `dist/index.html` is a byte-for-byte copy made by `npm run build`.

## Overview

SQUEELODY is a toy for people who follow the Squeekchain hamster: open it, press LISTEN, and the live wheel plays music. The look is dark neon and monospace, as the brief asked. One mood colour (blue, amber or orange-red) carries the whole page and changes with the hamster's state. The page is built around one large stage (the canvas wheel and its three buttons), with data and explanations beside it on wide screens and below it on phones. Density is low: a few cards on flat dark surfaces, no decoration apart from the mood glow.

## Colors

All colours are hex custom properties on `:root` (`site/index.html`, top of `<style>`).

| Token | Value | Role |
| --- | --- | --- |
| `--color-bg` | `#07080d` | Page background, plus a soft radial wash of `--color-glow` at 14% |
| `--color-surface` | `#10131c` | Cards, the stage frame, the vinyl panel |
| `--color-surface-raised` | `#171b27` | Status pill, skip link |
| `--color-text` | `#e8ecf5` | Primary text, readout values |
| `--color-text-muted` | `#a3acc2` | Labels, secondary copy, footer, units |
| `--color-focus` | `#ffffff` | 2px `:focus-visible` outline |
| `--color-live` | `#3ddc84` | "API live" pill (always shown with its text) |
| `--color-warn` | `#ffb547` | "reconnecting" pill (always shown with its text) |
| `--mood-nap` / `--mood-jog` / `--mood-zoom` | `#6cb8ff` / `#ffb547` / `#ff6a3d` | Mood primitives; never used directly in components |
| `--color-glow` | one of the three moods | The accent: primary button fill, button borders, links, mood pill, explainer rules, canvas wheel |
| `--color-on-glow` | `#07080d` | Text on a `--color-glow` fill |

`--color-glow` switches through `body[data-mood="NAPPING|JOGGING|ZOOMIES"]`, which `render()` sets from live data. The canvas and the SVG vinyl read the same three values from the `MOOD_COLORS` constant in the script, so keep the two in sync when changing a mood colour. The mood is always also written out as a word (NAPPING, JOGGING, ZOOMIES), so it never depends on colour alone. The taste@1 probe measured every text pair at 320, 390 and 1440 wide in the NAPPING state and found no contrast failures.

## Typography

- Families: `--font-mono` (system monospace stack: ui-monospace, SF Mono, JetBrains Mono, Cascadia Mono, Menlo, Consolas, Liberation Mono) for the product name, headings, buttons and numbers; `--font-sans` (system-ui stack) for sentences: the tagline, the status line, readout labels, explainer, vinyl blurb and footer. No web fonts are loaded.
- Weights: 400 and 700 only.
- Scale, five sizes: `--text-xs` 12px (labels, units, footer, pill), `--text-sm` 14px (buttons, prose), `--text-md` 16px (body, readout values), `--text-lg` 20px (section headings, and readout values from 72rem up), `--text-xl` 32px (the `h1`).
- Line height 1.5 for body text, 1.1 for headings. The `h1` uses -0.02em tracking; nothing else is tracked.
- Headings use `text-wrap: balance`, prose uses `text-wrap: pretty`, explainer lines cap at 65ch and the footer at 75ch.
- Changing numbers (`.card dd`, the "Updated" time) use `font-variant-numeric: tabular-nums`. Long values (SQK minted, addresses) use `overflow-wrap: anywhere` and are never clipped.

## Layout

- Spacing scale: `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-6` 24px, `--space-8` 32px. Inside a group the gap is 8 to 12px; between sections it is 24px.
- Page width is capped at 90rem with 16px inline padding. The header, `main.layout` and footer share that edge.
- Below 60rem: one column, in this order: header, stage (canvas, buttons, status line), live readout, vinyl, explainer, contracts, footer.
- From 60rem: two columns `minmax(0, 1.35fr) minmax(20rem, 1fr)`. The stage is on the left and sticky (`top: 16px`) while the panel scrolls.
- Stage canvas: square, capped at `min(68vh, 44rem)` tall; below 30rem it is 6:5 so the three buttons stay on a 390x844 first screen.
- Buttons stack one per row below 36rem and sit in one row from 36rem (`auto auto 1fr`, so PRESS takes the remaining width).
- Readout grid: `repeat(auto-fit, minmax(9.5rem, 1fr))`: one column at 320, two at 390, three in the desktop panel.
- Checked with screenshots at 320, 390 and 1440. There is no horizontal scroll at any of these widths.

## Elevation & Depth

The page is flat. Depth comes from tone (`--color-surface` on `--color-bg`) and from the mood glow: a radial gradient on the body and the stage frame, and `shadowBlur` on the canvas rim that pulses with the kick drum. There are no box shadows, and no surface has both a border and a shadow.

## Shapes

`--radius-sm` 8px (skip link), `--radius-md` 12px (buttons, readout cards), `--radius-lg` 20px (stage frame, vinyl panel), `--radius-pill` (status pill). The vinyl preview is a circle. Buttons are the only bordered elements (2px `--color-glow`), which marks them as controls.

## Components

- **Button** (`.btn`, `.btn-primary`): minimum 48px tall, mono 14px bold. `.btn-primary` (LISTEN) is the one filled action. It is a toggle with `aria-pressed`: pressed, it turns into an outline and its icon changes from play to pause, while the label stays "LISTEN". Hover is gated by `@media (hover: hover)`. Press uses `scale: 0.96`. Transitions are named (`background-color, color, border-color, scale`, 150ms, `cubic-bezier(0.2, 0, 0, 1)`). Focus shows a 2px white outline with a 3px offset.
- **Status pill** (`.pill[data-state]`): `connecting` (muted), `live` ("API live", green, with a slow breathing dot that only animates when reduced motion is off), `reconnecting` (amber). It is a `role="status"` region.
- **Readout card** (`.card` in `dl.readouts`): a `dt` label in 12px sans and a `dd` value in mono bold, with an optional `<small>` unit. While loading, values show "…" in muted colour (`[data-loading="true"]`).
- **Mood pill** (`.mood`): a dot plus the mood word in `--color-glow`.
- **Status line** (`#now`, `role="status"`): one sentence on what the music is doing. Poke and press messages replace it for 5 seconds.
- **Wheel stage** (`class Wheel`, canvas): 12 spokes, a glowing rim, a block-progress arc, rim particles while running, and a hamster emoji that bobs (napping adds a floating "zz"). Under `prefers-reduced-motion: reduce` the wheel stops rotating and there are no particles or bobbing. Its `aria-label` describes the live state.
- **Vinyl** (`vinylSvg()`, `.vinyl` panel): a deterministic 400x400 SVG. The preview `<img>` updates when the telemetry changes; PRESS downloads the same SVG.
- **Explainer list** (`.explain li`): a bold mono term, then a sans sentence, with a 2px inline-start rule in the mood colour.

## Do's and Don'ts

- Do take colour from `--color-glow` for anything interactive or mood-related, and from the neutral tokens for everything else. Don't use the `--mood-*` primitives directly in components.
- Do keep exactly one filled button per view (LISTEN). Other actions use outline buttons.
- Do keep the five-size scale. A new role should reuse a size, not add one.
- Do use mono for names, numbers and controls, and sans for sentences of six or more words.
- Don't add borders to cards or shadows to buttons. Depth is tonal.
- Don't animate without a `prefers-reduced-motion` guard, and never use `transition: all`.
- Recipe for a new section in the panel: a `<section aria-labelledby>` holding `.section-head` (an `h2` plus an optional muted note on the right), then content in `.card` tiles or sans paragraphs. Put it inside `.panel`, which already handles the grid gap and both layouts.
