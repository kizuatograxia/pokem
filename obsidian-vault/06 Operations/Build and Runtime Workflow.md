---
tags:
  - operations
  - build
  - runtime
status: active
---

# Build and Runtime Workflow

## Objetivo

Descrever o fluxo oficial para reconstruir, executar e validar o runtime de referencia do projeto.

## Regra geral

O workflow correto e:

1. editar nas fontes corretas
2. rodar o rebuild oficial
3. testar no runtime oficial
4. registrar qualquer observacao relevante

## Build oficial

### Runtime gerado

`C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-complete-gen9`

### Script oficial de rebuild

`C:\Users\hedge\OneDrive\Desktop\pokém\tools\rebuild-complete-gen9-runtime.bat`

### Launcher oficial

`C:\Users\hedge\OneDrive\Desktop\pokém\tools\launch-complete-gen9-runtime.bat`

Atalho raiz:

`C:\Users\hedge\OneDrive\Desktop\pokém\launch-gen9-game.bat`

## O que o rebuild faz conceitualmente

- recria a base a partir da distribuicao completa do Essentials v21.1
- sobrepoe scripts e artefatos relevantes da fonte repo-style
- aplica assets, PBS e plugin do Pack Gen 9
- aplica o hotfix exigido pelo plugin da Gen 9
- remove `Data\PluginScripts.rxdata` para permitir recompilacao correta na primeira inicializacao
- cria `Data\force_compile` para obrigar uma recompilacao dos `.dat` no primeiro boot apos cada rebuild

## Por que o runtime oficial fica em outro caminho

O caminho sem acento foi adotado porque o boot do jogo apresentou problemas em caminhos acentuados. Isso tornou a pasta `pokem-runtime` a escolha segura para execucao.

## Fluxo operacional recomendado

### Quando alterar scripts

1. editar em `sources\pokemon-essentials-21.1`
2. rebuildar
3. iniciar o jogo
4. verificar se o boot continua limpo

### Quando alterar dados ou assets da Gen 9

1. editar em `sources\generation-9-pack-v3.3.4`
2. rebuildar
3. abrir o runtime oficial uma vez para permitir a recompilacao forçada dos `.dat`
4. validar boot e comportamento esperado

## Nova regra importante de primeira abertura

Depois de cada rebuild do runtime oficial:

1. abra o jogo uma vez pelo launcher oficial
2. espere a inicializacao terminar normalmente
3. deixe o runtime consumir e remover `Data\force_compile`
4. so depois trate o teste funcional como definitivo

Essa etapa existe porque o runtime legado nao recompila automaticamente os `PBS` em modo release sem ajuda adicional. O marcador `force_compile` e a forma segura de garantir que os dados de `PBS` realmente virem `Data/*.dat`.

### Quando alterar documentacao

1. atualizar nota correspondente no vault
2. se o fluxo operacional mudou, atualizar tambem `docs` caso a documentacao antiga ainda seja usada
3. se a mudanca afetar abertura do cofre ou automacao documental, atualizar [[06 Operations/Obsidian Vault Workflow]]

## Validacoes minimas apos rebuild

- o jogo abre
- `Data\force_compile` desaparece depois do primeiro boot
- os arquivos `Data\*.dat` recebem timestamp novo
- nao reaparecem erros de `Game.ini`
- nao reaparecem erros de `PluginScripts.rxdata`
- nao falta `Animations.rxdata`
- nao volta a reclamar do hotfix da Gen 9

## Erros historicos ja resolvidos

### `No script file has been specified`

Causa:

- `Game.ini` ausente ou incompleto

### `No such file or directory - Data/PluginScripts.rxdata`

Causa:

- fluxo de compilacao de plugins falhando na primeira geracao

### `No such file or directory - Data/Animations.rxdata`

Causa:

- tentativa de boot em copia incompleta que nao era a instalacao full do Essentials

### `Generation 9 Pack requires plugin v21.1 Hotfixes`

Causa:

- hotfix nao aplicado

## Politica de troubleshooting

Se a build parar de bootar:

1. confirmar que esta testando o runtime oficial
2. confirmar que o rebuild usou as fontes esperadas
3. comparar a falha com os erros historicos conhecidos
4. registrar a analise em `07 Sessions/Session Log`
5. se a correcao for estrutural, atualizar `08 Decisions` ou `06 Operations`

## Resultado esperado

Qualquer pessoa que abra este vault deve conseguir:

- entender onde editar
- rebuildar sem improvisar
- testar a build correta
- saber por que certas escolhas operacionais foram feitas
