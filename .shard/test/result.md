What I did
- Fixed the Pokemon battle sprite runtime in `client/web` so animated battlers no longer fall back to the legacy/static path just because the wrapper animation overwrote the spritesheet animation.
- Reworked `client/web/src/battle/BattleField.tsx` to render battlers through an animated wrapper plus an internal `canvas`, allowing battle motion (`switch-in`, selection bob, faint, move-use) and frame playback to run at the same time.
- Replaced the old “horizontal strip only” spritesheet logic with runtime sheet analysis that now supports:
  - horizontal strips
  - grid sheets with a uniform chroma background
  - leading red guide columns present in some exported strips
- Added a short diagnostic playtest script in `.shard/test/inspect-sprite-runtime.cjs` to confirm the browser is drawing animated Pokemon canvases and that their pixels change over time.

Files changed
- `client/web/src/battle/BattleField.tsx`
  - Added spritesheet analysis + canvas renderer.
  - Split wrapper animation from sprite frame playback.
  - Kept existing battle cue hooks (`spriteAnims`, `keepVisible`) wired into the field renderer.
- `.shard/test/inspect-sprite-runtime.cjs`
  - Browser diagnostic for sprite DOM/runtime validation.
- `.shard/test/result.md`

Verification
- `cd client/web && npx tsc --noEmit` ✅
- `cd server/battle && npx tsc --noEmit` ✅
- Browser playtest against `http://127.0.0.1:4317` ✅
  - `node .shard/test/verify-quick-battle.cjs http://127.0.0.1:4317`
  - screenshot: `.shard/test/quick-battle-check.png`
  - runtime probe: `.shard/test/inspect-sprite-runtime.json`
  - result: `canvasCount = 2` and `canvasChanged = true`, confirming both battler sprites are animating frame-to-frame

Assumptions
- I treated the user’s latest request (“Pokemon animations still look legacy/static”) as the active task, even though `.shard/test/task.md` still describes the earlier server transport work.
- I kept the fix local to the battle frontend runtime and did not change the canonical battle view-model contract.

Blockers / open questions
- I validated live animation playback with Pikachu in the quick-battle smoke test. The renderer now also supports grid sheets, but I did not exhaustively playtest every species/form asset in the set.
