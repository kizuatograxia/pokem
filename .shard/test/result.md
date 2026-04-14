What I did
- Fixed the Pokemon battle sprite runtime in `client/web` so animated battlers no longer fall back to the legacy/static path just because the wrapper animation overwrote the spritesheet animation.
- Reworked `client/web/src/battle/BattleField.tsx` to render battlers through an animated wrapper plus an internal `canvas`, allowing battle motion (`switch-in`, selection bob, faint, move-use) and frame playback to run at the same time.
- Replaced the old “horizontal strip only” spritesheet logic with runtime sheet analysis that now supports:
  - horizontal strips
  - grid sheets with a uniform chroma background
  - leading red guide columns present in some exported strips
- Tightened the sheet parser for badly cut sprites by:
  - separating repeated frame columns from side-note chunks/text
  - supporting stacked multi-row strips
  - refining frame bounds from connected opaque components
  - trimming sparse edge columns/rows before drawing
- Refined the parser again for the remaining bad cuts:
  - frame cells are now built from gaps between detected runs instead of raw run bounds
  - single-pixel / guide-line components are filtered out explicitly
  - front-facing sheets like `PIKACHU front` keep their silhouette without pulling the red guide column
  - `VENUSAUR front` / `VENUSAUR back` now use more consistent extracted bounds
- Added a short diagnostic playtest script in `.shard/test/inspect-sprite-runtime.cjs` to confirm the browser is drawing animated Pokemon canvases and that their pixels change over time.
- Added a preview script in `.shard/test/preview-analyzed-sprites.cjs` to inspect the extracted frames for problematic species outside the battle flow.

Files changed
- `client/web/src/battle/BattleField.tsx`
  - Added spritesheet analysis + canvas renderer.
  - Split wrapper animation from sprite frame playback.
  - Kept existing battle cue hooks (`spriteAnims`, `keepVisible`) wired into the field renderer.
- `.shard/test/inspect-sprite-runtime.cjs`
  - Browser diagnostic for sprite DOM/runtime validation.
- `.shard/test/preview-analyzed-sprites.cjs`
  - Offline visual preview of parsed frames for problematic animated sheets.
- `.shard/test/result.md`

Verification
- `cd client/web && npx tsc --noEmit` ✅
- `cd server/battle && npx tsc --noEmit` ✅
- Browser playtest against `http://127.0.0.1:4317` ✅
  - `node .shard/test/verify-quick-battle.cjs http://127.0.0.1:4317`
  - screenshot: `.shard/test/quick-battle-check.png`
  - runtime probe: `.shard/test/inspect-sprite-runtime.json`
  - result: `canvasCount = 2` and `canvasChanged = true`, confirming both battler sprites are animating frame-to-frame
- Sheet preview pass against representative problematic assets ✅
  - `node .shard/test/preview-analyzed-sprites.cjs http://127.0.0.1:4317`
  - screenshot: `.shard/test/preview-analyzed-sprites.png`
  - covered: `PIKACHU front`, `PIKACHU back`, `VENUSAUR front`, `VENUSAUR back`

Assumptions
- I treated the user’s latest request (“Pokemon animations still look legacy/static”) as the active task, even though `.shard/test/task.md` still describes the earlier server transport work.
- I kept the fix local to the battle frontend runtime and did not change the canonical battle view-model contract.

Blockers / open questions
- The parser is much less aggressive about bad cuts now, but some source sheets still contain embedded artifact pixels or handwritten instructions from the asset source. Small leftovers may still appear on a few species unless the exported PNGs are cleaned at the asset level.

---

Sprite resolver follow-up

What I did
- Added a dedicated sprite resolver for battle sprites and party icons so the frontend no longer assumes `speciesId.toUpperCase()` is enough.
- Wired `BattleField` to resolve animated and static candidates in the right order, with support for:
  - female sprite variants like `PIKACHU_female`
  - numbered form variants like `ROTOM_2`, `DEOXYS_3`, `DARMANITAN_1`
  - shiny fallback to static `front-shiny` / `back-shiny` because the animated pack does not include shiny strips
- Wired `BattleParty` to use the same resolver for icon sprites, so forms and shiny icons can resolve consistently there as well.

Files changed
- `client/web/src/battle/pokemonSpriteResolver.ts`
- `client/web/src/battle/BattleField.tsx`
- `client/web/src/battle/BattleParty.tsx`
- `.shard/test/result.md`

Verification
- `cd client/web && npx tsc --noEmit` passed.
- Confirmed the battle server and Vite app were still serving locally after the change.

Assumptions
- I treated the current user request as "fix sprite resolution/correctness in the battle UI" rather than adding new asset extraction work.
- I kept animation enabled only for non-shiny battlers because the current animated asset pack only contains `animated/front` and `animated/back`, not shiny variants.

Blockers / open questions
- `Nidoran` is still a source-pack edge case. The static pack contains corrupted canonical filenames (`NIDORANfE`, `NIDORANmA`) and the animated pack does not contain those sprites, so those two species still depend on static fallback rather than proper animation.

---

Spriters Resource redownload via torresflo repo

What I did
- Cloned `https://github.com/torresflo/Spriters-Resource-Downloader.git` into `sources/torresflo-spriters-resource-downloader-repo`.
- Created an isolated Python virtualenv inside that cloned repo and installed compatible runtime dependencies for Python 3.14.
- Ran the repo's own CLI against `https://www.spriters-resource.com/ds_dsi/pokemonblackwhite/`.
- Copied the fresh dump into `sources/spriters-resource/pokemonblackwhite-redownload` so the old dump stays intact for comparison.

Files / directories created
- `sources/torresflo-spriters-resource-downloader-repo`
- `sources/spriters-resource/pokemonblackwhite-redownload`
- `.shard/test/result.md`

Verification
- Fresh redownload count: `998` files total.
- Top-level in the new dump: `844` files plus `Pokédex/` with `154` nested files.
- Pixel comparison against the previous dump:
  - `Pokémon (5th Generation, Front)` old vs new: identical pixel content
  - `Pokémon (5th Generation, Back)` old vs new: identical pixel content
  - `Bulbasaur` single-sheet old vs new: identical pixel content

Assumptions
- I treated the user request as "redo the raw asset download using the exact torresflo downloader repo" and kept the old source dump untouched instead of overwriting it.

Blockers / open questions
- The fresh redownload does not support the theory that the front sprites were cut during download. The battle atlases and individual sheets I spot-checked are pixel-identical to the previous raw dump, so the cutting is still most likely happening in the later normalization / extraction step, not the download step.

---

Front sprite head cut diagnosis

What I did
- Traced the head-cut bug to the organizer, not the download step.
- Found that `tools/organize-spriters-resource-bw-assets.ps1` was dropping the first `35` rows of every battler sheet before splitting front/back, which clipped the top of many front sprites.
- Reworked the organizer so it now:
  - keeps the true top rows of the battler sheet
  - chooses major animation bands by pixel weight instead of taking the first band blindly
  - regenerates the animated `front` / `back` exports with the updated logic
- Hardened the battle runtime in `client/web/src/battle/BattleField.tsx` so it removes dominant border background colors instead of only a single corner color when analyzing sprite strips.

Files changed
- `tools/organize-spriters-resource-bw-assets.ps1`
- `client/web/src/battle/BattleField.tsx`
- `.shard/test/result.md`

Verification
- Re-ran the organizer successfully and regenerated the animated sprite exports.
- Checked representative outputs:
  - `ALAKAZAM front` no longer loses the top of the head
  - `GIRATINA front` no longer loses the top silhouette
- `cd client/web && npx tsc --noEmit` passed after the renderer update.

Assumptions
- I treated the current priority as fixing the front battler cropping defect end-to-end, even though some raw strips still contain guide backgrounds or labels that need future cleanup.

Blockers / open questions
- The head-cut issue is fixed at its root cause, but some species with more complex source sheets still carry colored guide/background sections inside the exported strip. The runtime is now more tolerant of that, but a cleaner long-term result still points to a stricter asset-cleanup pass for those species.

---

Spriters Resource pipeline rebuild

What I did
- Replaced the old PowerShell-only crop heuristic with a new extractor in `tools/organize-spriters-resource-bw-assets.py`.
- The new extractor now:
  - removes dominant border/background colors from each raw sheet
  - detects repeated sprite components instead of cropping by fixed row bands
  - separates `front` and `back` by choosing the better split axis (`top/bottom` or `left/right`) per sheet
  - rebuilds clean transparent animation sheets row-by-row from the detected sprite components
- Updated `tools/organize-spriters-resource-bw-assets.ps1` to act as a thin wrapper around the new Python pipeline so the existing entrypoint still works.
- Added support for the redownloaded file naming scheme from the torresflo downloader, which uses stems like `_0479_Rotom_Fan_` instead of the older `#479 Rotom (Fan)` style.
- Changed the pipeline to clear the generated output folders before each run so unresolved species do not keep stale/broken animated PNGs from previous batches.
- Regenerated the full animated sprite pack from `sources/spriters-resource/pokemonblackwhite-redownload`.

Files changed
- `tools/organize-spriters-resource-bw-assets.py`
- `tools/organize-spriters-resource-bw-assets.ps1`
- `sources/spriters-resource/pokemonblackwhite-pokemon/README.md`
- `sources/spriters-resource/pokemonblackwhite-pokemon/manifest.json`
- `client/web/public/assets/sprites/pokemon/animated/front/*.png`
- `client/web/public/assets/sprites/pokemon/animated/back/*.png`
- `.shard/test/result.md`

Verification
- `python -m py_compile tools/organize-spriters-resource-bw-assets.py` passed.
- `cd client/web && npx tsc --noEmit` passed.
- Full regeneration completed from the redownloaded source dump.
- Final manifest after regeneration:
  - `844` files scanned
  - `767` battler sheets exported
  - `20` atlas sheets copied
  - `20` parts sheets copied
  - `4` unresolved battlers
- Visual spot checks on regenerated animated sheets looked correct for previously bad cases:
  - `CHARIZARD`
  - `SCIZOR`
  - `ALAKAZAM`
  - `VENUSAUR`
  - `TYNAMO`
  - `GIRATINA`
- Confirmed unresolved species no longer have stale animated files left behind:
  - `WEEDLE`
  - `VILEPLUME`
  - `TOGETIC`
  - `MAMOSWINE_female`
  - these now fall back to the static sprite path at runtime instead of serving an old broken animation

Assumptions
- I treated the current user request as a sprite-pipeline repair task and did not resume the unrelated `server/battle` transport task from `.shard/test/task.md`.
- For unresolved animated sheets, I preferred no animated asset over a stale/broken one, because the battle runtime already has static fallback.

Blockers / open questions
- `4` battlers still fail automatic front/back separation with the current heuristics:
  - `_0013_Weedle.png`
  - `_0045_Vileplume_male_.png`
  - `_0176_Togetic.png`
  - `_0473_Mamoswine_female_.png`
- If needed, these can be handled with a tiny manual override table or a species-specific fallback rule in the extractor.

---

ROM inspect bootstrap

What I did
- Added a ROM inspection mode to `tools/dex-importer` so the importer can now accept `--rom <path>` without disturbing the existing PBS merge pipeline.
- Implemented NDS header parsing, banner/title extraction, file hashing, and NitroFS traversal for `.nds` images.
- Added output writers that persist a reproducible ROM manifest, filesystem listing, and a human-readable summary under `tools/dex-importer/output/rom-inspect/`.
- Fixed an existing `dex-importer` type mismatch by initializing `Species.metrics` to `null` in the species parser.
- Ran the new ROM inspection against `Pokemon Black (Unova Pokédex Edition v1.23).nds`.

Files changed
- `tools/dex-importer/src/index.ts`
  - Added CLI parsing for `--rom` and preserved the existing PBS import path. Relevant sections: lines 28-65 and 189-195.
- `tools/dex-importer/src/rom/inspect.ts`
  - Added NDS header, banner, hash, and NitroFS parsing. Relevant sections: lines 5-65, 103-156, and 248-285.
- `tools/dex-importer/src/rom/output.ts`
  - Added manifest/filesystem/summary writers for ROM inspection output. Relevant sections: lines 21-88.
- `tools/dex-importer/src/parsers/species.ts`
  - Added the conservative `metrics: null` default so the importer satisfies the `Species` contract.
- `tools/dex-importer/package.json`
  - Added `inspect:rom`.
- `.shard/test/result.md`

Verification
- `cd tools/dex-importer && npx.cmd tsc --noEmit` passed.
- `cd tools/dex-importer && npm.cmd run import` passed.
- `cd tools/dex-importer && npm.cmd run inspect:rom -- "..\\..\\Pokemon Black (Unova Pokédex Edition v1.23).nds"` passed.
- ROM inspection result:
  - internal title: `POKEMON B`
  - game code: `IRBO`
  - maker code: `01`
  - file hash (SHA-256): `a635e75bcd38a2627607145fcd4f73ef5dce34debccb1037609128c59453fe6d`
  - NitroFS: `247` files in `31` directories
  - output dir: `tools/dex-importer/output/rom-inspect/pokemon-black-unova-pok-dex-edition-v1-23-a635e75b`

Assumptions
- I treated the user's ROM import request as the active task, even though `.shard/test/task.md` still describes the unrelated `server/battle` WebSocket task.
- I kept this first slice conservative: inspect and inventory the ROM structure first, without pretending that game-specific offset extraction is already solved.

Blockers / open questions
- The ROM reports a declared size larger than the actual file size, which may be harmless for this hack build but should be tracked as part of ROM profile validation.
- The next real import step is no longer "can we read the ROM?" but "which NitroFS/NARC containers map to species, moves, maps, scripts, and localized strings for this specific Black-based build?".

---

ROM sprite archive extraction

What I did
- Added a generic NARC inspector/extractor to `tools/dex-importer` so we can target a specific path inside the ROM filesystem, not just inspect the whole `.nds`.
- Implemented parsing for the NARC chunk layout (`BTAF`, `BTNF`, `GMIF`) and subfile enumeration.
- Added DS LZ decompression support for the common `0x10` and `0x11` formats so compressed subfiles can be identified by their real inner format instead of only showing `LZ77`.
- Ran the new extractor against the two sprite candidates inside the ROM:
  - `a/0/0/4` (battle sprite archive)
  - `a/0/0/7` (Pokémon icon archive)
- Exported manifests, file lists, summaries, and a sample of extracted files for both archives.

Files changed
- `tools/dex-importer/src/index.ts`
  - Added CLI support for `--narc`, `--extract-files`, and `--extract-limit`.
- `tools/dex-importer/src/rom/narc.ts`
  - Added NARC parsing, histogram generation, sample extraction, and DS LZ decompression.
- `tools/dex-importer/package.json`
  - Added `inspect:narc`.
- `.shard/test/result.md`

Verification
- `cd tools/dex-importer && npx.cmd tsc --noEmit` passed.
- `cd tools/dex-importer && npm.cmd run import` passed.
- `cd tools/dex-importer && npx.cmd tsc` passed.
- `cd tools/dex-importer && node dist/index.js --rom "C:\users\hedge\onedrive\desktop\pokem\Pokemon Black (Unova Pokédex Edition v1.23).nds" --narc a/0/0/4 --extract-files --extract-limit 40` passed.
- `cd tools/dex-importer && node dist/index.js --rom "C:\users\hedge\onedrive\desktop\pokem\Pokemon Black (Unova Pokédex Edition v1.23).nds" --narc a/0/0/7 --extract-files --extract-limit 40` passed.

Findings
- `a/0/0/4` is clearly the battle sprite archive:
  - `14285` subfiles total
  - strong repeating 20-file structure: `714` full groups of 20 plus `5` trailing extras
  - first groups repeat this pattern almost exactly:
    - `LZ77-11->RGCN`
    - `EMPTY`
    - `LZ77-11->RGCN`
    - `EMPTY`
    - `RECN`
    - `LZ77-11->RNAN`
    - `RCMN`
    - `RAMN`
    - `BIN`
    - repeated again
    - then two `RLCN` palettes
  - top histogram:
    - `LZ77-11->RGCN = 3234`
    - `EMPTY = 2464`
    - `RLCN = 1457`
    - `LZ77-11->RNAN = 1426`
    - `RAMN = 1426`
    - `RCMN = 1426`
    - `RECN = 1426`
- `a/0/0/7` is clearly the icon archive:
  - `1431` subfiles total
  - first `7` files are shared support data (`RLCN`, `RNAN`, `RECN`)
  - after that, the archive falls into repeating pairs of `RGCN` + `EMPTY`
  - this means the icon path should be easier to map first than the battle sprite path

Artifacts generated
- `tools/dex-importer/output/rom-narc/a_0_0_4-a635e75b/`
- `tools/dex-importer/output/rom-narc/a_0_0_7-a635e75b/`

Assumptions
- I treated the user request as "locate and validate the sprite archives in the ROM" rather than fully decoding NCGR/NCER/NCLR into PNG in this pass.

Blockers / open questions
- We have confirmed the right archives, but we still need a decoder for the Nintendo graphic containers (`RGCN`/`RLCN`/`RECN` and related animation/meta files) to render them into usable PNG or strip assets.
- The battle sprite archive is richer but also more complex than the icon archive. The icon path is the better first target if we want a fast visible win from the ROM assets.

---

BW ROM icon export

What I did
- Implemented a first working decoder for the Pokémon icon archive `a/0/0/7`.
- Added a Python export script that:
  - reads the shared `RLCN` palette
  - decodes the `RGCN` icon tiles as 4bpp Nitro graphics
  - exports each icon as a PNG
  - writes a manifest and a contact sheet for quick visual inspection
- Kept the pipeline scoped to icons only, without claiming that battle sprite rendering is solved yet.

Files changed
- `tools/dex-importer/scripts/export_bw_rom_icons.py`
  - Decodes ROM icon graphics and exports PNGs.
- `tools/dex-importer/requirements-rom.txt`
  - Documents the Pillow dependency for the Python-side export helper.
- `tools/dex-importer/package.json`
  - Added `export:rom-icons`.
- `.shard/test/result.md`

Verification
- `cd tools/dex-importer && npx.cmd tsc --noEmit` passed.
- `cd tools/dex-importer && npm.cmd run import` passed.
- `cd tools/dex-importer && python scripts/export_bw_rom_icons.py` passed.
- Output generated in:
  - `tools/dex-importer/output/rom-icons/a_0_0_7-a635e75b-decoded/icons`
  - `tools/dex-importer/output/rom-icons/a_0_0_7-a635e75b-decoded/manifest.json`
  - `tools/dex-importer/output/rom-icons/a_0_0_7-a635e75b-decoded/contact-sheet.png`
- Export count:
  - `715` icon PNGs

Findings
- The icon archive decode is now materially useful.
- The first exported contact sheet visually confirms real Pokémon icons, not just raw tile noise.
- The icon archive is much easier to unlock from the ROM than the battle sprite archive and is a good base for future species mapping.

Assumptions
- I used palette bank `0` from the shared `RLCN` palette file for the static icon export. That is enough to render a valid icon set, even though the archive also contains shared `RNAN` / `RECN` animation metadata.

Blockers / open questions
- The exported icons are still sequentially indexed from the ROM archive, not yet mapped to canonical species/form IDs.
- The next useful step is either:
  - map icon order to species via `a/0/1/6`, or
  - start a similar decoder pass for the richer battle sprite archive `a/0/0/4`.

---

BW ROM icon mapping

What I did
- Extended `tools/dex-importer/scripts/export_bw_rom_icons.py` so the BW icon export now resolves the raw `RGCN` sequence to canonical stems instead of only dumping numbered PNGs.
- Added slot-aware mapping based on the actual NARC structure:
  - odd `RGCN` files are the primary icon slots
  - even `RGCN` files are non-empty female variants
  - special tail blocks now resolve to named forms like `UNOWN_1`, `ROTOM_4`, `SHAYMIN_1`, `GENESECT_3`
- Generated a named output folder and richer metadata:
  - `resolved-icons/` with files like `BULBASAUR.png`, `ROTOM_2.png`, `UNFEZANT_female.png`
  - `resolved-manifest.json` with source slot, canonical stem, duplicate detection, and shared-image groups
  - updated `summary.md` with the important archive findings

Files changed
- `tools/dex-importer/scripts/export_bw_rom_icons.py`
  - Added species/form mapping, female variant detection, duplicate handling, and named asset export.
- `.shard/test/result.md`

Verification
- `cd tools/dex-importer && npx.cmd tsc --noEmit` passed.
- `cd tools/dex-importer && npm.cmd run import` passed.
- `cd tools/dex-importer && python scripts/export_bw_rom_icons.py` passed.
- Output generated in:
  - `tools/dex-importer/output/rom-icons/a_0_0_7-a635e75b-decoded/resolved-icons`
  - `tools/dex-importer/output/rom-icons/a_0_0_7-a635e75b-decoded/resolved-manifest.json`
  - `tools/dex-importer/output/rom-icons/a_0_0_7-a635e75b-decoded/summary.md`

Findings
- The raw `715` exported icons break down into:
  - `712` resolved named icons
  - `3` inline duplicates (`DEOXYS_1`, `DEOXYS_2`, `DEOXYS_3`) that also reappear in the tail-form block
  - `3` non-empty female variants: `UNFEZANT_female`, `FRILLISH_female`, `JELLICENT_female`
- The BW1-based archive is not a perfect national-dex icon set:
  - `TURTWIG`, `GROTLE`, and `TORTERRA` are absent from the archive
  - the tail-form block contains canonical Gen 4/5 extras such as `UNOWN_1..27`, `ROTOM_1..5`, `GIRATINA_1`, `SHAYMIN_1`, `BASCULIN_1`, `DARMANITAN_1`, `DEERLING_*`, `SAWSBUCK_*`, `MELOETTA_1`
- `GENESECT` and `GENESECT_1..4` are present as distinct slots, but their decoded icon pixels are identical in this archive.

Assumptions
- I treated the form numbering used in the existing frontend assets as canonical when naming mapped icons, for example:
  - `ROTOM_1 = Heat`
  - `ROTOM_2 = Wash`
  - `DEERLING_1 = Summer`
  - `DEERLING_2 = Autumn`
  - `DEERLING_3 = Winter`
- I treated the second egg icon as `MANAPHY_EGG`, which matches the usual BW icon convention and the decoded sprite appearance.

Blockers / open questions
- The icon mapping is now usable, but it also shows that this BW1-based ROM icon archive is incomplete for a project that expects later Gen 5 forms like `KELDEO_1`, `TORNADUS_1`, `THUNDURUS_1`, `LANDORUS_1`, and `KYUREM_*`.
- I have not yet propagated these resolved icons into `client/web/public/assets/sprites/pokemon/icons`; they are currently staged as importer output so we can review the archive quality first.

---

Charizard-only battle sprite preview

What I did
- Isolated the Charizard battle group inside BW battle archive `a/0/0/4`.
- Confirmed Charizard is group `6`, which maps to battle indices starting at `120`.
- Added a dedicated preview exporter in `tools/dex-importer/scripts/export_bw_battle_sprite_preview.py` to rerender one species at a time from extracted BW battle files.
- Reworked the preview exporter so it now:
  - keeps NCER cell offsets instead of flattening everything to origin
  - derives the shared battle palette from the group base
  - follows the animated-cell state machine more closely instead of sampling every part as an independent frame
- Regenerated Charizard front and back preview strips in `.shard/test/rom-charizard-rerender/`.

Files changed
- `tools/dex-importer/scripts/export_bw_battle_sprite_preview.py`
- `.shard/test/result.md`

Artifacts generated
- `.shard/test/rom-charizard-rerender/CHARIZARD-front-rom.png`
- `.shard/test/rom-charizard-rerender/CHARIZARD-front-rom-sheet.png`
- `.shard/test/rom-charizard-rerender/CHARIZARD-back-rom.png`
- `.shard/test/rom-charizard-rerender/CHARIZARD-back-rom-sheet.png`

Findings
- The new preview path is better grounded in the actual Nitro animation structure, but the rendered Charizard is still broken into horizontal fragments.
- This means the remaining bug is still in the Nitro graphics interpretation, not just in species selection or frame anchoring.
- I did not overwrite:
  - `client/web/public/assets/sprites/pokemon/animated/front/CHARIZARD.png`
  - `client/web/public/assets/sprites/pokemon/animated/back/CHARIZARD.png`
  because the ROM-derived output would visibly regress the current client asset.

Assumptions
- I treated the user request as "prove the Charizard path first without risking the shipped frontend assets".

Blockers / open questions
- The next decoder pass should focus on the BW `RGCN` interpretation for battle sprites, or adopt a known-good external parser such as RawDB / ndspy-backed tooling before we try to replace frontend animation strips.
