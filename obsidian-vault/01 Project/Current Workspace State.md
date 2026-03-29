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
- `docs`
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

### `docs`

Contem a documentacao operacional inicial produzida antes do vault.

### `pokemon-essentials-v21.1-gen9`

Esta pasta existe no workspace, mas nao deve ser tratada como runtime oficial de execucao. Ela se tornou obsoleta como alvo de teste principal depois que a build consolidada sem acento foi criada.

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

## Proximas observacoes que devem entrar aqui

Esta nota deve ser atualizada quando houver:

- criacao de um monorepo paralelo para backend e cliente modernos
- mudanca da build oficial
- alteracao do fluxo de rebuild
- descoberta de novos artefatos obsoletos ou perigosos
