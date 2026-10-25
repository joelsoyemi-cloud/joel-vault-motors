# VAULT — The Vintage Motor Collection

An independent cinematic automotive design study by **Joel Soyemi**. Five classic cars share a dark architectural showroom with a satin cover reveal and individually choreographed camera paths.

## Experience

- 1960 Chevrolet Corvette C1 — low front to profile
- 1970 Chevrolet Camaro Pro Touring — rear to front sweep
- Mercedes-Benz 300 SL Gullwing — overhead to three-quarter (1954 design debut)
- 1989 Lamborghini Countach 25th Anniversary — wheel level to wide
- 1975 Porsche 911 (930) Turbo — high rear to low front

Drag horizontally, scroll slowly, or use the accessible reveal timeline. Play, pause, reverse, reset and change cars. Live 3D also supports front, rear, above and wheel viewpoints. The cover and camera are deterministic functions of the same progress value, so reversing retraces the animation.

A 33-frame rendered sequence per car supports browsers without WebGL. These frames use the same real car models and reveal choreography. Alternate viewpoint buttons require the live WebGL showroom. Ambient audio starts only after an explicit click. The site respects reduced motion and pauses animation when the tab is hidden.

## Development

Node 20.9 or later:

```sh
npm ci
npm run dev
```

```sh
npm run build
```

Next.js exports the site to `out/`. Deploy through Vercel's GitHub integration; push to `main` for production updates. There are no API keys or server dependencies.

### Binary assets

The GitHub copy stores all models, drape data, self-hosted fonts, posters and rendered reveal frames in `showroom-assets.json.gz`. `prebuild` and `predev` restore the exact files into `public/` using Node's built-in gzip decoder. `ASSETS.md` records the file inventory and checksums. Sites source checkouts also retain the individual public assets. The bundle avoids a large browser upload of hundreds of binary files and is not a runtime network dependency.

## Source

- `app/lib/cars.ts`: collection and camera paths
- `app/lib/showroom.ts`: Three.js room, lighting, GLB loading and reversible fabric deformation
- `app/components/Showroom.tsx`: live renderer with rendered sequence fallback
- `app/components/Vault.tsx`: controls, dialogs, audio and progress
- `tools/render.py`: offline Blender renderer (Blender 4.5; uncompressed GLB inputs)
- `tools/decode.mjs`: build-time conversion for Blender (`npm install --prefix tools`, then `node tools/decode.mjs`). Render with `blender -b --python tools/render.py -- posters` and `-- sequences`.

The cloth is an art-directed surface sampled from the car body, with reversible deformation; it is not a real-time physics simulation. Rendered fallback lighting uses Cycles, so minor lighting differences from the live Three.js scene are expected.

## Credits

See [CREDITS.md](CREDITS.md) for model authors, original sources and CC BY 4.0 licensing. The site includes a visible credits panel. The project is not affiliated with any vehicle manufacturer. No sales, bookings or performance claims are implied.
