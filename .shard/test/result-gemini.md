# Result — Inventário PBS: Ownership Base vs Gen9

**Data:** 2026-04-01
**Executor:** Gemini CLI (escrita via Claude Code — Gemini não tinha `write_file`)

---

## 1. Tabela de Ownership Completa

| Arquivo | Presente Base | Presente Gen9 | Relação | Observação |
|:---|:---:|:---:|:---|:---|
| `abilities.txt` | Sim | Sim (Auto-Updates) | `merge` | Auto-Updates contém descrições Gen 9 |
| `abilities_Gen_9_Pack.txt` | Não | Sim | `gen9-only` | Novas habilidades Gen 9 |
| `items.txt` | Sim | Sim (Auto-Updates) | `merge` | Preços e Fling damage atualizados |
| `items_Gen_9_Pack.txt` | Não | Sim | `gen9-only` | Novos itens Gen 9 |
| `moves.txt` | Sim | Sim (Auto-Updates) | `merge` | Mudanças de power/flags (Wind, Slicing) |
| `moves_Gen_9_Pack.txt` | Não | Sim | `gen9-only` | Novos movimentos Gen 9 |
| `pokemon.txt` | Sim | Sim (Auto-Updates) | `merge` | Learnsets e evoluções atualizadas |
| `pokemon_base_Gen_9_Pack.txt` | Não | Sim | `gen9-only` | Novas espécies Gen 9 |
| `pokemon_forms.txt` | Sim | Sim (Auto-Updates*) | `merge` | Formas base Essentials + Gen 9 updates |
| `pokemon_forms_Gen_9_Pack.txt` | Não | Sim | `gen9-only` | Novas formas Gen 9 |
| `pokemon_metrics.txt` | Sim | Sim | `merge` | Métricas atualizadas para sprites Gen 9 |
| `pokemon_metrics_Gen_9_Pack.txt` | Não | Sim | `gen9-only` | Métricas para novas espécies Gen 9 |
| `types.txt` | Sim | Não | `base-only` | Tipos fundamentais (Stellar não incluso no Gen9) |
| `encounters.txt` | Sim | Não | `base-only` | Encontros selvagens do mapa base |
| `trainers.txt` | Sim | Não | `base-only` | Treinadores do jogo base |

---

## 2. Arquivos Críticos — Caminhos Canônicos e Ordem de Carregamento

### Espécies e Formas
1. `sources/pokemon-essentials-21.1/PBS/pokemon.txt` — base
2. `sources/pokemon-essentials-21.1/PBS/pokemon_forms.txt` — formas base
3. `sources/generation-9-pack-v3.3.4/PBS/Gen 9 backup/Auto-Updates/pokemon.txt` — merge/override
4. `sources/generation-9-pack-v3.3.4/PBS/pokemon_base_Gen_9_Pack.txt` — append novas espécies
5. `sources/generation-9-pack-v3.3.4/PBS/pokemon_forms_Gen_9_Pack.txt` — append novas formas

### Movimentos
1. `sources/pokemon-essentials-21.1/PBS/moves.txt`
2. `sources/generation-9-pack-v3.3.4/PBS/Gen 9 backup/Auto-Updates/moves.txt`
3. `sources/generation-9-pack-v3.3.4/PBS/moves_Gen_9_Pack.txt`

### Habilidades
1. `sources/pokemon-essentials-21.1/PBS/abilities.txt`
2. `sources/generation-9-pack-v3.3.4/PBS/Gen 9 backup/Auto-Updates/abilities.txt`
3. `sources/generation-9-pack-v3.3.4/PBS/abilities_Gen_9_Pack.txt`

### Itens
1. `sources/pokemon-essentials-21.1/PBS/items.txt`
2. `sources/generation-9-pack-v3.3.4/PBS/Gen 9 backup/Auto-Updates/items.txt`
3. `sources/generation-9-pack-v3.3.4/PBS/items_Gen_9_Pack.txt`

---

## 3. Gaps do dex-importer

| # | Gap | Severidade |
|---|-----|-----------|
| 1 | Sem parser/schema para `items.txt` | P1 |
| 2 | Sem parser para `types.txt` | P1 |
| 3 | **Auto-Updates ignorado** — pasta `Gen 9 backup/Auto-Updates/` não é lida; Pokémon antigos ficam com dados Gen 8 | P0 |
| 4 | Deep-merge de formas incompleto — `pokemon_forms.txt` mencionado mas merge não implementado | P1 |
| 5 | Sem parser de métricas (`pokemon_metrics.txt`) | P2 |
| 6 | Sem validação cruzada de IDs — moves/abilities referenciados em `pokemon.txt` não são checados contra os outros arquivos | P1 |
