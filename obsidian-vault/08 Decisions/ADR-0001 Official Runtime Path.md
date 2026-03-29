---
tags:
  - adr
  - runtime
  - decisions
status: accepted
---

# ADR-0001 Official Runtime Path

## Status

Accepted

## Contexto

Durante a consolidacao da build do Pokemon Essentials v21.1 com Pack Gen 9, o projeto foi inicialmente operado dentro do workspace localizado em um caminho com caractere acentuado:

`C:\Users\hedge\OneDrive\Desktop\pokém`

Na pratica, isso contribuiu para problemas no boot e tornou o ambiente menos previsivel para execucao direta do runtime.

Ao mesmo tempo, havia necessidade de distinguir claramente:

- fontes editaveis
- runtime gerado para teste

## Decisao

O runtime oficial de execucao passa a ser:

`C:\Users\hedge\OneDrive\Desktop\pokem-runtime\pokemon-essentials-v21.1-complete-gen9`

enquanto o workspace com fontes e ferramentas continua em:

`C:\Users\hedge\OneDrive\Desktop\pokém`

## Consequencias positivas

- reduçao de risco relacionado a caminho com acento
- separacao mais clara entre autoria e artefato gerado
- menor chance de editar o runtime por engano
- caminho estavel para scripts de launch e smoke test

## Consequencias negativas

- aumenta a quantidade de caminhos relevantes
- exige disciplina para nao confundir workspace e runtime

## Alternativas consideradas

### Executar diretamente do workspace original

Rejeitada porque:

- ja demonstrou fragilidade operacional
- mistura fonte e artefato

### Mover todo o workspace para um caminho sem acento

Nao adotada neste momento porque:

- exigiria reorganizacao maior do ambiente
- nao era necessaria para estabilizar a build oficial

## Regra derivada

Qualquer nova automacao, documentacao ou onboarding deve tratar `pokem-runtime` como alvo oficial de execucao ate segunda ordem.
