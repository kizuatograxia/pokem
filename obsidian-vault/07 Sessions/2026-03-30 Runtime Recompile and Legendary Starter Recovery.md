---
tags:
  - sessions
  - runtime
  - gen9
  - starter
status: active
date: 2026-03-30
---

# 2026-03-30 Runtime Recompile and Legendary Starter Recovery

## Contexto

O runtime oficial ja estava bootando, o spawn de `New Game` ja havia sido movido para a Battle Tower e o bundle de Pokemon lendarios ja existia em script. Mesmo assim, o jogador ainda iniciava com `Party 0` e caixas vazias.

Os sintomas observados foram:

- `New Game` funcionando, mas com `Party 0`
- `Trainer Card` ainda em estado inicial (`Unnamed`, Pokedex `0/0`)
- script de entrega rodando sem erro visivel, mas sem adicionar Pokemon

## Causa raiz

O problema real nao era a logica de adicionar os Pokemon na party. O problema era o pipeline de dados do runtime:

- o jogo em release nao recompilava automaticamente os `PBS`
- os arquivos `Data/*.dat` do runtime continuavam com timestamp de 2023
- por causa disso, os dados Gen 9 nao estavam presentes no `GameData` carregado pelo runtime
- species como `KORAIDON`, `MIRAIDON` e `TERAPAGOS` nao existiam de fato no conjunto compilado que o jogo estava lendo

Em outras palavras, o pack Gen 9 estava presente em `PBS`, mas nao estava materializado nos `.dat` consumidos pela execucao.

## Correcao aplicada

### 1. Compilacao forcada no primeiro boot do runtime

Arquivo:

`C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\021_Compiler\001_Compiler.rb`

Mudanca conceitual:

- `Compiler.main` deixou de depender exclusivamente de `DEBUG`
- se existir `Data\force_compile`, o runtime recompila mesmo fora do fluxo normal de debug
- ao final, o arquivo `Data\force_compile` e removido

Isso transforma a compilacao em um mecanismo operacional controlado pelo rebuild.

### 2. Rebuild marcando o runtime para recompilar

Arquivo:

`C:\Users\hedge\OneDrive\Desktop\pokém\tools\rebuild-complete-gen9-runtime.bat`

Mudanca conceitual:

- o rebuild agora cria `Data\force_compile`
- o launcher seguinte do runtime recompila os dados legados uma unica vez
- o rebuild tambem valida que esse marcador existe antes de finalizar com sucesso

### 3. Bundle com fallback seguro

Arquivo:

`C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\019_Utilities\004_RecentLegendaryBundle.rb`

Mudanca conceitual:

- `BUNDLE_VERSION` foi elevado para `6`
- o bundle continua preferindo `Koraidon`, `Miraidon` e `Terapagos`
- se a disponibilidade de species falhar, ha fallback para `Mewtwo`, `Lugia` e `Rayquaza`

Isso reduz o risco de o jogador voltar a ficar sem Pokemon jogaveis caso haja nova regressao de dados.

## Validacao

Foi validado que:

- `Data\force_compile` foi criado pelo rebuild
- o arquivo sumiu depois do boot do jogo
- os arquivos `Data/*.dat` do runtime passaram a ter timestamp de `2026-03-30 06:07`
- `species.dat`, `moves.dat`, `items.dat` e outros cresceram de tamanho, indicando recompilacao real
- o usuario confirmou em conversa que o problema finalmente "pegou"

## Impacto pratico

O runtime oficial agora possui um fluxo muito mais seguro:

1. rebuild copia scripts, PBS, pack Gen 9 e hotfix
2. rebuild cria o marcador `force_compile`
3. primeiro boot recompila o conjunto de dados legado
4. a entrega dos Pokemon lendarios passa a operar sobre dados realmente disponiveis

## Arquivos principais envolvidos

- `C:\Users\hedge\OneDrive\Desktop\pokém\tools\rebuild-complete-gen9-runtime.bat`
- `C:\Users\hedge\OneDrive\Desktop\pokém\launch-gen9-game.bat`
- `C:\Users\hedge\OneDrive\Desktop\pokém\JOGAR-POKEMON.bat`
- `C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\021_Compiler\001_Compiler.rb`
- `C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\019_Utilities\004_RecentLegendaryBundle.rb`
- `C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1\Data\Scripts\003_Game processing\001_StartGame.rb`
- `C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-complete-gen9`

## Proximos passos naturais

- formalizar melhor a estrategia de recompilacao para qualquer mudanca em `PBS`
- adicionar logging leve para futuras investigacoes de runtime
- consolidar a lista de customizacoes locais aplicadas ao Essentials legado
