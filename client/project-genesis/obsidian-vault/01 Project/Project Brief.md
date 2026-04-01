---
tags:
  - project
  - brief
status: active
---

# Project Brief

## Resumo executivo

O projeto tem como objetivo construir uma plataforma moderna de batalhas Pokemon online, inspirada no conjunto de regras e dados do Pokemon Essentials v21.1 com suporte ao roster da Gen 9, mas evoluindo para uma arquitetura multiplayer autoritativa, multiplataforma e observavel.

O runtime atual do Essentials resolve um problema importante: ele nos da uma base jogavel, validada e util para extrair regras, dados, estruturas e comportamento esperado. Porem, ele nao deve ser tratado como o destino final da plataforma online. A direcao correta e usar o Essentials como:

- fonte de referencia de regras
- fonte de dados de especies, moves, abilities, items e PBS
- base para validacao comportamental
- ferramenta de comparacao e fixture

e nao como stack final para matchmaking, tempo real, espectador e cliente multiplataforma.

## Objetivo principal

Construir uma plataforma de batalha que permita:

- batalhas em tempo real entre dois jogadores com servidor autoritativo
- sincronizacao robusta entre clientes
- modo espectador com visao publica consistente
- base de dados valida para especies, moves, abilities e itens ate a Gen 9
- clientes modernos preparados para desktop, web e eventualmente mobile
- trilha clara de migracao do ambiente Essentials para uma arquitetura de servicos

## Objetivos secundarios

- documentar integralmente a base atual para evitar retrabalho
- separar claramente o que e runtime jogavel do que e fonte editavel
- tornar o rebuild da base reproduzivel
- reduzir risco de corrupcao de dados ou edicao no lugar errado

## O que ja existe

- workspace em `C:\Users\hedge\OneDrive\Desktop\pokém`
- runtime oficial consolidado em `C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-complete-gen9`
- fontes extraidas do Essentials repo-style e do Pack Gen 9 em `sources`
- scripts de rebuild e launch em `tools`
- documentacao operacional inicial em `docs`

## O que este projeto nao deve assumir

- que o Pokemon Essentials sera o runtime online definitivo
- que o codigo Ruby do jogo podera ser reutilizado sem adaptacao como back-end online
- que cliente, sincronizacao e dados devam permanecer acoplados
- que caminho com acento seja seguro para runtime do jogo

## Principios arquiteturais

### 1. Fonte editavel e runtime sao coisas diferentes

As edicoes devem ocorrer nas fontes corretas do workspace. O runtime oficial deve ser reconstruido a partir dessas fontes, nao editado manualmente como regra geral.

### 2. Servidor autoritativo

Qualquer versao online do jogo precisa ter resolucao de turno e estado de batalha controlados pelo servidor, e nao pelo cliente.

### 3. Determinismo antes de performance exotica

O sistema de batalha precisa ser reproduzivel, auditavel e comparavel com a referencia antes de qualquer otimizacao agressiva.

### 4. Dados com proveniencia

Toda informacao de especies, moves e mechanics precisa ter origem rastreavel: Essentials base, Gen 9 Pack, override local ou regra propria.

### 5. Operacao reproduzivel

Abrir, rebuildar, testar e comparar precisam ser tarefas documentadas, repetiveis e com baixa ambiguidade.

## Definicao de sucesso para esta fase

Esta fase inicial do projeto sera bem-sucedida quando:

- o runtime jogavel continuar bootando de forma consistente
- o vault e a documentacao refletirem corretamente o estado do workspace
- a equipe souber exatamente onde editar, onde testar e onde nao mexer
- o plano de porting da logica de batalha estiver claro o bastante para iniciar a extracao

## Perguntas que este brief responde

- por que o Essentials ainda esta aqui
- por que o runtime oficial fica fora do caminho com acento
- como separar o trabalho de engine, dados e cliente
- qual e o objetivo real do workspace nesta etapa

## Leitura complementar

- [[01 Project/Current Workspace State]]
- [[01 Project/Source of Truth]]
- [[03 Architecture/System Overview]]
- [[06 Operations/Build and Runtime Workflow]]
