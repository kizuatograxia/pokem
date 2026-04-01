# OpenClaw Task — Importação de assets PKE + Gen9 → client/web

## Contexto
Gemini ficou rate-limited (429) e não conseguiu executar as importações.
Todas as tarefas abaixo são puramente shell (robocopy / mkdir) — sem raciocínio necessário.

## Workspace raiz
`C:\Users\hedge\OneDrive\Desktop\pokém`

---

## Tarefa 1 — Fontes PKE

```bat
mkdir "client\web\public\assets\fonts" 2>nul
robocopy "sources\pokemon-essentials-21.1\Fonts" "client\web\public\assets\fonts" *.ttf /NFL /NDL
```

Fontes esperadas: `power clear.ttf`, `power clear bold.ttf`, `power green.ttf`,
`power green narrow.ttf`, `power green small.ttf`, `power red and blue.ttf`,
`power red and blue intl.ttf`, `power red and green.ttf`

---

## Tarefa 2 — Pokemon sprites Gen9 (Front, Back, Icons, Eggs, Footprints, Shadow)

```bat
robocopy "sources\generation-9-pack-v3.3.4\Graphics\Pokemon\Front"         "client\web\public\assets\sprites\pokemon\front"         /E /NFL /NDL
robocopy "sources\generation-9-pack-v3.3.4\Graphics\Pokemon\Front shiny"   "client\web\public\assets\sprites\pokemon\front-shiny"   /E /NFL /NDL
robocopy "sources\generation-9-pack-v3.3.4\Graphics\Pokemon\Back"          "client\web\public\assets\sprites\pokemon\back"          /E /NFL /NDL
robocopy "sources\generation-9-pack-v3.3.4\Graphics\Pokemon\Back shiny"    "client\web\public\assets\sprites\pokemon\back-shiny"    /E /NFL /NDL
robocopy "sources\generation-9-pack-v3.3.4\Graphics\Pokemon\Icons"         "client\web\public\assets\sprites\pokemon\icons"        /E /NFL /NDL
robocopy "sources\generation-9-pack-v3.3.4\Graphics\Pokemon\Icons shiny"   "client\web\public\assets\sprites\pokemon\icons-shiny"  /E /NFL /NDL
robocopy "sources\generation-9-pack-v3.3.4\Graphics\Pokemon\Shadow"        "client\web\public\assets\sprites\pokemon\shadow"       /E /NFL /NDL
robocopy "sources\generation-9-pack-v3.3.4\Graphics\Pokemon\Eggs"          "client\web\public\assets\sprites\pokemon\eggs"         /E /NFL /NDL
robocopy "sources\generation-9-pack-v3.3.4\Graphics\Pokemon\Footprints"    "client\web\public\assets\sprites\pokemon\footprints"   /E /NFL /NDL
```

---

## Tarefa 3 — Items Gen9

```bat
robocopy "sources\generation-9-pack-v3.3.4\Graphics\Items" "client\web\public\assets\sprites\items" /E /NFL /NDL
```

---

## Tarefa 4 — Characters Gen9 (Followers)

```bat
robocopy "sources\generation-9-pack-v3.3.4\Graphics\Characters\Followers"         "client\web\public\assets\sprites\characters\followers"        /E /NFL /NDL
robocopy "sources\generation-9-pack-v3.3.4\Graphics\Characters\Followers shiny"   "client\web\public\assets\sprites\characters\followers-shiny"  /E /NFL /NDL
```

---

## Tarefa 5 — Windowskin: busca nos scripts Ruby do PKE

```bat
findstr /S /I /C:"windowskin" /C:"Windowskins" "sources\pokemon-essentials-21.1\Data\Scripts\*.rb" | findstr /V "test Test" > .shard\test\windowskin-refs.txt 2>&1
```

Se `.shard\test\windowskin-refs.txt` tiver conteúdo, reporta as primeiras 30 linhas.

Também tenta:
```bat
findstr /S /I /C:"font_name" /C:"Font.new" "sources\pokemon-essentials-21.1\Data\Scripts\*.rb" | head
```

---

## Tarefa 6 — Busca de fontes nos scripts PKE

```bat
findstr /S /I /C:"font_name" /C:"Font.new" /C:"font_size" "sources\pokemon-essentials-21.1\Data\Scripts\*.rb" > .shard\test\font-refs.txt 2>&1
```

Reporta as primeiras 40 linhas de `.shard\test\font-refs.txt`.

---

## Resultado
Escreve em `.shard/test/result-openclaw.md`:
- Quantos arquivos copiados por tarefa (saída do robocopy: linha "Files :")
- Primeiras 30 linhas de `windowskin-refs.txt`
- Primeiras 40 linhas de `font-refs.txt`

## Log
Adiciona em `.shard/test/log.md`:
```
## 2026-03-31 — openclaw-done: importação assets PKE+Gen9 (fontes, pokemon, items, followers), busca windowskin+fontes
```
