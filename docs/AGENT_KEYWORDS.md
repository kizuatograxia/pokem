# Agent Keywords

This file exists to make agent routing easier when tasks begin from the workspace root instead of from a domain folder.

It does not change Codex platform internals, but it gives the root `AGENT.md` a clear dispatch table so the active agent can self-route based on the user's wording.

## Flutter Client

Primary keywords:

- flutter
- dart
- widget
- mobile
- responsive
- battle ui
- lobby ui
- spectator ui
- provider
- bloc
- riverpod
- websocket client
- reconnect ui
- navigation
- animation
- client shell

Owner:

- `C:\Users\hedge\OneDrive\Desktop\pokém\client\flutter\AGENT.md`

## Gameplay / UX

Primary keywords:

- ux
- gameplay
- game design
- player flow
- battle flow
- spectator experience
- queue flow
- lobby experience
- readability
- wireframe
- feature spec
- friction
- onboarding

Owner:

- `C:\Users\hedge\OneDrive\Desktop\pokém\design\gameplay\AGENT.md`

## Backend Battle / Realtime

Primary keywords:

- backend
- api
- websocket
- realtime
- sync
- desync
- reconnect
- matchmaking
- battle service
- event log
- snapshot
- replay
- authoritative
- state hash
- spectator stream
- server

Owner:

- `C:\Users\hedge\OneDrive\Desktop\pokém\server\battle\AGENT.md`

## Data Importer

Primary keywords:

- pbs
- importer
- importador
- parser
- species
- moves
- abilities
- items
- learnsets
- forms
- legality
- normalization
- validation
- gen 9 data
- essentials data

Owner:

- `C:\Users\hedge\OneDrive\Desktop\pokém\tools\dex-importer\AGENT.md`

## Suggested Prompt Patterns

### Flutter

- "Flutter: build the initial battle lobby screen"
- "Client UI: implement reconnect state for the battle screen"

### Gameplay / UX

- "Gameplay UX: redesign the spectator flow for clarity"
- "Game design: define the lobby to match-found player journey"

### Backend / Realtime

- "Backend realtime: design the websocket message schema"
- "Battle server: implement snapshot and resync flow"

### Data Importer

- "Importer: parse PBS moves and species into typed structures"
- "Data validation: detect broken learnset references"
