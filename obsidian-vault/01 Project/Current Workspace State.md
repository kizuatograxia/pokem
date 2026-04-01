---
tags:
  - project
  - workspace
  - operations
status: active
---

# Current Workspace State

## Objetivo desta nota

Registrar o estado real do workspace no momento em que o vault foi criado, para que futuras decisoes partam de uma base concreta e nao de memoria informal.

## Caminho raiz do workspace

`C:\Users\hedge\OneDrive\Desktop\pokém`

## Pastas e artefatos mais importantes

### Workspace principal

- `backend-monero`
- `client`
- `docs`
- `.shard`
- `sources`
- `tools`
- `pokemon-essentials-v21.1-gen9`
- `obsidian-vault`

### Arquivos compactados relevantes na raiz

- `Pokemon Essentials v21.1 2023-07-30.zip`
- `pokemon-essentials-21.1.zip`
- `Generation 9 Pack v3.3.4.rar`
- `v21.1 Hotfixes.zip`

## Estado consolidado da build jogavel

A build jogavel oficial e funcional fica fora do caminho com acento, em:

`C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-complete-gen9`

Essa escolha nao e estetica; ela resolve um problema operacional real. Durante os testes, caminhos com caracteres acentuados se mostraram problematicos para o boot do jogo.

## O que ja foi resolvido

- Game.ini foi corrigido no fluxo de build
- a base completa do Essentials v21.1 foi combinada corretamente com o Pack Gen 9
- o plugin de hotfix necessario para a Gen 9 foi aplicado
- o fluxo de primeira compilacao de plugins foi ajustado para nao falhar quando `PluginScripts.rxdata` ainda nao existe
- a build oficial boota com sucesso
- o runtime agora recompila os `.dat` no primeiro boot apos rebuild via `Data\force_compile`
- o problema de `Party 0` no `New Game` foi resolvido depois da recompilacao efetiva dos dados Gen 9
- o vault agora possui um ponto de entrada local para abrir o cofre e acionar o CLI oficial do Obsidian

## O que significa cada camada

### `sources`

Concentra os insumos editaveis e reaproveitaveis usados para gerar o runtime oficial.

Subcamadas relevantes:

- `sources\pokemon-essentials-21.1`
  - fonte repo-style extraida do zip do Essentials
  - contem scripts, dados auxiliares e estrutura util para overlay
- `sources\generation-9-pack-v3.3.4`
  - origem do pacote da Gen 9 usado como fonte de dados, plugins e assets

### `tools`

Contem automacoes locais do workspace. O principal artefato atual e o script de rebuild da build oficial.

Tambem passa a concentrar o suporte local ao vault em:

- `tools\obsidian-cli\open-project-vault.bat`
- `tools\obsidian-cli\obsidian-cli.bat`

### `docs`

Contem a documentacao operacional inicial produzida antes do vault.

### `pokemon-essentials-v21.1-gen9`

Esta pasta existe no workspace, mas nao deve ser tratada como runtime oficial de execucao. Ela se tornou obsoleta como alvo de teste principal depois que a build consolidada sem acento foi criada.

### `client`

Essa pasta passou a concentrar tres papeis diferentes:

- `client\\web`
  - frontend web ativo do workspace
  - contem a title screen, menu, hub Phaser, componentes pixel-perfect e assets sincronizados
- `client\\genesis`
  - repositorio de referencia pratica para assets, mapas e composicao visual usados no frontend web
  - serviu como fonte principal para portar o lobby da Battle Tower e sincronizar `public\\assets`
- `client\\project-genesis`
  - referencia adicional de UI, especialmente para title screen e organizacao de assets de interface

### `.shard`

`.shard\\test` se tornou uma area operacional relevante durante o trabalho multiagente no `client/web`.

Ela concentra:

- tarefas delegadas aos workers
- logs cronologicos do shard
- resultados por agente
- screenshots de smoke test
- scripts auxiliares para subir Vite e automatizar validacao com Playwright

Esse material nao substitui o vault, mas passou a ser uma fonte primaria de evidencia operacional.

## Atualizacao de 2026-03-31 - client/web

O estado atual do frontend web, depois da rodada multiagente mais recente, pode ser resumido assim:

- o `client\\web` saiu de uma base placeholder e hoje tem fluxo navegavel de `TitleScreen -> MainMenuScreen -> Battle Tower`
- a title screen usa assets reais sincronizados em `client\\web\\public\\assets\\reference-ui\\titles\\`
- o menu principal expoe a entrada `Battle Tower`
- o hub Phaser foi convertido para o lobby da Battle Tower usando assets vindos de `client\\genesis`
- a trilha de audio `.ogg` do hub foi gerada e colocada em `client\\web\\public\\assets\\hub\\bgm\\`
- houve sync pontual de assets do Essentials para `client\\web\\public\\assets\\essentials\\`
- a UI React recebeu uma rodada de pixel-perfect com `PixelScreen`, `PixelButton`, `PixelDialogueBox` e `PixelFrame`

Os caminhos mais relevantes dessa rodada sao:

- `client\\web\\src\\screens\\TitleScreen.tsx`
- `client\\web\\src\\screens\\MainMenuScreen.tsx`
- `client\\web\\src\\hub\\HubScene.ts`
- `client\\web\\src\\hub\\HubGame.tsx`
- `client\\web\\src\\components\\ui-pixel\\`
- `client\\web\\public\\assets\\`
- `.shard\\test\\`

Para o historico detalhado dessa rodada, consultar:

- [[07 Sessions/2026-03-31 Multi-Agent Progress Consolidation]]

## Mudancas tecnicas importantes ja aplicadas

### PluginManager

Uma correcao foi introduzida no fluxo para permitir a primeira compilacao dos plugins mesmo quando `Data\PluginScripts.rxdata` ainda nao existe.

Local importante de referencia:

- `sources\pokemon-essentials-21.1\Data\Scripts\001_Technical\005_PluginManager.rb`

### Hotfix da v21.1

O Pack Gen 9 exigia o plugin `v21.1 Hotfixes`. Esse requisito foi atendido na build oficial consolidada.

## Disciplina de trabalho atual

- editar fontes, nao o runtime, como regra geral
- rebuildar o runtime oficial via script
- testar na pasta `pokem-runtime`
- documentar qualquer mudanca estrutural neste vault

## Riscos ainda presentes

- o runtime do Essentials continua sendo uma stack legada para o objetivo final multiplayer
- parte das regras da Gen 9 ainda precisa ser tratada como material de validacao/importacao, nao como contrato definitivo do sistema futuro
- a estrategia de extracao da engine de batalha ainda precisa ser executada de forma sistematica

## Aprendizado operacional importante

Foi confirmado na pratica que apenas copiar `PBS` para o runtime nao basta. Sem recompilacao real, o jogo continua lendo `Data/*.dat` antigos. Isso significa:

- qualquer alteracao relevante em species, moves, items, metadata ou outros dados compilados precisa passar pela etapa de recompilacao do runtime
- `timestamp` dos `.dat` virou um sinal operacional util para validar se a mudanca entrou de verdade
- falhas aparentes de gameplay podem, na verdade, ser falhas de pipeline de compilacao

## Proximas observacoes que devem entrar aqui

Esta nota deve ser atualizada quando houver:

- criacao de um monorepo paralelo para backend e cliente modernos
- mudanca da build oficial
- alteracao do fluxo de rebuild
- descoberta de novos artefatos obsoletos ou perigosos
- mudanca do papel canonico de `client\\web`, `client\\genesis` ou `client\\project-genesis`
