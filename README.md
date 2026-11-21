# Abdullah Javed — 3D Procedural Studio Portfolio

Next.js App Router + plain Three.js scroll-directed studio showcase featuring a 10-layer **AI Neural Compute Module** authored procedurally in real millimetres with zero external 3D, video, or audio assets.

## Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **3D Engine:** Plain `three` (`src/engine/`) — 2D SDF + marching squares extrusions with 0.05 mm bevels, CCW `LatheGeometry`, procedural `CanvasTexture` anisotropy maps, PMREM dark photo studio lighting, MSAA HDR post-processing (high-threshold bloom, ACES Filmic, film grain), and Web Audio synthesis
- **Styling:** Tailwind CSS v4 with self-hosted `Space Grotesk` and `JetBrains Mono`
- **Content:** Markdown projects in `src/content/projects/*.md`

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run start
```
