---
tags:
  - architecture
  - client
  - platforms
status: active
---

# Client Platform Strategy

## Objetivo

Definir a estrategia para sair de um runtime legado de RPG Maker para clientes modernos, sem perder o valor da base atual durante a transicao.

## Premissa

O cliente atual do Essentials e excelente como referencia jogavel, mas inadequado como destino final para:

- multiplayer moderno
- observabilidade
- UX de reconexao
- distribuicao ampla em multiplas plataformas

## Estrategia recomendada

### Fase de transicao

Manter dois papeis diferentes:

- Essentials como referencia jogavel e fonte de validacao
- cliente moderno como alvo final da experiencia online

### Prioridade de plataformas

1. desktop
2. web
3. mobile

Motivo:

- desktop e web permitem iteracao mais rapida
- web facilita testes e depuracao do fluxo online
- mobile entra melhor quando os contratos de rede e UI ja estiverem maduros

## Papel do cliente moderno

O cliente moderno deve ser responsavel por:

- autenticacao de sessao
- lobby
- team flow
- matchmaking
- renderizacao da batalha
- consumo do stream realtime
- reconexao
- espectador

Nao deve ser responsavel por:

- resolver a mecanica final da batalha
- manter o estado canonico
- aplicar logicas de dados sem rastreabilidade

## Consideracoes sobre tecnologia

### Flutter

Pontos fortes:

- uma base para multiplas plataformas
- velocidade de prototipagem boa
- boa ergonomia para interfaces stateful

Pontos de atencao:

- integração com fluxos de tempo real precisa ser muito disciplinada
- animacao de batalha deve ser guiada por eventos, nao por suposicoes locais

### Web primeiro

Uma stack web tambem pode fazer sentido se quisermos:

- debugar mais rapido
- inspecionar protocolos com facilidade
- distribuir sem friccao no inicio

## Regras de UX da batalha online

- UI deve tratar servidor como fonte de verdade
- input local pode ser otimista na sensacao, mas nunca definitivo no resultado
- reconectar deve ser experiencia de produto, nao erro terminal por padrao
- modo espectador deve deixar claro o que e visao publica

## Decisoes que devem vir depois, nao antes

- framework visual final definitivo
- camadas exatas de animacao cinematica
- embalagem nativa definitiva para todas as plataformas

Essas escolhas so valem a pena quando:

- o protocolo de batalha existir
- a modelagem de estado estiver firme
- o fluxo de espectador estiver claro

## Definicao de pronto para a camada cliente

A camada cliente pode ser considerada madura quando:

- consegue abrir sessao
- entrar em lobby
- iniciar e acompanhar uma batalha
- sobreviver a reconexao
- apresentar visao de espectador coerente

## Regra operacional

Enquanto o cliente moderno nao estiver consolidado, toda feature de UX importante deve responder:

- ela pertence ao runtime legado apenas como referencia?
- ou ela ja deve nascer no cliente moderno?
