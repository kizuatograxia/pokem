# Project Genesis

This repository is the frontend interface lab for a Pokemon battle platform whose original planning, runtime workflow, and product notes were imported from the main workspace.

The goal here is not to build a generic modern app. The goal is to reconstruct a Pokemon Essentials-like interface language in a modern React codebase, with strong pixel fidelity and room to evolve into a multiplayer platform.

## Start here

1. Read [AGENT.md](/Users/hedge/OneDrive/Desktop/project-genesis/AGENT.md)
2. Read [CONTEXT_IMPORT.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/CONTEXT_IMPORT.md)
3. Open [Home.md](/Users/hedge/OneDrive/Desktop/project-genesis/obsidian-vault/Home.md)

## Imported context

The repository now includes:

- a curated project context package in [docs/project-context](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context)
- the imported Obsidian knowledge base in [obsidian-vault](/Users/hedge/OneDrive/Desktop/project-genesis/obsidian-vault)
- the original workspace agent reference in [ORIGINAL_WORKSPACE_AGENT.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/ORIGINAL_WORKSPACE_AGENT.md)
- the Lovable-ready prompt pack in [LOVABLE_PIXEL_PROMPT_PACK.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/LOVABLE_PIXEL_PROMPT_PACK.md)
- the real-asset workflow in [LOCAL_ASSET_WORKFLOW.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/LOCAL_ASSET_WORKFLOW.md)
- the real-asset prompt in [LOVABLE_REAL_ASSET_PROMPT.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/LOVABLE_REAL_ASSET_PROMPT.md)
- the strict master prompt in [LOVABLE_MASTER_EXECUTION_PROMPT.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/LOVABLE_MASTER_EXECUTION_PROMPT.md)
- the committed starter asset manifest in [SPRITE_MANIFEST.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/SPRITE_MANIFEST.md)
- the runtime structure map in [ESSENTIALS_RUNTIME_STRUCTURE.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/ESSENTIALS_RUNTIME_STRUCTURE.md)
- the screen role map in [SCREEN_ROLE_MAP.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/SCREEN_ROLE_MAP.md)

These files document:

- product scope
- architecture direction
- gameplay goals
- build and runtime workflow
- backlog and decisions
- source-of-truth paths from the original workspace

## Important framing

- The legacy Pokemon Essentials runtime is a reference build, not the architecture for this repo.
- This repo should focus on frontend/interface implementation.
- Pixel fidelity matters more than generic polish.
- Do not pull in third-party archives or runtime dumps unless there is a very deliberate reason.

## Local development

```bash
npm install
npm run dev
```

## Frontend direction

The intended interface direction is:

- pixel-art first
- Pokemon Essentials fidelity
- crisp borders and retro panel composition
- compact game-like information density
- modern code structure underneath

## Real starter assets now in repo

This repository now includes a committed starter pack of real local assets under:

- [public/assets/reference-ui](/Users/hedge/OneDrive/Desktop/project-genesis/public/assets/reference-ui)
- [public/assets/sprites](/Users/hedge/OneDrive/Desktop/project-genesis/public/assets/sprites)
- [public/assets/tilesets](/Users/hedge/OneDrive/Desktop/project-genesis/public/assets/tilesets)

For exact usage guidance, read:

- [LOVABLE_MASTER_EXECUTION_PROMPT.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/LOVABLE_MASTER_EXECUTION_PROMPT.md)
- [SPRITE_MANIFEST.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/SPRITE_MANIFEST.md)
- [LOVABLE_REAL_ASSET_PROMPT.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/LOVABLE_REAL_ASSET_PROMPT.md)
- [ESSENTIALS_RUNTIME_STRUCTURE.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/ESSENTIALS_RUNTIME_STRUCTURE.md)
- [SCREEN_ROLE_MAP.md](/Users/hedge/OneDrive/Desktop/project-genesis/docs/project-context/SCREEN_ROLE_MAP.md)

## Recommended reading order

- [Home.md](/Users/hedge/OneDrive/Desktop/project-genesis/obsidian-vault/Home.md)
- [System Overview.md](/Users/hedge/OneDrive/Desktop/project-genesis/obsidian-vault/03%20Architecture/System%20Overview.md)
- [Build and Runtime Workflow.md](/Users/hedge/OneDrive/Desktop/project-genesis/obsidian-vault/06%20Operations/Build%20and%20Runtime%20Workflow.md)
- [Current Workspace State.md](/Users/hedge/OneDrive/Desktop/project-genesis/obsidian-vault/01%20Project/Current%20Workspace%20State.md)
- [2026-03-30 Runtime Recompile and Legendary Starter Recovery.md](/Users/hedge/OneDrive/Desktop/project-genesis/obsidian-vault/07%20Sessions/2026-03-30%20Runtime%20Recompile%20and%20Legendary%20Starter%20Recovery.md)
