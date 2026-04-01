# Workspace Map

## Official Runtime

This is the runnable game build we should use from now on:

- `C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-complete-gen9`

Reason:
- it uses an ASCII-only path, which avoids the boot issues caused by the accented workspace path
- it is built from the complete Essentials base
- it includes the Gen 9 pack and the `v21.1 Hotfixes` dependency

## Source Layers

These are the source inputs used to rebuild the official runtime:

- `C:\Users\hedge\OneDrive\Desktop\pokém\Pokemon Essentials v21.1 2023-07-30.zip`
  - complete Essentials base distribution
- `C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1`
  - extracted repo-style Essentials source with editable `Data\Scripts`
- `C:\Users\hedge\OneDrive\Desktop\pokém\sources\generation-9-pack-v3.3.4`
  - Gen 9 assets, PBS, and plugin source
- `C:\Users\hedge\OneDrive\Desktop\pokém\v21.1 Hotfixes.zip`
  - required plugin dependency for the Gen 9 pack

## Important Paths

- `C:\Users\hedge\OneDrive\Desktop\pokém\tools\rebuild-complete-gen9-runtime.bat`
  - rebuilds the official runtime from the source layers
- `C:\Users\hedge\OneDrive\Desktop\pokém\tools\launch-complete-gen9-runtime.bat`
  - launches the official runtime
- `C:\Users\hedge\OneDrive\Desktop\pokém\tools\obsidian-cli\open-project-vault.bat`
  - opens the project Obsidian vault in the installed desktop app
- `C:\Users\hedge\OneDrive\Desktop\pokém\tools\obsidian-cli\obsidian-cli.bat`
  - forwards commands to the installed Obsidian CLI wrapper (`Obsidian.com`); if commands fail, enable `Settings > General > Advanced > Command line interface` in the app
- `C:\Users\hedge\OneDrive\Desktop\pokém\launch-gen9-game.bat`
  - convenience launcher from the workspace root

## Obsolete Paths

These should not be treated as the main game build anymore:

- `C:\Users\hedge\OneDrive\Desktop\pokém\pokemon-essentials-v21.1-gen9`
  - earlier incomplete build assembled before the full Essentials base was available
- `C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-gen9`
  - earlier runtime built from the stripped repo package

Keep them only as historical scratch space unless we decide to delete them later.
