# VAULT — The Vintage Motor Collection

An interactive automotive study by **Joel Soyemi**. Five vintage cars occupy five full-screen chapters, followed by their stories and design details.

[Live website](https://vintagemotors.vercel.app/)

## The experience

Scroll vertically from Corvette to Camaro, 300 SL, Countach and 911 Turbo. Each chapter fills the viewport. Drag horizontally or use its timeline to reveal the car. Play, pause, reverse and reset work independently for each car; vertical scrolling remains normal page navigation.

The fabric uses **Blender cloth simulation** with body collision, self collision, a soft corner pull and subtle air movement. The surface is 0.5 mm thick. Forty-nine sampled cloth meshes per car are stored as compact 16-bit positions and interpolated in Three.js, so moving backward retraces the same motion. The former rigid cover deformation has been removed.

Actual convex silhouette points control framing, keeping the vehicles prominent through different viewpoints. Browsers without WebGL use 49 rendered frames per car in landscape and portrait formats (490 frames total). Five complete stories below the reveals include origin, body style and design features. A separate car-picker dialog is no longer part of the experience.

Only the visible chapter loads a live renderer. Leaving it disposes the scene and stops playback. Reduced motion is respected; manual timeline scrubbing remains available. Sound starts only after an explicit click.

## Run and deploy

Node 20.9 or later:

```sh
npm ci
npm run dev
```

```sh
npm run build
```

Next.js exports the site into `out/`. Vercel uses the Next.js preset, the repository root and `npm run build`. No environment variables are required.

The `prebuild` and `predev` scripts unpack ten `showroom-v2-*.json.gz` bundles using Node's built-in gzip decoder. `assets-manifest.json` lists the exact bundle checksums and expected counts. `ASSETS.md` contains the individual file inventory. All 516 assets are present in the repository; the bundles are build inputs, not runtime network dependencies.

## Source

- `app/components/CarChapter.tsx`: independent reveal controls and playback
- `app/components/Vault.tsx`: scroll-based chapter activation, stories and credits
- `app/components/Showroom.tsx`: live scene with responsive rendered fallback
- `app/lib/showroom.ts`: Three.js room, model loading and baked cloth playback
- `app/lib/framing.ts` and `vehicle-geometry.json`: silhouette-based framing
- `app/lib/stories.ts`: vehicle context and distinguishing details

## Reproduce the visuals

The website build does not require Blender or Python. To regenerate visual assets, install Blender 4.5 and Python with Pillow, then:

```sh
npm install --prefix tools
node tools/decode.mjs
blender -b --python tools/framing-geometry.py
blender -b --python tools/render.py -- all
python tools/finish-frames.py
python tools/pack-assets.py all
python tools/pack-assets.py manifest
```

`render.py -- simulate` bakes only the cloth. `-- sample corvette` renders five checkpoints for one car. The simulation and intermediate PNG cache are ignored by Git. When replacing scene files, bump `SCENE_VERSION` in `app/lib/assets.ts` to refresh browser caches. Cycles and the live renderer have different lighting implementations; the underlying models and cloth motion are shared.

## Credits

See [CREDITS.md](CREDITS.md) for model authors and CC BY 4.0 source links. A visible credits panel is included in the website. Vehicle names identify the subjects of this independent study.
