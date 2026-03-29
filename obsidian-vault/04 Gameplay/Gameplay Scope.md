---
tags:
  - gameplay
  - scope
status: active
---

# Gameplay Scope

## Objetivo

Traduzir a ambicao do produto em experiencia de jogo concreta, distinguindo:

- o que precisa existir para a plataforma ser divertida e clara
- o que precisa existir para ela ser tecnicamente confiavel
- o que pode esperar sem comprometer o valor inicial

## Loop principal desejado

1. jogador entra no ambiente da plataforma
2. escolhe ou confirma time
3. entra em matchmaking ou desafio direto
4. partida e iniciada
5. jogadores escolhem acoes por turno
6. espectadores podem acompanhar a partida
7. resultado final e exibido
8. replay, rematch ou retorno ao lobby

## Pilares de experiencia

### Clareza competitiva

O jogador precisa entender rapidamente:

- qual e o estado atual da batalha
- quais acoes estao disponiveis
- quando esta esperando o oponente
- quando houve evento importante

### Fidelidade mecanica

A plataforma precisa se comportar de forma coerente com a base de regras adotada.

### Fluxo sem friccao

Entre abrir a plataforma e iniciar a partida deve haver o minimo de atrito desnecessario.

### Espectabilidade

Modo espectador deve ser legivel e interessante sem comprometer a integridade competitiva.

## Componentes de gameplay prioritarios

### Batalha 1v1 estruturada

Prioridade maxima, pois e o coracao do produto.

### Team validation

Nao basta permitir selecionar Pokemon; e preciso validar se a composicao esta coerente com regras do formato.

### Matchmaking basico

Mesmo que inicialmente simples, precisa existir um fluxo confiavel de pareamento.

### Spectator mode

Mesmo em versao inicial, ja vale estruturar a visao publica da luta.

## Aspectos de UX para a tela de batalha

- acoes disponiveis precisam ser obvias
- estados de espera precisam ser distintos de travamento
- mensagens de sistema nao devem competir demais com o tabuleiro
- historico de eventos deve ser compreensivel
- reconexao nao deve parecer derrota automatica

## Informacao publica versus privada

### Privada

- composicao completa do time nao revelado
- detalhes ainda nao expostos ao oponente

### Publica

- Pokemon em campo
- eventos observaveis
- resultado de moves
- efeitos publicamente visiveis

## Fora de escopo imediato em gameplay

- hub social gigantesco com atividades paralelas complexas
- progressao extensa
- colecionismo fora do nucleo de batalha
- customizacoes pesadas antes do loop principal estar confiavel

## Perguntas que cada feature de gameplay deve responder

- torna a batalha mais clara?
- melhora o ritmo entre jogadores?
- respeita a separacao entre informacao publica e privada?
- complica a sincronizacao mais do que o beneficio justifica?

## Definicao de pronto da experiencia inicial

Temos uma primeira experiencia valida quando:

- um jogador consegue entrar, batalhar e sair sem confusao operacional grave
- um espectador entende o que esta acontecendo
- o resultado da partida parece coerente com as regras
