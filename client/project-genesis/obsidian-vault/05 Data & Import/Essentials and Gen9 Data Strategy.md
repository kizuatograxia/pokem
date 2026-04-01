---
tags:
  - data
  - import
  - essentials
  - gen9
status: active
---

# Essentials and Gen9 Data Strategy

## Objetivo

Definir como usar o Pokemon Essentials e o Pack Gen 9 como fontes de dados confiaveis sem acoplar o futuro sistema inteiro ao formato e aos limites do runtime legado.

## Premissa fundamental

Essentials + Gen 9 devem ser tratados como:

- fonte de referencia
- fonte de importacao
- fonte de comparacao

e nao como formato final obrigatorio para todos os modulos futuros.

## Fontes atuais

### Fonte base overlay

`C:\Users\hedge\OneDrive\Desktop\pokém\sources\pokemon-essentials-21.1`

### Fonte do pacote Gen 9

`C:\Users\hedge\OneDrive\Desktop\pokém\sources\generation-9-pack-v3.3.4`

## Tipos de dados que precisamos dominar

- especies
- formas
- moves
- abilities
- items
- tipos
- learnsets
- evolucoes
- encounter e metadata relevante quando fizer sentido
- battle flags e propriedades com impacto direto no combate

## Problema que esta estrategia resolve

Se consumirmos PBS e scripts diretamente como se fossem API eterna:

- ficamos presos ao formato original
- perdemos clareza de ownership
- misturamos dado bruto com dado normalizado
- dificultamos testes e versionamento

## Pipeline recomendado

### Etapa 1: ingestao

Ler os arquivos brutos preservando origem.

Cada registro relevante deve conseguir dizer:

- de qual arquivo veio
- em qual camada veio
- se veio do base Essentials, do Pack Gen 9 ou de override local

### Etapa 2: parse tipado

Converter arquivos em estruturas intermediarias tipadas.

Objetivo:

- parar de raciocinar em texto solto o quanto antes
- detectar erro de parse cedo

### Etapa 3: normalizacao

Padronizar:

- IDs
- naming
- referencias cruzadas
- forms
- aliases

### Etapa 4: validacao

Validar:

- referencias quebradas
- duplicidades
- learnsets inconsistentes
- moves inexistentes
- items/abilities ausentes
- formas sem base coerente

### Etapa 5: emissao

Gerar datasets consumiveis por:

- battle engine
- ferramentas internas
- clientes
- testes

## Regra de proveniencia

Todo dataset derivado deve manter metadados minimos de origem. Quando houver conflito, precisamos saber:

- qual fonte ganhou
- por que ganhou
- se foi por prioridade declarada ou override manual

## Sobre scripts versus PBS

Nem tudo vivera apenas no PBS. Parte da mecanica esta nos scripts Ruby.

Portanto, a estrategia de dados deve separar:

- dados descritivos, ideais para importacao direta
- regras comportamentais, que precisam ser catalogadas e portadas

## Resultado desejado

Uma camada de dados que permita dizer com seguranca:

- esta especie existe
- esta forma e valida
- este move e referenciado corretamente
- este item/ability tem efeito descrito ou mapeado
- este conjunto de dados pertence a tal versao

## Criterios de qualidade

- importacao reproduzivel
- relatorio de inconsistencias acionavel
- versao de dataset identificavel
- separacao entre bruto, intermediario e derivado
