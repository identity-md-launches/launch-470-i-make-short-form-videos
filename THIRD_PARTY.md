# Third-party software and design credits

These components retain their own licenses. Pepe Premiere does not modify the encoder's distributed browser runtime or its native dependencies. The application's license does not relicense collection artwork, branding, fonts, or third-party software.

| Component | Use | License and local notice |
| --- | --- | --- |
| React and React DOM 19.1.0; Scheduler 0.26.0 | User interface runtime | MIT, copyright Meta Platforms, Inc. and affiliates; [license](licenses/React-MIT.txt) |
| h264-mp4-encoder 1.0.12 | Locally bundled H.264 encoder and MP4 writer | MIT, copyright 2020 Trevor Sundberg; [license](licenses/h264-mp4-encoder-MIT.txt) |
| libmp4v2 | MP4 container writer included in the encoder | Mozilla Public License 1.1; [license](licenses/libmp4v2-MPL-1.1.txt), [copyright notice](licenses/libmp4v2-NOTICE.txt), source availability below |
| minih264 | H.264 implementation included in the encoder | CC0 1.0 Universal public-domain dedication; [complete text](licenses/minih264-CC0-1.0.txt) |
| Encoder browser polyfills | Dependencies already embedded in the upstream browser bundle | [Package-by-package licenses and notices](licenses/encoder-bundled-NOTICES.txt) |
| Vite 6.4.3 | Development server and production bundler | MIT; [upstream license and bundled dependency notices](licenses/Vite-LICENSE.txt). Vite itself is a build dependency. |
| DM Sans | Interface and card typography | SIL Open Font License 1.1; [license](public/fonts/DM-Sans-LICENSE.txt) |
| Space Grotesk | Display and card typography | SIL Open Font License 1.1; [license](public/fonts/Space-Grotesk-LICENSE.txt) |

## Encoder source availability

The exact npm package is pinned by the application lockfile. Its published `gitHead` is [`6d177fd043157606224cef4702e134dd31f6adfa`](https://github.com/TrevorSundberg/h264-mp4-encoder/tree/6d177fd043157606224cef4702e134dd31f6adfa). This revision includes the encoder wrapper source and build instructions. Its upstream dependency revisions are:

- **libmp4v2:** [`d49b4466ed76fc23b59e31a5f7f10f34b30ad7c4`](https://github.com/TrevorSundberg/libmp4v2/tree/d49b4466ed76fc23b59e31a5f7f10f34b30ad7c4), including the upstream Emscripten changes. [Download that source revision](https://github.com/TrevorSundberg/libmp4v2/archive/d49b4466ed76fc23b59e31a5f7f10f34b30ad7c4.zip). That covered source is available under MPL 1.1, independently of this application's MIT license.
- **minih264:** [`25f441086ac8f2eef1c883476c095f9397843ac8`](https://github.com/TrevorSundberg/minih264/tree/25f441086ac8f2eef1c883476c095f9397843ac8). [Download that source revision](https://github.com/TrevorSundberg/minih264/archive/25f441086ac8f2eef1c883476c095f9397843ac8.zip).

The embedded JavaScript package inventory was taken from the distributed encoder's browser source map. License texts in `licenses/encoder-bundled-NOTICES.txt` came from the exact package versions in the encoder revision's upstream lockfile; each downloaded package was checked against that lockfile's integrity value. Dependency archives and source maps are not needed at runtime and are not shipped.

Keep these notices, font licenses, and source-availability links with redistributed builds and source downloads.

## Design guidance

The implementation and review used the assignment's pinned Better Interface guide: copyright 2026 Jakub Krehel, MIT. Its documentation guidance includes Impeccable: copyright 2025 Paul Bakaus, Apache-2.0. The supplied combined attribution and complete license texts are preserved unchanged in [docs/design-guidance-LICENSE.txt](docs/design-guidance-LICENSE.txt).

## Collection artwork

Swarm Pepe artwork and revealed traits are read from the Ethereum collection contract identified in [docs/ONCHAIN.md](docs/ONCHAIN.md). The included example is a saved contract response, and the application preserves the original SVG artwork. The studio frame, title, and animation are separate presentation effects.
