---
tags:
  - vault
  - home
  - index
status: active
---

# Pokemon Battle Platform Vault

Este vault foi criado para ser a base documental e operacional do projeto de plataforma multiplayer de batalhas Pokemon construída a partir do ecossistema do Pokemon Essentials v21.1 com pacote Gen 9 aplicado.

O objetivo deste vault nao e ser apenas um conjunto de notas soltas. Ele foi estruturado como um sistema de trabalho para:

- manter uma fonte de verdade unica sobre o projeto
- registrar decisoes tecnicas e de produto
- organizar a migracao da base offline para uma arquitetura online autoritativa
- documentar o fluxo de importacao de dados do Essentials e do Pack Gen 9
- reduzir ambiguidade entre fonte de desenvolvimento, runtime oficial e artefatos obsoletos
- apoiar backlog, sessoes de trabalho e proximos passos

## Como usar este vault

1. Comece por [[00 Home/Navigation Map]] para entender a estrutura.
2. Leia [[01 Project/Project Brief]] para alinhar escopo e direcao.
3. Consulte [[01 Project/Source of Truth]] antes de editar arquivos no workspace.
4. Use [[06 Operations/Build and Runtime Workflow]] sempre que precisar rebuildar ou testar o jogo.
5. Use [[06 Operations/Obsidian Vault Workflow]] sempre que precisar operar o vault ou o CLI oficial do Obsidian.
6. Registre sessoes em [[07 Sessions/Session Log]] e em notas diarias.
7. Quando uma decisao impactar arquitetura, runtime ou fluxo de dados, crie um ADR em [[08 Decisions]].

## Leitura recomendada por objetivo

### Se o foco for produto

- [[02 Product/Product Scope]]
- [[02 Product/Release Plan]]
- [[04 Gameplay/Gameplay Scope]]

### Se o foco for arquitetura

- [[03 Architecture/System Overview]]
- [[03 Architecture/Battle Engine Porting Plan]]
- [[03 Architecture/Realtime Multiplayer Model]]
- [[03 Architecture/Client Platform Strategy]]

### Se o foco for dados

- [[05 Data & Import/Essentials and Gen9 Data Strategy]]
- [[05 Data & Import/PBS Ownership and Editing Rules]]

### Se o foco for operacao

- [[06 Operations/Build and Runtime Workflow]]
- [[06 Operations/Obsidian Vault Workflow]]
- [[06 Operations/Risks and Unknowns]]
- [[10 Reference/Canonical Paths]]

## Estado atual resumido

- A build jogavel oficial esta em `C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-complete-gen9`
- O projeto ja boota com sucesso
- O Pack Gen 9 foi aplicado sobre uma base completa do Essentials v21.1
- O hotfix necessario para o plugin da Gen 9 ja foi integrado ao runtime oficial
- O workspace ja possui scripts e documentacao para rebuild e launch
- O vault agora possui wrappers locais para abertura do cofre e uso do CLI oficial do Obsidian

## Principio operacional deste vault

Toda nota importante deve responder a pelo menos uma destas perguntas:

- o que estamos construindo
- onde isso vive no workspace
- qual e a fonte de verdade
- como reproduzir
- qual risco ainda esta aberto
- qual decisao ja foi tomada

## Navegacao rapida

- [[00 Home/Navigation Map]]
- [[01 Project/Current Workspace State]]
- [[09 Backlog/Master Backlog]]
- [[09 Backlog/Near-Term Execution Plan]]
- [[10 Reference/Glossary]]

## Convencoes

- ADRs ficam em `08 Decisions`
- notas operacionais ficam em `06 Operations`
- backlog geral fica em `09 Backlog`
- termos e caminhos canonicos ficam em `10 Reference`
- templates ficam em `Templates`

## Proxima acao sugerida

Se a intencao for avancar no desenvolvimento, a melhor sequencia inicial e:

1. revisar [[01 Project/Source of Truth]]
2. revisar [[06 Operations/Build and Runtime Workflow]]
3. iniciar a extracao sistematica da logica de batalha em [[03 Architecture/Battle Engine Porting Plan]]
4. transformar o plano imediato em tarefas concretas dentro de [[09 Backlog/Near-Term Execution Plan]]
