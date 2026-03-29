---
tags:
  - data
  - pbs
  - rules
status: active
---

# PBS Ownership and Editing Rules

## Objetivo

Definir quem edita o que, em qual camada, e com qual cuidado. PBS tende a parecer "so arquivo de texto", mas muda rapidamente de status para ponto de fragilidade quando varias fontes coexistem.

## Regra principal

Nao editar dados PBS sem saber:

- se o arquivo e fonte ou artefato
- se existe outra camada sobrepondo esse dado
- como a mudanca sera reconstruida no runtime oficial

## Camadas relevantes

### PBS no Pack Gen 9

`C:\Users\hedge\OneDrive\Desktop\pokém\sources\generation-9-pack-v3.3.4\PBS`

Uso principal:

- fonte primaria de conteudo adicional da Gen 9
- ponto de estudo para importacao

### PBS vanilla atualizado do backup do pack

Esta camada existe porque o pack tambem distribui atualizacoes para PBS vanilla.

Ela precisa ser tratada como:

- overlay explicito
- nunca como "magica invisivel"

## Regras de ownership

### Mudancas corretivas em dados da Gen 9

Devem ser registradas junto da fonte da Gen 9, com nota explicando:

- arquivo alterado
- problema corrigido
- impacto esperado

### Overrides locais do projeto

Se em algum momento criarmos overrides proprios do projeto, eles devem viver numa camada separada e nomeada, nunca misturados silenciosamente a um pacote de terceiro.

## Regras de seguranca operacional

- evitar edicoes ad hoc diretamente na build oficial
- evitar substituir arquivos inteiros sem diff conceitual
- evitar corrigir problema de parse ou referencia apenas no runtime final

## Checklist antes de editar um PBS

1. Este arquivo e fonte original, overlay ou artefato gerado?
2. Existe outra camada que o sobrepoe?
3. Esta mudanca faz parte do produto ou apenas do runtime de referencia?
4. Precisamos transformar isso em regra do importador em vez de patch manual?

## Mudancas que merecem nota imediata

- IDs alterados
- inclusao ou remocao de especie, move, item ou ability
- ajustes em formas
- mudanca de referencias cruzadas
- qualquer correcao de legality

## O que documentar junto com a mudanca

- motivacao
- local
- origem do problema
- como validar
- se a mudanca deve ser portada para datasets normalizados futuros

## Meta desta disciplina

Chegar a um ponto em que:

- nenhum dado critico depende de "alguem lembrar que mudou aquilo"
- qualquer diferenca importante pode ser rastreada
- o importador consiga absorver boa parte das regras sem gambiarra silenciosa
