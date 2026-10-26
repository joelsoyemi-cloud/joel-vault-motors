# VAULT — The Vintage Motor Collection

An automotive study by **Joel Soyemi**. [Live website](https://vintagemotors.vercel.app/)

## The experience

Scroll through Corvette, Camaro, 300 SL, Countach and 911 Turbo. Each car holds the full viewport while scrolling removes its satin cover and moves the camera. The final part of each chapter studies the uncovered car before the following car enters. Scrolling upward retraces the sequence. No horizontal dragging or car picker is required.

A photographed studio environment, broad softboxes and a curved concrete cyclorama replace the former ceiling-strip room. Paint, chrome, glass, tyres and interior materials are calibrated separately. Smooth surface normals are rebuilt for the live models and studio renders, reducing the coarse reflection artifacts in the source assets. The source models still set the limit on small geometry and texture detail.

The cover uses the existing Blender cloth bake with body and self collision. Forty-nine 16-bit mesh poses per car interpolate continuously in Three.js. The reveal completes at 72% of the scroll chapter; the camera continues moving through the remaining portion.

The active chapter owns one live renderer, which releases its resources when the next chapter takes over. Browsers without WebGL use responsive studio films with 25 frames per format, crossfading between adjacent views. Reduced motion presents shorter, static chapters with optional keyboard-accessible view timelines. Sound starts only after a click. Five editorial stories and model credits follow the collection.

## Run and deploy

Requires Node 20.9 or later. No environment variables are required.

```sh
npm ci
npm run dev
```

```sh
npm run build
```

The Next.js static export is written to `out/`. Vercel uses the repository root, Next.js preset and `npm run build`.

The prebuild/predev script restores 277 assets from eleven checksum-verified bundles. `assets-manifest.json` records bundle hashes; `ASSETS.md` inventories individual files. All runtime assets are self-hosted.

## Source

- `CarChapter.tsx`: pinned scenes, scroll indicators and reduced-motion controls
- `Vault.tsx`: scroll progress, chapter activation, stories and credits
- `Showroom.tsx`: responsive films and live-renderer lifecycle
- `showroom.ts`: photographed environment, physical materials and cloth playback
- `framing.ts`: silhouette-aware camera fitting
- `timeline.ts`: reveal timing and scroll progress
- `surfaces.json`: shared material calibration

These files live under `app/components` and `app/lib`.

## Reproduce studio films

The website build does not require Blender or Python. To regenerate the studio assets, use Blender 4.5:

```sh
npm install --prefix tools
node scripts/unpack-assets.mjs
node tools/decode.mjs
blender -b --python tools/studio.py
python tools/package-studio.py --manifest
```

`studio.py` reads the committed models and cloth bakes, renders 25 views in landscape and portrait for each car, and resumes completed frames from its ignored cache. It also accepts a car ID to render one car. `package-studio.py` packages completed sequences and the final manifest. Bump `SCENE_VERSION` when replacing assets. Live and offline lighting use the same HDRI with different rendering implementations.

See [CREDITS.md](CREDITS.md) for model authors, source links, fonts and HDRI licensing. This is an independent design study, unaffiliated with the manufacturers.
