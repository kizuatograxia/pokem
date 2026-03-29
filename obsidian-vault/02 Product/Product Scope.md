---
tags:
  - product
  - scope
status: active
---

# Product Scope

## Tese do produto

O produto desejado e uma plataforma de batalhas Pokemon online com alto grau de fidelidade as mecanicas conhecidas, capacidade de observacao por terceiros e fundacao tecnica suficiente para evoluir alem do runtime legado do Essentials.

Nesta fase, o escopo do produto precisa ser formulado de modo que:

- aproveite a base concreta que ja existe
- nao misture objetivo final com implementacao temporaria
- proteja o time contra escopo inflamado cedo demais

## Escopo em camadas

### Camada 1: base jogavel de referencia

Objetivo:

- manter um runtime funcional de referencia
- usar esse runtime para validar dados, fluxo de batalha e comportamento esperado

Saida esperada:

- build do Essentials v21.1 com Gen 9 funcional e reproduzivel

### Camada 2: extracao da base de dados e regras

Objetivo:

- transformar o que hoje esta acoplado ao Essentials em dados e regras portaveis

Inclui:

- especies
- formas
- moves
- abilities
- items
- learnsets
- battle flags
- efeitos relevantes para a engine

### Camada 3: nucleo de batalha online

Objetivo:

- desenvolver um motor autoritativo de batalha que nao dependa da execucao local do cliente

Inclui:

- recebimento de comandos
- resolucao deterministica de turnos
- sincronizacao de estado
- snapshots e resync
- validacao de times e regras

### Camada 4: experiencia online

Objetivo:

- oferecer fluxo de matchmaking, lobby, partida, reconexao e espectador

Inclui:

- fila de matchmaking
- lobbies e salas
- notificacoes de inicio
- fluxo de espectador
- replays

### Camada 5: clientes modernos

Objetivo:

- sair da dependencia direta do runtime do RPG Maker para a experiencia final do usuario

Inclui:

- cliente desktop moderno
- cliente web
- estrategia de mobile

## Fora de escopo imediato

Os itens abaixo podem existir como horizonte, mas nao devem bloquear a fase atual:

- metajogo social completo com chat global e economia complexa
- progressao extensa e sistema de contas definitivo
- polimento final de monetizacao ou infraestrutura de pagamentos
- combate a trapaça em nivel de produto final antes de existir o loop principal autoritativo

## Requisitos nao funcionais prioritarios

- reproducibilidade
- clareza de ownership
- isolamento entre fonte e artefato gerado
- documentacao suficiente para onboarding
- precisao de dados Gen 1 a Gen 9
- confiabilidade de sincronizacao

## Requisitos funcionais prioritarios

### Curto prazo

- boot estavel da build de referencia
- visibilidade completa sobre dados e arquivos canonicos
- plano de extracao da engine de batalha

### Medio prazo

- importador de dados PBS tipado
- validador de roster e learnsets
- modelo de estado de batalha independente do cliente

### Longo prazo

- servicos online
- espectadores em tempo real
- cliente multiplataforma fora do runtime legado

## Definicao pragmatica de sucesso

Se precisarmos resumir o escopo em uma frase:

> construir uma plataforma online de batalha Pokemon com base fiel em Essentials + Gen 9, mas com arquitetura moderna e separacao rigorosa entre dados, runtime de referencia e sistema online final
