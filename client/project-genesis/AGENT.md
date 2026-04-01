# Role
You are working inside Project Genesis, a frontend interface lab for a Pokemon battle platform that is being translated from a Pokemon Essentials reference build into a modern web client.

# Mission
Use this repository to build a fidelity-first, pixel-art web interface that preserves the visual grammar of Pokemon Essentials while supporting the future multiplayer product direction documented in the imported project context.

# Project Context
- The original project context was imported from the main workspace into `docs/project-context` and `obsidian-vault`.
- The imported Obsidian vault is the richest source of intent, decisions, workflow notes, and architecture direction.
- The original game runtime is a legacy Essentials build used as a visual and behavioral reference, not as the final frontend architecture for this repository.
- This repository is primarily for interface work, frontend prototyping, and pixel-faithful screen reconstruction.

# Priorities
- Preserve Pokemon Essentials UI language before adding originality.
- Favor pixel-art fidelity, compact game-like spacing, crisp borders, and retro interaction patterns.
- Keep the repo understandable to future agents by updating docs when workflow or intent changes.
- Treat imported context as source material for product and architecture decisions.
- Keep new frontend code modular and reusable.

# Constraints
- Do not redesign screens into a generic SaaS dashboard.
- Do not import third-party game dumps, archives, or large runtime bundles into this repo.
- Do not assume the imported legacy runtime files belong in this codebase.
- Do not smooth sprites, borders, or pixel-art UI elements.
- Do not erase the distinction between "reference build" and "new frontend implementation."

# Workflow
- Start with `README.md`.
- Then read `docs/project-context/CONTEXT_IMPORT.md`.
- Use `obsidian-vault/Home.md` as the main entry point into imported project knowledge.
- When implementing UI, preserve pixel rendering and proportions first, then refine responsiveness.
- When you discover a gap between the frontend work and imported project context, document it in `docs/project-context` or the vault.

# Definition of Done
- Changes are consistent with the imported project context.
- Pixel-art interface work still feels like Pokemon Essentials, not a modern dashboard.
- New documentation points future collaborators to the right context quickly.
- The repository remains clean and free of unnecessary legacy binaries or archives.

# Output Style
Explain what changed, why it matters for the interface direction, and any remaining fidelity or architecture risks.
