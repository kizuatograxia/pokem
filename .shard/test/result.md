What I did
- Moved the main sprite fix from runtime-only heuristics into the asset pipeline by adding `tools/organize_spriters_resource_bw_assets.py`.
- The new exporter cleans guide lines, isolates front/back regions, extracts per-frame transparent crops, and rebuilds normalized animated strips for `client/web/public/assets/sprites/pokemon/animated/front` and `client/web/public/assets/sprites/pokemon/animated/back`.
- Added targeted region overrides for the layouts that were visibly broken in battle:
  - `PIKACHU` / `PIKACHU_female`: removes the left red guide column and keeps a clean 10-frame loop for front/back.
  - `VENUSAUR` / `VENUSAUR_female`: locks front to the left animation block and back to the right block so the two no longer swap/mix.
  - `BLASTOISE`: trims the extra side sprites/text and keeps clean front/back loops.
- Kept the generic segmentation path for the rest of the Black/White sheets and added batch execution support (`--offset` / `--limit`) so the full folder can be regenerated without the shell timing out.
- Re-emitted the animated sprite folders in batches covering the whole source set.

Files changed
- `tools/organize_spriters_resource_bw_assets.py`
  - New Pillow-based exporter for animated battler sheets.
  - Generic segmentation + species overrides + batch mode.
- `client/web/public/assets/sprites/pokemon/animated/front/*`
  - Regenerated animated front sheets.
- `client/web/public/assets/sprites/pokemon/animated/back/*`
  - Regenerated animated back sheets.
- `sources/spriters-resource/pokemonblackwhite-pokemon/battlers-raw/*`
  - Refreshed copied raw battler sheets from the source set.
- `progress.md`
  - Logged the export-pipeline pass and validations.
- `.shard/test/preview-analyzed-sprites.json`
- `.shard/test/preview-analyzed-sprites.png`
- `.shard/test/quick-battle-check.json`
- `.shard/test/quick-battle-check.png`

Verification
- `cd client/web && npx tsc --noEmit` ✅
- `node .shard/test/verify-quick-battle.cjs http://127.0.0.1:4317` ✅
- `node .shard/test/inspect-sprite-runtime.cjs http://127.0.0.1:4317` ✅
- `node .shard/test/preview-analyzed-sprites.cjs http://127.0.0.1:4317` ✅
- Visual checks:
  - `.shard/test/quick-battle-check.png` now shows clean animated `PIKACHU` front/back in battle with no red column.
  - `.shard/test/preview-analyzed-sprites.png` shows:
    - `PIKACHU front` = 10 clean frames
    - `PIKACHU back` = 10 clean frames
    - `VENUSAUR front` = 26 clean frames
    - `VENUSAUR back` = 35 clean frames
  - Direct asset checks confirmed `BLASTOISE front` / `BLASTOISE back` export as clean 8-frame strips without text bleed.

Assumptions
- I treated the user’s latest sprite-quality request as the active task, even though `.shard/test/task.md` still points to the older server transport work.
- For species with obviously hand-annotated or repeated-sheet layouts, explicit overrides are safer than trying to solve every case with one heuristic.

Blockers / open questions
- `sources/spriters-resource/pokemonblackwhite-pokemon/manifest.json` and `README.md` are produced per exporter run; because the full regeneration had to be done in batches to avoid shell timeout, those two files reflect the last batch run rather than an aggregated all-species manifest. The exported PNG folders themselves were regenerated across all batches.

2026-04-09 follow-up
- Fixed `client/web/src/battle/useBattleWs.ts` so the battle client no longer hardcodes `ws://localhost:5173/battle-ws`.
- The hook now derives the default WebSocket URL from `window.location`, which makes the app connect correctly when Vite is running on another local port such as `http://127.0.0.1:4319`.
- Updated the connection error text to report the actual resolved URL instead of the old fixed message.
- Verification: `cd client/web && npx tsc --noEmit` ✅

2026-04-09 team selection follow-up
- Added a Quick Battle team setup flow in `client/web` so the player can choose the 6 Pokemon used in battle before opening the battle screen.
- `client/web/src/battle/battleTeamCatalog.ts` now defines a fixed catalog of battle-ready packed sets plus the default quick-battle roster.
- `client/web/src/battle/QuickBattleSetupScreen.tsx` adds the pre-battle selection UI:
  - left panel = available Pokemon catalog
  - right panel = 6 team slots
  - `Enter` assigns the highlighted Pokemon to the selected slot
  - `Left/Right` changes the target slot
  - `X/Delete/Backspace` clears the current slot
  - `R` resets to the default quick-battle team
  - `Space` or the `START` button begins the battle once all 6 slots are filled
- `client/web/src/screens/MainMenuScreen.tsx` now routes `Quick Battle` through the setup screen instead of jumping straight into battle.
- `client/web/src/battle/BattleScreen.tsx` now accepts `playerTeamPacked`.
- `client/web/src/battle/useBattleWs.ts` now sends `team` in the initial `join` payload so the selected roster reaches the battle server.
- Added Playwright action payloads for validation:
  - `.shard/test/web-game-actions-quick-battle-setup.json`
  - `.shard/test/web-game-actions-quick-battle-custom-team.json`

Verification
- `cd client/web && npx tsc --noEmit` ✅
- Shared skill client smoke for the setup screen ✅
  - screenshot: `.shard/test/web-game-skill-quick-battle-setup/shot-0.png`
- Shared skill client smoke for a custom team ✅
  - replaced the lead slot with `Lucario`
  - screenshot: `.shard/test/web-game-skill-custom-team/shot-0.png`
  - result: battle opened with `Lucario` on the player's side instead of the old default lead, confirming the selected team was used by the server

2026-04-09 PC party follow-up
What I did
- Moved the source of truth for the player's battle party out of `HubGame` and into a persistent top-level hook at `client/web/src/hub/usePersistentHubStorage.ts`.
- `MainMenuScreen` now reads the current PC party, builds the packed team from those species, and passes that directly into `BattleScreen` for `Quick Battle`.
- `HubGame` now receives `party` / `storageBoxes` from the parent instead of owning a separate local copy, so changes made in Bill's PC survive leaving the hub and are immediately available to battle flow.
- Expanded `client/web/src/battle/battleTeamCatalog.ts` with battle-ready sets for every species currently available in the PC/storage pool, so swapping via the PC does not silently produce unsupported team members.
- Reworked `client/web/src/hub/PcMenu.tsx` to make the PC menu clearer and nicer:
  - added an `ACTIVE PARTY` panel with the six current slots
  - added `Party` and `Stored` counters
  - added copy that explicitly says `Quick Battle uses this team`
- Polished `client/web/src/hub/StorageOverlay.tsx` with extra depth:
  - drop shadows on the box and party panel
  - shadow under the preview sprite
  - slight lift on the prompt window so the storage view reads less flat

Files changed
- `client/web/src/hub/usePersistentHubStorage.ts`
- `client/web/src/hub/HubGame.tsx`
- `client/web/src/screens/MainMenuScreen.tsx`
- `client/web/src/battle/battleTeamCatalog.ts`
- `client/web/src/hub/PcMenu.tsx`
- `client/web/src/hub/StorageOverlay.tsx`
- `progress.md`
- Added browser-test action payloads:
  - `.shard/test/pc-shot-menu-actions.json`
  - `.shard/test/pc-shot-organize-actions.json`
  - `.shard/test/pc-shot-organize-alt-actions.json`
  - `.shard/test/pc-shot-withdraw-actions.json`
  - `.shard/test/pc-shot-deposit-actions.json`
  - `.shard/test/pc-shot-deposit-alt-actions.json`
  - `.shard/test/quick-battle-direct-actions.json`
  - `.shard/test/pc-to-quick-battle-actions.json`

Verification
- `cd client/web && npx tsc --noEmit` ✅
- Shared skill browser captures reviewed manually:
  - `Menu`: `.shard/test/pc-shot-deposit-v4/shot-0.png`
  - `Organize`: `.shard/test/pc-shot-organize-v2/shot-0.png`
  - `Withdraw`: `.shard/test/pc-shot-withdraw-v3/shot-0.png`
  - `Dialogue entry`: `.shard/test/pc-shot-menu-v3/shot-0.png`
- `Quick Battle` still reaches the battle scene after the flow change:
  - `.shard/test/quick-battle-direct/shot-0.png`

Assumptions
- I treated the user's request to use the PC as the authoritative team-management flow, so `Quick Battle` now consumes the current PC party instead of relying on the separate pre-battle setup screen.

Blockers / open questions
- I left `client/web/src/battle/QuickBattleSetupScreen.tsx` in the tree even though the main menu no longer routes through it. It is now effectively dormant code unless someone wires it back in later.
- The shared skill client was reliable for screenshot capture, but its long multi-step `PC -> edit -> back -> Quick Battle` scenario did not finish cleanly enough to use as the primary proof artifact. The code path is wired directly and the shorter browser smokes passed, but if the orchestrator wants a single end-to-end artifact for `PC change -> battle uses changed party`, that flow still deserves a dedicated deterministic Playwright script.
