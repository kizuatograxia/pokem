# Agent Guide

This workspace uses layered `AGENT.md` files so agents can pick up both global context and domain-specific behavior.

## Root agent

- `C:\Users\hedge\OneDrive\Desktop\pokém\AGENT.md`

Use this as the project-wide operating context. It explains:

- what this workspace is
- where the official runtime lives
- where source-of-truth paths are
- what not to treat as the final architecture
- global constraints for safe, reproducible work

## Domain agents

### Flutter client

- `C:\Users\hedge\OneDrive\Desktop\pokém\client\flutter\AGENT.md`

Use when working on:

- client shell
- battle UI
- spectator UI
- matchmaking lobby UI
- websocket client integration
- cross-platform UX and state management

### Gameplay / UX design

- `C:\Users\hedge\OneDrive\Desktop\pokém\design\gameplay\AGENT.md`

Use when working on:

- player flows
- battle UX
- spectator experience
- queue/lobby clarity
- feature specs and design rationale

### Backend battle / realtime

- `C:\Users\hedge\OneDrive\Desktop\pokém\server\battle\AGENT.md`

Use when working on:

- authoritative battle services
- matchmaking services
- websocket synchronization
- snapshots, replay, and desync recovery
- public/private battle projections

### Data importer

- `C:\Users\hedge\OneDrive\Desktop\pokém\tools\dex-importer\AGENT.md`

Use when working on:

- parsing PBS
- data normalization
- conflict detection
- legality validation
- versioned dataset generation

## Recommended usage pattern

1. Read the root `AGENT.md`.
2. Work inside the relevant domain directory so the local `AGENT.md` applies naturally.
3. If the task changes architecture or workflow, update the vault or docs alongside the code.

## Keyword-based routing

The root agent now contains a keyword routing section so tasks launched from the workspace root can self-dispatch by intent.

Reference:

- `C:\Users\hedge\OneDrive\Desktop\pokém\docs\AGENT_KEYWORDS.md`

Practical examples:

- saying `Flutter`, `widget`, `battle UI`, or `spectator screen` should route toward the Flutter client agent
- saying `gameplay`, `UX`, `player flow`, or `lobby experience` should route toward the gameplay/design agent
- saying `websocket`, `matchmaking`, `desync`, or `snapshot` should route toward the backend battle/realtime agent
- saying `PBS`, `importer`, `learnsets`, or `validation` should route toward the data importer agent

## Important reminder

The playable Essentials runtime is a reference build. New platform code should grow in dedicated modules, not be forced into the legacy runtime unless the task is specifically about runtime debugging or comparison.
