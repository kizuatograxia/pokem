# Development Workflow

## Rule of Thumb

Do not treat the runtime build as the permanent source of truth.

Use this workflow instead:

1. Edit the source layer you actually mean to change.
2. Rebuild the official runtime.
3. Launch the official runtime and test.

## Where To Edit

### Core Essentials script changes

Edit here:

- `C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts`

Use this for:
- core battle logic
- compiler behavior
- plugin manager behavior
- UI code inherited from Essentials

### Gen 9 plugin changes

Edit here:

- `C:\Users\hedge\OneDrive\Desktop\pokém\sources\generation-9-pack-v3.3.4\Plugins\Generation 9 Pack Scripts`

Use this for:
- Gen 9 move handlers
- Gen 9 ability handlers
- Gen 9 item handlers
- Gen 9 PBS updater/plugin behavior

### Gen 9 PBS/data changes

Edit here:

- `C:\Users\hedge\OneDrive\Desktop\pokém\sources\generation-9-pack-v3.3.4\PBS`

Use this for:
- new species and forms
- move/item/ability entries
- pack-specific PBS updates

## Rebuild And Launch

Rebuild:

- `C:\Users\hedge\OneDrive\Desktop\pokém\tools\rebuild-complete-gen9-runtime.bat`

Launch:

- `C:\Users\hedge\OneDrive\Desktop\pokém\tools\launch-complete-gen9-runtime.bat`

## Current Runtime Fixes Already Included

The rebuild flow includes:

- the complete Essentials v21.1 base
- editable `Data\Scripts` overlay from the repo-style source
- Gen 9 pack assets, PBS, and plugin scripts
- `v21.1 Hotfixes`
- the `PluginManager.rb` adjustment that allows first-boot plugin compilation when `PluginScripts.rxdata` is missing

## Warning

If you make direct edits inside:

- `C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-complete-gen9`

those edits can be lost on rebuild unless they are copied back into the proper source layer.
