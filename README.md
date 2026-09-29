# Pepe Premiere

A tiny, public-ready studio for Swarm Pepe collectors. Enter a token ID, use its actual Ethereum artwork, pick Spotlight, Orbit or Glitch, and write a short title. Download a vertical PNG or a six-second silent MP4. No account, wallet, backend, API key, or upload is needed.

The finished static site is **`dist/index.html`**. Publish the entire `dist/` directory. Its **Get the source** link downloads `dist/source.zip`, a complete, rebuildable copy of the source, lockfile, local assets, tests, licenses and documentation. The source is also delivered as ordinary files alongside `dist/`.

## Install, run and rebuild

Use Node.js 22 LTS (checked with 22.22.1) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For the production export:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` runs Vite and creates the source download using Node's built-in ZIP/compression support. It requires no Python, external CDN, or vendored registry. `npm run preview` serves `dist/`; open the URL printed by Vite. Use an HTTP server, rather than opening `index.html` with `file://`.

`node_modules`, package-manager caches, browser downloads and temporary test output are development-only. Never include them in a submission or upload. No ignore file is supplied or changed. Use explicit source paths when staging; the complete delivered files must stay below 8 MiB. The package script uses an explicit source allowlist and never archives dependencies or prior exports.

## Publish the website and source

Upload **all contents of `dist/`**, including `assets/`, `fonts/`, `source.zip` and metadata/artwork files, to a public static host. The contributor publisher can serve this committed export directly; it does not need to rebuild it. Alternatively, use a host's static-directory upload and choose `dist/` as the published directory. Keep directory structure intact.

Vite's `base` is `./`; generated script, stylesheet, font and encoder URLs are relative. The site was checked at `/preview/`, so it can live at a gateway subpath or ENS-linked static location. There is one page with hash anchors and no server route rewrites. Serve `.js` as JavaScript, `.json` as JSON and `.woff2` as font/woff2. Public HTTPS is recommended. A restrictive Content Security Policy must allow the two RPC hosts, `img-src data:`, `worker-src blob:`, and the bundled WebAssembly encoder; no COOP/COEP headers are required.

After uploading, check Load Pepe, both downloads, and Get the source at the public URL. No external hosting account or deployment URL was provided in this assignment; the production directory and source archive are the publishing deliverables. A remote deployment is not claimed.

## What is authentic

Collection: **Swarm Pepe**, Ethereum mainnet, [`0x999ce0ce8c5f7661e0c74a568ffe27ceb9177bdb`](https://etherscan.io/address/0x999ce0ce8c5f7661e0c74a568ffe27ceb9177bdb#code).

The studio calls `tokenURI(uint256)` at a pinned block. Both metadata and original SVG are embedded on-chain. The five revealed traits are shown verbatim. A token with `Status: Unrevealed` retains its contract's mystery artwork and exposes no invented traits. An unminted ID is an error, not a mystery card. IDs run from 1–5,000; some may not be minted.

The initial card is explicitly a **saved example** of real token #1 at block 26,085,433. It makes the editor immediately usable. Select Load Pepe to refresh from Ethereum. Errors retain the existing card and say which token is still displayed; there is no silent substitution for a failed live read. The RPC requests disclose the requested public token ID to Publicnode/dRPC, but exports and title editing stay on your device. Full provenance and historical unrevealed fixtures: [docs/ONCHAIN.md](docs/ONCHAIN.md).

## Exports and limits

- **PNG:** 1080 × 1920, fixed opening frame. Pausing the preview does not choose a different PNG frame.
- **MP4:** 720 × 1280, H.264 Baseline / yuv420p, 24 fps, exactly 144 frames / six seconds, no audio track. Add music inside Reels/TikTok after upload.
- The same canvas renderer powers the preview and exports. The whole original artwork remains contained and recognisable; effects sit around its frame.
- Video encoding runs locally in a worker, with progress and cancellation. Keep the tab open. Rendering took approximately 5–10 seconds in this Chromium environment; slower devices may take longer.
- Live lookups depend on public RPC availability. Each endpoint has a 12-second timeout with fallback. A real 429 was observed and successfully recovered through dRPC.
- The local fonts, saved example and encoder ship with the site. No runtime CDN is needed. This is not an offline-caching PWA; the site must first be served and loaded.
- Chromium was checked. Safari, Firefox, physical iOS/Android, screen readers, native browser 200% zoom and actual uploads inside social apps were not tested. Device download prompts and platform acceptance can differ.

## Actual validation

Production build and strict TypeScript check passed. **Seven collection tests passed.** Browser checks exercised all three styles, title editing, blank/maximum title, invalid and unminted IDs, live revealed #1, live unrevealed #980, a simulated total RPC outage, cancellation, PNG downloads and all three MP4 downloads. `ffprobe` confirmed dimensions, codec, duration, frame count and absence of audio. Browser widths of **1440, 760, 390 and 320 CSS pixels** had no horizontal overflow. Reduced-motion startup and native keyboard radio/dialog behavior passed. Automated axe checks found no violations in the final checked editor and dialog states, with manual-review items documented.

The worker initially used dependencies outside the repository and a scratch resolver config, then verified the documented npm commands in an isolated source checkout. The complete command results, fixes, six-domain Better Interface review, contrast measurements, screenshots and limits are in [artifacts/validation.md](artifacts/validation.md); media details are in [artifacts/export-checks.json](artifacts/export-checks.json). These are worker observations, not independent certification.

## Source map

- `src/collection.ts`: bounded read-only RPC calls, ABI decoding and exact trait handling.
- `src/card.ts`: three motion styles and shared 9:16 renderer.
- `src/export.ts`: PNG creation and local worker-based MP4 encoding.
- `src/main.tsx`, `src/style.css`: responsive editor and accessible controls.
- `public/`: authentic examples, locally hosted fonts and favicon.
- `scripts/package-source.mjs`: deterministic public source archive.
- `test/`: real metadata fixtures and collection behavior tests; `test/scratch/` is not delivered.
- [DESIGN.md](DESIGN.md): implemented visual tokens, components and responsive behavior.

Original studio code is MIT licensed. Artwork rights are separate. See [THIRD_PARTY.md](THIRD_PARTY.md) for runtime, fonts and design-guidance notices.
