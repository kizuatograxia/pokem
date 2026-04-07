What I did
- Downloaded the full `Pokemon Black/White` asset set from Spriters Resource into `sources/spriters-resource/pokemonblackwhite-full`.
- Added a reusable downloader script at `tools/download-spriters-resource-assets.ps1`.
- Added an organizer/converter script at `tools/organize-spriters-resource-bw-assets.ps1`.
- Separated the Pokemon-related battle assets into:
  - `sources/spriters-resource/pokemonblackwhite-pokemon/battlers-raw`
  - `sources/spriters-resource/pokemonblackwhite-pokemon/atlases`
  - `sources/spriters-resource/pokemonblackwhite-pokemon/parts`
- Exported normalized animated strips for the frontend into:
  - `client/web/public/assets/sprites/pokemon/animated/front`
  - `client/web/public/assets/sprites/pokemon/animated/back`
- Generated inventory/report files:
  - `sources/spriters-resource/pokemonblackwhite-pokemon/manifest.json`
  - `sources/spriters-resource/pokemonblackwhite-pokemon/README.md`

Files changed
- `tools/download-spriters-resource-assets.ps1`
- `tools/organize-spriters-resource-bw-assets.ps1`
- `client/web/public/assets/sprites/pokemon/animated/front/*`
- `client/web/public/assets/sprites/pokemon/animated/back/*`
- `sources/spriters-resource/pokemonblackwhite-full/*`
- `sources/spriters-resource/pokemonblackwhite-pokemon/*`
- `.shard/test/result.md`

Key output
- Total source files scanned: `845`
- Battler sheets normalized: `769`
- Battle atlases separated: `20`
- Battle parts sheets separated: `20`
- Animated front strips exported: `769`
- Animated back strips exported: `769`

Assumptions
- Used the existing filenames in `client/web/public/assets/sprites/pokemon/front` as the canonical naming contract.
- Treated the individual per-Pokemon Spriters Resource PNGs as the source of front/back animation strips.
- Kept the generation-wide shiny/front/back sheets as separated source material in `atlases`/`parts`, but did not attempt per-species shiny strip reconstruction from those atlases.

Blockers / open questions
- Two battlers are still unresolved in the generated manifest:
  - `#0029 Nidoran♀`
  - `#0032 Nidoran♂`
- The site source is limited to the Black/White page, so this pipeline currently covers the assets exposed there, not National Dex animated sprites beyond that page.
- The exported animated strips are generated assets only; the frontend runtime has not yet been switched to use `pokemon/animated/front|back`.

Verification
- `client/web`: `C:\Program Files\nodejs\npx.cmd tsc --noEmit` ✅
