# Pepe Premiere design

## Overview

A compact studio for collectors making short-form social cards. The implemented direction is warm paper, dark olive ink, a citrus export action, and a large vertical “collector cut.” Controls and numbered steps sit on a quiet surface beside the preview. One restrained serif word adds an editorial accent; pixel artwork remains the hero. This is an inferred design for this assignment, not an official Swarm Pepe brand system.

Source of truth: `src/style.css` for the interface, `src/card.ts` for the exported compositions, and `src/main.tsx` for semantics and state. The single page uses native controls and no component-library dependency.

## Colors

The interface uses a consistent sRGB hex system. Semantic custom properties are in `src/style.css:15`.

| Token | Value | Implemented job |
| --- | --- | --- |
| `--paper` | `#f5f3ec` | Page background |
| `--surface` | `#fffef9` | Editor, inputs, secondary actions, dialog |
| `--ink` | `#252b22` | Primary text and dark Load Pepe action |
| `--muted` | `#65695e` | Hints, small labels, secondary copy |
| `--border` | `#d9dbce` | Structural dividers and panel edges |
| `--field-border` | `#858c7b` | Input and outlined-action boundaries |
| `--accent` / `--accent-hover` | `#d8ed74` / `#cce260` | Primary video export and its hover state |
| `--accent-ink` | `#29341b` | Text on the accent fill |
| `--stage` | `#e7e9df` | Preview surroundings |
| `--soft` | `#eeeee5` | Loaded-token summary and quiet hover fill |
| `--focus` | `#476623` | Visible keyboard focus |
| `--error` | `#9c3229` | Persistent, actionable error copy |

The logo also uses the citrus brand accent; action priority is carried by shape, label and location as well as fill. There is one light interface theme. Card palettes are creative options, not global themes:

| Card | Background / text / secondary / frame / accent |
| --- | --- |
| Spotlight | `#dcec98` / `#25351b` / `#536139` / `#faf8ed` / `#bfd27d` |
| Orbit | `#232242` / `#f5edff` / `#cbc0e8` / `#ede5fa` / `#7474ad` |
| Glitch | `#ec825c` / `#291f1c` / `#633429` / `#fff1df` / `#c75043` |

Measured text pairs include ink/paper 13.07:1, muted/paper 5.06:1, muted/surface 5.57:1, and accent-ink/accent 10.17:1. Final boundary and focus measurements are recorded in `artifacts/contrast.json`. Gradient/card decoration contrast is not exhaustively certified for every animated frame.

## Typography

Local variable WOFF2 fonts: `public/fonts/dm-sans.woff2` (DM Sans, declared 100–1000 normal) and `space-grotesk.woff2` (Space Grotesk, 300–700 normal). Both loaded successfully in the inspected browser. Font files retain their SIL OFL notices. Body/interface copy uses DM Sans with sans-serif fallback; display and section headings use Space Grotesk with sans-serif fallback. Georgia italic is used only for “energy.” The system fallback supplies that word; it is not a downloaded font.

Root text is 16px/1.5. Implemented type tokens are 12, 13, 16, 18 and 22px equivalents (`--text-xs`, `--text-sm`, `--text-base`, `--text-lg`, `--text-heading`). Dense auxiliary desktop captions use explicit 9–11px values; mobile hints increase to 12px. Inputs remain 16px on every viewport. Heading is `clamp(40px, 4.3vw, 59px)`/1.05 with −2.6px tracking, then adapts at the documented breakpoints. Step titles use 18px/500; mobile step titles use 19px. Eyebrows are uppercase, 11px/600 with 1.6px tracking; the UI stores natural-language strings.

Headings use balanced wrapping; prose uses pretty wrapping. Long trait values use `overflow-wrap:anywhere`. Counters and playback times use tabular numerals. Canvas title starts at 74px in its 1080px coordinate system, wraps to two lines, and shrinks in 2px steps when necessary to preserve all 36 allowed characters. Blank titles use “Ready for my close-up.” Card labels use 22–28px. The renderer uses the same local font families after fonts are ready.

## Layout

`main` and `.site-header` share a maximum width of 1280px with 40px side padding. The studio has a 0.86:1.14 editor/preview grid, minimum tracks of 360px and 400px. Editor padding is 26px/30px; steps have about 26–27px separation with 7–16px gaps inside groups. Adjacent controls have 9–10px gaps. The provenance section sits beneath the studio with a five-column trait list.

Implemented content breakpoints:

- ≥1400px: larger intro spacing and 316px-wide preview card.
- ≤1050px: 28px page padding, balanced studio tracks, 288px card, smaller intro; side stage caption is removed.
- ≤800px: denser 300/280px grid, smaller panel padding, provenance stacks beneath its heading.
- ≤650px: 20px page padding; studio stacks editor then preview, with a **View preview** anchor. The preview remains full 9:16, up to 295px wide. Traits form three columns. Header source link moves out of the compact header; the same source download remains in How it works.
- ≤370px: 14px page padding, 17px panel padding, two-column traits, compact export buttons and playback labels.

Browser inspection at 1440, 760, 390 and 320 CSS pixels established no horizontal page overflow. Controls remain in normal document flow. No fixed bottom bar covers the artwork. Full native zoom, RTL localization and physical device safe areas were not exhaustively tested; English is the implemented language.

## Elevation & Depth

The page and editor use tonal backgrounds and 1px structural borders. Only the collector card and help dialog are elevated: card shadows are `0 16px 32px #26301821` and `0 3px 7px #26301814`; the dialog is `0 24px 90px #0003`. The native dialog backdrop uses `#22291dcc` and 3px blur. Its content scrolls within a bounded viewport with overscroll containment. The canvas uses a gentle frame shadow and a low-opacity black artwork outline.

## Shapes

The studio is a 12px rounded container. Inputs and rectangular buttons use 5px radii; thumbnails and loaded summaries use 6px; the displayed canvas is clipped to 4px. Step numbers, selected checks and play control use circles. Card motion rotates the whole uncropped artwork frame. The canvas frame is deliberately square to resemble a printed collector card.

## Components

These are implemented patterns inside `App`, not a separately exported component library:

- **Brand/header:** home hash link, native help button and direct source-download link. Shared page edges.
- **Token form:** visible label, numeric input mode, native submit. Loading disables dependent actions. Invalid IDs are announced next to the field and receive focus. Successful reads show token, reveal state and read source. Failed lookups keep the prior artwork with an explicit “Still showing” message.
- **Style options:** one native radio group inside a fieldset. Three artwork thumbnails, selected perimeter and check. Native arrows change selection. The full label is the pointer target; hidden inputs remain keyboard accessible. Focus is drawn around the thumbnail.
- **Title field:** 36-character input, visible counter and fallback hint. Title remains editable until an export begins. No artwork or title is uploaded.
- **Export actions:** neutral PNG and citrus MP4 buttons. Controls freeze the captured card during export; a named native progress bar and Cancel export button appear for MP4. Result messages use a stable polite status region; errors persist in an alert.
- **Canvas preview:** named image role with token, reveal state, style and title in its accessible name. Revealed traits are also real DOM text in a definition list. Pause/Play has a dynamic accessible name and text state. Reduced-motion preference disables autoplay; paused previews do not run a continuous animation loop.
- **Help dialog:** native `dialog`, heading-associated accessible name, close button, Escape handling/focus return supplied by the platform. Source and contract links remain ordinary links.
- **Icon:** `Icon` in `src/main.tsx` accepts named glyph and optional size. Inline SVGs use currentColor and 1.7px stroke; decorative icons are hidden from assistive technology.

Focus uses a 3px outline with 4px offset; the token-input wrapper uses a 3px offset. In forced-colors mode the focus color is `Highlight`. Enabled presses scale to 0.96; the effect is removed for reduced motion. Interaction transitions are 120ms, named properties only. Preview animation loops every six seconds: slow float/light for Spotlight, orbital rings for Orbit, and small stepped offsets/digital details for Glitch. There are no flashing full-screen effects or motion overlays over the artwork.

## Do's and Don'ts

- Reuse semantic color roles and the shared page-width edges. Start any small informational page with those primitives, the existing heading/body pair, and ordinary links.
- Keep one clearly emphasized video action; use the neutral outline for peer exports and the dark local submit action for fetching a token.
- Preserve the same `drawCard` renderer for preview and downloads, and contain the original image instead of cropping it.
- Keep title and frame decoration in separate regions, and fit long titles rather than clipping them.
- Preserve native fields, radios and dialog behavior when adding controls. Provide a keyboard path and persistent labels.
- Show the source and age of saved data. Never use guessed traits or turn a network failure into an unrevealed-token state.

The six-domain review and limits are in `artifacts/validation.md`. Design guidance attribution and preserved licenses are in `THIRD_PARTY.md` and `docs/design-guidance-LICENSE.txt`.
