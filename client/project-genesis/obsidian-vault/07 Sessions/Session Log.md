---
tags:
  - sessions
  - log
status: active
---

# Session Log

## Objetivo

Manter uma trilha cronologica das sessoes relevantes de trabalho. Esta pagina funciona como indice de progresso, memoria operacional e ponte entre conversas, alteracoes e decisoes.

## Como usar

- registre uma entrada curta por sessao significativa
- inclua o que foi feito, o que foi descoberto e o que ficou aberto
- se houver uma decisao importante, linke um ADR
- se houver tarefas novas, linke o backlog

## Entrada inicial

### Bootstrap do workspace e consolidacao da build oficial

Resumo:

- fontes do Essentials e do Pack Gen 9 foram extraidas
- foi identificado que a primeira copia utilizada nao era uma instalacao completa para boot
- a build correta foi reconstruida a partir da base completa do Essentials v21.1
- o Pack Gen 9 foi reaplicado
- o hotfix requerido pelo plugin da Gen 9 foi instalado
- o fluxo de `PluginScripts.rxdata` foi corrigido para a primeira compilacao
- o runtime oficial passou a viver em caminho sem acento

Resultados:

- build oficial funcional em `C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-complete-gen9`
- script de rebuild criado
- launcher criado
- documentacao operacional iniciada

Pendencias abertas na epoca:

- estruturar documentacao mais completa
- planejar extracao da engine de batalha
- formalizar backlog

### Criacao do vault Obsidian

Resumo:

- estrutura de pastas do vault criada
- configuracoes basicas do Obsidian definidas
- paginas mestras de projeto, produto, arquitetura, dados e operacao adicionadas
- templates e backlog inicializados

Resultado:

- o workspace agora possui uma base documental central para orientar execucao, onboarding e decisoes

## Proxima convencao sugerida

Nas proximas sessoes, criar novas entradas com:

- data
- foco principal
- alteracoes concretas
- links relevantes
- proximos passos

### 2026-03-30 - Runtime Recompile and Legendary Starter Recovery

Resumo:

- foi identificado que o runtime oficial em release nao estava recompilando os `PBS`
- os `.dat` carregados pelo jogo permaneciam com dados antigos, apesar de o Pack Gen 9 estar presente na pasta `PBS`
- isso impedia a existencia real de species Gen 9 no `GameData` usado pelo jogo e quebrava a entrega dos Pokemon iniciais
- o fluxo de rebuild passou a marcar o runtime com `Data\force_compile`
- o compilador passou a aceitar recompilacao forcada fora do fluxo normal de debug
- o bundle de Pokemon lendarios recebeu fallback seguro e nova versao

Resultado:

- os arquivos `Data/*.dat` do runtime foram recompilados com timestamp atual
- a base Gen 9 entrou no conjunto de dados efetivamente lido pelo jogo
- o problema de `Party 0` foi resolvido

Nota detalhada:

- [[07 Sessions/2026-03-30 Runtime Recompile and Legendary Starter Recovery]]
