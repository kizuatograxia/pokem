---
tags:
  - architecture
  - battle
  - porting
status: active
---

# Battle Engine Porting Plan

## Objetivo

Definir como sair de uma base de batalha acoplada ao runtime do Essentials para um motor reaproveitavel, testavel e apto para execucao autoritativa em um servico online.

## Premissa central

Nao devemos tentar "migrar tudo de uma vez". O caminho mais seguro e:

1. identificar a superficie minima de regras
2. modelar o estado e os eventos
3. comparar comportamento com a referencia
4. expandir cobertura gradualmente

## O que significa portar a engine

Portar a engine nao e copiar arquivos Ruby para outro lugar. Portar significa:

- compreender a semantica das regras
- isolar dependencias de UI e runtime
- representar estado de forma independente
- reproduzir resultados com determinismo

## Resultado desejado

Uma engine que:

- recebe um estado de batalha bem definido
- recebe comandos validos de jogadores
- usa uma fonte de RNG controlada
- resolve a proxima etapa da batalha
- produz eventos e novo estado

## Frentes de trabalho

### Frente 1: inventario da logica relevante

Mapear nos scripts do Essentials:

- fluxo de inicio de batalha
- estrutura do estado da batalha
- resolucao de turno
- ordem de prioridade
- regras de switch
- status
- clima e terreno
- abilities e itens com efeito de batalha
- mudancas de forma

Saida:

- inventario comentado por modulo
- lista do que e fundamental, derivado ou periferico

### Frente 2: modelagem do estado independente

Criar uma representacao explicita para:

- batalha
- jogador/lado
- campo
- Pokemon
- efeitos temporarios
- pilhas de eventos
- timers

Importante:

o estado deve ser serializavel e comparavel, para permitir hash, snapshot e replay.

### Frente 3: modelo de comandos

Comandos minimos:

- escolher move
- trocar Pokemon
- usar acao especial quando o formato permitir
- render-se ou desistir

Cada comando precisa carregar:

- identificador de batalha
- identificador de jogador/lado
- numero de sequencia
- contexto minimo do turno

### Frente 4: modelo de resolucao

Resolver turno precisa incluir:

- validacao previa dos comandos
- calculo da ordem efetiva
- aplicacao de efeitos pre-turno
- execucao dos movimentos e interrupcoes
- aplicacao de KO, switching forzado e efeitos pos-acao
- consolidacao do estado final do turno

### Frente 5: fixtures e comparacao

Cada comportamento critico deve virar fixture comparavel com a referencia.

Exemplos de cenarios:

- prioridade simples
- speed tie
- switch por KO
- weather residual
- item consumivel
- ability reativa
- move multi-hit
- forma condicional

## Estrategia de migracao

### Etapa A: leitura e catalogacao

Nao escrever engine nova antes de saber:

- quais dados entram
- quais mutacoes acontecem
- quais efeitos dependem de ordem sutil

### Etapa B: subset inicial

Implementar um subconjunto deliberado:

- batalha simples 1v1
- moves sem efeitos exoticos
- status mais comuns
- fluxo basico de dano, faint e troca

### Etapa C: cobertura incremental

Expandir para:

- doubles se desejado
- formas especiais
- interacoes complexas de item e ability
- mecanicas geracionais especificas

## O que evitar

- reescrever tudo de forma impressionista
- confiar em memoria informal da mecanica
- misturar resolucao de batalha com transporte websocket
- misturar logica de cliente com logica autoritativa

## Artefatos que esta frente deve produzir

- mapa dos scripts relevantes no Essentials
- esquema do estado de batalha
- lista de eventos canonicos
- colecao de fixtures
- matriz de cobertura por feature

## Criterio de sucesso

Podemos considerar essa frente madura quando:

- um conjunto de cenarios representativos roda na engine nova
- o resultado bate com a referencia para esses cenarios
- divergencias sao documentadas e explicaveis
