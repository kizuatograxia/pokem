# Resultado: Inventário PBS — Ownership Base vs Gen9

## 1. Tabela de Ownership Completa

| Arquivo | Presente Base | Presente Gen9 | Relação | Observação |
| :--- | :---: | :---: | :---: | :--- |
| `abilities.txt` | Sim | Sim* | `merge` | Gen9 usa `abilities_Gen_9_Pack.txt` |
| `items.txt` | Sim | Sim* | `merge` | Gen9 usa `items_Gen_9_Pack.txt` |
| `moves.txt` | Sim | Sim* | `merge` | Gen9 usa `moves_Gen_9_Pack.txt` |
| `pokemon.txt` | Sim | Sim* | `merge` | Gen9 usa `pokemon_base_Gen_9_Pack.txt` |
| `pokemon_forms.txt` | Sim | Sim* | `merge` | Gen9 usa `pokemon_forms_Gen_9_Pack.txt` |
| `pokemon_metrics.txt` | Sim | Sim | `override` | Gen9 possui arquivo com mesmo nome (6242 linhas) que substitui o base |
| `pokemon_metrics_Gen_9_Pack.txt` | Não | Sim | `gen9-only` | Contém métricas específicas da Gen9 e formas extras do pack |
| `types.txt` | Sim | Não | `base-only` | Tipos permanecem os do Essentials 21.1 |
| `encounters.txt` | Sim | Não | `base-only` | Encontros wild do Essentials |
| `trainers.txt` | Sim | Não | `base-only` | Treinadores base |
| `trainer_types.txt` | Sim | Não | `base-only` | Tipos de treinadores base |
| `town_map.txt` | Sim | Não | `base-only` | Dados do mapa regional |

*\*Arquivos do Gen9 Pack possuem sufixos (ex: `_Gen_9_Pack.txt`) e devem ser fundidos com os arquivos base homônimos.*

## 2. Arquivos Críticos (Caminho Canônico)

Para o importador, a ordem de carga deve respeitar:
1. **Espécies**: `sources/pokemon-essentials-21.1/PBS/pokemon.txt` + `sources/generation-9-pack-v3.3.4/PBS/pokemon_base_Gen_9_Pack.txt`
2. **Formas**: `sources/pokemon-essentials-21.1/PBS/pokemon_forms.txt` + `sources/generation-9-pack-v3.3.4/PBS/pokemon_forms_Gen_9_Pack.txt`
3. **Métricas (Visual)**: `sources/generation-9-pack-v3.3.4/PBS/pokemon_metrics.txt` (Precedência) + `sources/generation-9-pack-v3.3.4/PBS/pokemon_metrics_Gen_9_Pack.txt`
4. **Moves**: `sources/pokemon-essentials-21.1/PBS/moves.txt` + `sources/generation-9-pack-v3.3.4/PBS/moves_Gen_9_Pack.txt`
5. **Items**: `sources/pokemon-essentials-21.1/PBS/items.txt` + `sources/generation-9-pack-v3.3.4/PBS/items_Gen_9_Pack.txt`

## 3. Gaps do dex-importer (O que falta)

Atualmente o `tools/dex-importer/src/index.ts` ignora os seguintes pontos:

- **Itens**: Não há parser para `items.txt` nem carga dos arquivos de itens.
- **Tipos**: O arquivo `types.txt` não é lido; tipos são hardcoded ou inferidos como strings simples.
- **Métricas Visuais**: O importador não lê `pokemon_metrics.txt`. Sem isso, o frontend não saberá o posicionamento dos sprites (`BackSprite`, `FrontSprite`) nem o tamanho das sombras.
- **Merge de Metrics**: O arquivo `pokemon_metrics.txt` do Gen9 Pack substitui o do Essentials, mas o pack ainda tem o `pokemon_metrics_Gen_9_Pack.txt` que precisa ser adicionado ao set final.
- **Encounters & Trainers**: Dados fundamentais para o gameplay de overworld que ainda não estão no pipeline de importação.
