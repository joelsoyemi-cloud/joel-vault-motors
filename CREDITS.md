# 3D model credits

All five models are licensed under Creative Commons Attribution 4.0 (CC BY 4.0): https://creativecommons.org/licenses/by/4.0/

Distributed in web-ready Meshopt-compressed form by https://github.com/pedrosoandre/carros.

## 1970 Chevrolet Camaro Pro Touring

- Author: everhard — https://sketchfab.com/everhard
- Original model: https://sketchfab.com/3d-models/none-dfad2dbf7db0401bb4cad60f657ff765
- Asset: `chevrolet-camaro-pro.glb`

## Lucifer's Corvette - 1960 Chevrolet Corvette C1

- Author: sharingan — https://sketchfab.com/luci-fan
- Original model: https://sketchfab.com/3d-models/507ee2e6d6a34a3db7bf8373c70fecff
- Asset: `chevrolet-corvette.glb`

## Mercedes-Benz 300sl Gullwing | www.vecarz.com

- Author: vecarz — https://sketchfab.com/heynic
- Original model: https://sketchfab.com/3d-models/none-65edd5814c9842bb9c769388d13fa27f
- Asset: `mercedes-benz-300sl-gullwing.glb`

## 1989 Lamborghini Countach 25th Anniversary

- Author: Ddiaz Design — https://sketchfab.com/ddiaz-design
- Original model: https://sketchfab.com/3d-models/none-75acd9a580574e128c0886d2bc5a2b21
- Asset: `lamborghini-countach-25th.glb`

## Porsche 911 (930) Turbo 1975

- Author: Lexyc16 — https://sketchfab.com/Lexyc16
- Original model: https://sketchfab.com/3d-models/de1ffd344c41481892511f7fd332c136
- Asset: `porsche-911.glb`

## Adaptation

The library compressed and optimized the source models. VAULT normalizes their scale/orientation, adjusts material roughness, and adds new lighting, environment, camera choreography, a physically simulated satin cover, and rendered sequences. The original artists retain attribution for the underlying 3D models and their depiction in all generated frames.

## Fonts

DM Sans and Italiana are distributed under the SIL Open Font License. License copies are in `docs/`.

## Historical date

The Gullwing model has no specific year in its source title. The site uses its 1954 design debut, verified against Mercedes-Benz USA: https://media.mbusa.com/news/sport-luxury-lifestyle-the-mercedes-benz-sl

## Cloth and framing

The new cloth motion was simulated in Blender, baked to 49 mesh samples per vehicle, and rendered in two screen formats. The site interpolates these samples for reversible playback. Rendered image crops and live camera framing use convex silhouette points extracted from the same normalized models.
