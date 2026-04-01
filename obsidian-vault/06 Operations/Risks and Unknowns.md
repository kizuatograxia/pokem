---
tags:
  - operations
  - risks
status: active
---

# Risks and Unknowns

## Objetivo

Listar os principais riscos tecnicos e incertezas do projeto para que planejamento e execucao nao sejam contaminados por otimismo vago.

## Risco 1: acoplamento mental ao runtime legado

Descricao:

Como o Essentials ja roda, existe o risco de a equipe inconscientemente trata-lo como arquitetura final, adiando a separacao correta entre referencia e sistema futuro.

Impacto:

- retrabalho
- design de rede fraco
- cliente moderno mal definido

Mitigacao:

- reforcar papel do runtime como baseline
- manter notas de arquitetura atualizadas

## Risco 2: complexidade real da logica de batalha

Descricao:

Pokemon possui muitas excecoes, interacoes sutis e efeitos contextuais. Subestimar isso pode levar a uma engine nova aparentemente funcional, mas incompatvel em casos importantes.

Impacto:

- divergencia comportamental
- bugs dificeis de depurar
- desconfiança no sistema online

Mitigacao:

- porting gradual
- fixtures comparativas
- mapeamento detalhado antes de reimplementacao

## Risco 3: dados com ownership confuso

Descricao:

Com varias camadas de PBS, scripts e hotfixes, fica facil aplicar mudancas sem clareza de origem.

Impacto:

- inconsistencias
- build irreproduzivel
- regressao silenciosa

Mitigacao:

- disciplina de fonte de verdade
- documentacao de overrides
- pipeline de importacao com proveniencia

## Risco 4: multiplataforma cedo demais

Descricao:

Tentar resolver desktop, web e mobile ao mesmo tempo antes do protocolo e do estado estarem maduros aumenta muito a superficie de problemas.

Mitigacao:

- priorizar contratos
- consolidar desktop/web primeiro

## Risco 5: protocolo de rede acoplado ao cliente

Descricao:

Se o protocolo nascer pensado em torno da UI, ele tende a virar um espelho de tela em vez de um contrato robusto de dominio.

Mitigacao:

- definir estado, comando e evento antes de polir UI

## Risco 6: instabilidade operacional do gateway de automacao

Descricao:

O gateway local do OpenClaw apresentou intermitencia (`gateway closed 1000`) em comandos de cron e probe, com comportamento inconsistente entre checks sucessivos.

Impacto:

- jobs automatizados podem falhar de forma silenciosa
- loops de tentativas e ruido operacional em chat
- perda de confianca no fluxo de delegacao entre agentes

Mitigacao:

- manter configuracao de gateway sem ambiguidades local/remote
- adotar janela de validacao antes de religar cron
- definir playbook de desligamento rapido de jobs quando houver erro recorrente

## Unknowns importantes

### Qual sera o stack final do cliente moderno

Ainda precisa de decisao mais firme, embora Flutter apareca como candidato forte.

### Qual linguagem/stack final da engine autoritativa

Depende do equilibrio desejado entre velocidade de iteracao, determinismo, tooling e integracao com os futuros clientes.

### Quanto da logica Ruby pode ser transposta conceitualmente sem herdar seu acoplamento

Essa resposta so aparece com o inventario sistematico da engine.

### Qual formato de dataset derivado sera mais adequado

JSON tipado, banco, binario versionado ou combinacao disso ainda e decisao de implementacao.

## Regra de gestao de risco

Se um risco:

- pode invalidar arquitetura
- pode corromper ownership
- pode tornar o rebuild irreproduzivel

entao ele precisa sair desta nota e virar tarefa concreta no backlog ou ADR formal.
