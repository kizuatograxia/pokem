# Task Gemini: Inventário PBS — tabela de ownership base vs Gen9

## Objetivo
Mapear os arquivos PBS nos dois diretórios de source e gerar uma tabela de ownership para o `tools/dex-importer`.

## Workspace
`C:\Users\hedge\OneDrive\Desktop\pokém`

## Passos

### 1. Listar arquivos PBS
```bash
ls sources/pokemon-essentials-21.1/PBS/
```
```bash
find sources/generation-9-pack-v3.3.4/ -name "*.txt" | sort
```

### 2. Gerar tabela de ownership
Crie tabela markdown com colunas:
| arquivo | presente_base | presente_gen9 | relação | observação |

Valores de `relação`:
- `override` — mesmo nome nos dois lados, Gen9 tem precedência
- `base-only` — só existe na base Essentials
- `gen9-only` — só existe no Gen9 pack
- `merge` — ambos existem com conteúdo complementar

### 3. Identificar arquivos críticos
Destaque quais contêm:
- Espécies (`pokemon.txt` ou equivalente)
- Movimentos (`moves.txt`)
- Habilidades (`abilities.txt`)
- Itens (`items.txt`)
- Tipos (`types.txt`)
- Encontros wild

### 4. Auditar o dex-importer atual
```bash
ls tools/dex-importer/src/
cat tools/dex-importer/src/*.ts 2>/dev/null || cat tools/dex-importer/src/**/*.ts
```
Identifique quais arquivos PBS já são parseados e quais faltam.

## Output
Salvar resultado em `.shard/test/result-gemini.md`:
1. Tabela de ownership completa
2. Lista de arquivos críticos com caminho canônico (base ou gen9)
3. Gaps do dex-importer: o que falta implementar

Adicionar em `.shard/test/log.md`:
```
## 2026-04-01 — gemini-done: inventário PBS ownership base vs gen9
```
